/**
 * /api/settings — business configuration, with the sensitive parts withheld.
 *
 * The rule this route exists to enforce: **a helper's browser must never
 * receive an API address or a key.** Hiding the settings form was not enough —
 * anything the browser holds can be read from developer tools in two clicks.
 * So the server decides what each caller is allowed to know, and simply does
 * not send the rest.
 *
 *   anonymous  the Stripe Payment Link only. That link is public by design —
 *              it is what a customer opens to pay — and pay.html needs it.
 *   helper     the same, plus whether payments are switched on. No URLs of
 *              ours, no keys, no database address.
 *   owner      everything the dashboard's Settings card edits.
 *
 * The API key itself is never returned to anybody. It lives in application
 * settings and is only used by a self-hosted caller; a browser on Static Web
 * Apps is authenticated by the platform cookie and needs no key at all.
 */
const { app } = require("@azure/functions");
const { ok, unauthorised, oops, json, readJson } = require("../shared/http");
const { requireOwner, principal } = require("../shared/auth");
const cosmos = require("../shared/cosmos");

const DEFAULTS = {
  stripeUrl: "",
  stripeVerifyUrl: "",
  businessName: "Menifee Maids",
  payExpiryDays: 21,
  monthResetAt: ""
};

/** What each kind of caller is allowed to see. */
function project(settings, role) {
  const s = { ...DEFAULTS, ...(settings || {}) };

  if (role === "owner") {
    return {
      role: "owner",
      stripeUrl: s.stripeUrl,
      stripeVerifyUrl: s.stripeVerifyUrl,
      businessName: s.businessName,
      payExpiryDays: s.payExpiryDays,
      monthResetAt: s.monthResetAt
    };
  }

  if (role === "helper") {
    return {
      role: "helper",
      businessName: s.businessName,
      payExpiryDays: s.payExpiryDays,
      monthResetAt: s.monthResetAt,
      // A yes/no, not the address. Enough to word the payment panel correctly.
      paymentsConfigured: !!s.stripeUrl,
      stripeUrl: s.stripeUrl        // public Stripe link; the helper hands it to customers
    };
  }

  // Anonymous: only what the customer's invoice page needs.
  return { role: "anonymous", businessName: s.businessName, stripeUrl: s.stripeUrl };
}

function roleOf(request) {
  const p = principal(request);
  if (!p) return "anonymous";
  if (p.roles.includes("owner")) return "owner";
  if (p.roles.includes("helper")) return "helper";
  return "anonymous";
}

app.http("settings", {
  methods: ["GET", "PUT"],
  authLevel: "anonymous",
  route: "settings",
  handler: async (request, context) => {
    try {
      if (request.method === "GET") {
        const stored = await cosmos.readSettings();
        return ok({ settings: project(stored, roleOf(request)) });
      }

      // Only the owner writes configuration.
      const guard = requireOwner(request);
      if (!guard.ok) return json(guard.status, { error: guard.message });

      const body = await readJson(request);
      if (!body) return oops("Send the settings to save.");

      for (const [field, value] of [["stripeUrl", body.stripeUrl],
                                    ["stripeVerifyUrl", body.stripeVerifyUrl]]) {
        if (value && !/^https:\/\//i.test(value)) {
          return json(400, { error: `The ${field} must start with https://` });
        }
      }

      const saved = await cosmos.writeSettings({
        stripeUrl: body.stripeUrl || "",
        stripeVerifyUrl: body.stripeVerifyUrl || "",
        businessName: body.businessName || DEFAULTS.businessName,
        payExpiryDays: Number(body.payExpiryDays) || DEFAULTS.payExpiryDays,
        monthResetAt: body.monthResetAt || ""
      });

      context.log("Settings updated by the owner.");
      return ok({ settings: project(saved, "owner") });
    } catch (err) {
      context.error("settings route failed:", err.message);
      return oops("Could not read or save the settings.");
    }
  }
});
