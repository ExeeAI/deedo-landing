/**
 * Google Tag provision — GTM and/or GA4, both optional and env-gated.
 *
 * Why injected here rather than hard-coded in index.html: the container/
 * measurement IDs differ per environment, and a static `<script>` tag in the
 * HTML would fire on every deploy including previews. Injecting from env means
 * a build with no IDs set loads NO Google script at all — zero third-party
 * requests, which also keeps local dev and CI clean.
 *
 * Set VITE_GTM_ID (GTM-XXXXXXX) and/or VITE_GA4_ID (G-XXXXXXXXXX).
 * You can use both: GTM as the tag manager, GA4 direct as a fallback. Most
 * setups want ONE — prefer GTM if you'll manage tags without redeploying.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function env(): Record<string, string> {
  return (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
}

/** dataLayer must exist before any Google snippet runs. */
function ensureDataLayer(): unknown[] {
  window.dataLayer = window.dataLayer ?? [];
  return window.dataLayer;
}

let initialised = false;

/**
 * Inject the configured Google tags. Idempotent and SSR-safe; call once on
 * mount. No-ops entirely when neither ID is configured.
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (initialised) return;
  initialised = true;

  const e = env();
  const gtmId = e.VITE_GTM_ID?.trim();
  const ga4Id = e.VITE_GA4_ID?.trim();
  if (!gtmId && !ga4Id) return;

  ensureDataLayer();

  if (gtmId) {
    window.dataLayer!.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
    document.head.appendChild(s);

    // <noscript> fallback iframe, mirroring Google's standard snippet.
    const ns = document.createElement('noscript');
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtmId)}`;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    ns.appendChild(iframe);
    document.body.insertBefore(ns, document.body.firstChild);
  }

  if (ga4Id) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
    document.head.appendChild(s);

    // gtag() must push `arguments` verbatim — not a spread array. The GA4
    // library reads the Arguments object itself, so a rest-parameter array
    // silently breaks config/event calls.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', ga4Id);
  }
}

/**
 * Push a custom event. Safe to call whether or not any tag is configured — it
 * just accumulates on dataLayer, which GTM replays once it loads.
 *
 * Deliberately vendor-neutral: components call track(), not gtag/dataLayer
 * directly, so swapping analytics later touches only this file.
 */
export function track(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  ensureDataLayer().push({ event, ...params });
}
