/** Small helpers so every route answers in the same shape. */
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

const json = (status, body, extra = {}) => ({
  status, headers: { ...JSON_HEADERS, ...extra }, jsonBody: body
});

const ok = (body) => json(200, body);
const bad = (message, details) => json(400, { error: message, details });
const unauthorised = (message = "Not authorised.") => json(401, { error: message });
const oops = (message) => json(500, { error: message });

/**
 * The database is starting. 503 with Retry-After is the correct signal — the
 * dashboard reads it and retries instead of showing an error.
 */
const waking = (seconds = 20) =>
  json(503, {
    error: "database_starting",
    message: "The database is waking up. This takes a minute or two after a quiet period.",
    retryAfter: seconds
  }, { "Retry-After": String(seconds) });

async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}

module.exports = { ok, bad, unauthorised, oops, waking, json, readJson };
