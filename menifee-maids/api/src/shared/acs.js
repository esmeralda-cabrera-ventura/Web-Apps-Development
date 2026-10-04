/**
 * Azure Communication Services — email and SMS.
 *
 * Both clients prefer a managed identity (endpoint + DefaultAzureCredential)
 * and fall back to a connection string for local development. Nothing here
 * touches Postgres, which is what lets a booking succeed while the database is
 * still starting up.
 */
const { EmailClient } = require("@azure/communication-email");
const { SmsClient } = require("@azure/communication-sms");
const { DefaultAzureCredential } = require("@azure/identity");

let emailClient = null;
let smsClient = null;
let cred = null;

function credential() { return (cred = cred || new DefaultAzureCredential()); }

function email() {
  if (emailClient) return emailClient;
  if (process.env.ACS_CONNECTION_STRING) {
    emailClient = new EmailClient(process.env.ACS_CONNECTION_STRING);
  } else if (process.env.ACS_ENDPOINT) {
    emailClient = new EmailClient(process.env.ACS_ENDPOINT, credential());
  } else {
    return null;
  }
  return emailClient;
}

function sms() {
  if (smsClient) return smsClient;
  if (process.env.ACS_CONNECTION_STRING) {
    smsClient = new SmsClient(process.env.ACS_CONNECTION_STRING);
  } else if (process.env.ACS_ENDPOINT) {
    smsClient = new SmsClient(process.env.ACS_ENDPOINT, credential());
  } else {
    return null;
  }
  return smsClient;
}

/**
 * Turn "a@x.com, b@y.com; c@z.com" into [{address:"a@x.com"}, ...].
 *
 * Any address field — including OWNER_EMAIL — may hold several addresses
 * separated by commas or semicolons, so a second owner or an office manager can
 * be added from the Azure portal without touching code. Blank entries and
 * stray whitespace are dropped, and duplicates are removed so nobody gets the
 * same alert twice.
 */
function recipientList(value) {
  const seen = new Set();
  return String(value || "")
    .split(/[,;]/)
    .map((a) => a.trim())
    .filter((a) => {
      if (!a || seen.has(a.toLowerCase())) return false;
      seen.add(a.toLowerCase());
      return true;
    })
    .map((address) => ({ address }));
}

/**
 * Send an email. Never throws — a failed notification must not fail the
 * booking that triggered it.
 *
 * `to` accepts one address or a comma-separated list. NOTIFY_BCC, if set, is
 * blind-copied on every message the app sends, which is how a second inbox gets
 * a copy of customer-facing mail (confirmations, reminders) as well as the
 * owner alerts. It is BCC rather than CC so customers never see internal
 * addresses.
 *
 * @returns {{sent:boolean, id?:string, error?:string}}
 */
async function sendEmail({ to, subject, text, html, replyTo, bcc }) {
  const client = email();
  const sender = process.env.ACS_SENDER_ADDRESS;
  const recipients = recipientList(to);
  if (!client || !sender || recipients.length === 0) {
    return { sent: false, error: "email not configured" };
  }
  try {
    const message = {
      senderAddress: sender,
      content: { subject, plainText: text, html: html || undefined },
      recipients: { to: recipients }
    };

    // Per-call bcc first, then the standing NOTIFY_BCC list. Anyone already on
    // the To line is removed so a single address cannot receive two copies.
    const onTo = new Set(recipients.map((r) => r.address.toLowerCase()));
    const blind = [...recipientList(bcc), ...recipientList(process.env.NOTIFY_BCC)]
      .filter((r) => !onTo.has(r.address.toLowerCase()));
    if (blind.length) message.recipients.bcc = blind;

    if (replyTo) message.replyTo = [{ address: replyTo }];
    const poller = await client.beginSend(message);
    const result = await poller.pollUntilDone();
    return { sent: true, id: result.id };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

/** Same contract as sendEmail: best effort, never throws. */
async function sendSms({ to, body }) {
  const client = sms();
  const from = process.env.ACS_SMS_FROM;
  if (!client || !from || !to) return { sent: false, error: "sms not configured" };
  try {
    const [res] = await client.send(
      { from, to: [normalise(to)], message: body },
      { enableDeliveryReport: true, tag: "menifee-maids" }
    );
    return { sent: res.successful, id: res.messageId, error: res.errorMessage };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

/** ACS wants E.164; the booking form collects whatever people type. */
function normalise(phone) {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return digits;
}

module.exports = { sendEmail, sendSms, normalise, recipientList };
