/**
 * Timer: archive jobs before Cosmos deletes them.
 *
 * Closed jobs carry a TTL and Cosmos removes them silently at 90 days — there
 * is no recycle bin and no export. Three months is also shorter than the record
 * retention most small businesses actually need, so this writes a dated JSON
 * and CSV snapshot to Blob Storage before anything disappears.
 *
 * Runs on the 1st of each month. Costs roughly a cent a month and turns an
 * irreversible deletion into a permanent, dated archive.
 */
const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");
const cosmos = require("../shared/cosmos");
const { sendEmail } = require("../shared/acs");

const CONTAINER = process.env.ARCHIVE_CONTAINER || "job-archive";
const WARN_DAYS = Number(process.env.ARCHIVE_WINDOW_DAYS || 35);

const CSV_COLUMNS = [
  ["Job number", (j) => j.id],
  ["Status", (j) => j.status],
  ["Customer", (j) => j.name],
  ["Company", (j) => j.company || ""],
  ["Phone", (j) => j.phone || ""],
  ["Email", (j) => j.email || ""],
  ["Address", (j) => (j.address ? [j.address.street, j.address.city, j.address.zip].filter(Boolean).join(" ") : "")],
  ["Scheduled", (j) => (j.confirmedSlot ? j.confirmedSlot.date : "")],
  ["Completed", (j) => j.completedAt || ""],
  ["Amount", (j) => (j.estimateCents ? (j.estimateCents / 100).toFixed(2) : "")],
  ["Photos", (j) => String((j.photos || []).length)]
];

const csvCell = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;

function toCsv(jobs) {
  const head = CSV_COLUMNS.map((c) => csvCell(c[0])).join(",");
  const rows = jobs.map((j) => CSV_COLUMNS.map((c) => csvCell(c[1](j))).join(","));
  return "\ufeff" + [head, ...rows].join("\r\n");
}

app.timer("archiveExpiring", {
  schedule: process.env.ARCHIVE_CRON || "0 0 3 1 * *",
  handler: async (_timer, context) => {
    const jobs = await cosmos.jobsExpiringWithin(WARN_DAYS);
    if (!jobs.length) {
      context.log("Nothing approaching expiry this month.");
      return;
    }

    const url = process.env.STORAGE_ACCOUNT_URL;
    if (!url) {
      context.error("STORAGE_ACCOUNT_URL is not set; cannot archive.");
      return;
    }

    const service = new BlobServiceClient(url.replace(/\/+$/, ""), new DefaultAzureCredential());
    const container = service.getContainerClient(CONTAINER);
    await container.createIfNotExists();

    const stamp = new Date().toISOString().slice(0, 10);
    const json = JSON.stringify({ archivedAt: new Date().toISOString(), jobs }, null, 2);
    const csv = toCsv(jobs);

    await container.getBlockBlobClient(`${stamp}-jobs.json`)
      .upload(json, Buffer.byteLength(json), {
        blobHTTPHeaders: { blobContentType: "application/json" }
      });
    await container.getBlockBlobClient(`${stamp}-jobs.csv`)
      .upload(csv, Buffer.byteLength(csv), {
        blobHTTPHeaders: { blobContentType: "text/csv; charset=utf-8" }
      });

    context.log(`Archived ${jobs.length} job(s) to ${CONTAINER}/${stamp}-jobs.*`);

    await sendEmail({
      to: process.env.OWNER_EMAIL,
      subject: `Monthly archive — ${jobs.length} job records saved`,
      text:
        `${jobs.length} job record(s) are approaching the ${cosmos.RETENTION_DAYS}-day\n` +
        `retention limit and have been archived to Blob Storage:\n\n` +
        `  ${stamp}-jobs.json\n  ${stamp}-jobs.csv\n\n` +
        `They will be removed from the live database automatically. The archive is\n` +
        `permanent — keep it for your accountant.\n\n` +
        `Menifee Maids`
    });
  }
});
