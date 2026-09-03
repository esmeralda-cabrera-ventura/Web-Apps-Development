# Deploying to Azure

Built on the **Cosmos DB free tier** — 1,000 RU/s and 25 GB free for the lifetime of the
account. Target running cost is **under $2/month**, and $0 of that is compute.

Everything here assumes the domain **menifeemaids.com** and the owner mailbox
**info.menifeemaids@outlook.com**.

---

## What runs where

```
Azure Static Web Apps  (Free)
├── the site
├── authentication (Microsoft sign-in + invited roles)
└── /api  — managed functions, HTTP only
    ├── POST   /api/bookings        queue + ACS, no database on the customer path
    ├── POST   /api/contact         ACS
    ├── GET    /api/health          liveness
    ├── GET    /api/availability    public
    ├── PUT    /api/availability    owner + helper
    ├── GET|PUT|DELETE /api/jobs    owner + helper
    ├── GET|POST|PUT   /api/payments owner + helper
    ├── POST   /api/photos          owner + helper — issues upload URLs
    ├── GET|PUT /api/settings       tiered by role
    └── GET    /api/verify-payment  owner only — Stripe

Azure Cosmos DB  (free tier, always on)
└── database `menifee`, 1000 RU/s shared
    ├── jobs          /id
    ├── payments      /jobId
    ├── availability  /monthKey
    ├── settings      /id
    └── customers     /contactKey

Blob Storage        job-photos, job-archive
Storage Queue       booking-writes (+ booking-writes-poison)

Function App  (Consumption, System-Assigned Managed Identity)
├── queue  persistBooking       drains queued bookings into Cosmos
├── queue  persistBookingPoison emails you a booking that exhausted its retries
├── timer  sendReminders        17:00 daily — emails (and optionally texts) tomorrow's customers
├── timer  archiveExpiring      1st monthly — saves records before TTL deletes them
└── timer  rollUpCustomers      nightly — keeps a customer aggregate that outlives jobs
```

Static Web Apps' managed API is **HTTP-only**, which is why timers and queue triggers live
in the separate Function App.

**Put everything in West US 2.** Static Web Apps is not offered in West US 3, and you want
the managed API in the same region as Cosmos and Storage.

---

## The two authentication models, and why they differ

This is the single most important thing to understand before you set application settings,
because getting it wrong produces a site that deploys perfectly and then fails every
request.

| | Static Web Apps `/api` | Function App `functions/` |
|---|---|---|
| Managed identity available? | **No** | Yes |
| Cosmos | `COSMOS_KEY` | managed identity + data role |
| Storage | `STORAGE_CONNECTION_STRING` | managed identity + data roles |
| ACS | `ACS_CONNECTION_STRING` | `ACS_CONNECTION_STRING` or endpoint + identity |

**Static Web Apps' managed functions have no managed identity.** Microsoft provisions one
on the Static Web App resource, but it is only used to read secrets from Key Vault — it is
not available to the function runtime. `DefaultAzureCredential` inside `/api` finds no
token endpoint and throws. The documented escape hatch, "bring your own functions", needs
the Standard plan at $9/month and defeats the point.

So `/api` uses keys, and the Function App — which has a real identity — uses it.

Every shared module in `api/src/shared/` implements both paths and picks based on which
settings are present:

- `cosmos.js` — `COSMOS_KEY` wins if set, else identity
- `queue.js` — `STORAGE_CONNECTION_STRING` wins if set, else identity
- `photos.js` — shared-key SAS if `STORAGE_CONNECTION_STRING` is set, else user delegation SAS
- `acs.js` — `ACS_CONNECTION_STRING` wins if set, else endpoint + identity

You never edit code to switch. You set different settings on the two apps.

### What it looks like when this is wrong

The site loads. The pages render. Then:

- The dashboard shows **"Cosmos refused that request"** or a bare 500 on every load.
- Bookings fail at the final step, or succeed but never appear in the dashboard.
- Photo upload returns 500 the moment you pick a file.

