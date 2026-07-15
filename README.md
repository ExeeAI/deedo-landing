# Deedo.ai — Headless HubSpot Lead Capture (10DLC-compliant)

A statically hosted React 19 + Tailwind landing page that captures leads and
TCPA/10DLC SMS opt-in directly into HubSpot via the **Forms Submission API** (raw
HTML path — no third-party embed script, no iframe), deployed to GitHub Pages by
GitHub Actions.

## What's here

```
src/
  components/HubspotForm.tsx   Strict-TS React 19 form, native markup, Tailwind, a11y
  lib/hubspot.ts               Forms Submission API client + validators + consent text
  App.tsx, main.tsx, index.css App shell + Tailwind entry
.github/workflows/deploy.yml   CI/CD: build on push to main → GitHub Pages
vite.config.ts                 base-path notes for user vs project Pages
.env.example                   Public config (portalId, formGuid, consent property)
STRATEGY-REVIEW.md             Corrections to the original strategy (read this)
HUBSPOT-SETUP.md               UI-only steps: create property + form, get GUID, verify
```

## Quick start

```bash
npm install
cp .env.example .env      # fill VITE_HUBSPOT_FORM_GUID after HUBSPOT-SETUP.md Step 4
npm run dev               # local dev
npm run build             # production build → dist/
```

Confirmed live for this account: **portalId `21197737`**. You still need to
create the `sms_opt_in` property and a dedicated form (or add fields to the
existing GUID `08426f5c-a5e8-47d4-bf9e-c12d4bc36fec`) — see `HUBSPOT-SETUP.md`.

## Deploy

Push to `main`. In GitHub → Settings → Pages, set **Source: GitHub Actions**.
Set the repo **variables** (not secrets) listed in `HUBSPOT-SETUP.md` Step 5.
The workflow builds and publishes `dist/` to Pages.

## The three things most likely to trip you up

1. **Missing *required* fields 400 — unknown fields are ignored.** Verified live
   against form `fa52f5f8` on portal 21197737:
   - Omitting a required field returns
     `400 REQUIRED_FIELD: Error in 'fields.sms_opt_in'`.
   - Posting a field the form does *not* define (tested with
     `definitely_not_a_field_xyz`) is **silently ignored** — no 400.

   So the rule is the reverse of what it looks like: you must post everything the
   form **requires**, and extra fields are harmless. This form requires
   `firstname`, `lastname`, `email`, **`mobilephone`**, and `sms_opt_in`.

   **Note `mobilephone`, not `phone`.** Posting `phone` alone 400s. The property
   name is configurable via `VITE_HUBSPOT_PHONE_PROPERTY` (default
   `mobilephone`).
2. **portalId / formGuid are public** — use GitHub *variables*, not secrets.
3. **Raw path = no HubSpot spam shield.** A **honeypot is now implemented**
   (`company_website`, off-screen + `aria-hidden` + `tabIndex -1`): a tripped
   honeypot short-circuits to the success UI without calling HubSpot, so bots
   get no detection signal. Add Turnstile/hCaptcha only if abuse survives it
   (see `STRATEGY-REVIEW.md` §5).

## Deploying as a GitHub *project* page

`vite.config.ts` reads `BASE_PATH` (default `/`). A project page served at
`user.github.io/<repo>/` **must** build with `base='/<repo>/'` or every asset
404s. Set a `BASE_PATH` repo variable to `/<repo>/`; leave it unset for a
user/org page. The workflow passes it through.

## Compliance note

This page captures and records SMS opt-in consent. Actual 10DLC compliance is a
separate **carrier registration** you complete with your messaging provider
(Twilio, etc.), which references this opt-in flow as proof of consent.
