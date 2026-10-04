# Menifee Maids: Website and Job Management System

Menifee Maids is a family-owned cleaning business serving Menifee, California and the surrounding Inland Empire communities. This repository contains the bilingual (English and Spanish) public website and the staff dashboard the business uses to manage requests, schedule work, document completed jobs and collect payment.

The front end is plain HTML, CSS and JavaScript with no framework and no build step. The back end consists of two small Azure Functions apps and a Cosmos DB database.

> **Before deploying,** read [DEPLOY.md](DEPLOY.md). It covers the two authentication models used by the API, the Cosmos DB free-tier setting that can only be applied once per subscription, and the GoDaddy DNS configuration.

---

## Project goals

Most cleaning businesses in this area operate on text messages and a paper calendar. Jobs get double-booked, reminders are missed, and there is no reliable record of monthly revenue. Nearly every local competitor is also English-only, even though Perris, Moreno Valley and Hemet have large Spanish-speaking populations.

I designed the system around four requirements:

1. **Customers can request a cleaning without a phone call**, in either language, and see an accurate price before they commit.
2. **No request is ever lost.** A booking is stored durably the moment it is accepted, even if downstream services are unavailable.
3. **The business runs from a phone.** The owner is usually on a job site, not at a desk.
4. **Operating costs stay close to zero.** A two-person business cannot absorb a large monthly cloud bill while it establishes itself.

The architecture and design decisions below follow from these requirements.

---

## Architecture

```
                    ┌──────────────────────────────────────┐
   customer ───────▶│  Azure Static Web Apps  (Free tier)   │
   browser          │  the site + /api managed functions    │
                    │  + Microsoft sign-in for staff        │
                    └───────┬──────────────────────┬────────┘
                            │                      │
                 fallback │                      │ bookings, sync
                 only     ▼                      ▼
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

### Key design decisions

**Bookings are written directly to the database, with a queue as a fallback.** The booking API saves each request to Cosmos DB and then sends the confirmation emails. If the database write fails, the booking is placed on a Storage Queue instead, and the `persistBooking` function writes it once the database is reachable. A queued copy never overwrites a job that already exists, so a late write cannot undo changes the owner has made. If a queued message exhausts all retries, `persistBookingPoison` emails the full booking details to the owner. The reference number shown to the customer is the one stored and quoted in both emails.

**Every staff device works from the same data.** The dashboard keeps a working copy in the browser so it stays fast and usable on a weak connection, and `js/sync.js` keeps that copy in step with Cosmos DB through the `/api` routes. Jobs, payment links, photos and the availability calendar are pulled when the dashboard opens, every 45 seconds while it is visible, and whenever the phone reconnects. Local changes are pushed within a couple of seconds. A record edited on two devices at once resolves to the most recent edit. As a safeguard, if more than three jobs disappear from a device at once (for example, because the browser cleared its storage), they are restored from the cloud rather than deleted. A status indicator in the corner of the dashboard shows whether the device is synced.

**The back end is split across two function apps.** The Static Web Apps managed API supports HTTP triggers only, so the queue and timer functions run in a separate Function App. The two apps also authenticate differently. The managed API has no managed identity and uses connection keys, while the Function App uses its system-assigned managed identity. DEPLOY.md describes this in detail, since it is the most common source of deployment problems.

**Reminders run on a schedule without anyone signed in.** `sendReminders` runs daily at 17:00 Pacific. This depends on Cosmos DB being continuously available; a database that pauses when idle could not be queried on a timer.

---

## Repository contents

| Path | Description |
|---|---|
| `index.html` / `index-es.html` | Home page: about the business, service area, contact form |
| `services.html` / `servicios.html` | Services, pricing, testimonials, FAQ |
| `book.html` / `reservar.html` | Quote and appointment request flow |
| `privacy.html` / `privacidad.html` | Privacy policy (required for SMS registration and Stripe) |
| `dashboard.html` | Single staff entry point; routes by role and language |
| `admin.html` | Owner dashboard (English, includes Settings) |
| `helper.html` | Helper dashboard (English, no Settings) |
| `admin-es.html` | Helper dashboard (Spanish, no Settings) |
| `pay.html` | Customer invoice page opened from a payment link; starts Stripe checkout |
| `login.html` / `helper-login.html` / `acceso.html` | Redirect to Microsoft sign-in on the deployed site |
| `404.html` / `no-access.html` / `offline.html` | Error and offline pages |
| `sw.js` | Service worker providing an offline shell for the dashboard |
| `staticwebapp.config.json` | Routing, role rules, headers and API runtime |
| `css/styles.css` | All site styles |
| `js/store.js` | Pricing rules, service-area ZIP codes, availability |
| `js/booking.js` | Booking flow |
| `js/admin.js` | Dashboard |
| `js/db.js` | Job data layer: status model, search, local and REST adapters |
| `js/sync.js` | Keeps each dashboard's working copy in step with Cosmos DB |
| `js/i18n.js` | All translated strings for the site and dashboard |
| `js/auth.js` | Offline-only sign-in; not used on the deployed site |
| `js/access.js` | Reads the platform identity and enforces roles on the client |
| `js/site.js` | Navigation, footer year, inquiry form |
| `js/bubbles.js` | Background bubble animation |
| `api/` | Static Web Apps managed API (HTTP endpoints) |
| `functions/` | Function App (queued writes, reminders, archiving, customer roll-up) |
| `infra/deploy.sh` | Azure deployment script |
| `assets/` | Logo, icons and two original SVG illustrations |
| `robots.txt`, `sitemap.xml` | Search engine files |

---

## Design

The color palette is taken from the logo: aqua `#00B4CC` and royal blue `#0054B4`, with deep navy `#0C2A38` for body text. The four-point sparkle from the logo appears above each section heading so the branding carries through the page.

