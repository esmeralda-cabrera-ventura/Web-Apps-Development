/**
 * /api/jobs — the dashboard's shared job list.
 *
 *   GET    /api/jobs        every job, in the dashboard's record shape
 *   GET    /api/jobs/{id}   one job
 *   PUT    /api/jobs/{id}   create or update
 *   DELETE /api/jobs/{id}   remove the job, its payment links and its photos
 *
 * Every staff device syncs through these routes, so a request booked on a
 * customer's phone or confirmed on the owner's phone shows up everywhere.
 */
const { app } = require("@azure/functions");
const { ok, bad, oops, json, readJson } = require("../shared/http");
const { requireStaff } = require("../shared/auth");
const cosmos = require("../shared/cosmos");
const photos = require("../shared/photos");
const { toDoc, toRecord } = require("../shared/jobdoc");

app.http("jobs", {
  methods: ["GET", "PUT", "DELETE"],
  authLevel: "anonymous",
  route: "jobs/{id?}",
  handler: async (request, context) => {
    const guard = requireStaff(request);
    if (!guard.ok) {
      return json(guard.status, { error: guard.message });
    }

    const id = request.params.id;

    try {
      if (request.method === "GET" && !id) {
        const docs = await cosmos.listJobs();
        const jobs = await Promise.all(docs.map(toRecord));
        return ok({ jobs, at: new Date().toISOString() });
      }

      if (request.method === "GET") {
        const doc = await cosmos.readJob(id);
        if (!doc) return json(404, { error: "No such job." });
        return ok({ job: await toRecord(doc) });
      }

      if (request.method === "PUT") {
        if (!id) return bad("A job number is required.");
        const body = await readJson(request);
        if (!body || !body.name) return bad("A job needs at least a customer name.");

        const existing = await cosmos.readJob(id);
        const doc = toDoc(body, id);
        // Keep server-side history the dashboard does not send back: when the
        // job was created, whether its reminder went out, and whether the
        // nightly roll-up already counted it (so a later edit can't make a
        // visit count twice or a reminder go out again).
        if (existing) {
          if (existing.createdAt && !doc.createdAt) doc.createdAt = existing.createdAt;
          if (existing.remindedAt && !doc.remindedAt) {
            doc.remindedAt = existing.remindedAt;
            doc.record.remindedAt = existing.remindedAt;
          }
          if (existing.rolledUp) doc.rolledUp = true;
        }
        const saved = await cosmos.upsertJob(doc);
        context.log(`Job ${id} saved as ${saved.status} by ${guard.role || "staff"}.`);
        return ok({ saved: true, id, updatedAt: saved.updatedAt });
      }

      if (request.method === "DELETE") {
        if (!id) return bad("A job number is required.");
        const gone = await cosmos.deleteJob(id);
        // Payments are partitioned by job, so clearing them is cheap.
        for (const p of await cosmos.paymentsForJob(id)) {
          await cosmos.remove("payments", p.id, p.jobId);
        }
        await photos.deletePhotos(id).catch(() => {});
        context.log(`Job ${id} deleted by ${guard.role || "staff"}.`);
        return ok({ deleted: gone, id });
      }

      return json(405, { error: "Method not allowed." });
    } catch (err) {
      context.error("jobs route failed:", err.message);
      if (err.code === 403) {
        return oops(
          "Cosmos refused that request. Check COSMOS_KEY in the Static Web App's " +
          "environment variables."
        );
      }
      return oops("The database rejected that request.");
    }
  }
});
