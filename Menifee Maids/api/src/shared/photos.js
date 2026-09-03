/**
 * Job photos live in Blob Storage, never inside Cosmos documents.
 *
 * A Cosmos document caps at 2 MB and writing base64 images would burn
 * throughput for no benefit, so the browser uploads straight to Blob using a
 * short-lived signed URL and the job document keeps only the path.
 *
 * Signing uses a user delegation key derived from the app's managed identity,
 * so no storage account key is ever stored or handed out.
 */
const {
  BlobServiceClient, StorageSharedKeyCredential,
  generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol
} = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");

const CONTAINER = process.env.PHOTO_CONTAINER || "job-photos";
const UPLOAD_MINUTES = 10;
const READ_MINUTES = 30;

let service = null;
let sharedKey;            // undefined = not resolved, null = none configured
let delegation = { key: null, expiresOn: 0 };

function accountUrl() {
  const url = process.env.STORAGE_ACCOUNT_URL;
  if (!url) throw new Error("STORAGE_ACCOUNT_URL is not set on this app.");
  return url.replace(/\/+$/, "");
}
function accountName() {
  return accountUrl().replace(/^https?:\/\//, "").split(".")[0];
}

/**
 * Pull the account name and key out of a storage connection string.
 * Returns null when no connection string is configured.
 */
function sharedKeyCredential() {
  if (sharedKey !== undefined) return sharedKey;
  const conn = process.env.STORAGE_CONNECTION_STRING;
  if (!conn) return (sharedKey = null);

  // AccountKey is base64 and contains "=", so split on the FIRST "=" only.
  const parts = Object.fromEntries(
    conn.split(";").filter(Boolean).map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), p.slice(i + 1)];
    })
  );
  if (!parts.AccountName || !parts.AccountKey) return (sharedKey = null);
  return (sharedKey = new StorageSharedKeyCredential(parts.AccountName, parts.AccountKey));
}

/**
 * Two ways in, and which one runs is decided by where this code is hosted.
 *
 * Static Web Apps' managed API has no managed identity — Microsoft only wires
 * one up for Key Vault lookups, not for the function runtime — so
 * DefaultAzureCredential finds nothing there and every call fails. Setting
 * STORAGE_CONNECTION_STRING switches this module to shared-key signing, which
 * is what the deployed /api uses.
 *
 * The separate Function App does have a real managed identity, so it leaves
 * STORAGE_CONNECTION_STRING unset and gets the better path automatically.
 */
function client() {
  if (service) return service;
  const cred = sharedKeyCredential();
  service = cred
    ? new BlobServiceClient(accountUrl(), cred)
    : new BlobServiceClient(accountUrl(), new DefaultAzureCredential());
  return service;
}

/** Delegation keys last up to 7 days; refresh a little before expiry. */
async function delegationKey() {
  if (delegation.key && Date.now() < delegation.expiresOn - 300_000) return delegation.key;
  const start = new Date(Date.now() - 60_000);
  const end = new Date(Date.now() + 60 * 60 * 1000);
  const key = await client().getUserDelegationKey(start, end);
  delegation = { key, expiresOn: end.getTime() };
  return key;
}

/**
 * A user delegation SAS is signed by Entra and is the better artefact — it
 * cannot outlive the identity that issued it. It also requires a managed
 * identity, so where there isn't one we sign with the account key instead.
 * Both produce a URL the browser can use directly; only the signature differs.
 */
async function sasFor(blobPath, permissions, minutes) {
  const options = {
    containerName: CONTAINER,
    blobName: blobPath,
    permissions: BlobSASPermissions.parse(permissions),
    protocol: SASProtocol.Https,
    startsOn: new Date(Date.now() - 60_000),
    expiresOn: new Date(Date.now() + minutes * 60_000)
  };
  const cred = sharedKeyCredential();
  const sas = cred
    ? generateBlobSASQueryParameters(options, cred).toString()
    : generateBlobSASQueryParameters(options, await delegationKey(), accountName()).toString();
  return `${accountUrl()}/${CONTAINER}/${blobPath}?${sas}`;
}

/** A write URL the browser can PUT straight to. */
const uploadUrl = (blobPath) => sasFor(blobPath, "cw", UPLOAD_MINUTES);
/** A read URL for showing a photo back in the dashboard. */
const readUrl = (blobPath) => sasFor(blobPath, "r", READ_MINUTES);
/** Unsigned path, for storing on the job document. */
const blobUrl = (blobPath) => `${accountUrl()}/${CONTAINER}/${blobPath}`;

async function ensureContainer() {
  try { await client().getContainerClient(CONTAINER).createIfNotExists(); } catch { /* exists */ }
}

async function deletePhotos(jobId) {
  const c = client().getContainerClient(CONTAINER);
  let removed = 0;
  for await (const b of c.listBlobsFlat({ prefix: `${jobId}/` })) {
    await c.deleteBlob(b.name).catch(() => {});
    removed++;
  }
  return removed;
}

module.exports = { CONTAINER, uploadUrl, readUrl, blobUrl, ensureContainer, deletePhotos };