Headings use **Outfit** and body text uses **Inter**. Both are geometric sans-serif typefaces chosen for readability on small screens.

The two illustrations in `assets/` are original SVG drawings, so no stock image licensing applies. I plan to replace them with before-and-after photos of completed jobs once those are available.

`js/bubbles.js` draws a soap-bubble animation on a fixed canvas behind the page content. It ignores pointer events so it never blocks a control, pauses when the tab is hidden, and is disabled for visitors who have enabled reduced motion.

---

## Booking flow

Customers submit a **request**, not an instant booking:

1. The customer enters a ZIP code. Addresses outside the service area are asked to call instead.
2. They choose **My home** or **My business**.
   - **Home:** bedrooms, bathrooms, frequency and add-ons, with a price that updates as they make selections.
   - **Business:** facility type, square footage, cleanings per week and scope. No price is shown, because commercial work is quoted after a walkthrough.
3. They select a first-choice and a backup time from the days the owner has marked as available.
4. They enter their name, mobile number, email and address, and indicate whether they allow completion photos and text messages.
5. They review and submit, then receive a reference number and a notice that the request will be confirmed by end of day.
6. No payment is collected at this stage.

The **Continue** button always remains active. If required information is missing, a banner lists what still needs to be completed, each affected field is highlighted, and focus moves to the first one. I chose this over a disabled button, which gives the visitor no indication of what is wrong.

Each submitted request is queued, the customer receives a confirmation email, and the request appears in the dashboard shortly afterward.

---

## Pricing

All pricing values are defined in `js/store.js` under `PRICING`:

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

The formula is `(base + bedrooms + bathrooms) × frequency multiplier + add-ons`, with a floor at the minimum and rounding to the nearest $5.

**Example:** a 3-bedroom, 2-bathroom home costs 75 + (3 × 28) + (2 × 25) = **$210** as a one-time cleaning. On a biweekly schedule (0.75), the price is **$155**, and the page displays "Saving $55 every visit vs $210 one-time." Savings are shown in dollars rather than percentages because a dollar amount is easier for customers to evaluate.

Add-on prices are defined directly below the frequency block. Separate pricing for deep cleans or move-outs can be added with a multiplier that follows the same pattern as frequency.

---

## Language support

Every customer-facing page is available in both languages with identical functionality, and a language switch appears in the navigation on every page.

| English | Spanish |
|---|---|
| `index.html` | `index-es.html` |
| `services.html` | `servicios.html` |
| `book.html` | `reservar.html` |
| `privacy.html` | `privacidad.html` |

The booking flow is fully translated, including steps, buttons, room labels, add-ons, error messages, the estimate, the review summary and the confirmation. Dates and day names use the browser's Spanish locale, so a Spanish-speaking customer sees *miércoles, 26 de agosto* where an English-speaking customer sees *Wednesday, August 26*.

The Spanish copy uses the vocabulary common in Southern California, such as *recámaras* rather than *habitaciones* and *cochera* rather than *garaje*.

### Customer messages

