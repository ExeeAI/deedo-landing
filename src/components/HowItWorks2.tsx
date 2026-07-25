/**
 * HowItWorks2.tsx — /howitworks2/ landing page.
 *
 * A conversion-focused explainer that leads hard with the offer — first listing
 * FREE, no credit card, no commitment — walks through how Deedo works, and then
 * deliberately SPLITS the audience into two paths:
 *   • Ready now  -> self-serve sign-up at deedo.ai (no form, no wait).
 *   • Want a demo -> request a callback via the HubSpot form.
 *
 * Same "architectural drawing set" design language as the other React pages
 * (paper/ink/navy, Fraunces + IBM Plex, hairline rules, mono markers). The clay
 * accent is reserved here for the free/offer emphasis so it reads as one idea.
 */

import HubspotForm from './HubspotForm';
import { track } from '../lib/analytics';
import { useReveal } from '../lib/useReveal';
import lockup from '../assets/deedo-lockup.svg';

const DEEDO_URL = 'https://deedo.ai';
// "Claim / start / sign up" CTAs go to the app sign-up flow; the footer brand
// link keeps using DEEDO_URL (the marketing site).
const SIGNUP_URL = 'https://app.deedo.ai/signup';

/** Fire an analytics event and let the default link/scroll happen. */
function cta(name: string, location: string) {
  track('cta_click', { cta: name, location });
}

const STEPS = [
  { k: 'Upload your docs', v: 'Add the disclosures, inspection reports, and specs you already have. This builds the listing’s knowledge base.' },
  { k: 'Pass the AI readiness check', v: 'An automated 8-category audit scores the listing. Once it clears the bar, it can go live — so buyers only meet an AI that knows its facts.' },
  { k: 'Deploy your QR code', v: 'Print-ready yard-sign and flyer templates. Buyers scan for an anonymous preview and instant, 24/7 Q&A — no app, no forms.' },
  { k: 'Capture verified leads', v: 'Phone-first identity: buyers authenticate by SMS code, so every lead is a real, verified number waiting in your dashboard.' },
];

const FREE_POINTS = [
  { k: 'No credit card', v: 'Activate your first listing without entering a card. Nothing to cancel, nothing charged.' },
  { k: 'No commitment', v: 'Free for 30 days. Walk away before day 30 and you pay nothing — no questions, no strings.' },
  { k: 'Every feature included', v: 'Your free listing is the full product: grounded AI, readiness score, QR codes, team rooms, and verified lead capture.' },
];

function Marker({ n, label, tone = 'ink' }: { n: string; label: string; tone?: 'ink' | 'paper' }) {
  const mute = tone === 'paper' ? 'text-paper/60' : 'text-ink-mute';
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className={`font-mono text-[11px] uppercase tracking-survey text-clay`}>{n}</span>
      <span className={`h-px w-8 ${tone === 'paper' ? 'bg-paper/25' : 'bg-ink/25'}`} />
      <span className={`font-mono text-[11px] uppercase tracking-survey ${mute}`}>{label}</span>
    </div>
  );
}

