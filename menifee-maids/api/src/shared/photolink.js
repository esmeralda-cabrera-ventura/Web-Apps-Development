/**
 * Private links to a job's completion photos, for sending to the customer.
 *
 * A link carries the job number and a short key derived from it with a server
 * secret, so it can't be guessed or changed to show another job's photos. No
 * database lookup is needed to check it.
 *
 * The secret is PHOTO_LINK_SECRET if set, otherwise the Cosmos key the API
 * already has. Rotating whichever one is in use retires every link sent so far.
 */
const crypto = require("crypto");

const JOB_RE = /^MCC-\d{6}-[A-Z0-9]{4}$/;

function secret() {
  return process.env.PHOTO_LINK_SECRET || process.env.COSMOS_KEY || process.env.API_KEY || "";
}

function keyFor(jobId) {
  const s = secret();
  if (!s || !JOB_RE.test(String(jobId))) return null;
  return crypto.createHmac("sha256", s).update("photos:" + jobId).digest("base64url").slice(0, 24);
}

function isValid(jobId, key) {
  const expected = keyFor(jobId);
  if (!expected || typeof key !== "string" || key.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(key));
}

function linkFor(jobId, lang, site) {
  const k = keyFor(jobId);
  if (!k) return null;
  const base = (site || process.env.SITE_URL || "").replace(/\/+$/, "");
  return `${base}/photos.html?job=${encodeURIComponent(jobId)}&k=${k}${lang === "es" ? "&lang=es" : ""}`;
}

module.exports = { keyFor, isValid, linkFor, JOB_RE };