The Application Insights exception is `CredentialUnavailableException` or
`ManagedIdentityCredential authentication unavailable`. If you see that on the Static Web
App, you are missing a key setting, not a role assignment.

---

## Authentication — do this, not a password in the code

The dashboard is protected by **Static Web Apps built-in authentication**. An
unauthenticated request for `/admin.html` is stopped at the edge and never reaches the
file, which is what makes publishing this repository safe.

**Use the pre-configured Microsoft provider.** `staticwebapp.config.json` deliberately has
**no `auth` block**. Adding one — even just to set `userDetailsClaim` — turns it into a
*custom registration*, and custom authentication requires the **Standard plan**. On Free a
custom block is ignored; on Standard it costs $9/month for a claim you do not need.

Without an `auth` block you get `/.auth/login/aad` for free: no app registration, no client
secret, no `AAD_CLIENT_ID` / `AAD_CLIENT_SECRET` settings.

### After the first deploy

1. **Static Web App → Role management → Invite.**
   - You: role **`owner`**
   - Your helper: role **`helper`**
   - Free tier allows 25 users in custom roles. You need two.
2. **Turn on MFA** for both Microsoft accounts. Free, and the single biggest security
   improvement available here.

**Your helper needs a Microsoft account** — any free Outlook or Hotmail address. Sort that
out before sending the invitation.

### The trap

Never use the built-in `authenticated` role on a dashboard route:

```jsonc
{ "route": "/admin.html", "allowedRoles": ["authenticated"] }   // WRONG
```

`authenticated` means "has a Microsoft account" — that is everyone on earth, not you. The
custom roles `owner` and `helper` are assigned only by your invitation. The API enforces
the same rule a second time and answers **403** to an account that is signed in but never
invited, which lands them on `no-access.html`.

### Who can do what

| Page | Who | Language | Settings |
|---|---|---|---|
| `/admin.html` | Owner only | English | Yes |
| `/helper.html` | Owner + helper | English | No |
| `/admin-es.html` | Owner + helper | Spanish | No |

| | Owner | Helper |
|---|---|---|
| Owner dashboard `/admin.html` | Yes | **No** |
| Helper dashboards (either language) | Yes | Yes |
| Jobs, photos, payments, calendar | Yes | Yes |
| Settings, Stripe keys, cloud config | Yes | **No** |
| `/api/verify-payment` | Yes | No |

Language is a preference, not a permission: invite each helper with their own Microsoft
account. The English helper opens `/helper.html`, the Spanish helper opens `/admin-es.html`,
and either can switch. Revoking one person's invitation does not affect the other.

Revoking access is deleting the invitation. No password to change, no redeploy.

---

## Keeping the API address and keys away from helpers

Removing the Settings form was not enough on its own: anything a browser holds can be read
from developer tools in two clicks. So configuration lives on the server and
`/api/settings` decides what each caller is allowed to know.

| Caller | Receives |
|---|---|
| Anonymous (`pay.html`) | The Stripe Payment Link and the business name. That link is public by design — it is what a customer opens to pay. |
| **Helper** | Business name, expiry days, and a yes/no on whether payments are switched on. **No URLs of ours, no keys, no database address.** |
| Owner | Everything the Settings card edits. |

The API key is never returned to anyone. Three further measures back this up:

- **The browser sends no key on the deployed site.** A same-origin API is authenticated by
  the platform cookie, so `js/db.js` attaches a key only to a cross-origin API — which
  exists solely for local development.
- **Helper sessions scrub storage on load**, synchronously, before the first request goes
  out. A shared or previously-owner device is cleaned rather than trusted.
- **Server settings are held in memory**, never written to storage, so nothing sensitive
  lands on a helper's phone even briefly.

## One address for the dashboard

Everyone uses **`/dashboard`**. It signs them in, reads the role Static Web Apps assigned,
and forwards them:

