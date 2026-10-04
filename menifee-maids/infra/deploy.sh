#!/usr/bin/env bash
# Menifee Maids — Azure setup on the Cosmos DB free tier.
#
# Names below match what was actually provisioned in the portal. Resource names
# are internal and never shown to customers; the site content, email and domain
# all say Menifee Maids.
#
# Idempotent: re-run it safely. Target cost is $0/month for everything but SMS.
#
# This script is the reference implementation of DEPLOY.md. If you are clicking
# through the portal instead, use it to check what each step should produce.
set -euo pipefail

# ---------------------------------------------------------------------------
# Actual deployed names. Override any of them with an environment variable.
# ---------------------------------------------------------------------------
SUBSCRIPTION="${SUBSCRIPTION:-MenifeeCleaningCo}"
LOCATION="${LOCATION:-westus2}"            # Static Web Apps is NOT offered in westus3
RG="${RG:-MenifeeCleaningCoMG}"
COSMOS="${COSMOS:-menifee-cleaningco-cosmosdb-nosql}"
COSMOS_DB="${COSMOS_DB:-menifee}"

# Storage account names: 3-24 chars, lowercase letters and digits only, and
# globally unique. If this one is taken, append digits and re-run.
STORAGE="${STORAGE:-menifeecleaningcosa}"

FUNC_APP="${FUNC_APP:-menifee-cleaningco-jobs}"
SWA="${SWA:-menifee-cleaningco-swa}"
ACS="${ACS:-menifee-cleaningco-acs}"

OWNER_EMAIL="${OWNER_EMAIL:-inquiry.menifeemaids@outlook.com}"
SITE_URL="${SITE_URL:-https://www.menifeemaids.com}"

echo "==> Selecting subscription: $SUBSCRIPTION"
az account set --subscription "$SUBSCRIPTION"
az account show --query "{subscription:name, id:id, tenant:tenantId}" -o yaml

echo "==> Resource group"
az group create -n "$RG" -l "$LOCATION" -o none
echo "    = $RG ($LOCATION)"

# ---------------------------------------------------------------------------
# Cosmos DB. Already created in the portal with the free tier applied. The free
# tier can ONLY be enabled at creation and there is one per subscription, so
# this block verifies rather than blindly creates.
# ---------------------------------------------------------------------------
echo "==> Cosmos DB account"
if az cosmosdb show -g "$RG" -n "$COSMOS" -o none 2>/dev/null; then
  FREE=$(az cosmosdb show -g "$RG" -n "$COSMOS" --query enableFreeTier -o tsv)
  if [ "$FREE" = "true" ]; then
    echo "    = $COSMOS exists, free tier APPLIED"
  else
    echo "    !! $COSMOS exists but free tier is NOT applied."
    echo "    !! It will bill at roughly \$24/month and cannot be fixed in place."
    echo "    !! Delete the account and recreate it with --enable-free-tier true."
    exit 1
  fi
else
  echo "    + creating with free tier"
  az cosmosdb create -g "$RG" -n "$COSMOS" \
    --locations regionName="$LOCATION" failoverPriority=0 isZoneRedundant=false \
    --enable-free-tier true \
    --default-consistency-level Session -o none
fi

echo "==> Database with 1000 RU/s shared throughput (manual, not autoscale)"
az cosmosdb sql database create -g "$RG" -a "$COSMOS" -n "$COSMOS_DB" \
  --throughput 1000 -o none 2>/dev/null \
  && echo "    + $COSMOS_DB" || echo "    = $COSMOS_DB already exists"

echo "==> Containers (all share the database's 1000 RU/s)"
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

# -1 means "TTL enabled, but only for documents that set their own ttl field".
# A positive number would expire EVERY document, including active jobs.
echo "==> Per-item TTL on jobs"
az cosmosdb sql container update -g "$RG" -a "$COSMOS" -d "$COSMOS_DB" \
  -n jobs --ttl -1 -o none 2>/dev/null \
  && echo "    + ttl = -1 (on, no default)" || echo "    = already set"

