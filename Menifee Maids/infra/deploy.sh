#!/usr/bin/env bash
# Menifee Maids — Azure setup on the Cosmos DB free tier.
#
# Every step is idempotent, so re-run it safely. Target cost is $0/month for
# everything except SMS.
#
# NOTE: this script is the reference implementation of what DEPLOY.md describes.
# If you are deploying by hand through the Azure Portal, read DEPLOY.md instead
# and use this file to check what a step is supposed to produce.
set -euo pipefail

# West US 2, not West US 3. Static Web Apps is not offered in West US 3, and you
# want the managed API in the same region as Cosmos and Storage.
LOCATION="${LOCATION:-westus2}"
RG="${RG:-menifee-maids-rg}"
COSMOS="${COSMOS:-menifee-cosmos}"
COSMOS_DB="${COSMOS_DB:-menifee}"
STORAGE="${STORAGE:-menifeemaidsst}"
FUNC_APP="${FUNC_APP:-menifee-jobs}"
SWA="${SWA:-menifee-maids}"
ACS="${ACS:-menifee-acs}"

echo "==> Resource group"
az group create -n "$RG" -l "$LOCATION" -o none

# ---------------------------------------------------------------------------
# Cosmos DB. The free tier can ONLY be enabled at creation time and there is one
# per subscription, so this is the step to get right first time.
# ---------------------------------------------------------------------------
echo "==> Cosmos DB account (free tier)"
if az cosmosdb show -g "$RG" -n "$COSMOS" -o none 2>/dev/null; then
  echo "    (already exists — free tier cannot be added afterwards)"
else
  az cosmosdb create -g "$RG" -n "$COSMOS" \
    --locations regionName="$LOCATION" failoverPriority=0 isZoneRedundant=false \
    --enable-free-tier true \
    --default-consistency-level Session -o none
fi

echo "==> Database with 1000 RU/s shared throughput"
az cosmosdb sql database create -g "$RG" -a "$COSMOS" -n "$COSMOS_DB" \
  --throughput 1000 -o none 2>/dev/null || echo "    (already exists)"

echo "==> Containers"
create_container () {  # name, partition key path
  az cosmosdb sql container create -g "$RG" -a "$COSMOS" -d "$COSMOS_DB" \
    -n "$1" --partition-key-path "$2" -o none 2>/dev/null \
    && echo "    + $1 ($2)" || echo "    = $1 already exists"
}
create_container jobs         /id
create_container payments     /jobId
create_container availability /monthKey
create_container settings     /id
create_container customers    /contactKey

# TTL must be switched on for per-item expiry to work. -1 means "enabled, but
# only for documents that set their own ttl" — exactly what we want.
echo "==> Enabling per-item TTL on jobs"
az cosmosdb sql container update -g "$RG" -a "$COSMOS" -d "$COSMOS_DB" \
  -n jobs --ttl -1 -o none 2>/dev/null || echo "    (already set)"

echo "==> Storage account (photos, archive, queue)"
az storage account create -n "$STORAGE" -g "$RG" -l "$LOCATION" \
  --sku Standard_LRS --min-tls-version TLS1_2 --allow-blob-public-access false -o none \
  || echo "    (already exists)"

echo "==> Blob containers and queue"
STORAGE_CONN=$(az storage account show-connection-string -g "$RG" -n "$STORAGE" --query connectionString -o tsv)
for c in job-photos job-archive; do
  az storage container create -n "$c" --connection-string "$STORAGE_CONN" -o none 2>/dev/null \
    && echo "    + container $c" || echo "    = container $c already exists"
done
az storage queue create -n booking-writes --connection-string "$STORAGE_CONN" -o none 2>/dev/null \
  && echo "    + queue booking-writes" || echo "    = queue booking-writes already exists"
# The poison queue is created by the Functions host on first failure, but making
# it now means the persistBookingPoison trigger binds cleanly on first start.
az storage queue create -n booking-writes-poison --connection-string "$STORAGE_CONN" -o none 2>/dev/null \
  && echo "    + queue booking-writes-poison" || echo "    = queue booking-writes-poison already exists"

echo "==> Function App"
az functionapp create -g "$RG" -n "$FUNC_APP" \
  --storage-account "$STORAGE" --consumption-plan-location "$LOCATION" \
  --runtime node --runtime-version 20 --functions-version 4 \
  --assign-identity '[system]' -o none || echo "    (already exists)"

# Function Apps run on UTC unless told otherwise. Without this the 17:00 reminder
# fires at 10:00 Pacific — it still works, so nothing errors, it is just wrong.
echo "==> Function App timezone (Pacific)"
az functionapp config appsettings set -g "$RG" -n "$FUNC_APP" \
  --settings WEBSITE_TIME_ZONE="Pacific Standard Time" -o none

