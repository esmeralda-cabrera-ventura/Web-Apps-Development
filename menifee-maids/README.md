# Menifee Maids — website and job management system

A bilingual public website and a staff dashboard for a family-owned cleaning business in
Menifee, California. Customers request cleanings in English or Spanish; the owner and a
helper run the work from a phone.

Plain HTML, CSS and JavaScript on the front end — no framework, no build step. The back end
is two small Azure Functions apps and a Cosmos DB database.

> **Deploying this?** Read **[DEPLOY.md](DEPLOY.md)** first. It covers the two different
> authentication models, the Cosmos free-tier rule you only get one shot at, and the DNS
> setup for GoDaddy.

---

## What this is for

Most cleaning businesses in this area run on text messages and a paper calendar. Jobs get
double-booked, reminders get forgotten, and nobody can tell you what last month earned. And
almost every competitor is English-only in a region where Perris, Moreno Valley and Hemet
have large Spanish-speaking populations.

So the intent is narrow and specific:

1. **Take a booking without a phone call**, in either language, with an honest price shown
   before the customer commits.
2. **Never lose a request.** A booking is durable the moment it is accepted, even if
   everything downstream is having a bad day.
3. **Run the day from a phone**, because the owner is in someone's kitchen, not at a desk.
4. **Cost almost nothing to operate**, because a two-person business cannot carry $200/month
   of cloud bills while it is finding its feet.

Everything below follows from those four.

---

## The architecture, and why it looks like this

```
                    ┌──────────────────────────────────────┐
   customer ───────▶│  Azure Static Web Apps  (Free tier)   │
   browser          │  the site + /api managed functions    │
                    │  + Microsoft sign-in for staff        │
                    └───────┬──────────────────────┬────────┘
                            │                      │
                   accepted │                      │ reads/writes
                   booking  ▼                      ▼
                    ┌───────────────┐     ┌────────────────────┐
                    │ Storage Queue │     │  Cosmos DB (free)  │
                    │ booking-writes│     │  database: menifee │
                    └───────┬───────┘     └────────▲───────────┘
                            │                      │
                            ▼                      │
                    ┌──────────────────────────────┴────────┐
                    │  Function App  (Consumption)          │
                    │  queue: persistBooking                │
                    │  timer: sendReminders    17:00 daily  │
                    │  timer: archiveExpiring  1st monthly  │
                    │  timer: rollUpCustomers  nightly      │
                    └───────┬───────────────────────┬───────┘
                            │                       │
                            ▼                       ▼
                    ┌───────────────┐      ┌─────────────────┐
                    │ Blob Storage  │      │ Communication   │
                    │ photos+archive│      │ Services (email)│
                    └───────────────┘      └─────────────────┘
```

### Three decisions worth understanding

**The customer path never touches the database.** A booking is accepted the moment it is
safely on a Storage Queue, and the confirmation email goes out immediately. The queue
function writes it to Cosmos a second later. This keeps the customer's response off the
write path, and it means a transient database failure delays a booking rather than losing
one. If a message somehow exhausts every retry, `persistBookingPoison` emails you the full
details so the job is only ever delayed, never dropped.

**There are two function apps, not one.** Static Web Apps' managed API is HTTP-only — it
cannot run a timer or a queue trigger. So scheduled work lives in a separate Function App.
This is also why the two halves authenticate differently: the managed API has no managed
identity available to it and uses keys, while the Function App has a real identity and uses
it. DEPLOY.md explains this in detail, and it is the thing most likely to trip up a
deployment.

**Reminders are genuinely automatic.** `sendReminders` runs at 17:00 whether or not anyone
is logged in. This is only possible because Cosmos is always available — a database that
sleeps when idle cannot be queried on a schedule, and reminders would have to be sent by
hand.

---

## What's in here

