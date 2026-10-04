/**
 * /api/checkout — card payment for one invoice.
 *
 *   POST /api/checkout { job, token }
 *        Creates a Stripe Checkout Session for exactly the amount stored on
 *        that payment link and returns its URL. The customer's browser goes
 *        straight there.
 *
 *   GET  /api/checkout?job=...&token=...
 *        The invoice as stored: first name, amount, description, expiry and
 *        whether it is already paid. Lets pay.html show the real amount even
 *        when the link it was opened from has no invoice data in it.
 *
 *   GET  /api/checkout?session_id=...&job=...&token=...
 *        Called by pay.html when Stripe sends the customer back. Confirms the
 *        payment with Stripe and marks the link paid. The webhook does the
 *        same thing independently, so a customer who closes the tab before
 *        returning is still recorded.
 *
 * Both are public: the customer is not signed in. The unguessable token in
 * their link is what identifies the invoice.
 */
const { app } = require("@azure/functions");
const { ok, bad, json, readJson } = require("../shared/http");
const cosmos = require("../shared/cosmos");
const { stripe, siteUrl, settleSession } = require("../shared/stripe");

const JOB_RE = /^MCC-\d{6}-[A-Z0-9]{4}$/;
const TOKEN_RE = /^[A-Za-z0-9]{8,64}$/;

app.http("checkout", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "checkout",
  handler: async (request, context) => {
    const s = stripe();

    try {
      const viewingInvoice = request.method === "GET" && !request.query.get("session_id");
      if (!s && !viewingInvoice) return json(503, { error: "cards_off" });

      if (request.method === "GET") {
        const sessionId = request.query.get("session_id") || "";
        const job = request.query.get("job") || "";
        const token = request.query.get("token") || "";
        if (!JOB_RE.test(job) || !TOKEN_RE.test(token)) return bad("That payment link isn't valid.");

        if (!sessionId) {
          const p = await cosmos.readOne("payments", token, job);
          if (!p) return json(404, { error: "not_found" });
          const jobDoc = await cosmos.readJob(job);
          return ok({
            job, token,
            firstName: jobDoc && jobDoc.name ? String(jobDoc.name).split(" ")[0] : "",
            amount: p.amountCents,
            description: p.description || "",
            expiresAt: p.expiresAt || null,
            status: p.status,
            lang: (jobDoc && jobDoc.lang) || "en"
          });
        }
        if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return bad("Missing checkout session.");

        const session = await s.checkout.sessions.retrieve(sessionId);
        const meta = session.metadata || {};
        if (meta.job_number !== job || meta.token !== token) {
          return json(404, { error: "not_found" });
        }
        const result = await settleSession(session);
        return ok({ paid: result.paid, job, amount: session.amount_total, status: session.status });
      }

      const body = await readJson(request);
      const job = body && String(body.job || "");
      const token = body && String(body.token || "");
      if (!JOB_RE.test(job) || !TOKEN_RE.test(token)) return bad("That payment link isn't valid.");

      const payment = await cosmos.readOne("payments", token, job);
      if (!payment) return json(404, { error: "not_found" });
      if (payment.status === "paid") return ok({ paid: true });
      if (payment.status === "replaced") return json(410, { error: "replaced" });
      if (payment.expiresAt && new Date(payment.expiresAt) < new Date()) {
        return json(410, { error: "expired" });
      }

      const amount = Math.round(Number(payment.amountCents) || 0);
      if (amount < 50) return bad("The amount on this invoice is too small to charge by card.");

      const jobDoc = await cosmos.readJob(job);
      const es = (jobDoc && jobDoc.lang) === "es";
      const site = siteUrl(request);
      const q = `job=${encodeURIComponent(job)}&token=${encodeURIComponent(token)}${es ? "&lang=es" : ""}`;

      const session = await s.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: {
              name: payment.description || (es ? "Servicio de limpieza" : "Cleaning service"),
              description: (es ? "Trabajo " : "Job ") + job
            }
          }
        }],
        customer_email: (jobDoc && jobDoc.email) || undefined,
        client_reference_id: job,
        metadata: { job_number: job, token },
        payment_intent_data: {
          description: `Menifee Maids ${job}`,
          metadata: { job_number: job, token }
        },
        locale: es ? "es" : "en",
        success_url: `${site}/pay.html?${q}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${site}/pay.html?${q}&cancelled=1`
      });

      context.log(`Checkout ${session.id} opened for ${job} (${amount} cents).`);
      return ok({ url: session.url });
    } catch (err) {
      context.error("checkout failed:", err.message);
      return json(502, { error: "stripe_unreachable" });
    }
  }
});
