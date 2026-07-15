/**
 * HubspotForm.tsx — Raw HTML + Forms API lead-capture form.
 *
 * Design notes
 * ------------
 * - RAW HTML PATH: we render our own semantic markup and POST to HubSpot's
 *   Forms Submission API (see ../lib/hubspot.ts). We do NOT inject
 *   js.hsforms.net, so there is no third-party script, no iframe, and no
 *   client-injected DOM. That means the "empty div on SSR to avoid hydration
 *   mismatch" guardrail is MOOT here — this component renders identical markup
 *   on server and client. It is safe to server-render.
 * - All browser-only access (cookies, window) lives in event handlers or the
 *   submit helper, never in render, so SSR/hydration stays clean.
 * - Fully controlled inputs, mobile-first, accessible (labels, aria-invalid,
 *   aria-describedby, role="alert", keyboard-friendly).
 * - Styling is Tailwind utility classes on our OWN elements. We are not
 *   fighting HubSpot's injected .hs-* classes because there are none.
 */

import { useId, useRef, useState, type FormEvent } from 'react';
import {
  submitLead,
  validators,
  SMS_CONSENT_TEXT,
  type HubspotConfig,
} from '../lib/hubspot';

type FieldName = 'firstname' | 'lastname' | 'email' | 'phone' | 'smsConsent';
type Status = 'idle' | 'submitting' | 'success' | 'error';

export interface HubspotFormProps {
  /**
   * HubSpot config. Defaults are read from Vite build-time env
   * (VITE_HUBSPOT_PORTAL_ID / VITE_HUBSPOT_FORM_GUID) so the component can be
   * dropped in without props. Props override env for testing/storybook.
   */
  config?: Partial<HubspotConfig>;
  /** Called after a confirmed successful submission. */
  onSuccess?: () => void;
  /** Optional heading rendered above the fields. */
  heading?: string;
  className?: string;
}

