/* =========================================================================
   CONTACT FORM BACKEND
   AWS Lambda (Node.js 20+, ESM) behind API Gateway. Receives the JSON body
   that contact.js posts, validates it, and delivers it through Amazon SES.

   Deploy instructions: lambda/README-CONTACT-DEPLOY.md

   Environment variables:
     TO_ADDRESS     Where messages are delivered.
                    e.g. esmeralda.cabrera-ventura@outlook.com
     FROM_ADDRESS   A domain or address you have VERIFIED in SES. This is the
                    envelope sender, NOT the visitor's address - sending mail
                    "from" the visitor would fail SPF/DKIM and land in spam.
                    e.g. no-reply@yourdomain.com
     ALLOWED_ORIGIN Your site's origin, for CORS.
                    e.g. https://www.yourdomain.com  ("*" works but is loose)
     AWS_REGION     Set automatically by Lambda.
   ========================================================================= */

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({});

const TO_ADDRESS = process.env.TO_ADDRESS;
const FROM_ADDRESS = process.env.FROM_ADDRESS;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept"
    },
    body: JSON.stringify(body)
  };
}

/* Header injection guard: a newline in a field the visitor controls could
   otherwise add headers to the outgoing message. */
const clean = (v, max = 500) =>
  String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);

export const handler = async (event) => {
  const method =
    event.requestContext?.http?.method || event.httpMethod || "POST";

  if (method === "OPTIONS") return respond(204, {});
  if (method !== "POST") {
    return respond(405, { success: false, message: "Method not allowed." });
  }

  if (!TO_ADDRESS || !FROM_ADDRESS) {
    console.error("Missing TO_ADDRESS or FROM_ADDRESS environment variable.");
    return respond(500, {
      success: false,
      message: "The mail service is not configured yet."
    });
  }

  let data;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
    data = JSON.parse(raw || "{}");
  } catch {
    return respond(400, { success: false, message: "Malformed request." });
  }

  /* Honeypot. contact.js already drops these client-side, but a bot posting
     straight at the endpoint never runs that code. */
  if (clean(data._honey)) {
    return respond(200, { success: true });
  }

  const firstName = clean(data.firstName, 80);
  const lastName = clean(data.lastName, 80);
  const email = clean(data.email, 160);
  const phone = clean(data.phone, 60);
  const linkedin = clean(data.linkedin, 300);
  const city = clean(data.city, 120);
  const message = String(data.message ?? "").trim().slice(0, 8000);

  const missing = [];
  if (!firstName) missing.push("first name");
  if (!lastName) missing.push("last name");
  if (!email) missing.push("email");
  if (!message) missing.push("message");

  if (missing.length) {
    return respond(400, {
      success: false,
      message: `Please provide your ${missing.join(", ")}.`
    });
  }

  if (!EMAIL_RE.test(email)) {
    return respond(400, {
      success: false,
      message: "That email address doesn't look valid."
    });
  }

  const fullName = `${firstName} ${lastName}`;
  const dash = "\u2014";

  const text = [
    `Name:     ${fullName}`,
    `Email:    ${email}`,
    `Phone:    ${phone || dash}`,
    `LinkedIn: ${linkedin || dash}`,
    `City:     ${city || dash}`,
    "",
    "Message:",
    message,
    "",
    `${dash} Sent from the contact form on your portfolio site.`
  ].join("\n");

  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const row = (label, value) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#667;font:600 12px sans-serif;` +
    `text-transform:uppercase;letter-spacing:.08em;vertical-align:top;">${label}</td>` +
    `<td style="padding:6px 0;font:14px sans-serif;color:#111;">${esc(value) || dash}</td></tr>`;

  const html =
    `<div style="font:14px sans-serif;color:#111;max-width:640px;">` +
    `<h2 style="font:700 18px sans-serif;margin:0 0 16px;">New portfolio contact</h2>` +
    `<table style="border-collapse:collapse;margin-bottom:18px;">` +
    row("Name", fullName) +
    row("Email", email) +
    row("Phone", phone) +
    row("LinkedIn", linkedin) +
    row("City", city) +
    `</table>` +
    `<div style="border-top:1px solid #ddd;padding-top:14px;white-space:pre-wrap;">` +
    `${esc(message)}</div></div>`;

  try {
    await ses.send(
      new SendEmailCommand({
        Source: `Portfolio Contact Form <${FROM_ADDRESS}>`,
        Destination: { ToAddresses: [TO_ADDRESS] },
        /* Replying in your mail client goes to the visitor, not to SES. */
        ReplyToAddresses: [email],
        Message: {
          Subject: {
            Data: `New message from your portfolio contact form ${dash} ${fullName}`,
            Charset: "UTF-8"
          },
          Body: {
            Text: { Data: text, Charset: "UTF-8" },
            Html: { Data: html, Charset: "UTF-8" }
          }
        }
      })
    );

    return respond(200, { success: true });
  } catch (err) {
    console.error("SES send failed:", err);
    return respond(502, {
      success: false,
      message: "The message could not be delivered right now."
    });
  }
};