| Path | What it is |
|---|---|
| `index.html` / `index-es.html` | Home — who we are, values, service area, contact form |
| `services.html` / `servicios.html` | Services, pricing, testimonials, FAQ |
| `book.html` / `reservar.html` | The quote and appointment request flow |
| `privacy.html` / `privacidad.html` | Privacy policy — required for SMS registration and Stripe |
| `dashboard.html` | The single staff entry point; routes by role and language |
| `admin.html` | **Owner dashboard** — English, includes Settings |
| `helper.html` | **Helper dashboard** — English, no Settings |
| `admin-es.html` | **Helper dashboard** — Spanish, no Settings |
| `pay.html` | The customer-facing invoice a payment link opens |
| `login.html` / `helper-login.html` / `acceso.html` | Redirect to Microsoft sign-in when deployed |
| `404.html` / `no-access.html` / `offline.html` | Error and offline pages, both languages |
| `sw.js` | Service worker — offline app shell for the dashboard |
| `staticwebapp.config.json` | Routing, role rules, headers, API runtime |
| `css/styles.css` | All styling |
| `js/store.js` | **Pricing rules**, service area ZIPs, availability |
| `js/booking.js` | The booking flow |
| `js/admin.js` | The dashboard |
| `js/db.js` | Job data layer — status model, search, local/REST adapters |
| `js/i18n.js` | Every translated string, customer-facing and dashboard |
| `js/auth.js` | Offline-only sign-in; inert on the deployed site |
| `js/access.js` | Reads the platform identity and enforces role on the client |
| `js/site.js` | Navigation, footer year, inquiry form |
| `js/bubbles.js` | The floating bubble effect |
| `api/` | Static Web Apps managed API — HTTP endpoints |
| `functions/` | Function App — queued writes, reminders, archiving, roll-up |
| `infra/deploy.sh` | The Azure deployment script |
| `assets/` | Logo, favicon, and two original SVG illustrations |
| `robots.txt`, `sitemap.xml` | Search engine files |

---

## Design

Colours are sampled from the logo — the aqua `#00B4CC` and royal blue `#0054B4` from the
emblem, with deep navy `#0C2A38` for text. The four-point sparkle from the logo is reused as
the marker above every section heading, so the branding carries through the page rather than
sitting only in the header.

Fonts are **Outfit** for headings and **Inter** for body text — clean geometric sans faces
chosen for legibility at small sizes on a phone.

The two illustrations in `assets/` are original SVG drawings, so there are no stock-photo
licences to worry about. **Swap them for real photos of your own finished jobs as soon as
you have some** — before-and-after shots outperform any illustration.

`js/bubbles.js` draws floating soap bubbles on a `<canvas>` that is fixed behind all content,
click-through so it can never block a button, paused when the tab is hidden, and switched off
entirely for visitors with "reduce motion" enabled.

---

## How the booking works

It is a **request**, not an instant booking:

1. Customer enters a ZIP. Outside the service area they are told to call rather than hitting
   a dead end.
2. They pick **My home** or **My business**.
   - **Home** → bedrooms, bathrooms, frequency, add-ons → a live price that updates as they tap.
   - **Business** → facility type, square footage, cleanings per week, scope → **no price
     shown**, because commercial is quoted after a walkthrough.
3. They choose a **first choice and a backup** time, from days *you* have marked open.
4. They enter name, mobile, email and address, and choose whether to allow completion photos
   and whether to receive text messages.
5. They review and send, and get a reference number plus a clear "this is a request, we'll
   confirm by end of day."
6. Nothing is charged.

The **Continue** button always stays clickable: pressing it with something missing shows a
red banner listing exactly what still needs filling in, highlights each field, and jumps
focus to the first gap. A greyed-out button that does nothing tells the visitor nothing, so
it is deliberately not used.

The request goes onto the queue, the customer gets a confirmation email, and it appears in
the dashboard a second later.

---

## Pricing — read this first

All the numbers live in `js/store.js` under `PRICING`:

```js
minimum: 150,        // minimum per visit
base: 75,            // starting point before rooms are counted
perBedroom: 28,
perBathroom: 25,

frequency: {
  once:     { mult: 1.00 },
  monthly:  { mult: 0.90 },
  biweekly: { mult: 0.75 },
  weekly:   { mult: 0.68 }
}
```

The formula is `(base + bedrooms + bathrooms) × frequency multiplier + add-ons`, floored at
the minimum and rounded to the nearest $5.

**Worked example.** A 3-bedroom, 2-bathroom home: 75 + (3 × 28) + (2 × 25) = **$210
one-time**. Biweekly at 0.75 = **$155**, which the page shows as *"Saving $55 every visit vs
$210 one-time."* Savings are stated in dollars, not percentages — "$55 off every visit" lands
harder than "25% off".

**Run four or five real jobs through the calculator and check the numbers match what you'd
actually charge.** This is the most important edit in the whole site. The add-on price list
is right below the frequency block.

If you later want deep cleans and move-outs priced higher, add a multiplier the same way the
frequency one works — the pattern is there to copy.

---

## Two languages

Every customer-facing page exists in both languages, with identical features. The switch sits
in the navigation on every page.

| English | Spanish |
|---|---|
| `index.html` | `index-es.html` |
| `services.html` | `servicios.html` |
| `book.html` | `reservar.html` |
| `privacy.html` | `privacidad.html` |

