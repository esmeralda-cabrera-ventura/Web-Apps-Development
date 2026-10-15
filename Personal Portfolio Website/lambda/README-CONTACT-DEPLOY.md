# Contact form setup — Lambda + Amazon SES

You have already verified your email address in SES. What follows creates the
small piece of code that sits between your website and SES, gives it a web
address, and points the form at it.

**About 20 minutes. No code to write — the code is already in this folder.**

---

## Why a Lambda is needed at all

The website is static, so the browser cannot send email by itself. It also
cannot call SES directly: doing that requires AWS credentials, and anything
placed in `contact.js` is readable by anyone who views the page source.
Publishing AWS keys on a public site would let a stranger send email as you.

The Lambda holds those credentials server-side, where nobody can see them.
Your form calls the Lambda; the Lambda calls SES. That is its whole job.

---

## Before you start

- SES → **Identities** shows `esmeralda.cabrera-ventura@outlook.com` as
  **Verified**.
- The region selector (top right of the console) reads
  **US West (N. California)**. Everything below must be in this same region,
  because SES identities are region-specific.

---

## Step 1 — Create the function

1. AWS Console → search **Lambda** → open it.
2. Check the region reads **US West (N. California)**.
3. Click **Create function**.
4. Choose **Author from scratch**.
5. **Function name:** `portfolio-contact-form`
6. **Runtime:** `Node.js 22.x` (or `Node.js 20.x`)
7. Leave everything else as-is → **Create function**.

---

## Step 2 — Paste in the code

1. Scroll down to the **Code** tab.
2. In the file tree on the left, double-click **index.mjs**.
3. Click inside the editor, press **Ctrl+A**, then **Delete**.
4. Open `lambda/contact-form/index.mjs` from this folder in Notepad, select
   all, copy.
5. Paste into the Lambda editor.
6. Click **Deploy** above the editor and wait for *"Successfully updated the
   function."*

---

## Step 3 — Add the three settings

1. Click the **Configuration** tab.
2. Left menu → **Environment variables** → **Edit**.
3. Click **Add environment variable** three times and fill in:

   | Key | Value |
   |-|-|
   | `TO_ADDRESS` | `esmeralda.cabrera-ventura@outlook.com` |
   | `FROM_ADDRESS` | `esmeralda.cabrera-ventura@outlook.com` |
   | `ALLOWED_ORIGIN` | `https://d9m4lbei06go8.cloudfront.net` |

4. **Save**.

Using the same address for both is fine: it is verified, so SES accepts it as
the sender. No domain is needed.

`ALLOWED_ORIGIN` must have no trailing slash, and must match your site's
address exactly. If you later put a custom domain in front of CloudFront,
update this value to match.

---

## Step 4 — Let the function send mail

A new Lambda has no permissions at all. This grants exactly one.

1. Still in **Configuration**, click **Permissions** in the left menu.
2. Under *Execution role*, click the blue **Role name** link. IAM opens in a
   new tab.
3. Click **Add permissions** → **Create inline policy**.
4. Choose the **JSON** tab.
5. Select everything in the box, delete it, and paste this:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": "ses:SendEmail",
       "Resource": "*"
     }]
   }
   ```

6. **Next** → **Policy name:** `SendContactFormEmail` → **Create policy**.

---

## Step 5 — Give the function a web address

1. Back on the Lambda tab, go to **Configuration** → **Function URL**.
2. Click **Create function URL**.
3. **Auth type:** `NONE`

   > This is correct here. The function only sends you an email; it holds no
   > data and returns nothing sensitive. `ALLOWED_ORIGIN` restricts which site
   > can call it from a browser.

4. Tick **Configure cross-origin resource sharing (CORS)**.
5. **Allow origin:** `https://d9m4lbei06go8.cloudfront.net`
6. **Allow headers:** type `content-type` and press Enter.
7. **Allow methods:** tick `POST` and `OPTIONS`.
8. **Save**.
9. Copy the **Function URL**. It looks like:
   `https://abc123xyz.lambda-url.us-west-1.on.aws/`

---

## Step 6 — Point the form at it

1. Open `contact.js` in Notepad.
2. Near the top, find:

   ```js
   var ENDPOINT = "";
   ```

3. Paste your Function URL between the quotes, keeping the trailing slash:

   ```js
   var ENDPOINT = "https://abc123xyz.lambda-url.us-west-1.on.aws/";
   ```

4. Save.

---

## Step 7 — Upload and test

1. **S3** → `portfolio-site-2.0` → **Upload** → add `contact.js` → **Upload**.
2. **CloudFront** → your distribution → **Invalidations** → **Create
   invalidation** → enter `/*` → **Create invalidation**. Wait ~2 minutes.
3. Open `https://d9m4lbei06go8.cloudfront.net/contact.html` and press
   **Ctrl+Shift+R**.
4. Fill in the form and click **Send message**.

A green *"Message sent"* banner means it worked. The email should arrive
within a minute.

---

## If something goes wrong

The visitor-facing message is deliberately plain, so the technical detail goes
to the browser console. Press **F12** → **Console** tab → submit again → look
for a line starting `[contact form] delivery failed:`.

| What you see | What it means |
|-|-|
| *"The form isn't connected yet"* | `ENDPOINT` is still empty, or the old `contact.js` is cached. Re-check Step 6, re-upload, invalidate CloudFront. |
| A CORS error in the console | `ALLOWED_ORIGIN` or the Function URL CORS origin does not match your site exactly. No trailing slash. |
| *"The mail service is not configured yet"* | `TO_ADDRESS` or `FROM_ADDRESS` is missing from the environment variables. |
| *"The message could not be delivered right now"* | SES refused. Check **CloudWatch → Log groups → /aws/lambda/portfolio-contact-form** for the reason — usually an unverified `FROM_ADDRESS` or the wrong region. |

To see the Lambda's own logs: Lambda → your function → **Monitor** tab →
**View CloudWatch logs**.

---

## What visitors see if delivery fails

The form never claims to have sent a message it did not send. On failure the
visitor gets one plain sentence plus a link that opens their own email app
with every field already filled in, and your address as a backup. All feedback
prints in white, in ordinary language.

---

## Cost

- **Lambda:** 1 million requests/month free, permanently. A contact form will
  never approach this.
- **SES:** $0.10 per 1,000 emails. At realistic volume, a few cents a year.
