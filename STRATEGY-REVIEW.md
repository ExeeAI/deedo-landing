# Strategy Review & Corrections

A technical review of the "Headless HubSpot Lead Capture for 10DLC" strategy,
adapted to the **Raw HTML + Forms API** rendering path you selected. The plan is
sound in shape; the notes below fix a few places where it would have bitten you
in implementation or in a compliance audit.

## 1. The raw-HTML vs. embed-script conflict (resolved)

The original directives mixed two mutually exclusive HubSpot integration paths:

- **Embed path** — load `//js.hsforms.net/forms/embed/v2.js`, call
  `hbspt.forms.create()`, and style HubSpot's *injected* `.hs-input` / `.hs-button`
  markup.
- **Raw HTML form** — a separate export where you own the markup and submit it
  yourself.

You can't do both at once: `hbspt.forms.create()` renders HubSpot's own DOM, so
there are no bare elements for you to style, and "Set as raw HTML form" produces
markup that the v2.js embed does not consume. **We took the raw path**: our own
semantic markup posting to HubSpot's **Forms Submission API**
(`api.hsforms.com/submissions/v3/integration/submit/{portalId}/{formGuid}`).

Consequences, all favorable:

- **No third-party script.** Nothing from `js.hsforms.net` loads. One fewer
  network dependency, no render-blocking, no CSP exception needed.
- **The hydration guardrail is moot.** Guardrail #1 in the strategy worried about
  an empty `div` on SSR so HubSpot's injected nodes wouldn't cause a hydration
  mismatch. Since we inject nothing, server and client render identical markup.
  The component is safe to server-render as-is. (It still guards every
  `window`/`document`/cookie access behind event handlers and SSR checks, so
  even a meta-framework won't complain.)
- **Native styling, for real.** Tailwind utilities sit directly on our elements
  — no fighting HubSpot's stylesheet specificity.

## 2. `portalId` / `formId` are NOT secrets

Directive 3 says to store the portal ID and form GUID as **GitHub Secrets**.
They are **public identifiers**. The Forms Submission API is deliberately
unauthenticated (that's what lets a static page submit to it at all), and both
IDs are visible in the browser network tab on every submission. Putting them in
Secrets buys zero security and only makes them harder to rotate.

Use **GitHub repository *variables*** instead (`vars.*`, already wired in
`deploy.yml`). They still get injected at build time — Vite inlines `VITE_*` into
the bundle — but they're editable in the repo UI without touching code and aren't
misrepresented as sensitive. Reserve Secrets for things that are actually secret
(a private-app token, if you later add a server component).

## 3. TCPA / 10DLC compliance hardening

The supplied consent language is a good start. To harden the audit trail against
a TCPA challenge (and to satisfy CTIA messaging guidelines that carriers enforce
for 10DLC), the implementation adds/recommends:

- **Frequency + rates + HELP.** The shipped text now reads: *"…Message frequency
  varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help."* plus
  visible links to Privacy Policy and Terms. Carriers routinely reject 10DLC
  campaign registrations whose opt-in flow lacks these.
- **Unchecked by default.** The checkbox must never be pre-checked — a
  pre-ticked consent box is not valid express consent. Our component initializes
  it to `false`.
- **Consent required to submit, but not bundled.** It's fine to require the box
  to submit *this* form. It must not be a condition of a *purchase* of unrelated
  goods/services. This form is lead capture, so requiring it is appropriate.
- **Store a real audit trail, not just a boolean.** Capture, per submission:
  the opt-in boolean, the **exact consent text shown**, a **timestamp**, and the
  **source** (page URL). The client sends the boolean to your custom property,
  a timestamp to an optional datetime property, and mirrors the exact text +
  timestamp into HubSpot's `legalConsentOptions.consent` block so HubSpot keeps
  its native communications-consent log too.
- **Phone must match the consented number.** The number in the audit record is
  the number consent applies to. Don't later text a different number for the
  same contact.
- **Version your consent language.** If you change the wording, keep the old
  version associated with contacts who agreed to it. Consider a
  `sms_consent_text_version` property.

**Scope clarification worth stating out loud:** this landing page captures and
records *opt-in consent*. It does **not** by itself make you "10DLC compliant."
10DLC compliance is a **carrier registration** of your Brand + Campaign performed
with your messaging provider (Twilio, etc.); that registration references the
consent flow this page implements as its proof-of-opt-in. Treat the two as
linked but separate deliverables.

## 4. Consent-data mapping — the failure mode from Guardrail #2

Guardrail #2 is the real risk: if the opt-in field doesn't map to the contact,
the audit trail is worthless. Two concrete requirements make it work with the
Forms Submission API:

1. **The custom boolean property must exist** on the Contact object (e.g.
   `sms_opt_in`) — created in HubSpot Settings → Properties.
2. **Every field you POST must be present on the form** in HubSpot. The v3
   integration-submit endpoint validates submitted fields against the form's
   field list; unknown fields cause a `400`. So the HubSpot form must contain
   `firstname`, `lastname`, `email`, `phone`, **and** the `sms_opt_in` field.

`HUBSPOT-SETUP.md` walks through creating the property and the form and mapping
the checkbox. The included `submitLead()` writes the opt-in **both** as the
boolean property and inside `legalConsentOptions`, so you get a filterable field
*and* HubSpot's native consent log.

## 5. The honest downside of the raw path: spam protection

Worth naming because the strategy doesn't. HubSpot's built-in bot protection
(reCAPTCHA, honeypots, submission-rate heuristics) runs on **native/embedded**
forms. When you post directly to the Submission API from a static page, you opt
out of most of that. Mitigations, in rough order of effort:

- Add a **honeypot** field (hidden input a human never fills) and drop
  submissions where it's populated — cheap, catches naive bots.
- Add a lightweight challenge (Cloudflare Turnstile / hCaptcha) if you see abuse.
- Enable HubSpot **workflow-based** validation/scoring on incoming contacts.

For a low-to-moderate-traffic lead form this is usually fine to start with a
honeypot and revisit. Just go in knowing you traded HubSpot's spam shield for
native UI control.

## 6. Minor build/deploy notes

- **Output directory.** Vite emits `dist` (wired into `deploy.yml`). If you swap
  to Next static export it's `out`; CRA is `build`. Change the
  `upload-pages-artifact` `path` to match.
- **Project vs. user Pages base path.** A project page served at
  `username.github.io/<repo>/` needs Vite `base: '/<repo>/'`, or asset URLs
  404. Set `BASE_PATH` in the workflow env (see `vite.config.ts`). A user/org
  page (`username.github.io`) uses `/`.
- **SPA 404s on refresh.** GitHub Pages has no server rewrites. A single-page
  form at `/` is fine; if you add client-side routes, add a `404.html` copy of
  `index.html` so deep links don't break.