Each job records the language it was booked in. Confirmations, reminders, on-my-way texts, cancellations, invoices and completion notes are generated in that language automatically, including for jobs booked months earlier. Spanish-speaking customers are marked with an **Español** badge on their job card.

The owner dashboard is in English. A Spanish dashboard (`admin-es.html`) is available for Spanish-speaking helpers. Both pages load the same `admin.js`, and all rendered text passes through a translation layer, so a new feature only needs its wording added to `js/i18n.js`. Any untranslated string falls back to English rather than appearing blank.

### Search engine support

Each page declares `hreflang` links for both languages plus `x-default`, and both versions are listed in `sitemap.xml`. This allows Google to serve the Spanish pages to Spanish-language searches.

---

## Access and roles

Staff sign in with a **Microsoft account through Azure Static Web Apps authentication**. The codebase contains no passwords and the application stores none.

Access is granted by invitation from the Azure portal, which assigns one of two custom roles:

| | Owner | Helper |
|---|---|---|
| Owner dashboard `/admin.html` | Yes | No |
| Helper dashboards (either language) | Yes | Yes |
| Jobs, photos, payments, calendar | Yes | Yes |
| Settings, Stripe configuration, retention | Yes | No |

All staff use the same address, **`/dashboard`**, and are routed to the correct page based on their role and language preference.

Access is revoked by deleting the user's role assignment in the portal. No password change or redeployment is required.

> `js/auth.js` contains a username-and-password sign-in that **runs only from a local `file://` copy** for offline demonstrations. Its credentials (`owner` / `demo-only-not-a-real-password`) are placeholders and protect nothing. On the deployed site, the sign-in pages redirect to Microsoft and this code never executes.

---

## Daily operations

### Availability calendar

- Selecting a day opens the time windows that can be marked as available. Changes save immediately.
- **Open all weekdays** fills the month with morning and afternoon windows.
- **Apply to every Tuesday this month** copies one day's hours to every matching weekday.
- Customers only see days with at least one open window.

Availability is stored in Cosmos DB as one document per month and synced to every staff device. The booking page reads the same calendar, so customers only see days the owner has opened.

### Request inbox

- **Accept first choice** / **Accept backup** confirms the request.
- **Change date & time** provides a date picker, time-window selector and note field. **Save as confirmed** locks the slot. **Propose to customer** suggests the new time without confirming it and moves the request to *Awaiting client*.

### Telling the customer

Whenever a job is confirmed, moved, proposed or cancelled, the website emails the customer automatically through `/api/notify`, in the language they booked in, from the business's own domain. Replies go to the business inbox. A panel then opens with a pre-written text message and a **Text** button that opens the phone's messaging app with the message filled in; the message can be edited first. Phones only allow a web page to open the messaging app from a tap, which is why sending the text takes one tap rather than happening on its own.

Once SMS registration is complete (`ACS_SMS_FROM` is set), the same confirmations are also texted automatically from the business number to customers who opted in to texts. Customers who declined texts are flagged in the panel.
- **Send payment link** becomes available once a job is confirmed.

### Booked jobs calendar

The booked jobs calendar is populated automatically from accepted requests. Days with work are highlighted, with one marker per job. Selecting a day shows each job's contact details, the customer's booking notes (gate codes, pets, parking), controls for rescheduling, and a notes field.

**Cancel booking** returns the job to the inbox as a new request rather than deleting it. **Add a booking manually** handles work arranged by phone.

### Completing a job

**Mark completed** on a confirmed job opens the completion panel:

1. **Upload photos** opens the device camera or photo library. Up to seven photos can be attached per job.
2. Photos are resized to 1400px and re-encoded as JPEG on the device before upload. This reduces file size and removes EXIF metadata, including the GPS coordinates phones embed in each image, so a customer's location is never stored in a photo.
3. The dashboard uploads each photo directly to Blob Storage using a short-lived signed URL from `/api/photos`. The job record stores only the file path, and other devices receive a signed link to view it.
4. After writing a message to the customer, the user selects **Complete & send photos**, **Complete & email**, or **Complete without sending**.

Photos cannot be attached to an email automatically from a desktop browser, because browsers do not allow web pages to pass files to a mail client. On a phone, the native share sheet handles attachments, which makes the phone the preferred device for closing out a job.

### Job records

Each job has a status that determines whether it appears in current or past work. **A job is closed only when the work is complete and payment has been received.**

| Status | List |
|---|---|
| New request | Current |
| Awaiting client | Current |
| Confirmed | Current |
| Done, unpaid | Current |
| Closed (done and paid) | Past |
| Cancelled | Past |