| Signed in as | Lands on |
|---|---|
| Owner | `/admin.html` (English, with Settings) |
| Helper, English | `/helper.html` |
| Helper, Spanish | `/admin-es.html` |

On a first visit it asks which language, once, then remembers. Nobody has to know that
`admin`, `helper` and `admin-es` exist.

Worth doing in the portal: add a short second custom domain such as `panel.menifeemaids.com`
pointing at the same app. Static Web Apps gives two custom domains free with managed TLS.

## Working without a signal

`sw.js` caches the app shell, so the dashboard opens on a bad connection and reads from
whatever is stored on the device. Two things it never caches:

- **`/api/`** — job data must be live.
- **`/.auth/`** — a stale answer to "is this person allowed in" would be a real bug.

Pages are fetched network-first so a deploy appears immediately, falling back to cache and
then to `offline.html`, which reloads by itself when the connection returns.

## Installing it on a phone — staff only

**Customers never install anything.** The public pages carry no web app manifest and no
`apple-mobile-web-app-capable` tag, so no browser offers them an install banner.

That second tag matters more than it looks: it makes a page launch without browser
chrome. A customer who saved the booking page to their home screen would lose the back
button mid-form with no obvious way out.

### You and your helper should install it

Open the dashboard, browser menu, **Add to Home Screen**.

| Manifest | Used by | Opens at |
|---|---|---|
| `dashboard.webmanifest` | English | `/dashboard` |
| `dashboard-es.webmanifest` | Spanish | `/dashboard` |

Both start at `/dashboard`, so the icon always lands the right person on the right
dashboard. They use `display: minimal-ui` rather than `standalone`, which keeps a back
button and the address bar without losing the icon or the iOS storage exemption.

Installing matters beyond convenience: **iOS clears script-writable storage for sites not
visited in seven days, and installed sites are exempt.**

---

## Custom domain and GoDaddy

Your canonical URL is `https://www.menifeemaids.com`. Point that first.

**`www` — a CNAME.** One record: `www` → your `*.azurestaticapps.net` hostname. No URL
forwarding, no masking, no competing A record for the same host.

**The apex (`menifeemaids.com`) — GoDaddy cannot do this properly.** GoDaddy supports
neither ALIAS/ANAME records nor CNAME flattening, which is what an apex needs. Three
options, in order of preference:

1. **GoDaddy domain forwarding to `www`.** Free, immediate, and the right answer here.
   Forwarding Type: *Permanent (301)*, Forward with: *Forward only* — not masking, which
   breaks HTTPS and SEO.
2. **An A record** to the Static Web App's regional IP. Works, but sends all traffic to one
   region and the IP can change.
3. **Move DNS to Azure DNS.** Technically cleanest, but ~$0.50/month and means re-creating
   every record including your mail SPF and DKIM. Not worth it for one redirect.

Expect a `_dnsauth` **TXT** record for validation on both names — Static Web Apps now
validates by TXT token rather than by CNAME.

⚠️ **Do not point `www` at Azure until the site is deployed and working on the
`*.azurestaticapps.net` URL.** Validation fails against a half-built app and the retry loop
is slow.

---

## Deploy

```bash
cd infra
./deploy.sh
```

Idempotent — re-run it safely. It creates everything, wires the Function App's managed
identity, and prints both `appsettings` commands with your real names and keys filled in.

If you would rather click through the Azure Portal, the script is still worth reading: it
documents exactly what each step is supposed to produce.

The two code trees deploy separately:

- **`api/` deploys with the site**, automatically, through the GitHub Action that Static
  Web Apps creates when you connect the repo. You never deploy it by hand.
- **`functions/` deploys on its own** to the Function App, with `func azure functionapp
  publish <name>` or the VS Code Azure Functions extension. It is not part of the site
  build and will not update when you push.

Then:

