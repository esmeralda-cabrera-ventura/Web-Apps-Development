/**
 * POST /api/notify — tell a customer their appointment was confirmed, moved,
 * proposed or cancelled.
 *
 * Called by the dashboard right after the owner or helper makes the change.
 * The email goes out from the business's own domain in the language the
 * customer booked in, so nobody has to switch to a mail app. Replies go to
 * the business inbox.
 *
 * Texts are sent too once SMS is set up (ACS_SMS_FROM) and only to customers
 * who opted in. Until then the dashboard offers a one-tap text from the phone.
 *
 * Body: { kind, job: { id, name, email, phone, address, lang, smsConsent,
 *         estimate }, slot: { date, window }, note }
 */
const { app } = require("@azure/functions");
const { ok, bad, json, readJson } = require("../shared/http");
const { requireStaff } = require("../shared/auth");
const { sendEmail, sendSms } = require("../shared/acs");

const BIZ = "Menifee Maids";
const BIZ_PHONE = "951-464-8147";
const KINDS = new Set(["confirmed", "changed", "proposed", "cancelled"]);

const WINDOWS = {
  en: { morning: "Morning (8:00 – 11:00 AM)", midday: "Midday (11:00 AM – 2:00 PM)",
        afternoon: "Afternoon (2:00 – 5:00 PM)", evening: "Evening (5:00 – 8:00 PM)" },
  es: { morning: "Mañana (8:00 – 11:00 AM)", midday: "Mediodía (11:00 AM – 2:00 PM)",
        afternoon: "Tarde (2:00 – 5:00 PM)", evening: "Noche (5:00 – 8:00 PM)" }
};

function when(slot, es) {
  const day = new Date(slot.date + "T12:00:00").toLocaleDateString(es ? "es-US" : "en-US", {
    weekday: "long", month: "long", day: "numeric"
  });
  return `${day}, ${(es ? WINDOWS.es : WINDOWS.en)[slot.window] || slot.window}`;
}

const first = (name) => String(name || "").trim().split(/\s+/)[0] || "";

function message(kind, job, slot, note) {
  const es = job.lang === "es";
  const hi = es ? `Hola ${first(job.name)},` : `Hi ${first(job.name)},`;
  const ref = es ? `Referencia: ${job.id}` : `Reference: ${job.id}`;
  const addr = es ? `Dirección: ${job.address}` : `Address: ${job.address}`;
  const sign = `${es ? "Gracias" : "Thank you"},\n${BIZ}\n${BIZ_PHONE}`;
  const extra = note ? `\n${note}\n` : "";
  const t = when(slot, es);

  const parts = {
    confirmed: es
      ? { subject: `Su limpieza está confirmada — ${t}`,
          lines: [`Su limpieza está confirmada para el ${t}.`,
                  job.estimate ? `Total estimado: $${job.estimate}` : "",
                  "Si algo cambia, responda a este correo o llámenos."] }
      : { subject: `Your cleaning is confirmed — ${t}`,
          lines: [`Your cleaning is confirmed for ${t}.`,
                  job.estimate ? `Estimated total: $${job.estimate}` : "",
                  "If anything changes, just reply to this email or give us a call."] },
    changed: es
      ? { subject: `Cambiamos la fecha de su limpieza — ${t}`,
          lines: [`Su limpieza ahora es el ${t}.`,
                  "Si esa fecha no le funciona, responda a este correo o llámenos y buscamos otra."] }
      : { subject: `Your cleaning has a new time — ${t}`,
          lines: [`Your cleaning is now scheduled for ${t}.`,
                  "If that doesn't work for you, reply to this email or call and we'll find another time."] },
    proposed: es
      ? { subject: `¿Le funciona el ${t}?`,
          lines: ["No podemos en el horario que eligió.",
                  `¿Podríamos hacer su limpieza el ${t}?`,
                  "Responda SÍ para confirmar, o díganos qué otro horario le acomoda."] }
      : { subject: `Would ${t} work for your cleaning?`,
          lines: ["We can't make the time you picked.",
                  `Could we do your cleaning on ${t} instead?`,
                  "Reply YES to confirm, or tell us another time that suits you."] },
    cancelled: es
      ? { subject: `Su limpieza del ${t} fue cancelada`,
          lines: [`Tuvimos que cancelar su limpieza del ${t}.`,
                  "Una disculpa por el aviso. Responda a este correo o llámenos y le reagendamos."] }
      : { subject: `Your cleaning on ${t} has been cancelled`,
          lines: [`We've had to cancel your cleaning scheduled for ${t}.`,
                  "We're sorry for the short notice. Reply to this email or call and we'll get you rebooked."] }
  }[kind];

  const text = [hi, "", ...parts.lines.filter(Boolean), extra, addr, ref, "", sign].join("\n")
    .replace(/\n{3,}/g, "\n\n");
  return { subject: `${parts.subject} (${job.id})`, text };
}

