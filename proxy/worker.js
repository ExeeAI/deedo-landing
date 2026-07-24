/**
 * Cloudflare Worker — first-party lead-form proxy.
 *
 * Why this exists
 * ---------------
 * The landing forms POST directly to api.hsforms.com from the browser. Ad
 * blockers and privacy browsers (uBlock/EasyPrivacy, Brave, Firefox strict)
 * block HubSpot's domains, so those visitors' submissions throw a network error
 * and never reach HubSpot — silent lost leads.
 *
 * A blocklist matches on hostname. If the browser instead POSTs to a first-party
 * host on your own domain (e.g. forms.deedo.ai) and THIS Worker forwards the
 * request to HubSpot server-side, the browser never makes a HubSpot request at
 * all — nothing for a blocker to match. The Worker runs on Cloudflare's edge, so
 * there is no origin server to maintain.
 *
 * Deploy: see proxy/README.md. Bind it to a route like forms.deedo.ai/lead.
 *
 * Security notes
 * - Only POST is forwarded, only to the fixed HubSpot submit URL — this is not
 *   an open proxy.
 * - CORS is restricted to the allowed origins below.
 * - portalId/formGuid are validated against an allow-list so the endpoint can't
 *   be abused to spam arbitrary HubSpot forms.
 */

const ALLOWED_ORIGINS = [
  'https://land.deedo.ai',
  'https://deedo.ai',
  'https://www.deedo.ai',
];

// Only these portal/form pairs may be submitted through the proxy.
const ALLOWED_FORMS = new Set([
  '21197737/fa52f5f8-7d09-4103-921c-0146c0322cef',
]);

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    // Preflight.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: cors });
    }

    // The form POSTs to /lead?portalId=..&formGuid=.. (or sends them in the
    // body); we accept either but validate against the allow-list.
    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ status: 'error', message: 'Invalid JSON' }, 400, cors);
    }

    const url = new URL(request.url);
    const portalId = url.searchParams.get('portalId') || payload.__portalId;
    const formGuid = url.searchParams.get('formGuid') || payload.__formGuid;
    delete payload.__portalId;
    delete payload.__formGuid;

    if (!ALLOWED_FORMS.has(`${portalId}/${formGuid}`)) {
      return json({ status: 'error', message: 'Unknown form' }, 403, cors);
    }

    // Forward server-side to HubSpot. The visitor's browser never sees this.
    const hsUrl =
      `https://api.hsforms.com/submissions/v3/integration/submit/${encodeURIComponent(portalId)}/${encodeURIComponent(formGuid)}`;

    const hsRes = await fetch(hsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Pass HubSpot's status + body straight back, with our CORS headers.
    const text = await hsRes.text();
    return new Response(text, {
      status: hsRes.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
