# Website Upgrade 2.0 — Deployment Notes
esmeraldaspace.com · us-west-1 · recruiter-verifier-backend

---

## Verification policy (current)

Five tests run on every visitor. Two are mandatory; the other three are
scored and logged but do not block access.

| Test | Source | Passes when | Readable today? |
|---|---|---|---|
| `openid` | **required** | LinkedIn returned a valid account id (`sub`) | ✅ yes |
| `profile` | **required** | Account has both a name and a profile photo | ✅ yes |
| `badge` | original | `verificationCategories` contains `WORKPLACE` or `IDENTITY` | ❌ no |
| `headline` | original | Headline contains a recruiter keyword | ❌ no |
| `domain` | original | Email is on a **corporate** domain (not consumer/disposable) | ✅ yes |

Controlled by two lines in `index.mjs`:

```javascript
const MIN_PASSING_CHECKS = 2;
const ALWAYS_REQUIRED = ["openid", "profile"];
```

`ALWAYS_REQUIRED` means those two must PASS or the visitor is rejected,
whatever else happens. Passing them also satisfies the count of 2, so they
are both necessary and sufficient.

**Net effect today:** a real authenticated LinkedIn account with a name and a
photo gets access. A Gmail-address recruiter with a normal profile gets in —
the `domain` test fails for them, that failure is logged and stored in their
token, but it does not block them. This is deliberate.

### Three states, not two

Each test returns `PASS`, `FAIL`, or `UNAVAILABLE`.

- `FAIL` — LinkedIn gave data and the visitor violates the rule.
- `UNAVAILABLE` — LinkedIn gave nothing. Not evidence either way, so it never
  counts against the visitor.

This distinction is the whole point. `/v2/verificationReport` returns 403 and
the headline needs `r_basicprofile`; treating those 403s as failed
verifications is what rejected 100% of visitors in the original function.

### Changing the policy

| Goal | Change |
|---|---|
| Make corporate email mandatory | `ALWAYS_REQUIRED = ["openid", "profile", "domain"]` |
| Require an extra criterion beyond the two | `MIN_PASSING_CHECKS = 3` |
| Loosen to any two of five | `ALWAYS_REQUIRED = []` |

Never add a test to `ALWAYS_REQUIRED` that reports `dataAvailable: false` in
CloudWatch — that rejects every visitor.

---

## Confirmed configuration

| Item | Value | Status |
|---|---|---|
| LinkedIn Client ID | `863h9ooa2qxswg` | ✅ |
| Redirect URI | `https://gbya7cofp4.execute-api.us-west-1.amazonaws.com/callback` | ✅ registered |
| API Gateway route | `GET /callback` → Lambda `pja72ek` | ✅ verified |
| Scopes granted | `openid`, `profile`, `email` | ✅ verified |
| SUCCESS_URL | `https://www.esmeraldaspace.com/verified.html` | ✅ |
| FAILURE_URL | `https://www.esmeraldaspace.com/not-verified.html` | ✅ |
| Calendly | `https://calendly.com/esmeralda-cabrera-v` | ✅ |

Your LinkedIn app has both the bare and `/callback` redirect URLs registered.
Harmless — the code sends the `/callback` form and LinkedIn matches any entry.

**Still unverified:** API Gateway → Stages. Confirm a `$default` stage exists
with auto-deploy enabled. If the stage is named `prod` or similar, the real
invoke URL includes it (`.../prod/callback`) and all three registered redirect
URIs would be wrong.

---

## ⚠️ Rotate the LinkedIn client secret

`<redacted>` was shared in plain text — treat it as
compromised. LinkedIn Developer Portal → your app → Auth → Generate new, then
set it as the `LINKEDIN_CLIENT_SECRET` environment variable on the Lambda.

---

## Deploy steps

**1. Lambda** — paste `index.mjs` into `recruiter-verifier-backend`.

| Setting | Value | Why |
|---|---|---|
| Runtime | Node.js 24.x | |
| Handler | `index.handler` | |
| Filename | `index.mjs` | `.mjs` marks it as ESM |
| **Timeout** | **30 sec** | The 3s default times out on cold start — confirmed in CloudWatch |
| **Memory** | **512 MB** | At 128 MB the function used 103 MB (80% of ceiling) and Lambda ties CPU speed to memory |

**2. S3** — upload the site files. New or changed:
`index.html`, `style.css`, `linkedin-auth.js`, `verified.html`,
`not-verified.html`, `Automations.png`.