1. Verify your sending domain in Communication Services; add the SPF and DKIM records.
2. Set a **$5 budget alert** — Azure has no automatic spend cap.
3. Invite yourself and your helper in Role management.
4. SMS is optional and comes last. See below.

---

## The four rules that keep it free

1. **Enable the free tier when you create the Cosmos account.** It cannot be added later,
   and there is one per subscription. `deploy.sh` refuses to pretend otherwise if the
   account already exists.
2. **Shared throughput on the database, manual, capped at 1,000 RU/s.** Not autoscale —
   autoscale can climb past the free ceiling and bill you.
3. **Photos in Blob, not in documents.** `/api/photos` issues short-lived signed URLs and
   the browser uploads straight to Blob; the job document stores only the path.
4. **Budget alert.** Free, and it tells you the moment anything changes.

At 200 jobs a month you will use well under 1 RU/s averaged — roughly three orders of
magnitude of headroom.

---

## The permission that catches everyone

Cosmos data-plane access is a **separate system** from normal Azure RBAC. An identity with
"Contributor" can read your account keys but cannot read a single document. The data role
is assigned with its own command, which `deploy.sh` runs for the Function App:

```bash
az cosmosdb sql role assignment create -g "$RG" -a "$COSMOS" \
  --role-definition-id 00000000-0000-0000-0000-000000000002 \
  --principal-id "$PRINCIPAL" --scope "/"
```

**This applies to the Function App only.** The Static Web App has no identity to grant it
to; it uses `COSMOS_KEY`. Do not spend an afternoon assigning a data role to a principal
that does not exist.

---

## Retention, and why the archive timer matters

Closed jobs carry a TTL of 90 days (`RETENTION_DAYS`). Cosmos deletes them for free once
it elapses — no purge job to run or fail.

Two things to understand:

- **The clock runs from the last write.** Editing an old job restarts its 90 days, which
  is the behaviour you want.
- **Deletion is silent and permanent.** There is no recycle bin.

That second point is why `archiveExpiring` exists. On the 1st of each month it writes a
dated JSON and CSV snapshot of everything approaching expiry to Blob Storage and emails
you that it has done so. Three months is shorter than most record-retention needs, and
this turns an irreversible deletion into a permanent archive for about a cent a month.

`rollUpCustomers` solves the related problem: once a job is deleted, a customer who booked
four months ago would look like a stranger. It folds each closed job into a tiny aggregate
— visit count, first and last visit, lifetime spend, cities — with no addresses, notes or
photos.

---

## Settings

### Static Web App — key-based

| Setting | Value | Purpose |
|---|---|---|
| `COSMOS_ENDPOINT` | `https://<acct>.documents.azure.com:443/` | The database |
| `COSMOS_DATABASE` | `menifee` | |
| `COSMOS_KEY` | primary key | **Required.** No managed identity here |
| `STORAGE_ACCOUNT_URL` | `https://<acct>.blob.core.windows.net` | Builds photo paths |
| `STORAGE_CONNECTION_STRING` | full connection string | **Required.** Queue writes and SAS signing |
| `SITE_URL` | `https://www.menifeemaids.com` | Builds payment link URLs |
| `ACS_CONNECTION_STRING` | from the ACS resource | Email |
| `ACS_SENDER_ADDRESS` | `DoNotReply@<verified-domain>` | Must match a verified domain |
| `OWNER_EMAIL` | `info.menifeemaids@outlook.com` | Where new-request alerts go |
| `API_KEY` | random hex | Guards owner routes when not behind SWA |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Payment verification |
| `ACS_SMS_FROM` | **leave unset** | Until A2P completes |
| `OWNER_SMS` | **leave unset** | Until A2P completes |

⚠️ `SITE_URL` must match the domain you actually serve, or every payment link points at the
wrong host and customers get a dead page.

### Function App — identity-based

Same Cosmos, storage and ACS values, **minus `COSMOS_KEY` and `STORAGE_CONNECTION_STRING`**
(it has an identity), plus:

