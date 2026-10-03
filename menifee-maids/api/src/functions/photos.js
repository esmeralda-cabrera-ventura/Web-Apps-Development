/**
 * POST /api/photos  — hand the browser short-lived upload URLs.
 *
 * The dashboard shrinks each photo on the device, asks for one signed URL per
 * file, and PUTs straight to Blob Storage. Image bytes never pass through the
 * API, which keeps the function fast and well clear of request size limits.
 */
const { app } = require("@azure/functions");
const { ok, bad, unauthorised, oops, readJson, json } = require("../shared/http");
const { requireStaff } = require("../shared/auth");
const photos = require("../shared/photos");

const MAX_PER_JOB = 7;

app.http("photos", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "photos",
  handler: async (request, context) => {
    const guard = requireStaff(request);
    if (!guard.ok) return json(guard.status, { error: guard.message });

    const body = await readJson(request);
    if (!body || !body.jobId) return bad("A jobId is required.");
    const count = Math.min(Number(body.count || 1), MAX_PER_JOB);
    if (count < 1) return bad("Ask for at least one upload URL.");

    try {
      await photos.ensureContainer();
      const stamp = Date.now();
      const slots = [];
      for (let i = 0; i < count; i++) {
        const blob = `${body.jobId}/${stamp}-${i + 1}.jpg`;
        slots.push({
          blob,
          uploadUrl: await photos.uploadUrl(blob),
          readUrl: photos.blobUrl(blob)
        });
      }
      context.log(`Issued ${slots.length} upload URL(s) for ${body.jobId}.`);
      return ok({ slots, expiresInMinutes: 10 });
    } catch (err) {
      context.error("photo SAS failed:", err.message);
      return oops("Could not prepare the photo upload.");
    }
  }
});
