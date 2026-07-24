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

## Fastest path — works immediately, no DNS needed

You do **not** need `deedo.ai` on Cloudflare to fix the blocking. A free
Cloudflare account is enough:

```bash
cd proxy
npx wrangler login     # opens a browser; free account is fine
npx wrangler deploy    # prints https://deedo-lead-proxy.<you>.workers.dev
```

`*.workers.dev` is not on any tracker blocklist, so it evades Tracking
Prevention just as well as a custom domain. Set the site's `LEAD_ENDPOINT` to
`https://deedo-lead-proxy.<you>.workers.dev` (see "Point the site at it") and the
form works for blocked visitors right away. Send that URL over and the site can
be wired up in a minute.

## Optional upgrade — custom domain

If `deedo.ai` is on Cloudflare, uncomment the `forms.deedo.ai/lead` route in
`wrangler.toml` and `npx wrangler deploy` again, then point `LEAD_ENDPOINT` at
`https://forms.deedo.ai/lead`. Cleaner and unambiguously first-party, but not
required for the fix.

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
