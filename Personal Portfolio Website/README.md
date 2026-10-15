# Esmeralda C. Ventura — Cloud, Data, AI \& Automation Portfolio

## Overview

This repository contains the source code and supporting assets for **Esmeralda C. Cabrers Ventura’s professional portfolio website**, a responsive, cloud-hosted website designed to present her experience, technical capabilities, services, projects, professional brand, and availability for employment, consulting, and collaboration opportunities.

The website is more than a digital résumé. It is designed as a centralized professional platform that helps recruiters, hiring managers, potential clients, collaborators, and other visitors quickly understand who the website owner is, what she builds, how she approaches technical problems, and where they can review evidence of her work. It combines personal branding, project discovery, service presentation, direct contact options, a video résumé, and a controlled interview-scheduling workflow within one cohesive experience.

The site highlights work across cloud architecture, software engineering, data science, machine learning, artificial intelligence, automation engineering, workflow automation, agentic AI systems, web application development, and technical strategy. Its structure intentionally connects the owner’s military leadership background, technical education, professional experience, and project portfolio to the types of opportunities she is pursuing.

\---

## Why This Website Was Created

The website was created to give the owner direct control over how her professional background and technical work are presented. Traditional résumés and social-media profiles are limited by fixed layouts, platform rules, character limits, and fragmented content. This site provides a single destination where visitors can see the owner’s professional story, technical specialties, portfolio categories, services, résumé, video introduction, social profiles, and contact methods without needing to navigate multiple unrelated platforms.

The website is designed to accomplish several goals:

* Establish a strong and consistent professional identity.
* Demonstrate technical breadth across cloud, AI, data, software, and automation.
* Provide direct access to project repositories and portfolio categories.
* Present the owner as both a hands-on technical builder and a strategic solutions architect.
* Give recruiters and hiring managers an efficient path from initial interest to interview scheduling.
* Give prospective clients a clear view of the services and technical solutions the owner can provide.
* Reduce administrative friction by automating parts of the interview-request process.
* Protect the owner’s time by placing a verification step in front of the public scheduling link.

The result is a website that serves simultaneously as a portfolio, professional introduction, lead-generation tool, recruiting resource, and scheduling gateway.

\---

## Website Audience

The primary intended audiences are:

* Recruiters and talent-acquisition professionals
* Hiring managers and technical interviewers
* Government and private-sector employers
* Potential consulting clients
* Cloud, software, data, AI, and automation professionals
* Professional mentors, collaborators, and industry contacts

The content is organized so that visitors can understand the owner’s value at different levels. A recruiter can quickly identify qualifications and schedule an interview, a technical leader can inspect project repositories and architectural capabilities, and a potential client can review available services and contact the owner directly.

\---

## Website Composition

The project uses a lightweight, responsive front end combined with a serverless verification backend. It is composed of the following major layers.

### 1\. Main Portfolio Page

The primary page is `index.html`. It provides the complete public-facing portfolio experience and is divided into several sections:

#### Header and Navigation

The header includes the website logo, links to the main page sections, and a prominent **Let’s Connect** call-to-action. The navigation is designed to let visitors move quickly between the owner’s biography, projects, services, and contact information.

#### Hero Section

The hero section introduces **Esmeralda C. Ventura** as an AWS/Azure Cloud and ML/AI professional. It includes:

* A concise professional value proposition
* A professional photograph
* U.S. Air Force Veteran branding
* A link to featured work
* A link to the **Credential Wallet**
* A link to the owner’s technical blog
* A link to the owner’s résumé
* The **Schedule an Interview** workflow
* High-level identity markers such as Cloud Architect, Problem Solver, Innovator, and Leader

The five hero call-to-action buttons sit on one line, left to right: **View My
Work**, **Visit My Blog**, **See Resume**, **View Credentials**, and **Schedule
an Interview**.

These five are `nowrap`, which means their combined width sets the *minimum*
width of the hero text column — and that in turn caps how large the photo
beside them can be. The two are directly in tension: shrinking the buttons is
what buys the photo room. Below 1400px the row wraps and hands that space back
to the photo, and the labels return to full size. On phones all five collapse
into a single centered column.

Page margins are one inch (96px of container padding). The header bar carries
both `.container` and `.header-inner`; `.header-inner` sets only
`padding-top`/`padding-bottom`, because a `padding` shorthand there would
silently wipe out those side margins and push the logo and nav flush against
the window edge.

