/**
 * Cosmos DB access.
 *
 * Replaces the old Postgres module. There is no wake handling here and no
 * "is it awake yet" state to report, because the free tier is always on —
 * which is most of the reason this rewrite happened.
 *
 * Two ways in. COSMOS_KEY wins when it is set; otherwise this falls back to a
 * managed identity.
 *
 * That order is deliberate. Static Web Apps' managed API has no managed
 * identity — Microsoft wires one up only for Key Vault lookups, not for the
 * function runtime — so DefaultAzureCredential finds nothing there and every
 * query fails. The deployed /api therefore sets COSMOS_KEY. The separate
 * Function App has a real identity and leaves COSMOS_KEY unset.
 *
 * When the identity path is in use, remember that Cosmos data-plane access is a
 * separate permission system from control-plane RBAC: an identity with
 * "Contributor" can read your account keys but cannot read a single document
 * until it also holds the Cosmos DB Built-in Data Contributor data role.
 */
const { CosmosClient } = require("@azure/cosmos");
const { DefaultAzureCredential } = require("@azure/identity");

const DB_NAME = process.env.COSMOS_DATABASE || "menifee";

const CONTAINERS = {
  jobs:         { id: "jobs",         pk: (doc) => doc.id },
  payments:     { id: "payments",     pk: (doc) => doc.jobId },
  availability: { id: "availability", pk: (doc) => doc.monthKey },
  settings:     { id: "settings",     pk: (doc) => doc.id },
  customers:    { id: "customers",    pk: (doc) => doc.contactKey }
};

let client = null;

function getClient() {
  if (client) return client;
  const endpoint = process.env.COSMOS_ENDPOINT;
  if (!endpoint) throw new Error("COSMOS_ENDPOINT is not set on this app.");

  client = process.env.COSMOS_KEY
    ? new CosmosClient({ endpoint, key: process.env.COSMOS_KEY })
    : new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
  return client;
}

const container = (name) => getClient().database(DB_NAME).container(CONTAINERS[name].id);

/** Cosmos throws on a missing document; treat that as null rather than an error. */
async function readOne(name, id, partitionKey) {
  try {
    const { resource } = await container(name).item(id, partitionKey).read();
    return resource || null;
  } catch (err) {
    if (err.code === 404) return null;
    throw err;
  }
}

async function queryAll(name, query, parameters = []) {
  const { resources } = await container(name).items
    .query({ query, parameters })
    .fetchAll();
  return resources;
}

async function upsert(name, doc) {
  const { resource } = await container(name).items.upsert(doc);
  return resource;
}

async function remove(name, id, partitionKey) {
  try {
    await container(name).item(id, partitionKey).delete();
    return true;
  } catch (err) {
    if (err.code === 404) return false;
    throw err;
  }
}

/* ---------------------------------------------------------------- jobs ---- */

const RETENTION_DAYS = Number(process.env.RETENTION_DAYS || 90);

/**
 * Closing a job starts its expiry clock. Cosmos deletes it for free once the
 * TTL elapses — no purge job to run or fail. The clock runs from the last
 * write, so editing an old job restarts it, which is the behaviour we want.
 */
function applyTtl(job) {
  const closed = job.status === "done" || job.status === "cancelled";
  job.ttl = closed ? RETENTION_DAYS * 24 * 60 * 60 : -1;
  return job;
}

const listJobs = () =>
  queryAll("jobs", "SELECT * FROM c WHERE c.type = 'job' ORDER BY c.createdAt DESC");

const readJob = (id) => readOne("jobs", id, id);

async function upsertJob(job) {
  job.type = "job";
  job.updatedAt = new Date().toISOString();
  if (!job.createdAt) job.createdAt = job.updatedAt;
  return upsert("jobs", applyTtl(job));
}

const deleteJob = (id) => remove("jobs", id, id);

/** Jobs scheduled for a given day — used by the reminder timer. */
const jobsOnDate = (isoDate) =>
  queryAll(
    "jobs",
    `SELECT * FROM c
      WHERE c.type = 'job' AND c.status = 'confirmed'
        AND c.confirmedSlot.date = @d`,
    [{ name: "@d", value: isoDate }]
  );

/** Closed jobs nearing their TTL — used by the archive timer. */
const jobsExpiringWithin = (days) => {
  const cutoff = new Date(Date.now() - (RETENTION_DAYS - days) * 86400000).toISOString();
  return queryAll(
    "jobs",
    `SELECT * FROM c
      WHERE c.type = 'job' AND c.ttl > 0 AND c.updatedAt <= @cutoff`,
    [{ name: "@cutoff", value: cutoff }]
  );
};

/* ------------------------------------------------------------ payments ---- */

const paymentsForJob = (jobId) =>
  queryAll(
    "payments",
    "SELECT * FROM c WHERE c.jobId = @j ORDER BY c.createdAt DESC",
    [{ name: "@j", value: jobId }]
  );

const allPayments = () => queryAll("payments", "SELECT * FROM c");

async function upsertPayment(payment) {
  if (!payment.jobId) throw new Error("A payment needs a jobId (its partition key).");
  return upsert("payments", payment);
}

/* -------------------------------------------------------- availability ---- */

const monthKeyOf = (isoDate) => String(isoDate).slice(0, 7);

/** One document per month holding a day-to-windows map. Small and cheap. */
async function readAvailability(monthKeys) {
  const docs = await Promise.all(
    monthKeys.map((m) => readOne("availability", m, m))
  );
  const merged = {};
  for (const doc of docs) {
    if (doc && doc.days) Object.assign(merged, doc.days);
  }
  return merged;
}

async function writeAvailability(map) {
  const byMonth = {};
  for (const [day, windows] of Object.entries(map || {})) {
    if (!Array.isArray(windows) || !windows.length) continue;
    const m = monthKeyOf(day);
    (byMonth[m] = byMonth[m] || {})[day] = windows;
  }
  const written = [];
  for (const [monthKey, days] of Object.entries(byMonth)) {
    written.push(await upsert("availability", {
      id: monthKey, monthKey, days, updatedAt: new Date().toISOString()
    }));
  }
  return written.length;
}

/* ------------------------------------------------------------ settings ---- */

const readSettings = () => readOne("settings", "app", "app");
const writeSettings = (patch) =>
  upsert("settings", { id: "app", ...patch, updatedAt: new Date().toISOString() });

/* ----------------------------------------------------------- customers ---- */

/**
 * A stable key for someone with no account: their phone if we have it, their
 * email otherwise. Lets a returning customer be recognised after their old jobs
 * have expired.
 */
function contactKey(job) {
  const digits = String(job.phone || "").replace(/\D/g, "");
  if (digits.length >= 10) return "p" + digits.slice(-10);
  return "e" + String(job.email || "").trim().toLowerCase();
}

const readCustomer = (key) => readOne("customers", key, key);
const upsertCustomer = (doc) => upsert("customers", doc);

/* ---------------------------------------------------------------- misc ---- */

async function ping() {
  await getClient().database(DB_NAME).read();
  return true;
}

module.exports = {
  DB_NAME, CONTAINERS, RETENTION_DAYS,
  container, readOne, queryAll, upsert, remove, ping,
  listJobs, readJob, upsertJob, deleteJob, jobsOnDate, jobsExpiringWithin,
  paymentsForJob, allPayments, upsertPayment,
  readAvailability, writeAvailability, monthKeyOf,
  readSettings, writeSettings,
  contactKey, readCustomer, upsertCustomer
};