# Periodic backup: 2 copies are free. A 1440-minute interval with 48h retention
# gives a two-day window at no cost. Locally-redundant, because geo-redundant
# backup storage bills at a higher rate past the free copies.
echo "==> Backup policy (2 free copies, 48h window, locally-redundant)"
az cosmosdb update -g "$RG" -n "$COSMOS" \
  --backup-interval 1440 --backup-retention 48 --backup-redundancy Local -o none 2>/dev/null \
  && echo "    + periodic, 1440 min / 48 h / Local" \
  || echo "    (unchanged — set it under $COSMOS > Backup & Restore)"

echo "==> Storage account"
az storage account create -n "$STORAGE" -g "$RG" -l "$LOCATION" \
  --sku Standard_LRS --min-tls-version TLS1_2 --allow-blob-public-access false -o none 2>/dev/null \
  && echo "    + $STORAGE" || echo "    = $STORAGE already exists (or the name is taken globally)"

echo "==> Blob containers and queues"
STORAGE_CONN=$(az storage account show-connection-string -g "$RG" -n "$STORAGE" --query connectionString -o tsv)
for c in job-photos job-archive; do
  az storage container create -n "$c" --connection-string "$STORAGE_CONN" -o none 2>/dev/null \
    && echo "    + container $c" || echo "    = container $c already exists"
done
# booking-writes carries accepted bookings to the Function App. The poison queue
# is created by the host on first failure, but making it now means the
# persistBookingPoison trigger binds cleanly on first start.
for q in booking-writes booking-writes-poison; do
  az storage queue create -n "$q" --connection-string "$STORAGE_CONN" -o none 2>/dev/null \
    && echo "    + queue $q" || echo "    = queue $q already exists"
done

echo "==> Function App (Consumption, system-assigned identity)"
az functionapp create -g "$RG" -n "$FUNC_APP" \
  --storage-account "$STORAGE" --consumption-plan-location "$LOCATION" \
  --runtime node --runtime-version 20 --functions-version 4 \
  --assign-identity '[system]' -o none 2>/dev/null \
  && echo "    + $FUNC_APP" || echo "    = $FUNC_APP already exists"

# Function Apps run on UTC. Without this the 17:00 reminder fires at 10:00
# Pacific — nothing errors, the reminders are just seven hours early.
echo "==> Function App timezone"
az functionapp config appsettings set -g "$RG" -n "$FUNC_APP" \
  --settings WEBSITE_TIME_ZONE="Pacific Standard Time" -o none
echo "    + WEBSITE_TIME_ZONE = Pacific Standard Time"

echo "==> Communication Services"
az communication create -n "$ACS" -g "$RG" --location Global --data-location UnitedStates -o none 2>/dev/null \
  && echo "    + $ACS" || echo "    = $ACS already exists"

echo "==> Static Web App (Free plan)"
az staticwebapp create -n "$SWA" -g "$RG" -l "$LOCATION" --sku Free -o none 2>/dev/null \
  && echo "    + $SWA" || echo "    = $SWA already exists"

# ---------------------------------------------------------------------------
# Access.
#
# The Function App has a managed identity and uses it. The Static Web App does
# NOT: Static Web Apps' managed API has no managed identity available to the
# function runtime — Microsoft wires one up only for Key Vault lookups — so its
# /api is configured with keys and connection strings instead. Do not try to
# assign the SWA an identity; on Free the command fails, and even on Standard
# the managed functions could not use it.
#
# For the Function App, Cosmos data-plane permission is a SEPARATE system from
# normal RBAC: "Contributor" lets an identity read account keys but not read a
# single document.
# ---------------------------------------------------------------------------
echo "==> Managed identity access (Function App only)"
FUNC_ID=$(az functionapp identity show -g "$RG" -n "$FUNC_APP" --query principalId -o tsv 2>/dev/null || echo "")
STORAGE_ID=$(az storage account show -g "$RG" -n "$STORAGE" --query id -o tsv)
DATA_CONTRIBUTOR=00000000-0000-0000-0000-000000000002   # Cosmos DB Built-in Data Contributor