All five share one palette taken from the page background itself — a
translucent indigo glass fill with a cool periwinkle hairline and light-blue
icons — so the row reads as one set rather than five competing brand colors.
Only **View My Work** is lifted, using a deeper, more saturated version of the
same indigo so the eye still knows where to start.

The main navigation carries About, Projects, Credentials, Resume, Blog,
Services, and Contact. The Resume and Blog tabs open the same destinations as
their matching hero buttons, and the **Let's Connect** button opens the contact
page described below.

This area is designed to communicate the owner’s professional focus within seconds of a visitor arriving on the site.

#### About Section

The About section explains the owner’s background as a U.S. Air Force Veteran, security-cleared technology professional, solutions architect, and founder of Apex Intelligent Systems. It describes her experience across cloud computing, software engineering, artificial intelligence, automation, DevOps, applied machine learning, and production-grade solution development.

The section also communicates the owner’s long-term professional vision: building responsible cloud, AI/ML, and automation technologies that strengthen organizations, improve operational capability, and contribute to a more resilient and efficient future.

#### Technical Skills and Core Strengths

The site organizes technical capabilities and professional strengths into visually scannable groups. These areas are intended to help recruiters and decision-makers quickly match the owner’s background to relevant roles, projects, or organizational needs.

#### Services Section

The Services section presents the types of work the owner can perform, including:

* AWS and Azure cloud solution architecture
* Data science and analytics
* Application and web development
* Machine learning and agentic AI automation
* Intelligent cloud AI-agent solutions
* Technical and strategic consulting

This section expands the site beyond employment positioning and allows it to function as a professional-services and consulting portfolio.

#### Video Résumé

The website includes a locally hosted video résumé and a poster image. The video provides a more personal introduction and allows visitors to hear directly from the owner rather than relying only on written content.

#### Featured Project Portfolios

The project area links to separate GitHub portfolio categories, including:

* Data Science
* Web Application Development
* Cloud Projects
* AI Applications
* Automations

The Automations portfolio is intended to include PowerShell, Terraform, YAML, Python, workflow automations, AI automations, and agentic automation systems. Organizing projects by category makes the portfolio easier to explore and allows each technical discipline to grow independently.

#### Contact Section

The Contact section provides direct pathways to the owner through email, LinkedIn, and GitHub. It is designed to support opportunities that do not fit the automated scheduling workflow, including general professional inquiries, collaboration requests, and consulting discussions.

\---

## Front-End Technologies

The public website is implemented with:

* **HTML5** for page structure and semantic content
* **CSS3** for the visual system, layout, responsive behavior, and reusable components
* **Vanilla JavaScript** for client-side interaction and authentication redirection
* **Google Fonts** for the Inter and Poppins typefaces
* **Static image assets** for branding, project categories, professional imagery, and social links
* **MP4 video** for the embedded video résumé

The project intentionally avoids a heavy front-end framework. This keeps the site fast, portable, easy to host as a static website, and straightforward to maintain. It also reduces dependency overhead and supports deployment through services such as Amazon S3 and CloudFront.

\---

## Key Front-End Files

|File|Purpose|
|-|-|
|`index.html`|Main portfolio website and all primary content sections|
|`style.css`|Global design system, responsive layout, cards, buttons, grids, and visual styling|
|`script.js`|General front-end interactions and page behavior|
|`credentials.html`|Credential Wallet page: searchable, filterable, verifiable certification record|
|`credentials-data.js`|**The only file to edit when a credential is earned.** Credential records and the category taxonomy|
|`credentials.js`|Wallet behavior: search, filters, sorting, timeline, detail dialog, sharing, JSON-LD|
|`credentials.css`|Wallet-specific styling, including the print stylesheet|
|`credentials/`|Hosted certificate PDFs and images, plus generated card thumbnails in `credentials/thumbs/`|
|`contact.html`|Contact page and message form|
|`contact.js`|Form validation, delivery, and the mail-client fallback. **Set the delivery endpoint here.**|
|`lambda/contact-form/index.mjs`|AWS Lambda that delivers contact-form messages through Amazon SES|
|`lambda/README-CONTACT-DEPLOY.md`|Contact-form delivery setup and troubleshooting|
|`contact.css`|Contact page styling|
|`linkedin-auth.js`|Starts the LinkedIn authentication and interview-verification workflow|
|`verified.html`|Success page shown after backend approval; continues the visitor to scheduling|
|`not-verified.html`|Failure or exception page with a specific explanation and alternate contact route|
|`README-DEPLOY.md`|Technical deployment, verification-policy, and troubleshooting notes|
|`lambda/index.mjs`|AWS Lambda backend for LinkedIn OAuth processing and recruiter verification|

