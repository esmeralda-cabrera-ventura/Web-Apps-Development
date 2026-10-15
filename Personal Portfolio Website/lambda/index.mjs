import crypto from "node:crypto";

const CLIENT_ID     = "863h9ooa2qxswg";
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI  = "https://gbya7cofp4.execute-api.us-west-1.amazonaws.com/callback";
const SUCCESS_URL   = "https://www.esmeraldaspace.com/verified.html";
const FAILURE_URL   = "https://www.esmeraldaspace.com/not-verified.html";
const CALENDLY_URL  = "https://calendly.com/esmeralda-cabrera-v";
const TOKEN_SIGNING_KEY = process.env.TOKEN_SIGNING_KEY;
const TOKEN_TTL_SECONDS = 900;

const MIN_PASSING_CHECKS = 2;
const ALWAYS_REQUIRED = ["openid", "profile"];

const RECRUITER_KEYWORDS = [
  "recruiter", "recruiting", "recruitment", "talent acquisition", "talent partner",
  "talent sourcer", "sourcer", "headhunter", "head hunter", "staffing",
  "executive search", "hiring manager", "head of talent", "talent lead",
  "people operations", "human resources", "hr manager", "technical recruiter",
];

const BANNED_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "ymail.com",
  "hotmail.com", "hotmail.co.uk", "outlook.com", "live.com", "msn.com", "aol.com",
  "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com", "pm.me",
  "gmx.com", "gmx.net", "mail.com", "zoho.com", "yandex.com", "yandex.ru",
  "comcast.net", "verizon.net", "att.net", "sbcglobal.net", "cox.net",
  "bellsouth.net", "charter.net", "earthlink.net", "juno.com", "rocketmail.com",
  "mail.ru", "qq.com", "163.com", "126.com", "sina.com", "naver.com", "hanmail.net",
  "tutanota.com", "hushmail.com", "fastmail.com", "duck.com",
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "temp-mail.org",
  "throwawaymail.com", "yopmail.com", "sharklasers.com", "trashmail.com",
  "getnada.com", "dispostable.com", "maildrop.cc", "tempmail.com", "moakt.com",
  "example.com", "example.org", "test.com", "localhost",
]);

const PASS = "PASS", FAIL = "FAIL", UNAVAILABLE = "UNAVAILABLE";

const b64url = (input) =>
  Buffer.from(input).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function redirect(url) {
  return {
    statusCode: 302,
    headers: {
      Location: url,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
    body: "",
  };
}

function rejectWith(reason) {
  console.log(JSON.stringify({ outcome: "REJECTED", reason }));
  const sep = FAILURE_URL.includes("?") ? "&" : "?";
  return redirect(`${FAILURE_URL}${sep}reason=${encodeURIComponent(reason)}`);
}

async function getJson(url, accessToken, label) {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": "202405" },
    });
    if (!res.ok) {
      console.log(JSON.stringify({ note: `${label} unavailable`, status: res.status, body: (await res.text()).slice(0, 300) }));
      return null;
    }
    return await res.json();
  } catch (err) {
    console.log(JSON.stringify({ note: `${label} request threw`, error: String(err) }));
    return null;
  }
}

function mintToken(profile, verdict) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: profile.sub,
    email: profile.email,
    name: profile.name,
    passed: verdict.passed,
    skipped: verdict.skipped,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
    jti: crypto.randomUUID(),
  };
  const encoded = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac("sha256", TOKEN_SIGNING_KEY).update(encoded).digest());
  return `${encoded}.${sig}`;
}

export function verifyToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [encoded, sig] = token.split(".");
  const expected = b64url(crypto.createHmac("sha256", TOKEN_SIGNING_KEY).update(encoded).digest());
  const a = Buffer.from(sig || ""), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch { return null; }
}

function checkBadge(verificationReport, userinfo) {
  if (verificationReport) {
    const categories = verificationReport.verificationCategories || [];
    const verified = categories.includes("WORKPLACE") || categories.includes("IDENTITY");
    return { id: "badge", state: verified ? PASS : FAIL, reason: verified ? null : "no_badge", detail: { categories } };
  }
  const flag = userinfo?.identity_verified ?? userinfo?.verified;
  if (flag !== undefined && flag !== null) {
    const verified = flag === true || flag === "VERIFIED";
    return { id: "badge", state: verified ? PASS : FAIL, reason: verified ? null : "no_badge", detail: { flag } };
  }
  return { id: "badge", state: UNAVAILABLE, reason: null, detail: {} };
}

function checkHeadline(userinfo, meProfile) {
  const headline =
    meProfile?.localizedHeadline ||
    meProfile?.headline?.localized?.en_US ||
    userinfo?.headline ||
    null;

  if (!headline) return { id: "headline", state: UNAVAILABLE, reason: null, detail: {} };

  const h = headline.toLowerCase();
  const matched = RECRUITER_KEYWORDS.filter((k) => h.includes(k));
  return { id: "headline", state: matched.length ? PASS : FAIL, reason: matched.length ? null : "no_keyword", detail: { headline, matched } };
}

