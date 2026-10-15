/* =========================================================================
   linkedin-auth.js
   "Schedule an Interview" -> LinkedIn OAuth -> recruiter-verifier-backend
   -------------------------------------------------------------------------
   FLOW
     1. Visitor clicks "Schedule an Interview".
     2. We mint a random `state` (CSRF nonce), stash it in sessionStorage,
        and send the browser to LinkedIn's authorization screen.
     3. LinkedIn redirects to the API Gateway route  GET /callback
        which invokes the recruiter-verifier-backend Lambda.
     4. The Lambda runs the three checks and 302-redirects the browser to
        either SUCCESS_URL (verified.html) or FAILURE_URL (not-verified.html).

   >>> EDIT THE THREE VALUES IN CONFIG BELOW BEFORE DEPLOYING <<<
   ========================================================================= */

const LINKEDIN_CONFIG = {
  // LinkedIn Developer Portal -> your app -> Auth tab -> Client ID
  CLIENT_ID: "863h9ooa2qxswg",

  // Your API Gateway invoke URL + /callback.
  // Looks like: https://abc123xyz.execute-api.us-west-1.amazonaws.com/callback
  // This EXACT string must also be listed under "Authorized redirect URLs"
  // in the LinkedIn app settings, or LinkedIn returns redirect_uri_mismatch.
  REDIRECT_URI: "https://gbya7cofp4.execute-api.us-west-1.amazonaws.com/callback",

  // openid/profile/email are the standard OpenID Connect scopes and are
  // available to every LinkedIn app. See README-DEPLOY.md for the caveat
  // about headline + verification-badge data.
  SCOPES: "openid profile email",

  AUTH_ENDPOINT: "https://www.linkedin.com/oauth/v2/authorization",
};

document.addEventListener("DOMContentLoaded", () => {
  /* Any element carrying `js-schedule-interview` starts this flow, alongside
     the main hero button. That lets a plain text link elsewhere on the site
     (for example the "here" link on the contact page) kick off the identical
     OAuth round-trip instead of pointing at a URL, which would not work: each
     attempt needs its own freshly minted CSRF nonce, so there is no fixed
     address to link to. */
  const triggers = Array.from(
    document.querySelectorAll("#scheduleInterviewBtn, .js-schedule-interview")
  );
  if (!triggers.length) return;

  const note = document.getElementById("scheduleNote");

  const start = (el, ev) => {
    /* Anchors carry a real href as a no-JavaScript fallback, so stop the
       browser following it when we are handling the click ourselves. */
    if (ev) ev.preventDefault();

    // CSRF nonce. The Lambda echoes this back on the redirect so the
    // landing page can confirm the round-trip started in this browser tab.
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const state = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

    try {
      sessionStorage.setItem("li_oauth_state", state);
    } catch (e) {
      // Private mode with storage disabled - the Lambda still validates
      // everything server-side, so continue rather than dead-ending.
    }

    const url =
      LINKEDIN_CONFIG.AUTH_ENDPOINT +
      "?response_type=code" +
      "&client_id=" + encodeURIComponent(LINKEDIN_CONFIG.CLIENT_ID) +
      "&redirect_uri=" + encodeURIComponent(LINKEDIN_CONFIG.REDIRECT_URI) +
      "&state=" + encodeURIComponent(state) +
      "&scope=" + encodeURIComponent(LINKEDIN_CONFIG.SCOPES);

    /* Only the standalone button gets a progress label. The inline "here"
       link sits mid-sentence, so swapping its text would read as
       "You can Schedule an Interview Redirecting to LinkedIn..." */
    if (el.tagName === "BUTTON") {
      const original = el.textContent;
      el.disabled = true;
      el.textContent = "Redirecting to LinkedIn\u2026";

      /* If the redirect is blocked or the visitor comes back, put the button
         back the way it was rather than leaving it stuck mid-flight. */
      window.setTimeout(() => {
        el.disabled = false;
        el.textContent = original;
        if (note) note.classList.remove("error");
      }, 8000);
    }

    window.location.assign(url);
  };

  triggers.forEach((el) => {
    el.addEventListener("click", (ev) => start(el, ev));
  });
});
