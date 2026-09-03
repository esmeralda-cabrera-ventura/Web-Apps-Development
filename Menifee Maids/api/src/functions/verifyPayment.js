/**
 * GET /api/verify-payment?job=MCC-260825-ABCD&token=...
 *
 * Asks Stripe whether a job number has been paid. This endpoint exists because
 * a Stripe secret key can never live in a web page — anyone could read it and
 * issue refunds. The key stays here, in Function App settings.
 *
 * Match is on the job_number metadata field, so set that on your Stripe
 * Payment Link (or as a custom field) when you create it.
 */
const { app } = require("@azure/functions");
const { ok, bad, unauthorised, json } = require("../shared/http");
const { requireOwner } = require("../shared/auth");

let stripe = null;
function client() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

app.http("verifyPayment", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "verify-payment",
  handler: async (request, context) => {
    const guard = requireOwner(request);
    if (!guard.ok) return json(guard.status, { error: guard.message });

    const job = (request.query.get("job") || "").trim();
    if (!job) return bad("Missing job number.");

    const s = client();
    if (!s) return json(501, { error: "Stripe is not configured on this Function App." });

    try {
      const search = await s.paymentIntents.search({
        query: `status:'succeeded' AND metadata['job_number']:'${job.replace(/'/g, "")}'`,
        limit: 1
      });
      if (!search.data.length) return ok({ paid: false, job });

      const pi = search.data[0];
      return ok({
        paid: true,
        job,
        amountPaid: pi.amount_received,
        paidAt: new Date(pi.created * 1000).toISOString(),
        stripeRef: pi.id
      });
    } catch (err) {
      context.error("Stripe lookup failed:", err.message);
      return json(502, { error: "Could not reach Stripe." });
    }
  }
});
