/**
 * HubSpot Forms Submission API client (raw HTML + Forms API path).
 *
 * This module talks DIRECTLY to HubSpot's public Forms Submission endpoint:
 *   https://api.hsforms.com/submissions/v3/integration/submit/{portalId}/{formGuid}
 *
 * No third-party script (js.hsforms.net) is loaded, so there is no injected
 * DOM, no iframe, and therefore NO hydration mismatch to guard against.
 * We own the markup, the validation, and the network call end-to-end.
 *
 * portalId and formGuid are PUBLIC identifiers (they ship in the client bundle
 * regardless of where they are stored) — see STRATEGY-REVIEW.md.
 */

export interface HubspotConfig {
  /** HubSpot Hub / portal ID. Public. */
  portalId: string;
  /** HubSpot form GUID (UUID). Public. */
  formGuid: string;
  /**
   * Internal name of the phone property the form expects. Verified live against
   * form fa52f5f8: this portal's lead form requires `mobilephone`, NOT `phone`
   * — posting `phone` alone returns 400 REQUIRED_FIELD. Configurable because
   * which one a form uses is a per-form choice in HubSpot.
   */
  phonePropertyName?: string;
  /**
   * Internal name of the boolean contact property that stores the 10DLC / TCPA
   * SMS opt-in for the compliance audit trail. Must exist in HubSpot and be
   * mapped onto the form. See HUBSPOT-SETUP.md.
   */
  smsConsentPropertyName?: string;
  /**
   * Internal name of the (optional) datetime property that records WHEN consent
   * was captured. Strengthens the TCPA audit trail. Optional.
   */
  smsConsentTimestampPropertyName?: string;
  /**
   * Internal name of the (optional) text property recording WHICH version of the
   * consent wording was agreed to. Without it, changing SMS_CONSENT_TEXT
   * silently rewrites history for every contact who agreed to the old language.
   */
  smsConsentTextVersionPropertyName?: string;
  /**
   * Optional first-party proxy endpoint (see proxy/). When set, the form POSTs
   * here instead of api.hsforms.com so ad blockers can't kill the submission;
   * the proxy forwards to HubSpot server-side. Empty => post to HubSpot direct.
   */
  leadEndpoint?: string;
}

export interface LeadFields {
  firstname: string;
  lastname: string;
  email: string;
  /** Digits + formatting as entered; HubSpot normalises server-side. */
  phone: string;
  /** The 10DLC SMS opt-in checkbox state. */
  smsConsent: boolean;
}

/** The exact TCPA/CTIA consent language shown to (and agreed by) the user. */
export const SMS_CONSENT_TEXT =
  'By checking this box, you agree to receive automated promotional and ' +
  'informational text messages from Deedo.ai at the phone number provided. ' +
  'Message frequency varies. Msg & data rates may apply. Reply STOP to cancel, ' +
  'HELP for help.';

/**
 * Version stamp for SMS_CONSENT_TEXT. Bump this whenever the wording above
 * changes, so each contact stays associated with the exact language they
 * actually agreed to (see STRATEGY-REVIEW.md §3).
 */
export const SMS_CONSENT_TEXT_VERSION = 'v1-2026-07';

export interface SubmitResult {
  ok: boolean;
  /** HubSpot's inline thank-you message when present. */
  inlineMessage?: string;
  /** Human-readable error for the UI when ok === false. */
  error?: string;
  /** Raw HubSpot error payload for logging/debugging. */
  raw?: unknown;
}