Completed jobs that have not been paid display a warning, with **Mark as paid** as the primary action. For cash or check payments, **Mark as paid** prompts for the amount received.

Two reopen actions cover different situations. **Reopen job** is used when the work needs another visit; photos, notes and payment history are preserved. **Mark unpaid** is used when a payment fails, such as a returned check or a reversed card charge.

Search covers job number, name, company, phone, email, address and city, with filters for status, payment state and date range. **Export as PDF** and **Export as CSV** include the entire filtered result set, not only the rows currently displayed.

The dashboard header shows three figures for the current month: revenue collected (payments marked as received, not invoices sent), days worked (distinct dates, so two jobs on the same day count once), and jobs closed.

---

## Data retention

Closed jobs have a **90-day time-to-live (TTL)** in Cosmos DB. When it expires, Cosmos DB deletes the record automatically. **This deletion is permanent and cannot be undone.**

Because 90 days is shorter than standard record-keeping requirements (the IRS generally expects business records to be kept for at least three years, and California has its own requirements), two scheduled functions preserve the data:

- **`archiveExpiring`** runs on the 1st of each month. It writes a dated JSON and CSV snapshot of all records nearing expiry to Blob Storage and sends the owner a confirmation email. The storage cost is roughly one cent per month.
- **`rollUpCustomers`** runs nightly and adds each closed job to a minimal customer summary: visit count, first and last visit, lifetime spend and cities served. It intentionally excludes addresses, notes and photos. This keeps repeat customers recognizable after their individual job records expire.

The retention period can be changed with the `RETENTION_DAYS` setting on the Function App.

---

## Payment links

Payment links are generated per job and shared directly with the customer. The site has no public payment page and no payment link in the navigation.

On a confirmed job, **Send payment link** opens a panel to set the amount (pre-filled with the estimate) and a description. A generated link looks like this:

```
https://www.menifeemaids.com/pay.html?job=MCC-260824-V1DS#d=eyJ0IjoiUjlmYlBac...
```

The job reference, customer name, amount, description and expiration date are encoded in the URL fragment after the `#`, so the invoice can be displayed even before the page has contacted the server. When the server is reachable, `pay.html` shows the amount and status stored in Cosmos DB instead, so an edited link cannot change the amount displayed or charged.

Generating a new link for a job invalidates the previous one, so each job has at most one active link. Expired, replaced or altered links display a notice with the business phone number. Invoices appear in the language the customer booked in (the link includes `&lang=es` for Spanish).

### Card payments with Stripe

Each invoice is charged through its own **Stripe Checkout Session**, created by `/api/checkout` for the exact amount stored on that payment link. No Stripe products or Payment Links need to be set up in the Stripe dashboard, and every customer can be charged a different amount.

1. The customer opens their payment link and selects **Pay**.
2. `/api/checkout` reads the invoice from Cosmos DB, creates a Checkout Session for that amount (in Spanish for Spanish-language customers, with their email prefilled), and redirects the customer to Stripe.
3. After payment, Stripe returns the customer to `pay.html`, which confirms the payment with the server and shows a receipt notice.
4. Independently, Stripe calls `/api/stripe-webhook`. The webhook marks the invoice paid even if the customer closes the browser before returning. Webhook requests are verified with the signing secret, so they cannot be forged.
5. The paid status syncs to every staff dashboard, and the job closes once it is both completed and paid.

Each session carries the job number and link token as metadata, so every Stripe payment can be traced to its job. **Check with Stripe** (`/api/verify-payment`) remains available as a manual backup.

Card payments are switched on by adding two environment variables to the Static Web App: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Until the secret key is set, the Pay button tells customers that card payments are not yet available and offers the business phone number. The Settings panel shows whether card payments and the webhook are active.

---

## Text messaging

The system supports two types of text messages, and only automated messages require carrier registration.

**Manual texts** work immediately at no cost. Each confirmed job has four buttons: **On my way**, **On my way (email)**, **Text confirmation** and **Text reminder**. Each opens the phone's messaging app with the message pre-filled, and the text is sent from the business number (951-464-8147). No Azure service is involved.

**Automated texts** (the 24-hour reminder and the new-booking alert) send through Azure Communication Services and require A2P 10DLC registration, which costs approximately $44 and takes one to four weeks to approve.

