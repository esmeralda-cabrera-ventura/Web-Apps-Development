/**
 * /api/payments — payment links, stored in Cosmos partitioned by job.
 *
 *   GET  /api/payments               every link, in the dashboard's record shape
 *   GET  /api/payments?job=MCC-...   the links for one job
 *   POST /api/payments               create a link for a job
 *   PUT  /api/payments/{token}       save the dashboard's copy of a link
 *                                    ({ jobId, record }), or just change its
 *                                    status ({ jobId, status })
 *
 * The link itself is generated exactly as the browser does it, so an owner who
 * is offline and one who is online produce the same URL shape.
 */
const { app } = require("@azure/functions");
const { ok, bad, unauthorised, oops, json, readJson } = require("../shared/http");
const { requireStaff } = require("../shared/auth");
const cosmos = require("../shared/cosmos");
const crypto = require("crypto");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function token() {
  const bytes = crypto.randomBytes(22);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** Cosmos payment document -> the dashboard's payment record. */
function toRecord(doc) {
  if (doc.record) return { ...doc.record, token: doc.id, requestId: doc.jobId };
  return {
    token: doc.id, requestId: doc.jobId, jobNumber: doc.jobId,
    amount: doc.amountCents, description: doc.description,
    createdAt: doc.createdAt, expiresAt: doc.expiresAt,
    status: doc.status, url: doc.url, paidAt: doc.paidAt || null,
    stripeRef: doc.stripeRef || null, verifiedAt: doc.verifiedAt || null
  };
}

const b64url = (s) =>
  Buffer.from(s, "utf8").toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

app.http("payments", {
  methods: ["GET", "POST", "PUT"],
  authLevel: "anonymous",
  route: "payments/{token?}",
  handler: async (request, context) => {
    const guard = requireStaff(request);
    if (!guard.ok) return json(guard.status, { error: guard.message });

    try {
      if (request.method === "GET") {
        const jobId = request.query.get("job");
        if (!jobId) {
          const all = await cosmos.allPayments();
          return ok({ payments: all.map(toRecord), at: new Date().toISOString() });
        }
        return ok({ payments: await cosmos.paymentsForJob(jobId) });
      }

      if (request.method === "POST") {
        const body = await readJson(request);
        if (!body || !body.jobId) return bad("A jobId is required.");
        const amount = Number(body.amount);
        if (!amount || amount <= 0) return bad("An amount greater than zero is required.");

        const job = await cosmos.readJob(body.jobId);
        if (!job) return json(404, { error: "No such job." });

        // One live link per job: retire any that are still outstanding.
        for (const p of await cosmos.paymentsForJob(body.jobId)) {
          if (p.status === "sent") {
            await cosmos.upsertPayment({ ...p, status: "replaced" });
          }
        }

        const settings = (await cosmos.readSettings()) || {};
        const days = Number(body.days || settings.payExpiryDays || 21);
        const expires = new Date(Date.now() + days * 86400000);
        const id = token();
        const cents = Math.round(amount * 100);

        const payload = {
          t: id, r: job.id, n: job.name, a: cents,
          d: body.description || "Cleaning service",
          e: expires.toISOString().slice(0, 10),
          b: settings.businessName || "Menifee Maids"
        };
        // Carry the booking language so a Spanish customer gets a Spanish invoice.
        const lang = job.lang === "es" ? "&lang=es" : "";
        const url =
          `${process.env.SITE_URL || ""}/pay.html?job=${encodeURIComponent(job.id)}${lang}` +
          `#d=${b64url(JSON.stringify(payload))}`;

        const saved = await cosmos.upsertPayment({
          id, jobId: job.id, amountCents: cents,
          description: payload.d, status: "sent", url,
          createdAt: new Date().toISOString(),
          expiresAt: expires.toISOString(),
          stripeRef: null, verifiedAt: null
        });
        context.log(`Payment link ${id} created for ${job.id}.`);
        return ok({ payment: saved });
      }

      // PUT — update the status of one link
      const id = request.params.token;
      if (!id) return bad("A payment token is required.");
      const body = await readJson(request);
      const jobId = body && body.jobId;
      if (!jobId) return bad("The jobId is required (it is the partition key).");

      // A full record from a dashboard device: store it as-is, creating the link
      // if this is the first time the cloud has seen it.
      if (body.record && typeof body.record === "object") {
        const r = body.record;
        const prior = await cosmos.readOne("payments", id, jobId);
        const doc = {
          ...(prior || {}),
          id, jobId,
          amountCents: Number(r.amount) || (prior && prior.amountCents) || 0,
          description: r.description || null,
          status: r.status || "sent",
          url: r.url || null,
          createdAt: r.createdAt || (prior && prior.createdAt) || new Date().toISOString(),
          expiresAt: r.expiresAt || null,
          paidAt: r.paidAt || null,
          amountPaidCents: r.amountPaid ? Math.round(Number(r.amountPaid)) : null,
          stripeRef: r.stripeRef || null,
          verifiedAt: r.verifiedAt || null,
          record: { ...r, token: id, requestId: jobId },
          updatedAt: new Date().toISOString()
        };
        await cosmos.upsertPayment(doc);
        return ok({ saved: true, token: id, updatedAt: doc.updatedAt });
      }

      const existing = await cosmos.readOne("payments", id, jobId);
      if (!existing) return json(404, { error: "No such payment link." });

      const next = { ...existing, status: body.status || existing.status };
      if (body.status === "paid") {
        next.paidAt = body.paidAt || new Date().toISOString();
        if (body.amountPaid) next.amountPaidCents = body.amountPaid;
        if (body.stripeRef) next.stripeRef = body.stripeRef;
        next.verifiedAt = new Date().toISOString();
      }
      return ok({ payment: await cosmos.upsertPayment(next) });
    } catch (err) {
      context.error("payments route failed:", err.message);
      return oops("The database rejected that payment update.");
    }
  }
});