| Setting | Default | Purpose |
|---|---|---|
| `WEBSITE_TIME_ZONE` | `Pacific Standard Time` | **Required** |
| `REMINDERS_ENABLED` | `true` | `false` switches the daily reminder off |
| `REMINDER_CRON` | `0 0 17 * * *` | |
| `RETENTION_DAYS` | `90` | |
| `ARCHIVE_CRON` | `0 0 3 1 * *` | |

⚠️ **`WEBSITE_TIME_ZONE` is not optional.** Function Apps run on UTC. Without it the 17:00
reminder fires at 10:00 Pacific. Nothing errors — the reminders just go out at the wrong
time of day, and you will not notice for weeks.

---

## Text messages — launch without them

There are two kinds of SMS in this app and **only one needs registration**.

**Manual texts need nothing.** The dashboard's text buttons open your own phone's messaging
app with the message pre-written, sending from 951-464-8147. They work the moment the site
is deployed. No Azure service, no registration, no cost.

**Automatic texts need A2P 10DLC.** The 24-hour reminder and the new-booking alert send
through ACS. Leave `ACS_SMS_FROM` and `OWNER_SMS` unset and both **degrade to email
silently and safely** — designed behaviour, not a fallback that might break:

- `sendReminders` sends the email unconditionally, *after* the SMS attempt, regardless of
  its result. SMS is purely additive.
- `bookings.js` sends the owner alert email unconditionally and guards the SMS behind
  `process.env.OWNER_SMS`.
- `acs.js` `sendSms()` returns `{ sent: false, error: "sms not configured" }` rather than
  throwing.

Launching email-only is the recommended path. Nothing is blocked by it.

### Before you register

Reviewers check the live site. You need, and this repo now has:

- **A public privacy policy** at `/privacy.html` and `/privacidad.html`, stating that
  mobile information is never shared or sold for marketing.
- **Opt-in language at the point of collection** — the `smsConsent` checkbox on
  `book.html` and `reservar.html`, carrying message frequency, "message and data rates may
  apply", STOP and HELP, and "consent is not a condition of purchase".
- **Consent recorded per customer.** `smsConsent` and `smsConsentAt` are stored on the job,
  and `sendReminders` texts only customers who ticked the box.

---

## Cost

| Line | Monthly |
|---|---|
| Static Web Apps (Free) | $0.00 |
| Cosmos DB (free tier) | $0.00 |
| Functions (Consumption) | $0.00 |
| Blob Storage (~5 GB) | ~$0.15 |
| Storage Queue | ~$0.01 |
| Application Insights | $0.00 |
| ACS email (~800 messages) | ~$0.30 |
| Domain, amortized | ~$1.25 |
| **Without SMS** | **~$1.70** |
| ACS SMS (number, campaign, ~600 segments) | ~$8.80 |
| **With SMS** | **~$10.50** |

One-time: **~$44** for A2P 10DLC registration. Plus Stripe's 2.9% + $0.30 per transaction.

**SMS is the entire bill.** Launching email-only keeps you under $2/month, and the SMS
templates and sending code are already written for whenever you turn it on.

---

## Local development

```bash
cd api && npm install && func start          # http://localhost:7071/api
cd functions && npm install && func start    # timers and queue
```

Put `COSMOS_ENDPOINT`, `COSMOS_KEY`, `STORAGE_CONNECTION_STRING` and the ACS values in
`local.settings.json` — which `.gitignore` already excludes, because it is the most common
way people leak Azure keys. With no `ACS_*` set, email and SMS return `{ sent: false }`
rather than throwing, so the booking flow stays testable offline.

Opened from a `file://` copy the site skips the API entirely and runs on browser storage,
and the built-in sign-in in `js/auth.js` stands in for the platform. That path exists only
for offline demonstrations; on the deployed site it never runs, because
`staticwebapp.config.json` redirects `login.html`, `acceso.html` and `helper-login.html`
straight to `/.auth/login/aad`.
