/**
 * GET  /api/availability   the open days the booking page offers
 * PUT  /api/availability   the owner's calendar edits
 *
 * Stored as one document per month, so reading the next two months is two point
 * reads at about 1 RU each rather than a scan over individual days.
 */
const { app } = require("@azure/functions");
const { ok, unauthorised, oops, readJson, json } = require("../shared/http");
const { requireStaff } = require("../shared/auth");
const cosmos = require("../shared/cosmos");

function monthsAhead(count) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

app.http("availability", {
  methods: ["GET", "PUT"],
  authLevel: "anonymous",
  route: "availability",
  handler: async (request, context) => {
    if (request.method === "GET") {
      try {
        const map = await cosmos.readAvailability(monthsAhead(3));
        return ok({ availability: map });
      } catch (err) {
        // Never block a customer on infrastructure: an empty calendar still
        // lets the booking page load and tell them to call.
        context.error("availability read failed:", err.message);
        return ok({ availability: {}, stale: true });
      }
    }

    const guard = requireStaff(request);
    if (!guard.ok) return json(guard.status, { error: guard.message });

    const body = await readJson(request);
    if (!body || typeof body.availability !== "object") {
      return oops("Send { availability: { 'YYYY-MM-DD': ['morning', ...] } }");
    }

    try {
      const months = await cosmos.writeAvailability(body.availability);
      return ok({ saved: true, months });
    } catch (err) {
      context.error("availability write failed:", err.message);
      return oops("Could not save the calendar.");
    }
  }
});
