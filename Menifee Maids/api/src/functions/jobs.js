/**
 * /api/jobs — the dashboard's view of the database.
 *
 *   GET    /api/jobs        every job
 *   GET    /api/jobs/{id}   one job
 *   PUT    /api/jobs/{id}   create or update
 *   DELETE /api/jobs/{id}   remove
 *
 * Rewritten for Cosmos. The wake-and-retry path the sleeping Postgres server
 * needed is gone: the free tier is always on, so a request either works or is
 * a genuine error worth showing.
 */
const { app } = require("@azure/functions");
const { ok, bad, unauthorised, oops, json, readJson } = require("../shared/http");
const { requireStaff } = require("../shared/auth");
const cosmos = require("../shared/cosmos");
const photos = require("../shared/photos");

const composeAddress = (a) =>
  a ? [a.street + (a.unit ? `, ${a.unit}` : ""), a.city, `${a.state || "CA"} ${a.zip}`]
        .filter(Boolean).join(", ")
    : "";

/** Cosmos document -> the shape js/db.js already expects. */
function toJob(doc, payments) {
  const mine = (payments || []).filter((p) => p.jobId === doc.id);
  const paid = mine.find((p) => p.status === "paid") || null;
  const live = paid || mine.find((p) => p.status !== "replaced") || null;

  return {
    id: doc.id,
    status: doc.status,
    kind: doc.kind,
    lang: doc.lang,
    name: doc.name,
    company: doc.company,
    email: doc.email,
    phone: doc.phone,
    address: doc.addressText || composeAddress(doc.address),
    city: (doc.address && doc.address.city) || doc.city,
    zip: (doc.address && doc.address.zip) || doc.zip,
    bedrooms: doc.bedrooms,
    bathrooms: doc.bathrooms,
    frequency: doc.frequency,
    addons: doc.addons || [],
    facility: doc.facility,
    sqft: doc.sqft,
    nights: doc.nights,
    scope: doc.scope,
    slot1: doc.slot1,
    slot2: doc.slot2,
    confirmedSlot: doc.confirmedSlot,
    estimate: doc.estimateCents ? doc.estimateCents / 100 : null,
    access: doc.accessNotes,
    ownerNotes: doc.ownerNotes,
    photos: (doc.photos || []).map((p) => ({
      id: p.id || p.blob,
      blob: p.blob,
      dataUrl: p.blob ? photos.blobUrl(p.blob) : p.dataUrl,
      addedAt: p.addedAt
    })),
    completedAt: doc.completedAt,
    reopenedAt: doc.reopenedAt,
    enRouteAt: doc.enRouteAt,
    remindedAt: doc.remindedAt,
    createdAt: doc.createdAt,
    payment: live && {
      token: live.id,
      amount: live.amountCents,
      status: live.status,
      stripeRef: live.stripeRef,
      expiresAt: live.expiresAt
    }
  };
}

/** The dashboard's shape -> a Cosmos document. */
function toDoc(body, id) {
  const structured = body.address && typeof body.address === "object";
  return {
    id,
    type: "job",
    status: body.status || "new",
    kind: body.kind || "residential",
    lang: body.lang || "en",
    name: body.name,
    company: body.company || null,
    email: body.email || null,
    phone: body.phone || null,
    address: structured ? body.address : {
      street: body.street || null,
      unit: body.unit || null,
      city: body.addressCity || body.city || null,
      state: body.addressState || "CA",
      zip: body.addressZip || body.zip || null
    },
    addressText: typeof body.address === "string" ? body.address : null,
    bedrooms: body.bedrooms || null,
    bathrooms: body.bathrooms || null,
    frequency: body.frequency || null,
    addons: body.addons || [],
    facility: body.facility || null,
    sqft: body.sqft || null,
    nights: body.nights || null,
    scope: body.scope || null,
    slot1: body.slot1 || null,
    slot2: body.slot2 || null,
    confirmedSlot: body.confirmedSlot || null,
    estimateCents: body.estimate ? Math.round(body.estimate * 100) : null,
    accessNotes: body.access || null,
    ownerNotes: body.ownerNotes || null,
    // Only blob-backed photos are persisted; the document never holds bytes.
    photos: (body.photos || [])
      .map((p) => ({ id: p.id, blob: p.blob || null, addedAt: p.addedAt }))
      .filter((p) => p.blob),
    photoConsent: body.photoConsent !== false,
    smsConsent: body.smsConsent === true,
    smsConsentAt: body.smsConsentAt || null,
    enRouteAt: body.enRouteAt || null,
    remindedAt: body.remindedAt || null,
    completedAt: body.completedAt || null,
    reopenedAt: body.reopenedAt || null
  };
}

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
        // Two queries beat N lookups: fetch every payment once and join in
        // memory. At a few hundred documents this stays under about 50 RU.
        const [docs, payments] = await Promise.all([
          cosmos.listJobs(),
          cosmos.allPayments()
        ]);
        return ok({ jobs: docs.map((d) => toJob(d, payments)) });
      }

      if (request.method === "GET") {
        const doc = await cosmos.readJob(id);
        if (!doc) return json(404, { error: "No such job." });
        return ok({ job: toJob(doc, await cosmos.paymentsForJob(id)) });
      }

      if (request.method === "PUT") {
        if (!id) return bad("A job number is required.");
        const body = await readJson(request);
        if (!body || !body.name) return bad("A job needs at least a customer name.");

        const existing = await cosmos.readJob(id);
        const saved = await cosmos.upsertJob({ ...(existing || {}), ...toDoc(body, id) });
        context.log(`Job ${id} saved as ${saved.status}, ttl ${saved.ttl}.`);
        return ok({ saved: true, id, ttl: saved.ttl });
      }

      if (request.method === "DELETE") {
        if (!id) return bad("A job number is required.");
        const gone = await cosmos.deleteJob(id);
        // Payments are partitioned by job, so clearing them is cheap.
        for (const p of await cosmos.paymentsForJob(id)) {
          await cosmos.remove("payments", p.id, p.jobId);
        }
        await photos.deletePhotos(id).catch(() => {});
        return ok({ deleted: gone, id });
      }

      return json(405, { error: "Method not allowed." });
    } catch (err) {
      context.error("jobs route failed:", err.message);
      if (err.code === 403) {
        return oops(
          "Cosmos refused that request. The identity needs the Cosmos DB Built-in Data " +
          "Contributor role on the data plane — control-plane Contributor is not enough."
        );
      }
      return oops("The database rejected that request.");
    }
  }
});
