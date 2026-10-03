/**
 * Durable hand-off between the customer-facing routes and the database.
 *
 * A booking is accepted the moment it is safely on the queue; the separate
 * Function App drains it into Cosmos a second later. Cosmos is always on, so
 * this is not working around a sleeping server — it keeps the customer's
 * response off the write path and retries a transient failure instead of
 * losing a job.
 */
const { QueueClient } = require("@azure/storage-queue");
const { DefaultAzureCredential } = require("@azure/identity");

const QUEUE_NAME = process.env.BOOKING_QUEUE_NAME || "booking-writes";
let client = null;
let ensured = false;

/**
 * Connection string first, managed identity second.
 *
 * Static Web Apps' managed API has no managed identity, so the deployed /api
 * sets STORAGE_CONNECTION_STRING and uses the first branch. The Function App
 * has a real identity and leaves it unset. AzureWebJobsStorage is checked last
 * and only helps locally — it is a reserved name that the Functions host owns,
 * so it is read rather than relied upon.
 */
function getClient() {
  if (client) return client;
  const conn = process.env.STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage;
  if (conn) {
    client = new QueueClient(conn, QUEUE_NAME);
  } else if (process.env.STORAGE_ACCOUNT_URL) {
    client = new QueueClient(
      `${process.env.STORAGE_ACCOUNT_URL.replace(/\/+$/, "")}/${QUEUE_NAME}`,
      new DefaultAzureCredential()
    );
  } else {
    return null;
  }
  return client;
}

async function enqueue(payload) {
  const q = getClient();
  if (!q) return { queued: false, error: "queue not configured" };
  try {
    if (!ensured) { await q.createIfNotExists(); ensured = true; }
    // Queue messages are base64 so JSON with accents survives intact.
    const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
    const res = await q.sendMessage(body);
    return { queued: true, id: res.messageId };
  } catch (err) {
    return { queued: false, error: err.message };
  }
}

module.exports = { enqueue, QUEUE_NAME };
