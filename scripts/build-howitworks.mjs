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
      /* Narrower frame => consent text wraps to more lines => taller form.
         Extra class (.page.htw-form-sheet) raises specificity above the base
         940px rule — media queries add no specificity, so without this the
         later base rule would win here despite the breakpoint. */
      .page.htw-form-sheet .hs-form-frame { height: 1160px !important; }
    }
    /* --- Lead-capture sheet (added) --- */
    .htw-form-sheet { scroll-margin-top: 14px; }
    .htw-form-sheet h2 { font-size: 23px; font-weight: 800; letter-spacing: -.5px;
      color: var(--ink); margin: 0 0 4px; }
    .htw-form-sheet .kick { font-size: 10.5px; font-weight: 800; letter-spacing: 1.3px;
      text-transform: uppercase; color: var(--brand); }
    .htw-form-sheet p.sub { font-size: 12px; color: var(--ink-soft); margin: 4px 0 16px; }
    /* HubSpot's embed renders the form in an iframe and is supposed to set the
       frame's height from a postMessage the iframe sends back. Inside this flex
       sheet that resize does not fire reliably, so the frame stays height:0 and
       the form is invisible. We give it an explicit height (iframe is height:100%
       of the frame) — !important beats HubSpot's inline height:0. Generous, so
       the whole form clears; any extra is harmless whitespace. */
    .htw-form-sheet .hs-form-frame { max-width: 560px; height: 940px !important; }
    /* --- CTA buttons that jump to the form (added) --- */
    .htw-cta { display: inline-block; margin-top: 14px; background: #fff; color: var(--brand);
      font-weight: 800; font-size: 12.5px; padding: 10px 18px; border-radius: 24px;
      text-decoration: none; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,.22); }
    .htw-cta:hover { filter: brightness(1.04); }
    .htw-foot-btn { display: inline-block; margin-top: 11px; background: #ffd27a; color: #5a3d0e;
      font-weight: 800; font-size: 12px; padding: 9px 18px; border-radius: 22px;
      text-decoration: none; }
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

// --- CTAs to the form (the pamphlet has none; a 4,500px page buries it) ------
// Hero button: add after the "1st listing FREE" badge inside the hero.
const heroCta =
  `<a href="#htw-form" class="htw-cta"` +
  ` onclick="window.dataLayer&&window.dataLayer.push({event:'cta_click',cta:'talk_to_expert',location:'howitworks_hero'})">` +
  `Talk to an expert &rarr;</a>`;
html = html.replace(
  '<div class="badge">1st listing FREE</div>',
  `<div class="badge">1st listing FREE</div>\n    ${heroCta}`
);

// Closing band CTA -> the main site (sign-up), not the on-page form. The hero's
// "Talk to an expert" covers the form; this one sends ready buyers to deedo.ai.
const footBtn =
  `<a href="https://deedo.ai" target="_blank" rel="noopener"` +
  ` class="htw-foot-btn"` +
  ` onclick="window.dataLayer&&window.dataLayer.push({event:'cta_click',cta:'get_started',location:'howitworks_footer',destination:'deedo.ai'})">` +
  `Get started free &rarr;</a>`;
// Append the button just before the p2-foot band's closing tag.
html = html.replace(
  /(<div class="p2-foot">[\s\S]*?<\/span>)(\s*<\/div>)/,
  `$1\n    ${footBtn}$2`
);

// --- 3. Lead form as a third sheet, before </body> --------------------------
// Native HubSpot embed of fa52f5f8 — the form that defines sms_opt_in, so
// consent is captured correctly and HubSpot's own spam protection applies.
const formSheet = `
  <div id="htw-form" class="page htw-form-sheet">
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
