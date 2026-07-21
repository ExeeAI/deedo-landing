/**
 * build-howitworks.mjs — host the print pamphlet as the /howitworks/ landing.
 *
 * The source (inputdata/deedo-pamphlet_5.html) is a fixed 8.5in x 11in print
 * sheet: pixel-perfect on paper, but 816px wide and non-responsive. Hosting it
 * literally would force horizontal scrolling on every phone.
 *
 * So we copy it VERBATIM and only LAYER additions on top — the original bytes
 * (markup, styles, embedded logo, illustrations) are untouched:
 *   1. GTM (GTM-MSNV33KS), matching the rest of the site.
 *   2. An additive responsive stylesheet: desktop is unchanged; below 860px the
 *      fixed grids stack and the sheet fills the viewport.
 *   3. Two CTAs the pamphlet lacks (a 4,500px page buries anything): a hero
 *      "Talk to an expert" that jumps to the form, and a closing "Get started"
 *      that goes to deedo.ai.
 *   4. A lead form as a third sheet.
 *
 * The form is the RAW HTML + Forms API form (same as /talk and /tryus), NOT
 * HubSpot's native iframe embed. The embed proved unreliable here: inside the
 * flex sheet its postMessage auto-resize never fired (frame stuck at height:0),
 * and even forced open the cross-origin iframe rendered blank. The raw form has
 * no iframe, no postMessage, no cross-origin opacity — it is same-origin DOM we
 * can fully verify, and it posts directly to form fa52f5f8 with mobilephone +
 * sms_opt_in + consent version, exactly like the other pages.
 *
 * Everything is appended/injected, never edited in place, so re-running against
 * a new pamphlet revision Just Works.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SRC = 'inputdata/deedo-pamphlet_5.html';
const OUT_DIR = 'public/howitworks';
const OUT = `${OUT_DIR}/index.html`;

const GTM_ID = 'GTM-MSNV33KS';
const PORTAL_ID = '21197737';
const FORM_GUID = 'fa52f5f8-7d09-4103-921c-0146c0322cef';
const PHONE_PROP = 'mobilephone';
const PRIVACY_URL = 'https://app.deedo.ai/privacy-policy';
const TERMS_URL = 'https://app.deedo.ai/terms-of-use';

let html = readFileSync(SRC, 'utf8');

// --- 1. <head>: GTM loader + meta + responsive layer + form styles ----------
const gtmHead = `
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="canonical" href="https://land.deedo.ai/howitworks/" />
  <meta name="description" content="How Deedo works: one QR code turns your listing into a 24/7 AI concierge that answers buyers from your own documents and sends serious buyers to your dashboard." />
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');</script>
  <!-- End Google Tag Manager -->
  <style>
    /* Additive responsive layer — desktop layout is untouched. The pamphlet is
       a fixed 8.5in sheet; below 860px the sheet fills the viewport and the
       fixed grids stack so nothing overflows on a phone. */
    img, svg { max-width: 100%; height: auto; }
    @media (max-width: 860px) {
      .page { width: auto; max-width: 100%; min-height: 0;
              margin: 12px; padding: 20px 15px;
              box-shadow: 0 6px 20px rgba(18,33,46,.15); }
      .grid, .bottom, .qr-uses { grid-template-columns: 1fr; }
      .steps { grid-template-columns: 1fr 1fr; }
      .qr-panel { flex-direction: column; align-items: center; text-align: center; }
      .frow, .frow.rev { flex-direction: column; text-align: center; gap: 12px; }
      .illus { flex: 0 0 auto; width: 100%; max-width: 280px; height: auto; padding: 12px 0; }
      .fdesc { padding-left: 0; }
      .fdesc .num { position: static; margin: 0 auto 8px; }
      .htw-form-sheet .row.two { grid-template-columns: 1fr; }
    }
    /* --- Lead-capture sheet heading (added) --- */
    .htw-form-sheet { scroll-margin-top: 14px; }
    .htw-form-sheet h2 { font-size: 23px; font-weight: 800; letter-spacing: -.5px;
      color: var(--ink); margin: 0 0 4px; }
    .htw-form-sheet .kick { font-size: 10.5px; font-weight: 800; letter-spacing: 1.3px;
      text-transform: uppercase; color: var(--brand); }
    .htw-form-sheet p.sub { font-size: 12px; color: var(--ink-soft); margin: 4px 0 16px; }
    /* --- Raw lead form, styled to the pamphlet (navy/gold) --- */
    .htw-form-sheet .lead-form { max-width: 460px; }
    .htw-form-sheet .row.two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .htw-form-sheet .field { margin-top: 12px; }
    .htw-form-sheet .row.two .field { margin-top: 0; }
    .htw-form-sheet .lbl { display: block; font-size: 11px; font-weight: 800;
      letter-spacing: .4px; text-transform: uppercase; color: var(--brand); margin-bottom: 5px; }
    .htw-form-sheet input[type=text], .htw-form-sheet input[type=email], .htw-form-sheet input[type=tel] {
      width: 100%; border: 1.5px solid var(--line); border-radius: 8px; padding: 10px 12px;
      font-size: 14px; font-family: inherit; color: var(--ink); background: #fff; }
    .htw-form-sheet input:focus { outline: none; border-color: var(--brand);
      box-shadow: 0 0 0 3px rgba(18,53,115,.12); }
    .htw-form-sheet input[aria-invalid=true] { border-color: #c0392b; }
    .htw-form-sheet .err, .htw-form-sheet .consent-err { margin: 5px 0 0; font-size: 11px; color: #c0392b; }
    .htw-form-sheet .hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
    .htw-form-sheet .consent { margin-top: 16px; display: flex; gap: 10px; align-items: flex-start; }
    .htw-form-sheet .consent input { margin-top: 3px; width: 18px; height: 18px; flex-shrink: 0;
      accent-color: var(--brand); }
    .htw-form-sheet .consent label { font-size: 11px; line-height: 1.5; color: var(--ink-soft); }
    .htw-form-sheet .consent a { color: var(--brand); }
    .htw-form-sheet .form-err { margin-top: 12px; border-radius: 8px; background: #fdecea;
      padding: 9px 12px; font-size: 12px; color: #a5281b; }
    .htw-form-sheet button { margin-top: 18px; width: 100%; border: 0; border-radius: 24px;
      background: linear-gradient(135deg, var(--brand), var(--brand-2)); color: #fff;
      font-size: 14px; font-weight: 800; padding: 12px 16px; cursor: pointer; font-family: inherit; }
    .htw-form-sheet button:disabled { opacity: .6; cursor: not-allowed; }
    .htw-form-sheet .success { text-align: center; padding: 22px 0; }
    .htw-form-sheet .success .badge { margin: 0 auto 12px; width: 48px; height: 48px; border-radius: 50%;
      background: #e6f4ea; display: flex; align-items: center; justify-content: center; }
    .htw-form-sheet .success .badge svg { width: 26px; height: 26px; color: #1f7a4d; }
    .htw-form-sheet .success h1 { font-size: 18px; margin: 0; }
    .htw-form-sheet .success p { font-size: 12px; color: var(--ink-soft); margin-top: 6px; }
    /* --- CTA buttons (added) --- */
    .htw-cta { display: inline-block; margin-top: 14px; background: #fff; color: var(--brand);
      font-weight: 800; font-size: 12.5px; padding: 10px 18px; border-radius: 24px;
      text-decoration: none; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,.22); }
    .htw-cta:hover { filter: brightness(1.04); }
    .htw-foot-btn { display: inline-block; margin-top: 11px; background: #ffd27a; color: #5a3d0e;
      font-weight: 800; font-size: 12px; padding: 9px 18px; border-radius: 22px; text-decoration: none; }
    .htw-foot-btn:hover { filter: brightness(1.04); }
  </style>
`;
html = html.replace('</head>', `${gtmHead}\n</head>`);

// --- 2. <body>: GTM noscript fallback ---------------------------------------
const gtmNoscript = `
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->
`;
html = html.replace(/<body([^>]*)>/, `<body$1>\n${gtmNoscript}`);

// --- 3. CTAs (the pamphlet has none; a 4,500px page buries the form) ---------
const heroCta =
  `<a href="#htw-form" class="htw-cta"` +
  ` onclick="window.dataLayer&&window.dataLayer.push({event:'cta_click',cta:'talk_to_expert',location:'howitworks_hero'})">` +
  `Talk to an expert &rarr;</a>`;
html = html.replace(
  '<div class="badge">1st listing FREE</div>',
  `<div class="badge">1st listing FREE</div>\n    ${heroCta}`
);

// Closing band CTA -> the main site (sign-up). The hero covers the form.
const footBtn =
  `<a href="https://deedo.ai" target="_blank" rel="noopener" class="htw-foot-btn"` +
  ` onclick="window.dataLayer&&window.dataLayer.push({event:'cta_click',cta:'get_started',location:'howitworks_footer',destination:'deedo.ai'})">` +
  `Get started free &rarr;</a>`;
html = html.replace(
  /(<div class="p2-foot">[\s\S]*?<\/span>)(\s*<\/div>)/,
  `$1\n    ${footBtn}$2`
);

// --- 4. Lead form sheet (raw HTML + Forms API, not the iframe embed) ---------
const formSheet = `
  <div id="htw-form" class="page htw-form-sheet">
    <div class="kick">Ready when you are</div>
    <h2>Put Deedo on your next listing</h2>
    <p class="sub">Your first listing is free — no credit card. Tell us how to reach you and we'll get you set up.</p>
    <div id="htw-app">
      <form id="lead-form" class="lead-form" novalidate>
        <div class="row two">
          <div class="field">
            <label class="lbl" for="firstname">First name</label>
            <input id="firstname" name="firstname" type="text" autocomplete="given-name" />
            <p class="err" id="firstname-err" hidden></p>
          </div>
          <div class="field">
            <label class="lbl" for="lastname">Last name</label>
            <input id="lastname" name="lastname" type="text" autocomplete="family-name" />
            <p class="err" id="lastname-err" hidden></p>
          </div>
        </div>
        <div class="field">
          <label class="lbl" for="email">Email</label>
          <input id="email" name="email" type="email" inputmode="email" autocomplete="email" />
          <p class="err" id="email-err" hidden></p>
        </div>
        <div class="field">
          <label class="lbl" for="phone">Mobile phone</label>
          <input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" />
          <p class="err" id="phone-err" hidden></p>
        </div>
        <!-- Honeypot: hidden from humans; bots that fill it are dropped. -->
        <div class="hp" aria-hidden="true">
          <label for="company_website">Company website</label>
          <input id="company_website" name="company_website" type="text" tabindex="-1" autocomplete="off" />
        </div>
        <div class="consent">
          <input id="smsConsent" name="smsConsent" type="checkbox" aria-describedby="smsConsent-err" />
          <label for="smsConsent" id="consent-label">
            By checking this box, you agree to receive automated promotional and informational text
            messages from Deedo.ai at the phone number provided. Message frequency varies. Msg &amp; data
            rates may apply. Reply STOP to cancel, HELP for help.
            See our <a href="${PRIVACY_URL}" target="_blank" rel="noopener">Privacy Policy</a> and <a href="${TERMS_URL}" target="_blank" rel="noopener">Terms</a>.
          </label>
        </div>
        <p class="consent-err" id="smsConsent-err" hidden></p>
        <p class="form-err" id="form-err" hidden></p>
        <button type="submit" id="submit-btn">Get started free</button>
      </form>
    </div>
  </div>
  <script>
    (function () {
      var HUBSPOT = {
        portalId: '${PORTAL_ID}',
        formGuid: '${FORM_GUID}',          // the only form defining sms_opt_in
        phoneProperty: '${PHONE_PROP}',    // this form requires mobilephone, not phone
        smsConsentProperty: 'sms_opt_in',
        smsConsentTimestampProperty: 'sms_opt_in_timestamp',
        smsConsentTextVersionProperty: 'sms_consent_text_version'
      };
      var SMS_CONSENT_TEXT =
        'By checking this box, you agree to receive automated promotional and informational text ' +
        'messages from Deedo.ai at the phone number provided. Message frequency varies. Msg & data ' +
        'rates may apply. Reply STOP to cancel, HELP for help.';
      var SMS_CONSENT_TEXT_VERSION = 'v1-2026-07';

      function $(id) { return document.getElementById(id); }
      function readUtk() {
        var m = document.cookie.match(/(?:^|;\\s*)hubspotutk=([^;]+)/);
        return m ? decodeURIComponent(m[1]) : undefined;
      }
      function isEmail(v) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v.trim()); }
      // North America (+1) only: 10 digits, or 11 with a leading 1.
      function isPhone(v) { var d = v.replace(/\\D/g, ''); return d.length === 10 || (d.length === 11 && d.charAt(0) === '1'); }
      function setErr(id, msg) {
        var input = $(id), el = $(id + '-err');
        if (msg) { el.textContent = msg; el.hidden = false; if (input) input.setAttribute('aria-invalid', 'true'); }
        else { el.hidden = true; if (input) input.removeAttribute('aria-invalid'); }
      }
      function showSuccess() {
        $('htw-app').innerHTML =
          '<div class="success"><div class="badge"><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">' +
          '<path fill-rule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z" clip-rule="evenodd"/>' +
          '</svg></div><h1>Thanks — you\\'re all set.</h1>' +
          '<p>A Deedo.ai expert will reach out shortly. Watch for a confirmation text at the number you provided.</p></div>';
      }

      var form = $('lead-form');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        $('form-err').hidden = true;
        var vals = {
          firstname: $('firstname').value, lastname: $('lastname').value,
          email: $('email').value, phone: $('phone').value, smsConsent: $('smsConsent').checked
        };
        var ok = true;
        setErr('firstname', vals.firstname.trim() ? '' : 'First name is required.'); ok = ok && !!vals.firstname.trim();
        setErr('lastname', vals.lastname.trim() ? '' : 'Last name is required.'); ok = ok && !!vals.lastname.trim();
        setErr('email', isEmail(vals.email) ? '' : 'Enter a valid email address.'); ok = ok && isEmail(vals.email);
        setErr('phone', isPhone(vals.phone) ? '' : 'Enter a valid US or Canadian mobile number (10 digits).'); ok = ok && isPhone(vals.phone);
        setErr('smsConsent', vals.smsConsent ? '' : 'You must agree to receive text messages to continue.'); ok = ok && vals.smsConsent;
        if (!ok) return;
        if ($('company_website').value) { showSuccess(); return; } // honeypot

        var btn = $('submit-btn'); btn.disabled = true; btn.textContent = 'Submitting…';
        var fields = [
          { name: 'firstname', value: vals.firstname.trim() },
          { name: 'lastname', value: vals.lastname.trim() },
          { name: 'email', value: vals.email.trim() },
          { name: HUBSPOT.phoneProperty, value: vals.phone.trim() },
          { name: HUBSPOT.smsConsentProperty, value: String(vals.smsConsent) }
        ];
        if (HUBSPOT.smsConsentTimestampProperty && vals.smsConsent) fields.push({ name: HUBSPOT.smsConsentTimestampProperty, value: new Date().toISOString() });
        if (HUBSPOT.smsConsentTextVersionProperty && vals.smsConsent) fields.push({ name: HUBSPOT.smsConsentTextVersionProperty, value: SMS_CONSENT_TEXT_VERSION });

        var utk = readUtk();
        var body = { fields: fields, context: { pageUri: window.location.href, pageName: document.title }, legalConsentOptions: { consent: { consentToProcess: true, text: SMS_CONSENT_TEXT } } };
        if (utk) body.context.hutk = utk;

        fetch('https://api.hsforms.com/submissions/v3/integration/submit/' + encodeURIComponent(HUBSPOT.portalId) + '/' + encodeURIComponent(HUBSPOT.formGuid), {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        }).then(function (res) {
          if (res.ok) { showSuccess(); window.dataLayer && window.dataLayer.push({ event: 'generate_lead', form: 'howitworks' }); return; }
          return res.json().catch(function () { return null; }).then(function (p) { console.error('[HubSpot]', res.status, p); fail(res.status === 400 ? 'We could not process your details. Please check the fields and try again.' : 'Something went wrong on our end. Please try again in a moment.'); });
        }).catch(function (err) { console.error('[HubSpot] network', err); fail('Network error. Please check your connection and try again.'); });

        function fail(msg) { btn.disabled = false; btn.textContent = 'Get started free'; var fe = $('form-err'); fe.textContent = msg; fe.hidden = false; }
      });
      ['firstname', 'lastname', 'email', 'phone'].forEach(function (id) { $(id).addEventListener('input', function () { setErr(id, ''); }); });
      $('smsConsent').addEventListener('change', function () { setErr('smsConsent', ''); });
    })();
  </script>
`;
html = html.replace('</body>', `${formSheet}\n</body>`);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, html);
console.log(`${OUT}  ${(html.length / 1024).toFixed(0)}KB  (source ${(readFileSync(SRC).length / 1024).toFixed(0)}KB)`);