echo "==> Communication Services"
az communication create -n "$ACS" -g "$RG" --location Global --data-location UnitedStates -o none \
  || echo "    (already exists)"

echo "==> Static Web App (Free)"
az staticwebapp create -n "$SWA" -g "$RG" -l "$LOCATION" --sku Free -o none \
  || echo "    (already exists)"

# ---------------------------------------------------------------------------
# Access.
#
# The Function App gets a managed identity and uses it. The Static Web App does
# NOT: Static Web Apps' managed API has no managed identity — Microsoft wires one
# up only for Key Vault lookups, not for the function runtime — so its /api is
# configured with keys and connection strings instead. Do not try to assign the
# SWA an identity here; on the Free plan the command fails, and even on Standard
# the managed functions could not use it.
#
# For the Function App, remember Cosmos data-plane permission is a SEPARATE
# system from normal RBAC: "Contributor" lets an identity read account keys but
# not a single document.
# ---------------------------------------------------------------------------
echo "==> Managed identity access (Function App only)"
FUNC_ID=$(az functionapp identity show -g "$RG" -n "$FUNC_APP" --query principalId -o tsv)

STORAGE_ID=$(az storage account show -g "$RG" -n "$STORAGE" --query id -o tsv)
DATA_CONTRIBUTOR=00000000-0000-0000-0000-000000000002   # Cosmos DB Built-in Data Contributor

if [ -z "$FUNC_ID" ]; then
  echo "    ! the Function App has no managed identity — enable it and re-run"
else
  az cosmosdb sql role assignment create -g "$RG" -a "$COSMOS" \
    --role-definition-id "$DATA_CONTRIBUTOR" --principal-id "$FUNC_ID" --scope "/" -o none 2>/dev/null \
    && echo "    + cosmos data role -> $FUNC_APP" || echo "    = cosmos data role already on $FUNC_APP"
  az role assignment create --assignee "$FUNC_ID" --role "Storage Blob Data Contributor"  --scope "$STORAGE_ID" -o none 2>/dev/null || true
  az role assignment create --assignee "$FUNC_ID" --role "Storage Queue Data Contributor" --scope "$STORAGE_ID" -o none 2>/dev/null || true
  echo "    + storage data roles -> $FUNC_APP"
fi

echo "==> Budget alert at \$5 (Azure has no automatic spend cap)"
echo "    Set this in the portal: Cost Management > Budgets > Add."

COSMOS_KEY=$(az cosmosdb keys list -g "$RG" -n "$COSMOS" --query primaryMasterKey -o tsv)
ACS_CONN=$(az communication list-key -n "$ACS" -g "$RG" --query primaryConnectionString -o tsv 2>/dev/null || echo "<get this from the portal>")

cat <<SETTINGS

================ Static Web App settings ================
Key-based, because the managed API has no managed identity.

az staticwebapp appsettings set -n $SWA -g $RG --setting-names \\
  COSMOS_ENDPOINT=https://$COSMOS.documents.azure.com:443/ \\
  COSMOS_DATABASE=$COSMOS_DB \\
  COSMOS_KEY='$COSMOS_KEY' \\
  STORAGE_ACCOUNT_URL=https://$STORAGE.blob.core.windows.net \\
  STORAGE_CONNECTION_STRING='$STORAGE_CONN' \\
  SITE_URL=https://www.menifeemaids.com \\
  ACS_CONNECTION_STRING='$ACS_CONN' \\
  ACS_SENDER_ADDRESS=DoNotReply@<your-verified-domain> \\
  OWNER_EMAIL=info.menifeemaids@outlook.com \\
  API_KEY=\$(openssl rand -hex 24) \\
  STRIPE_SECRET_KEY=sk_live_...

Leave ACS_SMS_FROM and OWNER_SMS unset until A2P registration completes.
Both send paths degrade to email on their own; nothing breaks.

================ Function App settings ==================
Identity-based, because this app has a real managed identity.

az functionapp config appsettings set -g $RG -n $FUNC_APP --settings \\
  COSMOS_ENDPOINT=https://$COSMOS.documents.azure.com:443/ \\
  COSMOS_DATABASE=$COSMOS_DB \\
  STORAGE_ACCOUNT_URL=https://$STORAGE.blob.core.windows.net \\
  OWNER_EMAIL=info.menifeemaids@outlook.com \\
  ACS_CONNECTION_STRING='$ACS_CONN' \\
  ACS_SENDER_ADDRESS=DoNotReply@<your-verified-domain> \\
  WEBSITE_TIME_ZONE='Pacific Standard Time' \\
  REMINDERS_ENABLED=true \\
  RETENTION_DAYS=90

Next:
  1. Verify your sending domain in Communication Services (SPF + DKIM).
  2. Set the \$5 budget alert.
  3. Invite yourself as 'owner' and your helper as 'helper' in Role management.
  4. SMS is optional and comes last — see DEPLOY.md.
SETTINGS