The booking flow is fully translated — steps, buttons, room labels, add-ons, error messages,
the estimate, the review summary and the confirmation. Dates and day names come from the
browser's own Spanish locale, so a Spanish customer sees *miércoles, 26 de agosto* where an
English one sees *Wednesday, August 26*.

The Spanish is written the way people actually speak here — *recámaras* rather than
*habitaciones*, *cochera* rather than *garaje*.

### Your side stays in English

The dashboard is always English. What changes is the language of the messages that go out.

Every job records the language it was booked in, and confirmations, reminders, on-my-way
texts, cancellations, invoices and completion notes are composed in that language
automatically. A job booked in Spanish still gets Spanish messages six months later.
Spanish-speaking customers carry an **Español** badge on their card so you know before you
pick up the phone.

There is also a Spanish dashboard (`admin-es.html`) for a Spanish-speaking helper. It is not
a second dashboard — both pages load the same `admin.js`, and everything it renders passes
through a translation step where the HTML meets the page. Add a feature once and it appears
in both; the only thing you add is its wording in `js/i18n.js`. An untranslated string falls
back to English rather than disappearing.

### SEO

Each page declares `hreflang` for both languages plus `x-default`, and both versions are in
`sitemap.xml`. Google serves the Spanish page to Spanish-language searchers, which is where
the traffic advantage actually comes from.

---

## Access and roles

Sign-in is **Microsoft account sign-in provided by Static Web Apps**. There are no passwords
in this codebase, and there is no password for you to manage.

Access is granted by **invitation** from the Azure portal, which assigns one of two custom
roles:

| | Owner | Helper |
|---|---|---|
| Owner dashboard `/admin.html` | Yes | **No** |
| Helper dashboards, either language | Yes | Yes |
| Jobs, photos, payments, calendar | Yes | Yes |
| Settings, Stripe keys, retention | Yes | **No** |

Everyone opens the same address — **`/dashboard`** — and is routed to the right page by role
and language preference.

Revoking someone's access is deleting their invitation. No password change, no redeploy.

> `js/auth.js` contains a username-and-password sign-in. **It only runs from a `file://`
> copy**, for offline demonstrations. On the deployed site the sign-in pages redirect
> straight to Microsoft and that code never executes.

---

## Running the day

### Your calendar

Open the dashboard.

- **Click any day** → tick the time windows you can work. Saved instantly.
- **Open all weekdays** fills the month with morning + afternoon in one click.
- **Apply to every Tuesday this month** copies one day's hours across that weekday.
- Customers only ever see days with at least one window open.

Availability is stored in Cosmos, one small document per month, so it follows you between
devices.

### The inbox

- **Accept first choice** / **Accept backup** — confirms it and opens a pre-written
  confirmation email.
- **Change date & time** — a date picker, time-window dropdown and note field on the card.
  **Save as confirmed** locks the slot and emails the customer; **Propose to customer**
  suggests it without confirming and parks the request under *Awaiting client*.
- **Send payment link** — appears once confirmed.

### The booked jobs calendar

Your actual schedule. Nothing is entered by hand — every request you accept appears on its
confirmed date. Days with work are highlighted, with one dot per job. Click a day and each
job opens with the customer's contact details, whatever they told you at booking (gate codes,
pets, parking), a date picker and time window for moving it, and a notes box.

**Cancel booking** sends the job back to the inbox as a new request rather than deleting it,
so nothing is lost by accident. **Add a booking manually** covers work booked over the phone.

### Completing a job

**Mark completed** on a confirmed job opens the finish panel:

1. **Upload photos** — opens the phone's camera or library. Up to 7 per job.
2. Photos shrink to 1400px and re-encode as JPEG **on the device** before upload. That keeps
   them small and, because re-encoding drops EXIF, it **strips the GPS coordinates your phone
   embeds in every shot**. You don't want a customer's home coordinates riding inside an image.
3. The browser uploads straight to Blob Storage using a short-lived signed URL from
   `/api/photos`. The job document stores only the path — never the bytes.
4. Write a message to the customer, then choose **Complete & send photos**, **Complete &
   email**, or **Complete without sending**.

**Why photos can't auto-attach to email on a computer:** no browser lets a web page put a
file into your mail client. That is a security boundary, not an oversight. On a phone the
share sheet handles it, which is why the dashboard is worth opening on your phone at the end
of a job.

### The job database

Every job carries a status, and status decides which side of the ledger it sits on.