**3. CloudFront invalidation** — required, or visitors get the cached 2025
footer and 404s on the new pages:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/index.html" "/style.css" "/linkedin-auth.js" \
          "/verified.html" "/not-verified.html" "/Automations.png"
```

Also confirm the CloudFront behaviour **forwards query strings**, or `?token=`
and `?reason=` get stripped and both new pages break. Use a cache policy that
includes query strings (e.g. `CachingDisabled`) for at least `/verified.html`
and `/not-verified.html`.

---

## Failure page reason codes

`not-verified.html` reads `?reason=` and shows a specific explanation:

| Code | Meaning |
|---|---|
| `no_identity` | No valid LinkedIn account id returned |
| `incomplete_profile` | Missing name or profile photo |
| `no_badge` | Badge data readable, no verification badge present |
| `no_keyword` | Headline readable, no recruiter keyword found |
| `consumer_domain` | Email is a consumer or disposable address |
| `no_email` | No verified email returned |
| `insufficient_data` | Not enough readable criteria to decide |
| `code_expired` | Sign-in link reused or expired (codes are single-use) |
| `access_denied` | Visitor cancelled at LinkedIn |
| `bad_state` | Callback hit without an authorization code |
| `token_error` | LinkedIn handshake failed |
| `server_error` | Unhandled exception |

---

## What to watch in CloudWatch

Every request logs a `checks` line. The `dataAvailable` field tells you
whether LinkedIn actually returned anything for that test:

```json
{"id":"badge","state":"UNAVAILABLE","dataAvailable":false,"detail":{}}
{"id":"domain","state":"PASS","dataAvailable":true,"detail":{"domain":"acme.io"}}
```

`badge` and `headline` will read `false` until LinkedIn grants elevated
access. Once either flips to `true`, you can safely tighten the policy.

---

## Troubleshooting

**`{"message":"Internal Server Error"}` from API Gateway**
The Lambda crashed or timed out; API Gateway had no valid response to return.
Check CloudWatch. A `REPORT` line reading `Status: timeout` with
`Duration: 3000.00 ms` means the timeout is too low — raise it to 30s.

**`AccessDenied` XML from S3**
The Lambda redirected correctly, but the target page is not in the bucket.
Upload `verified.html` and `not-verified.html`, then invalidate CloudFront.
(S3 returns AccessDenied rather than NoSuchKey when the bucket policy lacks
`s3:ListBucket`.)

**`Token exchange failed: 400 ... Unable to retrieve access token`**
Almost always a reused authorization code — LinkedIn codes are single-use, so
reloading a `/callback?code=...` URL always fails. Start over from the
homepage. The Lambda now classifies this as `code_expired` and shows a retry
message rather than a generic error.

If it happens on a genuinely fresh sign-in, read the full `error_description`
in CloudWatch: the same 400 also covers a `redirect_uri` mismatch, which would
mean the URI in the Lambda, in `linkedin-auth.js`, and in the LinkedIn Portal
have drifted apart.

**Only `INIT_START` in the log stream, no `START` / `END` / `REPORT`**
The execution environment was killed during cold start, almost always the
timeout. Raise timeout and memory.

**Reading a CloudWatch `REPORT` line**
`Duration` is actual runtime, `Max Memory Used` vs `Memory Size` shows
headroom, and `Status: timeout` appears only on a timeout kill.

---

## Security note on the Calendly hand-off

The HMAC token proves the Lambda approved that person and expires in 15
minutes, but `verified.html` is a static page — the token check there is
cosmetic. `https://calendly.com/esmeralda-cabrera-v` is a public URL, so
anyone who knows it can book directly and skip verification.

To close that: use **Calendly single-use links** (Professional plan and up)
minted by the Lambda via the Calendly API, so each approved recruiter gets a
link that dies after one booking.

---

## Front-end changes

- Footer year → **2026**.
- Fifth portfolio tile (`Automations.png`). Grid went 4 → 5 columns, so all
  tiles scale down proportionally to stay on one row. Tablet 3-up, mobile 2-up.
- **Schedule an Interview** button, inline right of *See Resume*, violet variant.
- New files: `linkedin-auth.js`, `verified.html`, `not-verified.html`.
- The Automations tile links to
  `github.com/esmeralda-cabrera-ventura/Automations` — change if the repo name
  differs.

---

## Test coverage

The policy logic was tested against all 162 valid combinations of the five
tests across `PASS`/`FAIL`/`UNAVAILABLE`, verified against the rule "granted
if and only if `openid` and `profile` both pass": **162/162 correct.**
