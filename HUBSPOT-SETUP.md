# HubSpot Setup Runbook (the last-mile, UI-only steps)

**Why this is a manual runbook:** the connected HubSpot MCP grants **read-only**
access to Forms (`FORM` write is not available) and exposes no
property-schema-creation tool. So creating the custom property and the form must
be done in the HubSpot UI (or automated in a browser). Everything else — portal
ID discovery, form-GUID discovery, and the code — is already done.

Discovered live from your account (portal **21197737**, Anuj Singhal):
- An existing published form, "New talk to an expert form," GUID
  `08426f5c-a5e8-47d4-bf9e-c12d4bc36fec`. Reuse it **only** if you add the fields
  below to it; otherwise create a dedicated form per Step 2.

---

## Step 1 — Create the SMS opt-in contact property

Settings → Data Management → **Properties** → Contact properties → **Create property**.

- **Object type:** Contact
- **Label:** SMS Opt-In (TCPA)
- **Internal name:** `sms_opt_in`  ← must match `VITE_HUBSPOT_SMS_CONSENT_PROPERTY`
- **Field type:** Single checkbox (Boolean)
- **Description:** "Contact expressly consented to receive automated SMS from
  Deedo.ai via the web opt-in. See timestamp/source for audit trail."

Optional but recommended for the audit trail:
- **`sms_opt_in_timestamp`** — Date picker (stores when consent was given).
- **`sms_consent_text_version`** — Single-line text (which wording they agreed to).

## Step 2 — Create the dedicated lead-capture form

Marketing → **Forms** → **Create form** → Regular form. Add exactly these fields
(the API rejects fields the form doesn't define):

1. First name  → `firstname`
2. Last name   → `lastname`
3. Email       → `email` (required)
4. Phone       → `phone` (required)
5. SMS Opt-In (TCPA) → `sms_opt_in` (the property from Step 1), set **required**

For the checkbox label, paste the compliant language (keep it identical to
`SMS_CONSENT_TEXT` in `src/lib/hubspot.ts`):

> By checking this box, you agree to receive automated promotional and
> informational text messages from Deedo.ai at the phone number provided.
> Message frequency varies. Msg & data rates may apply. Reply STOP to cancel,
> HELP for help.

Ensure the box is **not pre-checked**. Publish the form.

## Step 3 — (Optional) native consent log

On the form's options, enable **"…process the contact's data" / consent
checkbox** and paste the same text. This makes HubSpot store a native
communications-consent record in addition to the boolean property. The code
already sends `legalConsentOptions.consent`, so this "just works" once enabled.

## Step 4 — Grab the form GUID

Open the published form → the URL (or the embed code) contains the GUID, e.g.
`.../forms/editor/21197737/<THIS-IS-THE-GUID>/edit`. Copy it.

## Step 5 — Wire the GUID into the build

Set these as **GitHub → Settings → Secrets and variables → Actions → Variables**
(not Secrets — they're public):

| Variable | Value |
|---|---|
| `HUBSPOT_PORTAL_ID` | `21197737` |
| `HUBSPOT_FORM_GUID` | *(your new form's GUID)* |
| `HUBSPOT_SMS_CONSENT_PROPERTY` | `sms_opt_in` |
| `HUBSPOT_SMS_CONSENT_TS_PROPERTY` | `sms_opt_in_timestamp` *(if created)* |

For local dev, copy `.env.example` → `.env` and fill the same values.

## Step 6 — Verify the mapping (the compliance-critical test)

1. Run `npm run dev`, fill the form with a test contact, check the box, submit.
2. In HubSpot, open Contacts → find the test contact.
3. Confirm **`sms_opt_in` = Yes/true** on the record, and (if configured) the
   timestamp property and the native consent log entry are populated.
4. Submit **once with the box unchecked** at the API level (or inspect a bot
   submission) to confirm a non-consented contact records `sms_opt_in = false`.
   In the UI the box is required, so this is an API-level check.

If `sms_opt_in` does **not** appear on the contact after a successful submit, the
field isn't on the form (Step 2) or the internal name is mismatched — fix before
going live, because that's exactly the audit-trail failure Guardrail #2 warns of.