The remaining image and media files support branding, the professional profile, project tiles, social links, and the video résumé.

\---

# Credential Wallet

## Purpose

`credentials.html` is a dedicated page for every degree, certification, and
professional credential the owner holds. A résumé certification section asks the reader to
take its word for it; this page does not. Each credential carries its issue
date, credential ID, and a direct link to the issuing organization's own
verification record, so a recruiter can confirm any claim in one click without
contacting anyone.

## What the Page Provides

### For the visitor

* **Live search** across credential name, issuer, skills, credential ID, and program dates. Pressing `/` anywhere on the page jumps to the search box.
* **Category filters** with live counts — Degrees, Cloud, AI/ML, Data Science, Agentic AI, Cybersecurity, Software, and Academic. A credential can belong to more than one category and matches the filter for each.
* **Status filters** — Lifetime, Active, and In progress. These sit on the same line as the category filters, since both answer the same question.
* **Sorting** by newest, oldest, issuer, or name.
* **Grouped results** — credentials are organized under a category header, then split into blocks by issuing organization inside it. A credential files under the first category in its list, so nothing appears twice. When exactly one category filter is active, the whole result set is shown under that single header instead.
* **Two layouts** — the grouped card view showing the actual certificate image, or a chronological timeline grouped by year.
* **Skill filtering** — every skill tag is clickable and filters the page to credentials demonstrating that skill.
* **A detail dialog** for each credential containing issuer, credential name, program dates, issue date, expiration, credit awarded, credential ID, certification number, the full verification URL, current status, and skills demonstrated.
* **Continuing education units** are shown on the card and in the detail dialog wherever the issuing institution awarded them, taken from the official CEU award letters.
* **Copy to clipboard** for individual credential IDs.
* **Shareable URLs** — filter state lives in the query string, so a filtered view or a single credential can be linked directly (for example `credentials.html?cat=cloud` or `credentials.html?cred=ms-az900`).

### For search engines

The page emits schema.org `EducationalOccupationalCredential` JSON-LD for every
awarded credential, so the certifications are machine-readable rather than only
human-readable.

## Adding a Credential

Edit `credentials-data.js` and nothing else. The counters, category chips and
their counts, status filters, search index, timeline, and structured data all
rebuild from that array automatically.

Each record supports the following fields:

|Field|Purpose|
|-|-|
|`id`|Unique slug, used for deep links|
|`name`|Credential name exactly as the issuer writes it|
|`issuer` / `issuerShort`|Awarding organization, and the short label used on the card|
|`categories`|One or more keys from the `CATEGORIES` object|
|`credentialCategory`|Optional schema.org classification. Set to `degree` for a conferred university degree; defaults to `certificate`|
|`status`|`lifetime`, `active`, or `in-progress`|
|`issued`|Award date, `YYYY-MM-DD`|
|`coursePeriod`|Optional human-readable study window|
|`expires`|Expiration date or `null`|
|`credentialId` / `credentialNo`|Issuer identifiers, shown in monospace with one-click copy|
|`verifyUrl` / `verifyLabel`|Issuer verification page and button text|
|`certificate`|Locally hosted PDF or image of the certificate|
|`thumb`|Card image, normally from `credentials/thumbs/`|
|`skills`|Skills demonstrated; these become clickable filters|
|`summary`|One or two sentences on what the credential covers|
|`credits`|Continuing education units or contact hours, such as `1.9 CEUs`|
|`featured`|`true` pins the card to the top of the default view|

A credential with `expires` set to `null` is badged **LIFETIME**. One with an
expiration inside six months is automatically badged **EXPIRES** in amber, so
nothing lapses unnoticed. An `in-progress` entry renders as a dashed card with
no verification link and is excluded from the verifiable counter.

The first entry in a credential's `categories` array decides which category
header it files under, so reordering that array moves the card between groups
without changing which filters it matches.

Two commented-out `in-progress` templates are included at the bottom of the data
file for reference. Category chips with zero credentials still render, dimmed,
so the page shows the full intended career map; set `SHOW_EMPTY_CATEGORIES` to
`false` to hide them instead.