**A job closes only when both things are true: the work is done and the money is in.**

| What the card says | Where it shows |
|---|---|
| New request | Present |
| Awaiting client | Present |
| Confirmed | Present |
| **Done — unpaid** | Present |
| **Closed** (done and paid) | Past |
| Cancelled | Past |

A finished job you haven't been paid for shows a warning on its card, with **Mark as paid**
as the main button. If they paid cash or by check, **Mark as paid** asks what they paid and
records it.

Two different reopen buttons, for two different problems: **Reopen job** when the work needs
revisiting (photos, notes and payment history are kept), and **Mark unpaid** when the money
fell through — a bounced check, a reversed charge.

Search covers job number, name, company, phone, email, address and city, filtered by status,
paid state and date range. **Export as PDF** and **Export as CSV** both cover the whole
filtered set, not just the rows on screen.

The top right shows three figures for the current calendar month: revenue collected (payments
actually marked paid, not invoices sent), days worked (distinct dates, two jobs on one
Tuesday is one day), and jobs closed.

---

## Retention — records are deleted after 90 days

Closed jobs carry a **90-day TTL** in Cosmos. When it elapses, Cosmos deletes the document
for free. **This is permanent and there is no recycle bin.**

Ninety days is shorter than most record-keeping needs — the IRS generally expects business
records for at least three years, and California has its own requirements — so two timers
exist to make that safe:

- **`archiveExpiring`** runs on the 1st of each month, writes a dated JSON and CSV snapshot of
  everything approaching expiry to Blob Storage, and emails you that it has done so. About a
  cent a month, and it turns an irreversible deletion into a permanent archive.
- **`rollUpCustomers`** runs nightly and folds each closed job into a tiny customer aggregate
  — visit count, first and last visit, lifetime spend, cities. Deliberately minimal: no
  addresses, no notes, no photos. Without it, a customer who booked four months ago would
  look like a stranger.

`RETENTION_DAYS` on the Function App changes the window.

---

## Payment links

Payment links are generated per job and only you hand them out. There is no public payment
page and no "Pay" item in the navigation.

On any confirmed request, **Send payment link** opens a panel where you set the amount
(pre-filled with the estimate) and what it's for:

```
https://www.menifeemaids.com/pay.html?job=MCC-260824-V1DS#d=eyJ0IjoiUjlmYlBac...
```

**How the link carries its data.** The job reference, customer name, amount, description and
expiry ride inside the part of the URL after the `#`. Browsers never send that to a server, so
the invoice renders on the customer's phone without a database lookup. The job number appears
twice — readably in the address and inside the payload — and `pay.html` checks them against
each other, so an edited link is rejected rather than showing the wrong customer's balance.

Creating a new link for a job retires the previous one, so there is never more than one live
link per job. Expired, edited or hand-typed links show a friendly "this link isn't active"
page with your phone number.

Invoices follow the language the customer booked in — the link carries `&lang=es`.

### Connecting Stripe

1. In Stripe, create a **Payment Link**.
2. Paste it into **Dashboard → Settings → Stripe payment link**.
3. Add a metadata field called `job_number` to the Stripe link, or enable a custom field that
   captures it — that is what ties a charge back to a job.

Until you do, the Pay button politely tells the customer that card payments aren't switched
on yet and gives them your phone number.

**Checking who has paid.** `/api/verify-payment` queries Stripe with your secret key, which
stays on the server — a secret key in a web page is not secret, and anyone could read it in
view-source and issue refunds. **Check with Stripe** on a single job, or **Check payments
with Stripe** to run through every outstanding link at once.

⚠️ **One thing to know before real money moves through it.** The amount currently lives in the
URL, which a technically-minded customer could edit. Stripe always charges what Stripe was
told to charge, so your exposure is limited to someone underpaying an invoice you'd notice —
but before you rely on it, either use fixed-price Stripe Payment Links per service so Stripe
controls the amount, or move link creation to a server that signs the payload.

---

## Text messages

There are two kinds, and only one needs registration.

**Manual texts — work immediately, cost nothing.** Four buttons sit on every confirmed job:
**On my way**, **On my way — email**, **Text confirmation**, and **Text reminder**. Each opens
your own phone's messaging app with the wording ready; you press send, and it goes from
951-464-8147. No Azure service involved.

**Automatic texts — need A2P 10DLC registration.** The 24-hour reminder timer and the
new-booking alert send through Communication Services. Registration costs about $44 and takes
days to weeks.