/** Read the HubSpot tracking cookie (hubspotutk) for attribution, if present. */
function readHubspotUtk(): string | undefined {
  if (typeof document === 'undefined') return undefined; // SSR guard
  const match = document.cookie.match(/(?:^|;\s*)hubspotutk=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Submit a lead to HubSpot.
 *
 * The SMS opt-in is written BOTH ways for a defensible compliance record:
 *  1. As a boolean value on `smsConsentPropertyName` (the field a compliance
 *     auditor filters/exports on), and
 *  2. Inside `legalConsentOptions.consent` so HubSpot records the exact text,
 *     timestamp, and subscription intent it was given (when the form is
 *     configured for consent). If the form has no consent config, HubSpot
 *     ignores legalConsentOptions and the boolean property still maps.
 */
export async function submitLead(
  config: HubspotConfig,
  fields: LeadFields,
  opts?: { pageUri?: string; pageName?: string; signal?: AbortSignal }
): Promise<SubmitResult> {
  // Prefer a first-party proxy (see proxy/) when configured, so ad blockers that
  // block api.hsforms.com can't kill the submission. Falls back to HubSpot
  // direct when VITE_LEAD_ENDPOINT is unset.
  const leadEndpoint = config.leadEndpoint?.trim();
  const endpoint = leadEndpoint
    ? `${leadEndpoint}?portalId=${encodeURIComponent(config.portalId)}&formGuid=${encodeURIComponent(config.formGuid)}`
    : `https://api.hsforms.com/submissions/v3/integration/submit/${encodeURIComponent(
        config.portalId
      )}/${encodeURIComponent(config.formGuid)}`;

  const consentPropertyName = config.smsConsentPropertyName ?? 'sms_opt_in';

  const fieldEntries: Array<{ name: string; value: string }> = [
    { name: 'firstname', value: fields.firstname.trim() },
    { name: 'lastname', value: fields.lastname.trim() },
    { name: 'email', value: fields.email.trim() },
    { name: config.phonePropertyName ?? 'mobilephone', value: fields.phone.trim() },
    // Boolean opt-in mapped to the audit-trail property. HubSpot booleans
    // accept the strings "true" / "false".
    { name: consentPropertyName, value: String(fields.smsConsent) },
  ];

  if (config.smsConsentTimestampPropertyName && fields.smsConsent) {
    fieldEntries.push({
      name: config.smsConsentTimestampPropertyName,
      // HubSpot datetime properties accept ISO 8601.
      value: new Date().toISOString(),
    });
  }

  if (config.smsConsentTextVersionPropertyName && fields.smsConsent) {
    fieldEntries.push({
      name: config.smsConsentTextVersionPropertyName,
      value: SMS_CONSENT_TEXT_VERSION,
    });
  }

  const hutk = readHubspotUtk();

  const body: Record<string, unknown> = {
    fields: fieldEntries,
    context: {
      ...(hutk ? { hutk } : {}),
      pageUri:
        opts?.pageUri ??
        (typeof window !== 'undefined' ? window.location.href : undefined),
      pageName:
        opts?.pageName ??
        (typeof document !== 'undefined' ? document.title : undefined),
    },
  };

  // Communications-consent audit trail. Requires the form to be configured
  // with consent/subscription options in HubSpot; harmless otherwise.
  if (fields.smsConsent) {
    body.legalConsentOptions = {
      consent: {
        consentToProcess: true,
        text: SMS_CONSENT_TEXT,
        // If you wire this to a specific SMS subscription type, add:
        // communications: [{ value: true, subscriptionTypeId: <id>, text: SMS_CONSENT_TEXT }],
      },
    };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: opts?.signal,
    });

    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        inlineMessage?: string;
      };
      return { ok: true, inlineMessage: data.inlineMessage };
    }

    // Non-2xx: HubSpot returns a structured error we surface for debugging.
    const errPayload = await res.json().catch(() => undefined);
    return {
      ok: false,
      error:
        res.status === 400
          ? 'We could not process your details. Please check the fields and try again.'
          : 'Something went wrong on our end. Please try again in a moment.',
      raw: errPayload,
    };
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      return { ok: false, error: 'Submission cancelled.' };
    }
    // fetch() only throws on a network-level failure. Since the endpoint is
    // reachable from a working browser, in practice this is an ad blocker /
    // privacy setting blocking the request. Say so — a generic "check your
    // connection" sends people down the wrong path.
    return {
      ok: false,
      error:
        'We could not submit the form — an ad blocker or privacy setting may be blocking it. Turn it off and try again, or sign up directly at deedo.ai.',
      raw: err,
    };
  }
}

/** Minimal, dependency-free validators. */
export const validators = {
  email(v: string): boolean {
    // Pragmatic RFC-5322-lite check; HubSpot re-validates server-side.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  },
  /**
   * North America (+1) only — Deedo operates in the US and Canada, and the SMS
   * consent applies to the number given. Accepts 10 digits, or 11 when prefixed
   * with the country code 1. Tolerant of +, spaces, (), -, . formatting.
   */
  phone(v: string): boolean {
    const digits = v.replace(/\D/g, '');
    return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
  },
  required(v: string): boolean {
    return v.trim().length > 0;
  },
};