## Certificate Assets

Original certificate PDFs and images live in `credentials/`. Card thumbnails
live in `credentials/thumbs/` and are downscaled copies, so the grid stays fast
while the **Certificate** button still opens the full-resolution original.

Card thumbnails are 760&nbsp;px wide JPEGs of roughly 40&ndash;50&nbsp;KB. A new
thumbnail should be generated at that width so it matches the rest of the grid.

\---

# Contact Page

`contact.html` collects a first name, last name, email, phone number, LinkedIn
profile, city, and message, and delivers them to
**esmeralda.cabrera-ventura@outlook.com**. The **Let's Connect** button in the
navigation on every page opens this form, as does the email tile in the home
page contact section.

## Delivery

The site is static, so the browser cannot send mail on its own — and it cannot
call Amazon SES directly either, since that needs AWS credentials and anything
in `contact.js` is readable from the page source. The form therefore posts to a
small AWS Lambda that holds the credentials server-side and calls SES.

`lambda/contact-form/index.mjs` is that function, ready to deploy.
`lambda/README-CONTACT-DEPLOY.md` has the click-by-click setup: create the
function, paste the code, add three environment variables, attach one IAM
permission, create a Function URL, then paste that URL into `ENDPOINT` at the
top of `contact.js`.

Until `ENDPOINT` is filled in, the form does not pretend to work: it says
plainly that it isn't connected yet and offers a pre-filled mail draft instead.

> An earlier version used FormSubmit, a free third-party relay. It was removed
> because it requires clicking an activation link it emails to the destination
> address, and that email never arrived — leaving no way to make it send. The
> SES path has no activation step and no third party in the middle.

## Form behavior

* Required fields are first name, last name, email, and message. Phone,
  LinkedIn, and city are optional but validated when filled in.
* Validation runs on blur and the error clears as soon as the visitor starts
  correcting it. On submit, the first invalid field is focused and scrolled to.
* Phone validation is deliberately permissive — 7+ digits after stripping
  punctuation — because formats vary by country and rejecting a valid number is
  worse than accepting a malformed one.
* A honeypot field, positioned off-screen rather than hidden with
  `display: none`, silently drops bot submissions.
* **The form never dead-ends.** If the endpoint is unreachable, the visitor gets
  a link that opens their own mail client with every field already filled in.

\---

# Schedule an Interview System

## Purpose of the Scheduling Button

The **Schedule an Interview** button was designed to provide legitimate recruiters and hiring professionals with a direct, convenient path to the owner’s availability while preventing the scheduling calendar from being openly exposed to every visitor.

Publishing a normal scheduling link directly on a public website can create several problems for the website owner:

* Spam or automated bookings
* Unqualified or unrelated meeting requests
* Calendar abuse
* Fake recruiter outreach
* Excessive scheduling noise
* Lost time reviewing or cancelling inappropriate appointments
* Public circulation of the scheduling URL outside its intended audience

The verification workflow was introduced to reduce these risks. Instead of immediately revealing the calendar, the button initiates an identity-based screening process through LinkedIn. This creates a controlled handoff between the public portfolio and the owner’s scheduling system.

The feature is intended to help the owner remain accessible to real opportunities without giving unrestricted access to her calendar.

\---

## High-Level Scheduling Flow

The workflow operates as follows:

1. A visitor clicks **Schedule an Interview** on the main website.
2. `linkedin-auth.js` generates a random browser-session value called a `state` nonce.
3. The state value is stored in `sessionStorage` when available.
4. The visitor is redirected to LinkedIn’s OAuth 2.0 authorization page.
5. LinkedIn asks the visitor to authenticate and approve the requested OpenID Connect scopes.
6. LinkedIn redirects the browser to an Amazon API Gateway callback URL.
7. API Gateway invokes the AWS Lambda function in `lambda/index.mjs`.
8. The Lambda function exchanges the temporary authorization code for a LinkedIn access token.
9. The backend requests the permitted LinkedIn identity and profile data.
10. The verification policy evaluates the available data.
11. Approved visitors are redirected to `verified.html` with a short-lived signed token and approved profile details.
12. Visitors who cannot be approved are redirected to `not-verified.html` with a reason code.
13. The success page checks the session state and token expiration, pre-fills the visitor’s name and email, and forwards the visitor to the owner’s scheduling page.
14. The failure page explains what happened and provides email and LinkedIn as alternate contact methods.