function checkDomain(userinfo) {
  const email = String(userinfo?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { id: "domain", state: UNAVAILABLE, reason: null, detail: {} };
  if (userinfo.email_verified === false) return { id: "domain", state: FAIL, reason: "no_email", detail: {} };

  const domain = email.split("@").pop();
  const bad = BANNED_DOMAINS.has(domain) || !domain.includes(".") || domain.length < 4;
  return { id: "domain", state: bad ? FAIL : PASS, reason: bad ? "consumer_domain" : null, detail: { domain } };
}

function checkOpenId(userinfo) {
  const sub = String(userinfo?.sub || "").trim();
  if (!sub) return { id: "openid", state: FAIL, reason: "no_identity", detail: {} };
  return { id: "openid", state: PASS, reason: null, detail: { sub } };
}

function checkProfile(userinfo) {
  const name =
    String(userinfo?.name || "").trim() ||
    [userinfo?.given_name, userinfo?.family_name].filter(Boolean).join(" ").trim();
  const picture = String(userinfo?.picture || "").trim();

  if (!name && !picture) {
    return { id: "profile", state: UNAVAILABLE, reason: null, detail: {} };
  }
  const complete = Boolean(name) && Boolean(picture);
  return {
    id: "profile",
    state: complete ? PASS : FAIL,
    reason: complete ? null : "incomplete_profile",
    detail: { hasName: Boolean(name), hasPicture: Boolean(picture) },
  };
}

function evaluate(results) {
  const passed = results.filter((r) => r.state === PASS).map((r) => r.id);
  const failed = results.filter((r) => r.state === FAIL);
  const skipped = results.filter((r) => r.state === UNAVAILABLE).map((r) => r.id);
  const failedIds = failed.map((f) => f.id);

  const vetoed = ALWAYS_REQUIRED.filter((id) => !passed.includes(id));
  if (vetoed.length) {
    const vetoReason =
      failed.find((f) => f.id === vetoed[0])?.reason ||
      { openid: "no_identity", profile: "incomplete_profile", badge: "no_badge",
        headline: "no_keyword", domain: "consumer_domain" }[vetoed[0]] ||
      "insufficient_data";
    return { approved: false, reason: vetoReason, passed, failed: failedIds, skipped };
  }

  if (passed.length >= MIN_PASSING_CHECKS) {
    return { approved: true, reason: null, passed, failed: failedIds, skipped };
  }

  return { approved: false, reason: failed.length ? failed[0].reason : "insufficient_data", passed, failed: failedIds, skipped };
}

export const handler = async (event) => {
  try {
    const qs = event?.queryStringParameters || {};

    if (qs.error) {
      const cancelled =
        qs.error === "user_cancelled_authorize" ||
        qs.error === "user_cancelled_login" ||
        qs.error === "access_denied";
      console.log(JSON.stringify({ note: "oauth error", error: qs.error, desc: qs.error_description }));
      return rejectWith(cancelled ? "access_denied" : "token_error");
    }

    if (!qs.code) return rejectWith("bad_state");

    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: qs.code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const body = (await tokenRes.text()).slice(0, 500);
      console.error("Token exchange failed:", tokenRes.status, body);
      // LinkedIn authorization codes are single-use and short-lived. Reusing one
      // (page reload, back button, stale bookmark) returns a 400 that is not a
      // verification failure, so give the visitor a retry message instead.
      const reused = /expired|already|used|invalid.*code|code.*invalid/i.test(body);
      return rejectWith(reused ? "code_expired" : "token_error");
    }

    const accessToken = (await tokenRes.json()).access_token;
    if (!accessToken) return rejectWith("token_error");

    const userinfo = await getJson("https://api.linkedin.com/v2/userinfo", accessToken, "userinfo");
    if (!userinfo) return rejectWith("token_error");

    const [verificationReport, meProfile] = await Promise.all([
      getJson("https://api.linkedin.com/v2/verificationReport", accessToken, "verificationReport"),
      getJson("https://api.linkedin.com/v2/me?projection=(id,localizedHeadline)", accessToken, "v2/me"),
    ]);

    const results = [
      checkOpenId(userinfo),
      checkProfile(userinfo),
      checkBadge(verificationReport, userinfo),
      checkHeadline(userinfo, meProfile),
      checkDomain(userinfo),
    ];
    const verdict = evaluate(results);

    console.log(JSON.stringify({
      sub: userinfo.sub,
      policy: { MIN_PASSING_CHECKS, ALWAYS_REQUIRED },
      checks: results.map((r) => ({ id: r.id, state: r.state, dataAvailable: r.state !== UNAVAILABLE, detail: r.detail })),
      verdict,
    }));

    if (!verdict.approved) return rejectWith(verdict.reason);

    const token = mintToken(userinfo, verdict);
    const sep = SUCCESS_URL.includes("?") ? "&" : "?";
    const url =
      `${SUCCESS_URL}${sep}token=${encodeURIComponent(token)}` +
      `&state=${encodeURIComponent(qs.state || "")}` +
      `&name=${encodeURIComponent(userinfo.name || "")}` +
      `&email=${encodeURIComponent(userinfo.email || "")}`;

    console.log(JSON.stringify({ outcome: "APPROVED", sub: userinfo.sub, passed: verdict.passed, skipped: verdict.skipped, next: CALENDLY_URL }));
    return redirect(url);

  } catch (err) {
    console.error("Unhandled error:", err);
    return rejectWith("server_error");
  }
};
