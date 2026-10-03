/**
 * Timer: remind tomorrow's customers, automatically.
 *
 * This is the piece the old sleeping-database design could not do. A server
 * that stops when idle cannot be queried on a schedule, so reminders had to be
 * sent by hand from the dashboard. Cosmos is always there, so this runs whether
 * or not anyone is logged in.
 *
 * Runs once a day at 17:00 local time.
 */
const { app } = require("@azure/functions");
const cosmos = require("../shared/cosmos");
const { sendSms, sendEmail } = require("../shared/acs");

const BIZ = process.env.BUSINESS_NAME || "Menifee Maids";
const BIZ_PHONE = process.env.BUSINESS_PHONE || "951-464-8147";

const WINDOWS = {
  en: { morning: "Morning (8:00 – 11:00 AM)", midday: "Midday (11:00 AM – 2:00 PM)",
        afternoon: "Afternoon (2:00 – 5:00 PM)", evening: "Evening (5:00 – 8:00 PM)" },
  es: { morning: "Mañana (8:00 – 11:00 AM)", midday: "Mediodía (11:00 AM – 2:00 PM)",
        afternoon: "Tarde (2:00 – 5:00 PM)", evening: "Noche (5:00 – 8:00 PM)" }
};

const addressOf = (j) =>
  j.addressText ||
  (j.address ? [j.address.street, j.address.city].filter(Boolean).join(", ") : "");

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

app.timer("sendReminders", {
  schedule: process.env.REMINDER_CRON || "0 0 17 * * *",
  handler: async (_timer, context) => {
    if (String(process.env.REMINDERS_ENABLED || "true").toLowerCase() === "false") {
      context.log("Reminders are switched off.");
      return;
    }

    const date = tomorrowIso();
    const jobs = (await cosmos.jobsOnDate(date)).filter((j) => !j.remindedAt);
    if (!jobs.length) {
      context.log(`Nothing booked for ${date}.`);
      return;
    }

    let texted = 0, emailed = 0;
    for (const j of jobs) {
      const es = j.lang === "es";
      const when = (WINDOWS[es ? "es" : "en"][j.confirmedSlot.window]) || j.confirmedSlot.window;
      const first = String(j.name || "").split(" ")[0];

      const sms = es
        ? `Hola ${first}, te recordamos de ${BIZ}: limpiamos mañana, ${when}, en ${addressOf(j)}. Responde aquí si necesitas moverlo.`
        : `Hi ${first}, a reminder from ${BIZ}: we're cleaning tomorrow, ${when}, at ${addressOf(j)}. Reply here if you need to move it.`;

      // Only text people who ticked the box at booking. A2P rules require
      // recorded consent per recipient, and an unconsented text is exactly the
      // complaint that gets a campaign shut down. Everyone still gets the email.
      const smsResult = j.smsConsent
        ? await sendSms({ to: j.phone, body: sms })
        : { sent: false, error: "no sms consent on file" };
      if (smsResult.sent) texted++;

      // Email as well as text: a text can be filtered, an email rarely is.
      const emailResult = await sendEmail({
        to: j.email,
        subject: es ? `Recordatorio: tu limpieza es mañana` : `Reminder: your cleaning is tomorrow`,
        text: es
          ? `Hola ${first},\n\nSólo un recordatorio de que limpiamos mañana, ${when}, en ${addressOf(j)}.\n\nSi necesitas moverlo, responde a este correo o llámanos al ${BIZ_PHONE}.\n\nNúmero de trabajo: ${j.id}\n\nGracias,\n${BIZ}`
          : `Hi ${first},\n\nJust a reminder that we're cleaning tomorrow, ${when}, at ${addressOf(j)}.\n\nIf you need to move it, reply to this email or call ${BIZ_PHONE}.\n\nJob number: ${j.id}\n\nThank you,\n${BIZ}`
      });
      if (emailResult.sent) emailed++;

      // Stamp it whatever happened, so a bad phone number can't cause a daily
      // retry loop. The owner can still send one by hand from the dashboard.
      await cosmos.upsertJob({ ...j, remindedAt: new Date().toISOString() });
    }

    context.log(`Reminders for ${date}: ${jobs.length} job(s), ${texted} texted, ${emailed} emailed.`);
  }
});