This architecture allows the public website to remain static while delegating sensitive OAuth processing, secret handling, policy evaluation, and token creation to the serverless backend.

\---

## Front-End Authentication Initiation

The interview workflow begins in `linkedin-auth.js`.

When the scheduling button is clicked, the script:

* Uses the browser’s cryptographic random-number generator to create a unique state value.
* Stores that value temporarily in the visitor’s current browser session.
* Constructs a LinkedIn OAuth authorization URL.
* Requests the standard `openid`, `profile`, and `email` scopes.
* Disables the button to reduce duplicate clicks.
* Redirects the visitor to LinkedIn.

The state value helps connect the outgoing request to the browser session that initiated it. When LinkedIn returns the visitor to the site, the value is echoed through the backend and checked by the success page. This provides a client-side safeguard against mismatched or unsolicited callback links.

The browser code contains only public OAuth configuration such as the LinkedIn client ID and callback URL. Private credentials must never be stored in front-end JavaScript.

\---

## AWS Serverless Backend

The scheduling backend is implemented as an **AWS Lambda function** written in modern JavaScript using the `.mjs` ES module format. It is exposed through an **Amazon API Gateway** callback route.

The backend exists because OAuth code exchange and verification logic cannot be performed securely in browser JavaScript. The Lambda function is responsible for operations that require trusted server-side execution, including:

* Holding the LinkedIn client secret
* Receiving the OAuth authorization code
* Exchanging the code for a LinkedIn access token
* Requesting profile data from LinkedIn APIs
* Applying the verification policy
* Creating a cryptographically signed, short-lived approval token
* Logging verification results for troubleshooting and policy improvement
* Redirecting visitors to the correct success or failure page

Using Lambda avoids the need to maintain a continuously running application server. The function executes only when a visitor completes the LinkedIn sign-in callback, making the backend scalable and cost-efficient for a portfolio site with intermittent traffic.

\---

## Verification Policy

The backend evaluates five possible checks:

|Check|What it evaluates|
|-|-|
|`openid`|Whether LinkedIn returned a valid account identifier|
|`profile`|Whether the account includes a name and profile photo|
|`badge`|Whether LinkedIn reports an identity or workplace verification category|
|`headline`|Whether available profile information contains recruiting-related language|
|`domain`|Whether the returned email uses a corporate rather than common consumer or disposable domain|

The current policy requires the `openid` and `profile` checks to pass. Other checks are evaluated when LinkedIn makes the required data available, but they are not currently mandatory.

Each check can return one of three states:

* **PASS** — LinkedIn returned relevant data and the criterion was satisfied.
* **FAIL** — LinkedIn returned relevant data and the criterion was not satisfied.
* **UNAVAILABLE** — LinkedIn did not make the required field available to the application.

The three-state model is important because unavailable data is not automatically treated as evidence that the visitor failed. Some LinkedIn fields require elevated permissions and may return no usable data even for legitimate recruiters. Distinguishing `UNAVAILABLE` from `FAIL` prevents the system from rejecting every visitor merely because an API field cannot be accessed.

The policy can be tightened later if LinkedIn grants additional API access or if the owner decides to require more criteria. This makes the verification design adaptable rather than permanently tied to one rule set.

\---

## Approval Token

When a visitor is approved, the Lambda creates a signed token with a short expiration period. The token contains limited information about the approved session and verification outcome.

The token is intended to:

* Demonstrate that the backend completed the verification workflow
* Carry an expiration time to the success page
* Preserve basic verification context during the redirect
* Support analytics or scheduling-source attribution
* Reduce the usefulness of old copied success links

The token is valid for approximately 15 minutes. The success page reads the expiration value and refuses stale links. It also verifies that the returned state matches the state created in the same browser session when possible.

The token signing key and LinkedIn client secret are sensitive credentials and must be stored in protected Lambda environment variables or AWS Secrets Manager. They must never be committed to a public repository.

\---

## Verified Visitor Experience

`verified.html` is displayed after backend approval. It:

* Confirms that the visitor completed verification
* Checks the browser-session state
* Checks whether the approval token has expired
* Displays a personalized confirmation using the visitor’s name when available
* Creates the scheduling URL with the approved visitor’s name and email pre-filled
* Adds campaign/source parameters identifying the visit as LinkedIn-verified
* Automatically redirects the visitor to the scheduling page after a short delay
* Provides a manual **Continue to scheduling** button in case automatic redirection does not occur

