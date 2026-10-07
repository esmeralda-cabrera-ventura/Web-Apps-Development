/**
 * GET /api/job-photos?job=MCC-...&k=...
 *
 * The completion photos for one job, as short-lived viewing links. Public, so
 * a customer can open the link from a text or email without signing in; the
 * key in the link is what grants access (see shared/photolink.js).
 */
const { app } = require("@azure/functions");
const { ok, bad, json } = require("../shared/http");
const photos = require("../shared/photos");
const { isValid, JOB_RE } = require("../shared/photolink");

app.http("jobPhotos", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "job-photos",
  handler: async (request, context) => {
    const job = request.query.get("job") || "";
    const key = request.query.get("k") || "";
    if (!JOB_RE.test(job)) return bad("That link isn't valid.");
    if (!isValid(job, key)) return json(404, { error: "not_found" });

    try {
      const names = await photos.listPhotos(job);
      const list = [];
      for (const name of names) {
        list.push({ url: await photos.readUrl(name) });
      }
      return ok({ job, photos: list });
    } catch (err) {
      context.error("job-photos failed:", err.message);
      return json(502, { error: "storage_unreachable" });
    }
  }
});