function env(): Record<string, string> {
  return (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
}

function resolveConfig(override?: Partial<HubspotConfig>): HubspotConfig {
  const e = env();
  const portalId = override?.portalId ?? e.VITE_HUBSPOT_PORTAL_ID ?? '';
  const formGuid = override?.formGuid ?? e.VITE_HUBSPOT_FORM_GUID ?? '';
  return {
    portalId,
    formGuid,
    phonePropertyName:
      override?.phonePropertyName ?? e.VITE_HUBSPOT_PHONE_PROPERTY ?? 'mobilephone',
    smsConsentPropertyName:
      override?.smsConsentPropertyName ??
      e.VITE_HUBSPOT_SMS_CONSENT_PROPERTY ??
      'sms_opt_in',
    smsConsentTimestampPropertyName:
      override?.smsConsentTimestampPropertyName ??
      e.VITE_HUBSPOT_SMS_CONSENT_TS_PROPERTY,
    smsConsentTextVersionPropertyName:
      override?.smsConsentTextVersionPropertyName ??
      e.VITE_HUBSPOT_SMS_CONSENT_VERSION_PROPERTY,
  };
}

/**
 * Carriers verify these links during 10DLC campaign registration, so they must
 * resolve to real, public pages. They are configurable because this app may be
 * hosted on a path (GitHub project page) where a root-relative "/privacy" is
 * wrong. Defaults point at the marketing site.
 */
function legalUrls(): { privacy: string; terms: string } {
  const e = env();
  return {
    privacy: e.VITE_PRIVACY_URL || 'https://deedo.ai/privacy',
    terms: e.VITE_TERMS_URL || 'https://deedo.ai/terms',
  };
}

const EMPTY = { firstname: '', lastname: '', email: '', phone: '' } as const;

export default function HubspotForm({
  config: configOverride,
  onSuccess,
  heading = 'Talk to an expert',
  className = '',
}: HubspotFormProps): React.JSX.Element {
  const config = resolveConfig(configOverride);
  const legal = legalUrls();

  const [values, setValues] = useState<Record<'firstname' | 'lastname' | 'email' | 'phone', string>>({
    ...EMPTY,
  });
  const [smsConsent, setSmsConsent] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [formError, setFormError] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);
  // Honeypot: hidden from humans, irresistible to naive bots. Posting directly
  // to the Forms API opts us out of HubSpot's own bot protection, so this is our
  // first line of defence (STRATEGY-REVIEW.md §5).
  const honeypotRef = useRef<HTMLInputElement | null>(null);

  // Stable, SSR-safe unique IDs for label/aria wiring.
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;

  function validate(): boolean {
    const next: Partial<Record<FieldName, string>> = {};
    if (!validators.required(values.firstname)) next.firstname = 'First name is required.';
    if (!validators.required(values.lastname)) next.lastname = 'Last name is required.';
    if (!validators.email(values.email)) next.email = 'Enter a valid email address.';
    if (!validators.phone(values.phone))
      next.phone = 'Enter a valid US or Canadian mobile number (10 digits).';
    // 10DLC: consent is REQUIRED to submit.
    if (!smsConsent) next.smsConsent = 'You must agree to receive text messages to continue.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError('');

    // Honeypot tripped: a human never fills a field they cannot see. Show the
    // success state without contacting HubSpot, so the bot gets no signal that
    // it was detected and no junk contact is created.
    if (honeypotRef.current?.value) {
      setStatus('success');
      return;
    }

    if (!validate()) return;
    if (!config.portalId || !config.formGuid) {
      setStatus('error');
      setFormError('Form is not configured. Missing HubSpot portal ID or form GUID.');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('submitting');

    const result = await submitLead(
      config,
      { ...values, smsConsent },
      { signal: controller.signal }
    );

    if (result.ok) {
      setStatus('success');
      onSuccess?.();
    } else {
      setStatus('error');
      setFormError(result.error ?? 'Submission failed. Please try again.');
    }
  }

  function update(name: 'firstname' | 'lastname' | 'email' | 'phone', v: string) {
    setValues((prev) => ({ ...prev, [name]: v }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        className={`w-full border border-ink/15 bg-paper p-6 text-center shadow-[6px_6px_0_0_rgba(23,21,18,0.08)] sm:p-8 ${className}`}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy/10">
          <svg className="h-6 w-6 text-navy" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="font-display text-2xl text-ink">Thanks — you&apos;re all set.</h2>
        <p className="mt-2 text-sm text-ink-soft">
          A Deedo.ai expert will reach out shortly. Watch for a confirmation text at the number you provided.
        </p>
      </div>
    );
  }

  // Squared, hairline-ruled inputs to match the drawing-set aesthetic — no
  // rounded/indigo defaults, which would read as a different product.
  const inputBase =
    'block w-full border border-ink/25 bg-paper px-3 py-2.5 text-ink ' +
    'placeholder:text-ink-mute focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy ' +
    'text-base transition-colors sm:text-sm';
  const invalidRing = 'border-clay focus:border-clay focus:ring-clay';

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-busy={status === 'submitting'}
      className={`w-full border border-ink/15 bg-paper p-6 shadow-[6px_6px_0_0_rgba(23,21,18,0.08)] sm:p-8 ${className}`}
    >
      {heading && <h2 className="mb-1 font-display text-2xl text-ink">{heading}</h2>}
      <p className="mb-6 text-sm text-ink-soft">Tell us how to reach you and we&apos;ll take it from there.</p>

      {/*
        Honeypot. Hidden from sighted users and from screen readers (aria-hidden
        + tabIndex -1), so no human is asked to fill it. Not `display:none` —
        some bots skip those; this is off-screen instead.
      */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={fid('company-website')}>Do not fill this in</label>
        <input
          ref={honeypotRef}
          id={fid('company-website')}
          name="company_website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id={fid('firstname')}
          name="firstname"
          label="First name"
          autoComplete="given-name"
          value={values.firstname}
          onChange={(v) => update('firstname', v)}
          error={errors.firstname}
          className={inputBase}
          invalidRing={invalidRing}
        />
        <Field
          id={fid('lastname')}
          name="lastname"
          label="Last name"
          autoComplete="family-name"
          value={values.lastname}
          onChange={(v) => update('lastname', v)}
          error={errors.lastname}
          className={inputBase}
          invalidRing={invalidRing}
        />
      </div>

      <div className="mt-4">
        <Field
          id={fid('email')}
          name="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.email}
          onChange={(v) => update('email', v)}
          error={errors.email}
          className={inputBase}
          invalidRing={invalidRing}
        />
      </div>

      <div className="mt-4">
        <Field
          id={fid('phone')}
          name="phone"
          label="Mobile phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(v) => update('phone', v)}
          error={errors.phone}
          className={inputBase}
          invalidRing={invalidRing}
        />
      </div>

      {/* 10DLC / TCPA consent checkbox — REQUIRED. */}
      <div className="mt-5">
        <div className="flex items-start gap-3">
          <input
            id={fid('smsConsent')}
            name="smsConsent"
            type="checkbox"
            checked={smsConsent}
            onChange={(e) => {
              setSmsConsent(e.target.checked);
              if (errors.smsConsent) setErrors((p) => ({ ...p, smsConsent: undefined }));
            }}
            aria-invalid={errors.smsConsent ? true : undefined}
            aria-describedby={errors.smsConsent ? fid('smsConsent-err') : undefined}
            className="mt-0.5 h-5 w-5 shrink-0 rounded-none border-ink/30 text-navy accent-navy focus:ring-navy"
          />
          <label htmlFor={fid('smsConsent')} className="text-xs leading-5 text-ink-soft">
            {SMS_CONSENT_TEXT}{' '}
            See our{' '}
            <a
              href={legal.privacy}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-900"
            >
              Privacy Policy
            </a>{' '}
            and{' '}
            <a
              href={legal.terms}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-900"
            >
              Terms
            </a>
            .
          </label>
        </div>
        {errors.smsConsent && (
          <p id={fid('smsConsent-err')} role="alert" className="mt-1.5 pl-8 text-xs text-clay-deep">
            {errors.smsConsent}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="mt-4 border-l-2 border-clay bg-clay/10 px-3 py-2 text-sm text-clay-deep">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-6 flex w-full items-center justify-center bg-clay px-4 py-3 text-sm font-medium text-paper transition-colors hover:bg-clay-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? 'Submitting…' : 'Get started'}
      </button>
    </form>
  );
}

/** Small labelled input, extracted to keep the form body readable. */
function Field(props: {
  id: string;
  /** Semantic form-control name (e.g. "email"), kept distinct from the unique DOM id. */
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  className: string;
  invalidRing: string;
  type?: string;
  inputMode?: 'text' | 'email' | 'tel';
  autoComplete?: string;
}): React.JSX.Element {
  const { id, name, label, value, onChange, error, className, invalidRing, type = 'text', inputMode, autoComplete } = props;
  return (
    <div>
      <label htmlFor={id} className="marker mb-1.5 block">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`${className} ${error ? invalidRing : ''}`}
      />
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-clay-deep">
          {error}
        </p>
      )}
    </div>
  );
}