This page creates a smoother experience for approved visitors and reduces repeated data entry when they reach the calendar.

\---

## Unverified Visitor Experience

`not-verified.html` handles cancelled sign-ins, expired authorization codes, missing profile fields, insufficient data, policy failures, and backend errors.

Rather than displaying a generic rejection, the backend attaches a reason code and the page translates it into an understandable explanation. This makes the system more transparent and easier to troubleshoot.

The page also acknowledges that automated verification can make mistakes, particularly for recruiters at small firms or visitors using personal LinkedIn accounts. For that reason, it provides alternate contact routes through email and LinkedIn. The goal is to screen access to the calendar without blocking legitimate professional communication.

\---

## What the Scheduling System Does for the Website Owner

The scheduling workflow is designed to serve the owner operationally, not merely to add a technical feature to the website. It provides several practical benefits:

### Protects Calendar Access

The owner’s public website can invite recruiter engagement without publishing an unrestricted calendar URL as the primary path.

### Reduces Manual Screening

The system performs an initial automated identity and profile check before a visitor reaches scheduling. This reduces the number of low-quality or fraudulent requests the owner must manually investigate.

### Preserves Professional Accessibility

Legitimate recruiters receive a convenient and polished route to book time. Visitors who are not automatically approved can still contact the owner directly, preventing the verification layer from becoming an absolute barrier.

### Saves Time

The scheduling page can receive the visitor’s name and email automatically. This reduces administrative exchanges and makes it easier to move from recruiter interest to a confirmed interview.

### Generates Useful Operational Signals

Backend logs show which checks passed, failed, or were unavailable. The owner can use this information to understand how visitors interact with the system, diagnose failures, and improve verification rules over time.

### Demonstrates Technical Capability

The feature also functions as a portfolio project within the portfolio itself. It demonstrates the owner’s ability to combine front-end development, OAuth 2.0, OpenID Connect, AWS Lambda, API Gateway, signed tokens, security controls, error handling, logging, policy evaluation, and third-party service integration into one end-to-end workflow.

### Supports Future Expansion

The architecture can later be expanded to support:

* Calendly API-generated single-use scheduling links
* CRM or applicant-tracking-system integration
* Recruiter inquiry logging
* Email notifications to the owner
* Automated follow-up messages
* Analytics dashboards
* Abuse-rate limiting
* CAPTCHA or bot protection
* Additional identity providers
* Organization allowlists or denylists
* More advanced risk scoring

\---

## Important Security Limitation

The current success page ultimately redirects to a normal scheduling URL. If that URL is already known or shared independently, a person may bypass the LinkedIn verification process and open it directly.

For stronger enforcement, the backend should request a unique, single-use scheduling link from the scheduling provider’s API after verification. That link should expire after a short period or after one booking. In that configuration, the permanent scheduling URL would not be embedded in public front-end files.

The current workflow should therefore be understood as a meaningful screening and routing layer, but not a complete access-control boundary around a publicly reachable third-party calendar.

\---

## Hosting and Deployment Architecture

The website is designed for deployment through an AWS static-site and serverless architecture:

* **Amazon S3** stores the HTML, CSS, JavaScript, images, and video assets.
* **Amazon CloudFront** distributes and caches the public website globally.
* **Amazon API Gateway** receives the LinkedIn OAuth callback.
* **AWS Lambda** performs token exchange, verification, signed-token generation, and redirects.
* **Amazon CloudWatch** stores Lambda execution logs and verification diagnostics.
* **LinkedIn OAuth/OpenID Connect** supplies authenticated profile information.
* **Calendly or another scheduling provider** hosts the owner’s interview availability.

This separation allows the main site to remain fast and inexpensive while still supporting a secure server-side integration for the scheduling workflow.

\---

## Configuration and Secret Management

Before deployment, environment-specific values must be configured, including:

* LinkedIn client ID
* LinkedIn client secret
* OAuth callback URI
* Success-page URL
* Failure-page URL
* Scheduling URL or scheduling API configuration
* Token-signing key
* Verification thresholds and required checks

**Do not commit real client secrets or token-signing keys to source control.** Store sensitive values in Lambda environment variables encrypted with AWS KMS or in AWS Secrets Manager. Any credential that has previously been exposed in source code or shared publicly should be revoked and replaced immediately.

