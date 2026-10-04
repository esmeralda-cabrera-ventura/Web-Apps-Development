/**
 * POST /api/bookings
 *
 * The customer path, and the one that must never fail. It validates the
 * request, saves it straight to Cosmos so it appears on every staff device,
 * then emails the owner and confirms to the customer through ACS.
 *
 * If the database write fails, the booking goes onto the durable queue
 * instead and the Function App writes it later. Only if both fail is the
 * customer asked to call.
 */
const { app } = require("@azure/functions");
const { ok, bad, oops, readJson } = require("../shared/http");
const { enqueue } = require("../shared/queue");
const cosmos = require("../shared/cosmos");
const { toDoc } = require("../shared/jobdoc");
const { sendEmail, sendSms, normalise } = require("../shared/acs");

const BIZ = "Menifee Maids";
const BIZ_PHONE = "951-464-8147";

const CITY_BY_ZIP = require("../shared/zips.json");

function reference() {
  const d = new Date();
  const stamp =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MCC-${stamp}-${rand}`;
}

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || ""));
const isPhone = (v) => String(v || "").replace(/\D/g, "").length >= 10;

function validate(b) {
  const problems = [];
  if (!b) return ["No booking data was sent."];
  if (!b.name || String(b.name).trim().length < 2) problems.push("name");
  if (!isPhone(b.phone)) problems.push("phone");
  if (!isEmail(b.email)) problems.push("email");
  if (!b.street) problems.push("street");
  if (!b.addressZip || !CITY_BY_ZIP[b.addressZip]) problems.push("zip");
  if (!b.slot1 || !b.slot1.date || !b.slot1.window) problems.push("slot1");
  if (!b.slot2 || !b.slot2.date || !b.slot2.window) problems.push("slot2");
  if (b.kind === "commercial" && !b.company) problems.push("company");
  return problems;
}

const WINDOWS = {
  morning: "Morning (8:00 – 11:00 AM)",
  midday: "Midday (11:00 AM – 2:00 PM)",
  afternoon: "Afternoon (2:00 – 5:00 PM)",
  evening: "Evening (5:00 – 8:00 PM)"
};
const WINDOWS_ES = {
  morning: "Mañana (8:00 – 11:00 AM)",
  midday: "Mediodía (11:00 AM – 2:00 PM)",
  afternoon: "Tarde (2:00 – 5:00 PM)",
  evening: "Noche (5:00 – 8:00 PM)"
};

const slotText = (slot, es) =>
  `${new Date(slot.date + "T12:00:00").toLocaleDateString(es ? "es-ES" : "en-US", {
    weekday: "long", month: "long", day: "numeric"
  })} · ${(es ? WINDOWS_ES : WINDOWS)[slot.window] || slot.window}`;

const addressLine = (b) =>
  [b.street + (b.unit ? `, ${b.unit}` : ""), b.addressCity, `CA ${b.addressZip}`]
    .filter(Boolean).join(", ");

function ownerEmail(b, ref) {
  const lines = [
    `NEW ${b.kind === "commercial" ? "COMMERCIAL QUOTE" : "CLEANING"} REQUEST`,
    `Reference: ${ref}`,
    "",
    `Name: ${b.name}`,
    b.company ? `Company: ${b.company}` : "",
    `Phone: ${b.phone}`,
    `Email: ${b.email}`,
    `Address: ${addressLine(b)}`,
    b.lang === "es" ? "Booked in: Spanish" : "",
    "",
    `First choice: ${slotText(b.slot1)}`,
    `Backup: ${slotText(b.slot2)}`,
    ""
  ];
  if (b.kind === "commercial") {
    lines.push(`Facility: ${b.facility || "not given"}`);
    lines.push(`Square footage: ${b.sqft || "not given"}`);
    lines.push(`Cleanings per week: ${b.nights || "not given"}`);
    lines.push(`Scope: ${b.scope || "not given"}`);
  } else {
    lines.push(`Property: ${b.bedrooms} bed / ${b.bathrooms} bath`);
    lines.push(`Frequency: ${b.frequency}`);
    lines.push(`Add-ons: ${(b.addons || []).join(", ") || "none"}`);
    lines.push(`Estimate: $${b.estimate}`);
  }
  if (b.access) { lines.push("", `Access notes: ${b.access}`); }
  lines.push("", "Confirm or propose another time from your dashboard.");
  return lines.filter(Boolean).join("\n");
}

function customerEmail(b, ref) {
  const es = b.lang === "es";
  const first = String(b.name).split(" ")[0];
  return es
    ? `Hola ${first},

Recibimos tu solicitud. Esto es una solicitud, todavía no una cita confirmada
— te confirmamos hoy mismo.

Primera opción: ${slotText(b.slot1, true)}
Alternativa: ${slotText(b.slot2, true)}
Dirección: ${addressLine(b)}
${b.estimate ? `Estimado: $${b.estimate} por visita\n` : ""}
Número de referencia: ${ref}

No se ha cobrado nada. Si quieres pagar en línea, te enviamos un enlace seguro
después de la visita.

Gracias,
${BIZ}
${BIZ_PHONE}`
    : `Hi ${first},

We've got your request. This is a request rather than a confirmed booking —
we'll confirm by the end of the day.

First choice: ${slotText(b.slot1)}
Backup: ${slotText(b.slot2)}
Address: ${addressLine(b)}
${b.estimate ? `Estimate: $${b.estimate} per visit\n` : ""}
Reference: ${ref}

Nothing has been charged. If you'd like to pay online we'll email a secure link
after the visit.

Thank you,
${BIZ}
${BIZ_PHONE}`;
}

app.http("bookings", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "bookings",
  handler: async (request, context) => {
    const body = await readJson(request);
    const problems = validate(body);
    if (problems.length) {
      return bad("Some required details are missing or invalid.", problems);
    }

    // Use the reference the customer's browser already showed them, so the
    // screen, the emails and the dashboard all quote the same number. A new one
    // is issued only if it is malformed or already taken.
    let ref = /^MCC-\d{6}-[A-Z0-9]{4}$/.test(String(body.id || "")) ? body.id : reference();
    try {
      for (let i = 0; i < 5 && await cosmos.readJob(ref); i++) ref = reference();
    } catch { /* database unreachable: the queue path below still works */ }

    const record = {
      ...body,
      id: ref,
      status: "new",
      address: addressLine(body),
      city: CITY_BY_ZIP[body.addressZip],
      zip: body.addressZip,
      createdAt: new Date().toISOString(),
      source: "web"
    };

    delete record.serverRef;
    delete record.confirmationSent;
    if (record.smsConsent === true && !record.smsConsentAt) record.smsConsentAt = record.createdAt;

    // Durability first. The database is the normal path; the queue is the
    // fallback. Only if both fail is the customer told to call.
    let savedTo = null;
    try {
      await cosmos.upsertJob(toDoc(record, ref));
      savedTo = "database";
    } catch (err) {
      context.error(`Booking ${ref}: database write failed, queueing instead:`, err.message);
      const queued = await enqueue({ type: "booking", record });
      if (queued.queued) {
        savedTo = "queue";
      } else {
        context.error("Could not queue booking either", queued.error);
        return oops("We couldn't save that just now. Please call 951-464-8147 and we'll book you in.");
      }
    }

    // Notifications are best effort and run in parallel; a failed text must
    // never turn a saved booking into an error for the customer.
    const notify = await Promise.allSettled([
      sendEmail({
        to: process.env.OWNER_EMAIL,
        subject: `New request ${ref} — ${body.name} (${record.city})`,
        text: ownerEmail(body, ref),
        replyTo: body.email
      }),
      sendEmail({
        to: body.email,
        subject: body.lang === "es"
          ? `Recibimos tu solicitud — ${ref}`
          : `We've got your request — ${ref}`,
        text: customerEmail(body, ref)
      }),
      process.env.OWNER_SMS
        ? sendSms({
            to: process.env.OWNER_SMS,
            body: `New ${body.kind === "commercial" ? "commercial" : "cleaning"} request ${ref}: ${body.name}, ${record.city}. First choice ${slotText(body.slot1)}.`
          })
        : Promise.resolve({ sent: false })
    ]);

    const delivered = notify.map((r) => (r.status === "fulfilled" ? r.value.sent : false));
    context.log(`Booking ${ref} saved to ${savedTo}; notifications sent: ${JSON.stringify(delivered)}`);

    return ok({
      reference: ref,
      status: "received",
      confirmationSent: delivered[1] === true,
      message: body.lang === "es"
        ? "Recibimos tu solicitud. Te confirmamos hoy mismo."
        : "We've got your request and will confirm by the end of the day."
    });
  }
});