export default function HowItWorks2(): React.JSX.Element {
  useReveal();

  return (
    <div id="top" className="surface-grain relative min-h-screen overflow-hidden">
      {/* ---------------------------------------------------------------- banner */}
      <div className="bg-clay text-paper">
        <p className="mx-auto max-w-6xl px-6 py-2.5 text-center font-mono text-[11px] uppercase tracking-survey">
          Launch offer — your first listing is free. No credit card. No commitment.
        </p>
      </div>

      {/* ------------------------------------------------------------------- nav */}
      <nav className="border-b border-ink/10 bg-paper/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="#top" aria-label="Deedo — home"><img src={lockup} alt="Deedo" width={997} height={1182} className="h-11 w-auto sm:h-12" /></a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="#demo" onClick={() => cta('request_demo', 'nav')} className="hidden border border-ink/25 px-4 py-2 font-mono text-[11px] uppercase tracking-survey text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper sm:inline-block">
              Request a demo
            </a>
            <a href={SIGNUP_URL} target="_blank" rel="noopener noreferrer" onClick={() => cta('start_free', 'nav')} className="bg-clay px-4 py-2 font-mono text-[11px] uppercase tracking-survey text-paper transition-colors hover:bg-clay-deep">
              Start free
            </a>
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ hero */}
      <header className="surface-grid relative border-b border-ink/10">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 sm:pt-20 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <div className="animate-rise-in"><Marker n="00" label="First listing free" /></div>
            <h1 className="animate-rise-in text-balance text-[2.7rem] leading-[1.02] tracking-[-0.02em] sm:text-6xl md:text-[4.15rem]" style={{ animationDelay: '120ms' }}>
              Your first listing is{' '}
              <span className="relative whitespace-nowrap text-clay">
                free
                <span className="absolute -bottom-1 left-0 h-[3px] w-full origin-left animate-draw-x bg-clay" style={{ animationDelay: '720ms' }} />
              </span>
              .<br />No card. No commitment.
            </h1>
            <p className="animate-rise-in mt-7 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft" style={{ animationDelay: '240ms' }}>
              Put an AI concierge on your next listing — it answers buyer questions 24/7 straight from your own documents, and sends verified leads to your dashboard. Try the whole thing on your next listing before you pay a cent.
            </p>

            <div className="animate-rise-in mt-9 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: '340ms' }}>
              <a href={SIGNUP_URL} target="_blank" rel="noopener noreferrer" onClick={() => cta('claim_free_listing', 'hero')} className="group inline-flex items-center justify-center gap-2 bg-clay px-7 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-clay-deep">
                Claim your free listing
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
              </a>
              <a href="#demo" onClick={() => cta('request_demo', 'hero')} className="inline-flex items-center justify-center border border-ink/25 px-7 py-3.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper">
                Prefer a demo? Request a callback
              </a>
            </div>

            <p className="animate-rise-in mt-6 font-mono text-[11px] uppercase tracking-survey text-ink-mute" style={{ animationDelay: '440ms' }}>
              No credit card · Cancel anytime · Web · iOS · Android
            </p>
          </div>

          {/* Offer card — the whole pitch, one glance. */}
          <div className="animate-rise-in" style={{ animationDelay: '460ms' }}>
            <div className="relative border-2 border-clay bg-paper p-7 shadow-[6px_6px_0_0_rgba(196,86,43,0.18)]">
              <span className="absolute -top-3 left-6 bg-clay px-3 py-1 font-mono text-[10px] uppercase tracking-survey text-paper">
                The FirstPropertyFree guarantee
              </span>
              <p className="mt-3 font-display text-5xl leading-none text-clay">$0</p>
              <p className="marker mt-2">for your first listing · 30 days</p>
              <ul className="mt-6 space-y-3">
                {['No credit card to activate', 'Full product, not a trial tier', 'Walk away before day 30 — pay nothing'].map((t) => (
                  <li key={t} className="flex gap-3 border-t border-ink/12 pt-3 text-sm text-ink-soft">
                    <span aria-hidden="true" className="mt-0.5 text-clay">✓</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <a href={SIGNUP_URL} target="_blank" rel="noopener noreferrer" onClick={() => cta('claim_free_listing', 'hero_card')} className="mt-6 block bg-ink px-5 py-3 text-center text-sm font-medium text-paper transition-colors hover:bg-navy">
                Start free — no card needed
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ how it works */}
      <section className="border-t border-ink/10 bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div data-reveal>
            <Marker n="01" label="How it works" />
            <h2 className="max-w-3xl text-balance text-3xl leading-[1.1] sm:text-4xl md:text-[2.75rem]">From your documents to a verified buyer — in four steps.</h2>
          </div>
          <ol className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.k} data-reveal style={{ '--reveal-delay': `${i * 90}ms` } as React.CSSProperties} className="border-t border-ink/15 pt-5">
                <span className="font-display text-4xl leading-none text-clay">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 text-lg leading-snug">{s.k}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{s.v}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------- free emphasis */}
      <section className="border-t border-ink/10 bg-navy-deep text-paper">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div data-reveal>
            <Marker n="02" label="Zero risk" tone="paper" />
            <h2 className="max-w-3xl text-balance text-3xl leading-[1.1] sm:text-4xl md:text-[2.75rem]">Free means free. Not a demo, not a trial tier.</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-paper/70">Your first listing runs the complete product for 30 days. No card up front, nothing to cancel, no strings.</p>
          </div>
          <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-3">
            {FREE_POINTS.map((c, i) => (
              <div key={c.k} data-reveal style={{ '--reveal-delay': `${i * 70}ms` } as React.CSSProperties} className="border-t border-paper/20 pt-5">
                <h3 className="text-lg leading-snug text-paper">{c.k}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-paper/65">{c.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- two paths */}
      <section className="border-t border-ink/10 bg-paper-deep">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div data-reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl leading-[1.1] sm:text-4xl md:text-[2.75rem]">Two ways to start — pick yours.</h2>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">Ready to go? Set up your free listing in minutes. Want to see it first? Book a walkthrough and we’ll call you back.</p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {/* Path A — self-serve */}
            <div data-reveal className="flex flex-col border border-ink/15 bg-paper p-8">
              <Marker n="A" label="Ready now" />
              <h3 className="font-display text-2xl text-ink">Start free, right now</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">Create your account, upload a listing’s documents, and deploy your QR code today. No card, no call, no waiting — you’re live in minutes.</p>
              <a href={SIGNUP_URL} target="_blank" rel="noopener noreferrer" onClick={() => cta('start_free', 'two_paths')} className="group mt-6 inline-flex items-center justify-center gap-2 bg-clay px-6 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-clay-deep">
                Sign up & claim your free listing
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
              </a>
            </div>

            {/* Path B — demo / callback */}
            <div data-reveal style={{ '--reveal-delay': '90ms' } as React.CSSProperties} className="flex flex-col border border-ink/15 bg-paper p-8">
              <Marker n="B" label="Want a demo" />
              <h3 className="font-display text-2xl text-ink">Get a guided walkthrough</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">Prefer to see it on one of your own listings first? Request a callback and a Deedo expert will walk you through setup and answer your questions.</p>
              <a href="#demo" onClick={() => cta('request_demo', 'two_paths')} className="mt-6 inline-flex items-center justify-center border border-ink/25 px-6 py-3.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper">
                Request a callback
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- pricing */}
      <section className="border-t border-ink/10 bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div data-reveal>
            <Marker n="03" label="Pricing" />
            <h2 className="max-w-3xl text-balance text-3xl leading-[1.1] sm:text-4xl md:text-[2.75rem]">Your first listing is free. Add more when you’re ready.</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">No card to start. When you list a second property, it’s simple per-property pricing — cancel anytime.</p>
          </div>

          <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-2">
            {/* Free */}
            <div data-reveal className="flex flex-col border-2 border-clay bg-paper p-8">
              <span className="marker text-clay">First listing</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-6xl leading-none text-clay">Free</span>
                <span className="marker">for 30 days</span>
              </div>
              <ul className="mt-7 space-y-3">
                {['No credit card required', 'The complete product — every feature', '1,000 AI Q&A credits included', 'Cancel before day 30, pay nothing'].map((t) => (
                  <li key={t} className="flex gap-3 border-t border-ink/12 pt-3 text-sm text-ink-soft"><span aria-hidden="true" className="mt-0.5 text-clay">✓</span><span>{t}</span></li>
                ))}
              </ul>
              <a href={SIGNUP_URL} target="_blank" rel="noopener noreferrer" onClick={() => cta('claim_free_listing', 'pricing')} className="mt-7 block bg-clay px-6 py-3.5 text-center text-sm font-medium text-paper transition-colors hover:bg-clay-deep">
                Claim your free listing
              </a>
            </div>

            {/* Subscription */}
            <div data-reveal style={{ '--reveal-delay': '90ms' } as React.CSSProperties} className="flex flex-col border border-ink/15 bg-paper-deep p-8">
              <span className="marker">Additional listings</span>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-6xl leading-none text-navy">$40</span>
                <span className="marker">/mo per property</span>
              </div>
              <ul className="mt-7 space-y-3">
                {['1,000 AI Q&A credits every month', 'Team Rooms, Broadcasts & lead capture', 'Listing archiving included', 'Cancel anytime — no lock-in'].map((t) => (
                  <li key={t} className="flex gap-3 border-t border-ink/15 pt-3 text-sm text-ink-soft"><span aria-hidden="true" className="mt-0.5 text-navy">✓</span><span>{t}</span></li>
                ))}
              </ul>
              <a href={SIGNUP_URL} target="_blank" rel="noopener noreferrer" onClick={() => cta('start_free', 'pricing_sub')} className="mt-7 block border border-ink/25 px-6 py-3.5 text-center text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper">
                Start with your free listing first
              </a>
            </div>
          </div>
          <p data-reveal className="mt-6 text-center font-mono text-[11px] uppercase tracking-survey text-ink-mute">
            You’re only ever billed when you add a second active property. The first is always free to try.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ demo */}
      <section id="demo" className="surface-grid relative border-t border-ink/10 bg-paper-deep">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:py-24 lg:grid-cols-2 lg:gap-20">
          <div data-reveal>
            <Marker n="04" label="Request a callback" />
            <h2 className="text-balance text-3xl leading-[1.1] sm:text-4xl md:text-[2.75rem]">Want a walkthrough before you start?</h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">Leave your details and a Deedo expert will call you back to set up your first — free — listing and answer anything.</p>
            <p className="mt-6 font-mono text-[12px] text-ink">
              In a hurry?{' '}
              <a href={SIGNUP_URL} target="_blank" rel="noopener noreferrer" onClick={() => cta('start_free', 'demo_inline')} className="text-clay underline">skip the call and start free now →</a>
            </p>
            <dl className="mt-8 space-y-4">
              {[['Setup', 'Under 10 minutes per listing'], ['Coverage', 'United States & Canada'], ['First listing', 'Free 30 days · no card']].map(([k, v]) => (
                <div key={k} className="flex justify-between border-t border-ink/15 pt-3">
                  <dt className="marker">{k}</dt>
                  <dd className="font-mono text-xs text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div data-reveal style={{ '--reveal-delay': '120ms' } as React.CSSProperties}>
            <HubspotForm heading="Request a callback" onSuccess={() => track('generate_lead', { form: 'howitworks2' })} />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- footer */}
      <footer className="border-t border-ink/10 bg-paper-deep text-ink">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img src={lockup} alt="Deedo" width={997} height={1182} className="h-14 w-auto" />
            <p className="marker max-w-[10rem] leading-4">AI for Real Estate Listings</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="/articles/" className="marker transition-colors hover:text-ink">Articles</a>
            <a href={DEEDO_URL} target="_blank" rel="noopener noreferrer" className="marker transition-colors hover:text-ink">deedo.ai</a>
            <a href="https://app.deedo.ai/privacy-policy" target="_blank" rel="noopener noreferrer" className="marker transition-colors hover:text-ink">Privacy</a>
            <a href="https://app.deedo.ai/terms-of-use" target="_blank" rel="noopener noreferrer" className="marker transition-colors hover:text-ink">Terms</a>
          </div>
        </div>
        <div className="border-t border-ink/10">
          <p className="mx-auto max-w-6xl px-6 py-4 font-mono text-[10px] uppercase tracking-survey text-ink-mute">© {new Date().getFullYear()} Deedo — United States &amp; Canada</p>
        </div>
      </footer>
    </div>
  );
}