The front-end callback URI, backend callback URI, API Gateway route, and LinkedIn application settings must match exactly. OAuth providers reject requests when these values differ.

\---

## Deployment Notes

Detailed operational instructions, policy behavior, troubleshooting steps, CloudFront requirements, and AWS configuration notes are maintained in [`README-DEPLOY.md`](README-DEPLOY.md).

Deployment generally requires:

1. Uploading the static front-end files to the website’s S3 bucket.
2. Deploying `lambda/index.mjs` to the configured Lambda function.
3. Connecting the API Gateway callback route to the Lambda function.
4. Registering the exact callback URL in the LinkedIn Developer Portal.
5. Configuring protected backend secrets.
6. Confirming that CloudFront forwards required query strings for the verification pages.
7. Invalidating CloudFront after updated files are uploaded.
8. Testing both successful and unsuccessful authentication paths.

\---

## Design Principles

The website follows several design and engineering principles:

* **Professional clarity:** Visitors should immediately understand the owner’s professional focus.
* **Evidence over claims:** Project repositories, portfolio categories, and technical integrations support the qualifications presented.
* **Low-friction navigation:** Important information is accessible through a single-page structure.
* **Responsive design:** Content adapts to desktop, tablet, and mobile displays.
* **Static-first architecture:** Most content is delivered without a server, improving speed and portability.
* **Serverless security boundary:** Sensitive OAuth operations are isolated from the browser.
* **Graceful failure:** Visitors receive actionable explanations and alternate contact paths.
* **Owner efficiency:** The site is designed to reduce repetitive professional-administration tasks.
* **Extensibility:** New projects, portfolio categories, services, and workflow integrations can be added without rebuilding the entire system.

\---

## Project Structure

```text
.
├── index.html                  # Main portfolio page
├── style.css                   # Responsive visual design and component styling
├── script.js                   # General browser interactions
├── linkedin-auth.js            # LinkedIn OAuth initiation
├── verified.html               # Approved visitor handoff to scheduling
├── not-verified.html           # Verification failure and alternate contact page
├── README.md                   # Primary project documentation
├── README-DEPLOY.md            # Deployment and troubleshooting documentation
├── lambda/
│   └── index.mjs               # API Gateway/Lambda OAuth verification backend
├── Logo.png                    # Site logo
├── ProfessionalPhoto.jpg       # Professional profile image
├── AirForceLogo.png            # Veteran branding asset
├── VideoResume.mp4             # Video résumé
├── VideoResume\\\\\\\_poster.jpg      # Video poster image
├── DataScience.png             # Data-science portfolio tile
├── WebApps.png                 # Web-applications portfolio tile
├── CloudProjects.png           # Cloud-projects portfolio tile
├── AI.Apps.png                 # AI-applications portfolio tile
├── Automations.png             # Automation portfolio tile
├── email.png                   # Email/contact graphic
├── GitHub.png                  # GitHub/contact graphic
└── Linkedin.png                # LinkedIn/contact graphic
```

\---

## Maintenance

The website owner should periodically:

* Update the résumé URL and professional biography.
* Add new portfolio repositories and project categories.
* Confirm all GitHub, LinkedIn, email, and scheduling links.
* Review CloudWatch logs for repeated verification failures or abuse patterns.
* Rotate credentials and signing keys according to security best practices.
* Confirm that OAuth scopes and LinkedIn API permissions have not changed.
* Test the site on current desktop and mobile browsers.
* Update the copyright year and professional credentials.
* Invalidate the CloudFront cache after publishing changes.
* Review the verification policy before making additional checks mandatory.

\---

## Ownership and Usage

This website and its original source code, design, content, automation logic, documentation, and project assets are proprietary portfolio materials owned by **Esmeralda C. Cabrera Ventura**, except where third-party materials are identified and governed by their own licenses.

The repository is intended for portfolio demonstration and professional evaluation. No permission is granted to copy, reuse, modify, distribute, deploy, sell, sublicense, or incorporate the original materials into another project without prior written authorization from the owner. See the repository’s `LICENSE` file for complete terms.

\---

## Author

**Esmeralda C. Cabrera Ventura**  
Cloud, Data, AI, Software \& Automation Professional  
U.S. Air Force Veteran  
Founder and Solutions Architect, Apex Intelligent Systems

