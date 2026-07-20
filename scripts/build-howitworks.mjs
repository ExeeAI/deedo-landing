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
 *   3. A HubSpot lead form (native embed of fa52f5f8 — the only form with the
 *      sms_opt_in consent field) as a third sheet, so the explainer converts.
 *
 * Everything is appended/injected, never edited in place, so re-running against
 * a new pamphlet revision Just Works.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SRC = 'inputdata/deedo-pamphlet_5.html';
const OUT_DIR = 'public/howitworks';
const OUT = `${OUT_DIR}/index.html`;

const GTM_ID = 'GTM-MSNV33KS';
const FORM_PORTAL = '21197737';
const FORM_GUID = 'fa52f5f8-7d09-4103-921c-0146c0322cef';

let html = readFileSync(SRC, 'utf8');

// --- 1. <head>: GTM loader + meta + responsive layer ------------------------
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
    }
    /* --- Lead-capture sheet (added) --- */
    .htw-form-sheet h2 { font-size: 23px; font-weight: 800; letter-spacing: -.5px;
      color: var(--ink); margin: 0 0 4px; }
    .htw-form-sheet .kick { font-size: 10.5px; font-weight: 800; letter-spacing: 1.3px;
      text-transform: uppercase; color: var(--brand); }
    .htw-form-sheet p.sub { font-size: 12px; color: var(--ink-soft); margin: 4px 0 16px; }
    .htw-form-sheet .hs-form-frame { max-width: 560px; }
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

// --- 3. Lead form as a third sheet, before </body> --------------------------
// Native HubSpot embed of fa52f5f8 — the form that defines sms_opt_in, so
// consent is captured correctly and HubSpot's own spam protection applies.
const formSheet = `
  <div class="page htw-form-sheet">
    <div class="kick">Ready when you are</div>
    <h2>Put Deedo on your next listing</h2>
    <p class="sub">Your first listing is free — no credit card. Talk to an expert and we'll get you set up.</p>
    <div class="hs-form-frame" data-region="na2"
         data-form-id="${FORM_GUID}" data-portal-id="${FORM_PORTAL}"></div>
  </div>
  <script src="https://js-na2.hsforms.net/forms/embed/${FORM_PORTAL}.js" defer></script>
`;
html = html.replace('</body>', `${formSheet}\n</body>`);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, html);
console.log(`${OUT}  ${(html.length / 1024).toFixed(0)}KB  (source ${(readFileSync(SRC).length / 1024).toFixed(0)}KB)`);
