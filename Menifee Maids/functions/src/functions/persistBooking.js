/**
 * Queue: write buffered bookings into Cosmos.
 *
 * The API already accepted the booking and confirmed it to the customer; this
 * puts it in the database. With Cosmos always available it usually lands within
 * a second, but the queue stays because it keeps the customer's response off
 * the write path and retries a transient failure instead of losing a job.
 */
const { app } = require("@azure/functions");
const cosmos = require("../shared/cosmos");
const { sendEmail } = require("../shared/acs");

const QUEUE = process.env.BOOKING_QUEUE_NAME || "booking-writes";

app.storageQueue("persistBooking", {
  queueName: QUEUE,
  connection: "AzureWebJobsStorage",
  handler: async (message, context) => {
    const payload = typeof message === "string" ? JSON.parse(message) : message;
    if (!payload || payload.type !== "booking" || !payload.record) {
      context.warn("Discarding an unrecognised queue message.");
      return;
    }

    const r = payload.record;
    const doc = {
      id: r.id,
      type: "job",
      status: r.status || "new",
      kind: r.kind || "residential",
      lang: r.lang || "en",
      name: r.name,
      company: r.company || null,
      email: r.email || null,
      phone: r.phone || null,
      address: {
        street: r.street || null,
        unit: r.unit || null,
        city: r.addressCity || r.city || null,
        state: r.addressState || "CA",
        zip: r.addressZip || r.zip || null
      },
      bedrooms: r.bedrooms || null,
      bathrooms: r.bathrooms || null,
      frequency: r.frequency || null,
      addons: r.addons || [],
      facility: r.facility || null,
      sqft: r.sqft || null,
      nights: r.nights || null,
      scope: r.scope || null,
      slot1: r.slot1 || null,
      slot2: r.slot2 || null,
      confirmedSlot: null,
      estimateCents: r.estimate ? Math.round(r.estimate * 100) : null,
      accessNotes: r.access || null,
      photos: [],
      photoConsent: r.photoConsent !== false,
      // Carriers expect proof of opt-in per recipient, so the timestamp is kept.
      smsConsent: r.smsConsent === true,
      smsConsentAt: r.smsConsent === true ? (r.createdAt || new Date().toISOString()) : null,
      createdAt: r.createdAt || new Date().toISOString()
    };

    // Throwing sends the message back to the queue with its own backoff, so a
    // blip in Cosmos delays the write rather than dropping the booking.
    await cosmos.upsertJob(doc);
    context.log(`Booking ${doc.id} written to Cosmos.`);
  }
});

/**
 * Safety net. If a booking has exhausted every retry it arrives here instead of
 * disappearing, and the owner gets the full details by email so the job is only
 * ever delayed, never lost.
 */
app.storageQueue("persistBookingPoison", {
  queueName: QUEUE + "-poison",
  connection: "AzureWebJobsStorage",
  handler: async (message, context) => {
    const payload = typeof message === "string" ? JSON.parse(message) : message;
    const j = (payload && payload.record) || {};
    context.error("Booking could not be stored after all retries:", j.id);
    await sendEmail({
      to: process.env.OWNER_EMAIL,
      subject: `ACTION NEEDED — booking ${j.id || "(unknown)"} did not save`,
      text:
        "A booking was accepted and the customer was confirmed, but it could not be\n" +
        "written to the database after repeated attempts. Add it by hand from the\n" +
        "dashboard so it isn't lost.\n\n" + JSON.stringify(j, null, 2)
    });
  }
});
