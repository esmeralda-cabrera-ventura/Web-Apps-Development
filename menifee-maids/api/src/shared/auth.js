/**
 * Who is allowed to call the owner and helper routes.
 *
 * The real gate is Static Web Apps: an unauthenticated request for a protected
 * route is stopped at the edge and never reaches these functions. This is the
 * second check, because route rules only cover requests the platform serves —
 * an API must confirm identity for itself before returning anybody's data.
 *
 * Identity arrives in x-ms-client-principal, a base64 JSON blob injected by the
 * platform. A caller cannot forge it: it is stripped from inbound requests and
 * re-added by the edge after the auth cookie is validated.
 *
 * The API key path exists for local development and for a self-hosted API that
 * is not behind Static Web Apps. It is not used once deployed.
 */
const crypto = require("crypto");

const ROLES = { OWNER: "owner", HELPER: "helper" };

function principal(request) {
  const header = request.headers.get("x-ms-client-principal");
  if (!header) return null;
  try {
    const parsed = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
    return {
      id: parsed.userId,
      name: parsed.userDetails,
      provider: parsed.identityProvider,
      roles: Array.isArray(parsed.userRoles) ? parsed.userRoles : []
    };
  } catch {
    return null;
  }
}

function sameKey(a, b) {
  const x = Buffer.from(String(a || ""), "utf8");
  const y = Buffer.from(String(b || ""), "utf8");
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

/**
 * @param {*} request
 * @param {string[]} allowed roles that may proceed
 * @returns {{ok:true, via:string, user?:object}|{ok:false, status:number, message:string}}
 */
function requireRole(request, allowed = [ROLES.OWNER]) {
  const p = principal(request);

  if (p) {
    // "authenticated" deliberately does not count. It only means the caller has
    // a Microsoft account, which everyone can get. Custom roles are assigned by
    // invitation and are what actually restrict access.
    const match = p.roles.find((r) => allowed.includes(r));
    if (match) return { ok: true, via: "swa", user: p, role: match };
    return {
      ok: false, status: 403,
      message: "Signed in, but this account has not been given access to the dashboard."
    };
  }

  const expected = process.env.API_KEY;
  if (expected && sameKey(request.headers.get("x-api-key"), expected)) {
    return { ok: true, via: "apikey", role: ROLES.OWNER };
  }

  if (!expected) {
    return {
      ok: false, status: 500,
      message: "No identity on the request and no API_KEY configured. On Static Web Apps " +
               "this route should be listed with allowedRoles so the platform attaches one."
    };
  }
  return { ok: false, status: 401, message: "Not authorised." };
}

/** Owner-only routes: settings, Stripe verification. */
const requireOwner = (request) => requireRole(request, [ROLES.OWNER]);
/** Day-to-day work: jobs, photos, payments, the calendar. */
const requireStaff = (request) => requireRole(request, [ROLES.OWNER, ROLES.HELPER]);

module.exports = { requireRole, requireOwner, requireStaff, principal, ROLES };
