/**
 * POST /api/stripe-webhook — Stripe tells us a payment went through.
 *
 * This is the reliable path: it fires even if the customer closes the tab
 * before Stripe sends them back to the site. The signature is checked against
 * STRIPE_WEBHOOK_SECRET, so nobody else can mark an invoice paid.
 */
const { app } = require("@azure/functions");
const { ok, json } = require("../shared/http");
const { stripe, settleSession } = require("../shared/stripe");

const HANDLED = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

app.http("stripeWebhook", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "stripe-webhook",
  handler: async (request, context) => {
    const s = stripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!s || !secret) return json(501, { error: "Stripe webhook is not configured." });

    const raw = await request.text();
    let event;
    try {
      event = s.webhooks.constructEvent(raw, request.headers.get("stripe-signature"), secret);
    } catch (err) {
      context.warn("Rejected a webhook with a bad signature.");
      return json(400, { error: "bad signature" });
    }

    if (HANDLED.has(event.type)) {
      try {
        const result = await settleSession(event.data.object);
        context.log(`Webhook ${event.type}: ${JSON.stringify(result)}`);
      } catch (err) {
        // A non-2xx makes Stripe retry, which is what we want if Cosmos blipped.
        context.error("Webhook could not record the payment:", err.message);
        return json(500, { error: "retry" });
      }
    }
    return ok({ received: true });
  }
});
