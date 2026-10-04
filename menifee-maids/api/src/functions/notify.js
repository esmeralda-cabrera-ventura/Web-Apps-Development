/**
 * POST /api/notify — messages to a customer about their appointment:
 * confirmed, moved, proposed, cancelled, or a request that can't be taken.
 *
 * Nothing is sent without a person pressing Send. The dashboard first asks
 * for a preview (the pre-written email and text in the customer's language),
 * shows it for editing, and sends only what the owner or helper approves.
 *
 *   { preview: true, kind, job, slot }            -> { subject, text, smsText, smsAutomatic }
 *   { channel: "email", kind, job, slot, subject, text }  -> sends the email
 *   { channel: "sms",   kind, job, slot, text }   -> texts from the business
 *                                                    number (needs ACS_SMS_FROM
 *                                                    and the customer's opt-in)
 *
 * Emails go out from the business's own domain; replies reach the business
 * inbox.
 *
 * job: { id, name, email, phone, address, lang, smsConsent, estimate }
 */
const { app } = require("@azure/functions");
const { ok, bad, json, readJson } = require("../shared/http");
const { requireStaff } = require("../shared/auth");
const { sendEmail, sendSms } = require("../shared/acs");

const BIZ = "Menifee Maids";
const BIZ_PHONE = "951-464-8147";
const KINDS = new Set(["confirmed", "changed", "proposed", "cancelled", "declined"]);

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
    declined: es
      ? { subject: "Sobre su solicitud de limpieza",
          lines: ["Gracias por pensar en nosotros. Lamentablemente no podemos atender esta solicitud.",
                  "Si gusta, responda a este correo o llámenos y con gusto buscamos otra opción."] }
      : { subject: "About your cleaning request",
          lines: ["Thank you for thinking of us. Unfortunately, we aren't able to take this request.",
                  "If you'd like, reply to this email or give us a call and we'll be glad to look at other options."] },
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
                  : `We've had to cancel your cleaning on ${t}. Call us to rebook.`,
    declined: es ? "Lamentablemente no podemos atender su solicitud de limpieza. Llámenos si desea otra opción."
                 : "Unfortunately we aren't able to take your cleaning request. Call us if you'd like other options."
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

    const replyTo = String(process.env.OWNER_EMAIL || "").split(/[,;]/)[0].trim() || undefined;
    const smsAutomatic = !!process.env.ACS_SMS_FROM;
    const OPT_OUT = job.lang === "es" ? "Responda STOP para no recibir mensajes." : "Reply STOP to opt out.";

    // 1. Preview: the pre-written messages, nothing sent.
    if (body.preview) {
      const m = message(kind, job, slot, "");
      return ok({ subject: m.subject, text: m.text, smsText: smsText(kind, job, slot), smsAutomatic });
    }

    // 2. Send the email exactly as the owner or helper approved it.
    if (body.channel === "email") {
      if (!job.email) return bad("This customer has no email address on file.");
      const fallback = message(kind, job, slot, "");
      const subject = String(body.subject || fallback.subject).slice(0, 200);
      const text = String(body.text || fallback.text).slice(0, 5000);
      const sent = await sendEmail({ to: job.email, subject, text, replyTo });
      context.log(`notify email ${kind} ${job.id}: ${sent.sent}`);
      return ok({ sent: !!sent.sent, error: sent.sent ? null : sent.error });
    }

    // 3. Text from the business number, once SMS is registered.
    if (body.channel === "sms") {
      if (!smsAutomatic) return json(501, { error: "Texting from the business number isn't set up yet." });
      if (job.smsConsent !== true) return bad("This customer didn't agree to receive texts.");
      if (!job.phone) return bad("This customer has no phone number on file.");
      let text = String(body.text || smsText(kind, job, slot)).slice(0, 1000);
      // Carriers require an opt-out line on business texts; keep it even if edited out.
      if (!/\bSTOP\b/i.test(text)) text = `${text} ${OPT_OUT}`;
      const sent = await sendSms({ to: job.phone, body: text });
      context.log(`notify sms ${kind} ${job.id}: ${sent.sent}`);
      return ok({ sent: !!sent.sent, error: sent.sent ? null : sent.error });
    }

    return bad("Ask for a preview, or choose email or sms.");
  }
});