function smsText(kind, job, slot) {
  const es = job.lang === "es";
  const t = when(slot, es);
  const hi = es ? `Hola ${first(job.name)}, le habla ${BIZ}.` : `Hi ${first(job.name)}, this is ${BIZ}.`;
  const body = {
    confirmed: es ? `Su limpieza está confirmada para el ${t}.` : `Your cleaning is confirmed for ${t}.`,
    changed: es ? `Su limpieza ahora es el ${t}.` : `Your cleaning is now ${t}.`,
    proposed: es ? `¿Podríamos hacer su limpieza el ${t}? Responda SÍ o díganos otro horario.`
                 : `Could we do your cleaning on ${t}? Reply YES or suggest another time.`,
    cancelled: es ? `Tuvimos que cancelar su limpieza del ${t}. Llámenos para reagendar.`
                  : `We've had to cancel your cleaning on ${t}. Call us to rebook.`
  }[kind];
  return `${hi} ${body} ${es ? "Ref." : "Ref"} ${job.id}. ${es ? "Responda STOP para no recibir mensajes." : "Reply STOP to opt out."}`;
}

app.http("notify", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "notify",
  handler: async (request, context) => {
    const guard = requireStaff(request);
    if (!guard.ok) return json(guard.status, { error: guard.message });

    const body = await readJson(request);
    const kind = body && body.kind;
    const job = (body && body.job) || {};
    const slot = (body && body.slot) || {};
    if (!KINDS.has(kind)) return bad("Unknown notification type.");
    if (!job.id || !/^\d{4}-\d{2}-\d{2}$/.test(String(slot.date || ""))) return bad("A job and a date are required.");

    const note = String((body && body.note) || "").slice(0, 1000);
    const replyTo = String(process.env.OWNER_EMAIL || "").split(/[,;]/)[0].trim() || undefined;

    let emailed = { sent: false, error: "no email on file" };
    if (job.email) {
      const m = message(kind, job, slot, note);
      emailed = await sendEmail({ to: job.email, subject: m.subject, text: m.text, replyTo });
    }

    // Automatic texts only once SMS is registered, and only with consent.
    let texted = { sent: false, error: "sms not configured" };
    if (process.env.ACS_SMS_FROM && job.phone && job.smsConsent === true) {
      texted = await sendSms({ to: job.phone, body: smsText(kind, job, slot) });
    } else if (process.env.ACS_SMS_FROM) {
      texted = { sent: false, error: job.smsConsent === true ? "no phone on file" : "customer did not opt in to texts" };
    }

    context.log(`notify ${kind} ${job.id}: email ${emailed.sent}, sms ${texted.sent}`);
    return ok({
      emailed: !!emailed.sent, emailError: emailed.sent ? null : emailed.error,
      texted: !!texted.sent, textError: texted.sent ? null : texted.error,
      smsAutomatic: !!process.env.ACS_SMS_FROM
    });
  }
});
