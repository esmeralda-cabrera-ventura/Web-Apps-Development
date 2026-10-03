/**
 * POST /api/contact
 *
 * The inquiry form. Like bookings, it stays off the database entirely: the
 * owner gets an email they can reply to directly, and the sender gets an
 * automatic acknowledgement in their own language.
 */
const { app } = require("@azure/functions");
const { ok, bad, readJson } = require("../shared/http");
const { sendEmail } = require("../shared/acs");

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || ""));

app.http("contact", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "contact",
  handler: async (request, context) => {
    const b = await readJson(request);
    const problems = [];
    if (!b || !b.name) problems.push("name");
    if (!b || !isEmail(b.email)) problems.push("email");
    if (!b || !b.message) problems.push("message");
    if (problems.length) return bad("Please fill in your name, email and message.", problems);

    const es = b.lang === "es";
    const owner = await sendEmail({
      to: process.env.OWNER_EMAIL,
      subject: `Website inquiry from ${b.name}${b.city ? ` (${b.city})` : ""}`,
      replyTo: b.email,
      text: [
        `Name: ${b.name}`,
        `Email: ${b.email}`,
        `Phone: ${b.phone || "not given"}`,
        `City: ${b.city || "not given"}`,
        es ? "Language: Spanish" : "",
        "",
        b.message
      ].filter(Boolean).join("\n")
    });

    await sendEmail({
      to: b.email,
      subject: es ? "Recibimos tu mensaje — Menifee Maids" : "We got your message — Menifee Maids",
      text: es
        ? `Hola ${String(b.name).split(" ")[0]},\n\nGracias por escribirnos. Recibimos tu mensaje y te respondemos hoy mismo.\n\nSi es urgente, llámanos o mándanos un mensaje al 951-464-8147.\n\nGracias,\nMenifee Maids`
        : `Hi ${String(b.name).split(" ")[0]},\n\nThanks for getting in touch. We've got your message and we'll reply today.\n\nIf it's urgent, call or text us on 951-464-8147.\n\nThank you,\nMenifee Maids`
    });

    context.log(`Inquiry from ${b.email}; owner notified: ${owner.sent}`);
    return ok({
      status: "received",
      message: es ? "Recibimos tu mensaje. Te respondemos hoy mismo."
                  : "We've got your message and we'll reply today."
    });
  }
});
