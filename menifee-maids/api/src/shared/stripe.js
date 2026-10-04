/**
 * Stripe, server side only.
 *
 * The secret key lives in the Static Web App's environment variables and is
 * never sent to a browser. Each invoice gets its own Checkout Session priced
 * from the payment link stored in Cosmos, so the amount a customer is charged
 * always comes from the database, never from the link they were sent.
 */
const cosmos = require("./cosmos");

let client = null;
function stripe() {
  if (!client && process.env.STRIPE_SECRET_KEY) {
    client = require("stripe")(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}

const cardPaymentsOn = () => !!process.env.STRIPE_SECRET_KEY;

/** Base address for links back to the site, without a trailing slash. */
function siteUrl(request) {
  const fromEnv = (process.env.SITE_URL || "").replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  const origin = request && request.headers.get("origin");
  return (origin || "").replace(/\/+$/, "");
}

/**
 * Record a Stripe payment against a payment link. Updates both the structured
 * fields and the dashboard's own copy, so every staff device shows it as paid
 * on its next sync. Safe to call twice for the same payment.
 */
async function markPaid(payment, { amountCents, stripeRef, paidAt }) {
  if (payment.status === "paid" && payment.stripeRef === stripeRef) return payment;
  const at = paidAt || new Date().toISOString();
  const now = new Date().toISOString();
  const record = {
    ...(payment.record || {}),
    token: payment.id,
    requestId: payment.jobId,
    jobNumber: payment.jobId,
    status: "paid",
    paidAt: at,
    amountPaid: amountCents,
    stripeRef: stripeRef || null,
    verifiedAt: now,
    paidVia: "stripe"
  };
  return cosmos.upsertPayment({
    ...payment,
    status: "paid",
    paidAt: at,
    amountPaidCents: amountCents,
    stripeRef: stripeRef || null,
    verifiedAt: now,
    record,
    updatedAt: now
  });
}

/** Mark the link behind a completed Checkout Session as paid. */
async function settleSession(session) {
  if (!session || session.payment_status !== "paid") return { paid: false };
  const meta = session.metadata || {};
  const job = meta.job_number, token = meta.token;
  if (!job || !token) return { paid: false, reason: "no metadata" };
  const payment = await cosmos.readOne("payments", token, job);
  if (!payment) return { paid: false, reason: "unknown link" };
  const ref = typeof session.payment_intent === "string"
    ? session.payment_intent
    : (session.payment_intent && session.payment_intent.id) || session.id;
  await markPaid(payment, {
    amountCents: session.amount_total,
    stripeRef: ref,
    paidAt: new Date((session.created || Date.now() / 1000) * 1000).toISOString()
  });
  return { paid: true, job, amount: session.amount_total };
}

module.exports = { stripe, cardPaymentsOn, siteUrl, markPaid, settleSession };