if [ -z "$FUNC_ID" ]; then
  echo "    ! $FUNC_APP has no managed identity — enable it and re-run"
else
  az cosmosdb sql role assignment create -g "$RG" -a "$COSMOS" \
    --role-definition-id "$DATA_CONTRIBUTOR" --principal-id "$FUNC_ID" --scope "/" -o none 2>/dev/null \
    && echo "    + cosmos DATA role -> $FUNC_APP" || echo "    = cosmos data role already on $FUNC_APP"
  az role assignment create --assignee "$FUNC_ID" --role "Storage Blob Data Contributor"  --scope "$STORAGE_ID" -o none 2>/dev/null || true
  az role assignment create --assignee "$FUNC_ID" --role "Storage Queue Data Contributor" --scope "$STORAGE_ID" -o none 2>/dev/null || true
  echo "    + storage data roles -> $FUNC_APP"
fi

echo "==> Budget alert"
echo "    Azure has no automatic spend cap. Set \$5 in the portal:"
echo "    Cost Management + Billing > Cost Management > Budgets > + Add"

COSMOS_KEY=$(az cosmosdb keys list -g "$RG" -n "$COSMOS" --query primaryMasterKey -o tsv)
ACS_CONN=$(az communication list-key -n "$ACS" -g "$RG" --query primaryConnectionString -o tsv 2>/dev/null || echo "<get from the portal: $ACS > Keys>")

cat <<SETTINGS

=================== Static Web App settings ===================
KEY-BASED. The managed API has no managed identity available to it.

az staticwebapp appsettings set -n $SWA -g $RG --setting-names \\
  COSMOS_ENDPOINT=https://$COSMOS.documents.azure.com:443/ \\
  COSMOS_DATABASE=$COSMOS_DB \\
  COSMOS_KEY='$COSMOS_KEY' \\
  STORAGE_ACCOUNT_URL=https://$STORAGE.blob.core.windows.net \\
  STORAGE_CONNECTION_STRING='$STORAGE_CONN' \\
  SITE_URL=$SITE_URL \\
  ACS_CONNECTION_STRING='$ACS_CONN' \\
  ACS_SENDER_ADDRESS=DoNotReply@<your-verified-domain> \\
  OWNER_EMAIL=$OWNER_EMAIL \\
  API_KEY=\$(openssl rand -hex 24) \\
  STRIPE_SECRET_KEY=sk_live_...

=================== Function App settings =====================
IDENTITY-BASED. No COSMOS_KEY, no STORAGE_CONNECTION_STRING.

az functionapp config appsettings set -g $RG -n $FUNC_APP --settings \\
  COSMOS_ENDPOINT=https://$COSMOS.documents.azure.com:443/ \\
  COSMOS_DATABASE=$COSMOS_DB \\
  STORAGE_ACCOUNT_URL=https://$STORAGE.blob.core.windows.net \\
  OWNER_EMAIL=$OWNER_EMAIL \\
  ACS_CONNECTION_STRING='$ACS_CONN' \\
  ACS_SENDER_ADDRESS=DoNotReply@<your-verified-domain> \\
  WEBSITE_TIME_ZONE='Pacific Standard Time' \\
  REMINDERS_ENABLED=true \\
  REMINDER_CRON='0 0 17 * * *' \\
  RETENTION_DAYS=90

Leave ACS_SMS_FROM and OWNER_SMS unset until A2P registration completes.
Both send paths fall back to email on their own; nothing breaks.

Next:
  1. Verify your sending domain in $ACS (SPF + DKIM at GoDaddy).
  2. Set the \$5 budget alert.
  3. Connect the GitHub repo to $SWA so api/ deploys with the site.
  4. Publish functions/ separately: func azure functionapp publish $FUNC_APP
  5. Invite yourself as 'owner' and your helper as 'helper' in Role management.
  6. SMS is optional and comes last — see DEPLOY.md.
SETTINGS