**The site launches email-only, and nothing is blocked by that.** With `ACS_SMS_FROM` and
`OWNER_SMS` unset, `sendSms()` returns `{ sent: false }` rather than throwing, and both send
paths email regardless. Reminders and booking alerts work on day one.

When you do register, the compliance pieces are already in place: the privacy policy pages,
the opt-in checkbox on both booking forms with frequency, rates, STOP/HELP and
"consent is not a condition of purchase", and per-customer consent recorded as `smsConsent`
and `smsConsentAt` on the job. `sendReminders` only texts customers who ticked the box.

Message wording lives in `js/admin.js` (`msgConfirm`, `msgReminder`, `msgOnMyWay`,
`msgCancel`).

---

## Working offline

`sw.js` caches the app shell so the dashboard opens on a bad connection. It never caches
`/api/` (job data must be live) or `/.auth/` (a stale answer to "is this person allowed in"
would be a real bug). Pages are network-first, falling back to cache and then to
`offline.html`, which reloads itself when the connection returns.

Install the dashboard on your phone: open it, browser menu, **Add to Home Screen**. Beyond
convenience, **iOS clears script-writable storage for sites not visited in seven days, and
installed sites are exempt.**

Customers are never offered this — the public pages carry no manifest.

---

## Things to change before launch

### 1. Testimonials — the three reviews on the site are SAMPLES ⚠️

`services.html` ships with three written example reviews so you can see the section populated.
**They are not real customers.** Replace all three with genuine quotes before the site goes
live, then delete the grey setup box above them.

Under the FTC's 2024 rule on consumer reviews, publishing invented testimonials as though they
were real is deceptive advertising and carries civil penalties. This is not a cosmetic to-do.

To set a star rating, repeat the full-star `<svg>` once per star; for a half star use the
half-star `<svg>`, and give each a unique gradient `id` (`hs1`, `hs2`, `hs3`).

**Don't add `aggregateRating` schema** until the reviews are real — marking up ratings you
don't have is a Google penalty. There is none in the file right now, deliberately.

Notice what makes the samples work: each names a **specific service** and a concrete outcome.
Ask your real customers for that rather than "great job, thanks!"

### 2. Check the pricing against real jobs

See the Pricing section above. This is the edit that matters most.

### 3. Service area ZIPs

`js/store.js` → `ZIPS` maps every ZIP to its city, and `CITIES` holds the list. Fifteen cities
are covered. Adding another means four edits: `js/store.js`, the `.cities` list and
`areaServed` JSON-LD in `index.html`, the `areaServed` array and FAQ answer in
`services.html`, and the footer "Serving…" line.

One to watch: **92587 is Canyon Lake, not Menifee** — a common local mix-up, since Sun City
(92586) *is* part of Menifee.

### 4. Business name consistency

The site uses **Menifee Maids** everywhere, matching the logo. Whatever you use must match
your **Google Business Profile exactly** — inconsistent names hurt local search.

### 5. Footer credit

The footer credit names Apex Intelligent Systems and the lead developer. Update it in every
page if the credit ever changes.

---

## SEO

Already in place:

- Unique titles and meta descriptions per page, built around target keywords
- `HouseCleaningService` structured data with all fifteen cities in `areaServed`
- `Service` and `OfferCatalog` markup on the services page
- `FAQPage` markup on the services FAQ — this can win expandable answers in Google results
- `hreflang` pairs on every page plus `x-default`
- Semantic headings, canonical URLs, Open Graph tags, favicon, sitemap and robots files
- Keywords worked into real sentences rather than stuffed

**The three things that will actually move your rankings, none of which are code:**

1. **Claim and complete your Google Business Profile.** For local service searches this
   outranks everything on your website.
2. **Get reviews on that profile.** Volume and recency both count.
3. **Consistent name, phone and service area** everywhere you appear — Yelp, Facebook,
   Nextdoor, Angi. Mismatched details dilute you.

To rank harder in specific cities later, add a page per city with genuinely different content
about that area. Don't clone one page fifteen times with the city swapped — Google treats that
as duplicate content.

---

## Accessibility and browser support

Keyboard navigable with visible focus rings, labelled form fields, skip link,
`prefers-reduced-motion` respected (bubbles and all animation switch off), and responsive down
to small phones. Works in current Chrome, Safari, Firefox and Edge.

---

## Looking around locally

Unzip and double-click `index.html`. The public site works entirely offline. The booking flow
runs on browser storage, the API is skipped, and `js/auth.js` stands in for Microsoft sign-in
so you can see the dashboard.

**None of that offline behaviour runs on the deployed site.** It exists so you can explore the
thing without an Azure account.
