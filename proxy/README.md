# Lead-form proxy (Cloudflare Worker)

Makes the landing-page forms **blocker-proof** by routing submissions through a
first-party host on `deedo.ai` instead of calling `api.hsforms.com` from the
browser.

## The problem it solves

The forms POST directly to `api.hsforms.com`. Ad blockers and privacy browsers
(uBlock/EasyPrivacy, Brave shields, Firefox strict) block HubSpot's domains, so
those visitors get a "network error" and their lead is lost — silently.

Blocklists match on **hostname**. If the browser POSTs to `forms.deedo.ai`
instead, and this Worker forwards to HubSpot **server-side**, the browser never
makes a HubSpot request — there's nothing for a blocker to catch.

```
Browser ──POST──▶ forms.deedo.ai/lead ──(edge, server-side)──▶ api.hsforms.com
        (first-party, not on any blocklist)
```

## Deploy (one time)

Requires the `deedo.ai` DNS zone to be on Cloudflare.

```bash
cd proxy
npx wrangler login
# Edit wrangler.toml: uncomment the forms.deedo.ai route (approach A).
npx wrangler deploy
```

Then in Cloudflare → Workers → your worker → **Settings → Domains & Routes**,
confirm `forms.deedo.ai/lead` is attached (wrangler does this when the route is
uncommented and DNS is on Cloudflare).

No custom domain yet? `wrangler deploy` still prints a
`https://deedo-lead-proxy.<subdomain>.workers.dev` URL that works for testing.

## Point the site at it

Set one value and redeploy the site:

- **GitHub repo variable** `LEAD_ENDPOINT` = `https://forms.deedo.ai/lead`
  (Settings → Secrets and variables → Actions → Variables). Used by the React
  pages (`/`, `/tryus/`).
- **Static pages** (`/howitworks/`, `/talk/`) read the same value at build time
  via `scripts/build-howitworks.mjs` and the talk page's config.

Leave `LEAD_ENDPOINT` unset and everything falls back to calling HubSpot
directly (today's behaviour) — so the site keeps working before the Worker
exists, and improves the moment it's set.

## How the form uses it

The form POSTs its normal HubSpot payload to `LEAD_ENDPOINT` with
`?portalId=…&formGuid=…`. The Worker validates that pair against its allow-list
(so it can't be abused to spam other forms), forwards to HubSpot, and returns
HubSpot's exact status/body. The form code is otherwise unchanged.

## Security

- Not an open proxy: only `POST`, only to HubSpot's submit URL, only for the
  portal/form pairs in `ALLOWED_FORMS`.
- CORS restricted to `ALLOWED_ORIGINS`.
- No secrets involved — portal ID and form GUID are public identifiers.