The site launched with email-only notifications. When `ACS_SMS_FROM` and `OWNER_SMS` are not set, `sendSms()` returns `{ sent: false }` instead of failing, and reminders and booking alerts are delivered by email.

The compliance requirements for registration are already in place: privacy policy pages in both languages, an SMS opt-in checkbox on both booking forms (with message frequency, rates, STOP/HELP instructions, and a statement that consent is not a condition of purchase), and per-customer consent stored as `smsConsent` and `smsConsentAt` on each job. `sendReminders` texts only customers who opted in.

Text message templates are defined in `js/admin.js` (`msgConfirm`, `msgChanged`, `msgPropose`, `msgCancelText`, `msgReminder`, `msgOnMyWay`). The automatic email wording is in `api/src/functions/notify.js`.

---

## Offline support

`sw.js` caches the dashboard's application shell so it opens on a weak connection. It never caches `/api/` responses, which must always be current, or `/.auth/` responses, since an outdated authorization result would be a security issue. Pages are loaded from the network first, then from the cache, then from `offline.html`, which reloads automatically when the connection returns.

Staff should install the dashboard on their phones (browser menu → **Add to Home Screen**). In addition to convenience, this matters on iOS, which clears stored site data for sites not visited within seven days unless they are installed to the home screen.

The public pages include no web app manifest, so customers are never prompted to install anything.

---

## Pre-launch checklist

### 1. Replace the sample testimonials

`services.html` currently contains three sample reviews written to demonstrate the layout. **They are not from real customers** and must be replaced with genuine reviews before launch, along with removing the setup notice above them.

The FTC's 2024 rule on consumer reviews prohibits publishing fabricated testimonials, and violations carry civil penalties.

To set a star rating, repeat the full-star `<svg>` once per star. For a half star, use the half-star `<svg>` and give each instance a unique gradient `id` (`hs1`, `hs2`, `hs3`).

`aggregateRating` structured data is intentionally omitted and should not be added until the reviews are genuine; marking up ratings that do not exist violates Google's guidelines. The most useful reviews mention a specific service and a concrete result, so that is worth asking customers for.

### 2. Service-area ZIP codes

`js/store.js` maps each ZIP code to its city in `ZIPS`, and `CITIES` holds the list of fifteen cities served. Adding a city requires updates in four places: `js/store.js`, the `.cities` list and `areaServed` JSON-LD in `index.html`, the `areaServed` array and FAQ answer in `services.html`, and the "Serving…" line in the footer.

Note that **92587 is Canyon Lake, not Menifee.** This is a common local mix-up, since Sun City (92586) is part of Menifee.

### 3. Business name consistency

The site uses **Menifee Maids** throughout, matching the logo. The name must match the Google Business Profile exactly, because inconsistent business names weaken local search ranking.

### 4. Footer credit

The footer reads "Designed, developed, and hosted on Microsoft Azure by Apex Intelligent Systems." If the credit changes, it must be updated on every page, in both languages.

---

## Search engine optimization

The following is already implemented:

- Unique titles and meta descriptions on every page, written around target search terms
- `HouseCleaningService` structured data listing all fifteen cities in `areaServed`
- `Service` and `OfferCatalog` markup on the services page
- `FAQPage` markup on the services FAQ, which can produce expandable answers in Google results
- `hreflang` pairs on every page, plus `x-default`
- Semantic headings, canonical URLs, Open Graph tags, favicon, sitemap and robots files

The factors with the greatest effect on local ranking are outside the codebase:

1. **A complete Google Business Profile.** For local service searches, this carries more weight than the website itself.
2. **Reviews on that profile.** Both the number of reviews and how recent they are matter.
3. **Consistent name, phone number and service area** across every listing, including Yelp, Facebook, Nextdoor and Angi.

To improve ranking in specific cities later, the right approach is a dedicated page per city with content specific to that area. Duplicating one page with only the city name changed is treated by Google as duplicate content.

---

## Accessibility and browser support

The site supports full keyboard navigation with visible focus indicators, labeled form fields, a skip link and responsive layouts down to small phones. It respects the reduced-motion preference by disabling the bubble animation and other transitions. It supports current versions of Chrome, Safari, Firefox and Edge.

---

## Running locally

Unzip the project and open `index.html` in a browser. The public site works entirely offline: the booking flow uses browser storage, API calls are skipped, and `js/auth.js` substitutes for Microsoft sign-in so the dashboard can be viewed.

**None of this offline behavior runs on the deployed site.** It exists only so the project can be reviewed without an Azure account.
