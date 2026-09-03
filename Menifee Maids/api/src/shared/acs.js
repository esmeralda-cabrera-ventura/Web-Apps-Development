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
 * Send an email. Never throws — a failed notification must not fail the
 * booking that triggered it.
 * @returns {{sent:boolean, id?:string, error?:string}}
 */
async function sendEmail({ to, subject, text, html, replyTo }) {
  const client = email();
  const sender = process.env.ACS_SENDER_ADDRESS;
  if (!client || !sender || !to) {
    return { sent: false, error: "email not configured" };
  }
  try {
    const message = {
      senderAddress: sender,
      content: { subject, plainText: text, html: html || undefined },
      recipients: { to: [{ address: to }] }
    };
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

module.exports = { sendEmail, sendSms, normalise };
