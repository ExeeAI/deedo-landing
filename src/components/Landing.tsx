/**
 * Landing.tsx — the Deedo.ai marketing page.
 *
 * Design concept: an architectural drawing set. Warm paper stock, ink, hairline
 * rules, mono survey markers ("02 — WHO IT SERVES"), and a graph-paper grid, so
 * the page reads as a property document rather than a generic SaaS page. The
 * copy is Deedo's own; the section order mirrors the marketing site.
 *
 * All content is static data below so the markup stays declarative and each
 * section is a thin map() over it.
 */

import HubspotForm from './HubspotForm';
import { track } from '../lib/analytics';
import { useReveal } from '../lib/useReveal';
// Traced vector (see scripts/prep-logos.mjs) — 24KB and sharp at any size,
// vs 197KB for the raster it replaces. Imported rather than referenced from
// /public so Vite fingerprints it for cache-busting.
import lockup from '../assets/deedo-lockup.svg';

const DEEDO_URL = 'https://deedo.ai';

const TRUST = [
  {
    k: 'Grounded in Your Documents',
    v: "Powered by Google's Gemini, the AI answers only from the PDFs, DOCXs, and text you upload — grounded in your facts, never the open web. No made-up answers, no guessing.",
  },
  {
    k: 'AI Readiness Score',
    v: "An automated audit grades your listing's data from 0–100%. If the AI lacks enough information to be accurate, the listing doesn't go Active.",
  },
  {
    k: 'Confidence-Scored & Escalated',
    v: 'Every answer carries a confidence score. On a subjective question the AI defers and sends a crisp two-sentence summary to your phone — human chat is never blocked.',
  },
];

const PERSONAS = [
  {
    k: 'Listing Agents',
    v: 'Create and manage listings, upload docs, run the AI readiness check, manage your listing team, talk to buyers, and run targeted broadcasts.',
  },
  {
    k: 'Buyers',
    v: 'Discover listings, ask the AI factual questions, chat with the listing team or a private broker, save favorites, and signal interest — web or mobile.',
  },
  {
    k: 'Organizations & Teams',
    v: 'Manage members, agents, and billing across many listings, with scoped invitations and granular, role-based permissions for every team.',
  },
];

const STEPS = [
  {
    k: 'Upload Your Property Docs',
    v: "PDF, DOCX, or text — disclosures, inspection reports, specs. This builds the property's knowledge base.",
  },
  {
    k: 'Pass the AI Readiness Check',
    v: 'An automated 8-category audit scores the listing. Once the score crosses the threshold, the listing can go Active.',
  },
  {
    k: 'Deploy Your QR Code',
    v: 'Print-ready templates for yard signs and flyers. Buyers scan for an anonymous preview and instant Q&A.',
  },
  {
    k: 'Capture Verified Leads',
    v: 'Phone-first identity: buyers authenticate via SMS one-time code, so you capture real, verified US phone numbers.',
  },
];

const PIPELINE = [
  {
    k: 'Dedicated Chat Rooms',
    v: 'A Q&A Room (buyer ↔ AI), Room A for your internal listing team, and Room B for private broker negotiations.',
  },
  {
    k: 'Interest-Level Tagging',
    v: 'Tag every buyer: Will Consider Offer · Very Interested · Considering · Browsing · Not Interested.',
  },
  {
    k: 'Targeted Broadcasts',
    v: 'Announce an offer deadline to just the buyers tagged “Very Interested” — no spraying your whole list.',
  },
  {
    k: 'Consumer Property Hub',
    v: 'Buyers get a dashboard of saved favorites, active chats, and their interest levels across listings.',
  },
];

const PLATFORM = [
  {
    k: 'Organizations & Team Management',
    v: 'Run many listings under one organization, invite members with scoped access, and assign role-based permissions.',
  },
  {
    k: 'Listings, Docs & Archiving',
    v: 'Full lifecycle — Active, Inactive, Archived — with secure document upload processed into a searchable knowledge base.',
  },
  {
    k: 'Agent Directory & Property Hub',
    v: 'An agent directory for discovery, plus a consumer hub tracking favorites, active chats, and interest across listings.',
  },
  {
    k: 'Real-Time Messaging & Push',
    v: 'Live chat with typing indicators, presence, and unread badges — plus mobile push so nobody misses a message.',
  },
  {
    k: 'Verified Phone-First Accounts',
    v: 'Buyers sign up with a one-time SMS code, so every lead is a real, verified number. Email login for returning users.',
  },
  {
    k: 'Secure Billing & Credits',
    v: 'Simple per-property subscriptions with monthly AI credits and optional top-ups, handled through secure Stripe billing.',
  },
];

const PRICE_INCLUDES = [
  '1,000 AI factual Q&A credits every month',
  'Full access to Team Rooms, Broadcasts & Lead Capture',
  'Listing archiving included',
];

/* A decorative QR mark. Deedo's whole open-house flow starts at a scanned code,
   so the motif is the product, not ornament. Fixed pattern (never random) so the
   render is deterministic across reloads and SSR. */
const QR_ROWS = [
  '111111101111111',
  '100000111000001',
  '101110001011101',
  '101110101011101',
  '101110001011101',
  '100000101000001',
  '111111111111111',
  '000000101101010',
  '111111101011010',
  '100000110110101',
  '101110101101011',
  '101110110011010',
  '101110101100101',
  '100000110101101',
  '111111101011011',
];

function QrMark() {
  return (
    <div
      aria-hidden="true"
      className="grid gap-[2px]"
      style={{ gridTemplateColumns: `repeat(15, 1fr)` }}
    >
      {QR_ROWS.flatMap((row, y) =>
        row.split('').map((cell, x) => (
          <span
            key={`${y}-${x}`}
            className={`aspect-square rounded-[1px] ${cell === '1' ? 'bg-ink' : 'bg-transparent'}`}
          />
        ))
      )}
    </div>
  );
}

function Marker({ n, label }: { n: string; label: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="marker text-clay">{n}</span>
      <span className="h-px w-8 bg-ink/25" />
      <span className="marker">{label}</span>
    </div>
  );
}

function Section({
  id,
  n,
  label,
  title,
  lede,
  children,
  tone = 'paper',
}: {
  id?: string;
  n: string;
  label: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
  tone?: 'paper' | 'deep' | 'navy';
}): React.JSX.Element {
  const tones = {
    paper: 'bg-paper text-ink',
    deep: 'bg-paper-deep text-ink',
    navy: 'bg-navy-deep text-paper',
  } as const;
  return (
    <section id={id} className={`relative border-t border-ink/10 ${tones[tone]}`}>
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div data-reveal>
          <Marker n={n} label={label} />
          <h2 className="max-w-3xl text-balance text-3xl leading-[1.1] sm:text-4xl md:text-[2.75rem]">
            {title}
          </h2>
          {lede && (
            <p
              className={`mt-4 max-w-2xl text-base leading-relaxed ${
                tone === 'navy' ? 'text-paper/70' : 'text-ink-soft'
              }`}
            >
              {lede}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Hairline-ruled cell — the drawing-set grid, not a floating "card". */
function Cell({
  k,
  v,
  i,
  tone = 'ink',
}: {
  k: string;
  v: string;
  i: number;
  tone?: 'ink' | 'paper';
}) {
  return (
    <div
      data-reveal
      style={{ '--reveal-delay': `${i * 70}ms` } as React.CSSProperties}
      className={`group border-t pt-5 ${tone === 'paper' ? 'border-paper/20' : 'border-ink/15'}`}
    >
      <h3
        className={`text-lg leading-snug ${tone === 'paper' ? 'text-paper' : 'text-ink'}`}
      >
        {k}
      </h3>
      <p
        className={`mt-2.5 text-sm leading-relaxed ${
          tone === 'paper' ? 'text-paper/65' : 'text-ink-soft'
        }`}
      >
        {v}
      </p>
    </div>
  );
}

export default function Landing(): React.JSX.Element {
  useReveal();

  return (
    <div id="top" className="surface-grain relative min-h-screen overflow-hidden">
      {/* ---------------------------------------------------------------- banner */}
      <div className="bg-navy-deep text-paper">
        <p className="mx-auto max-w-6xl px-6 py-2.5 text-center font-mono text-[11px] uppercase tracking-survey">
          Launch Special — first listing free for 30 days. No credit card.
        </p>
      </div>

      {/* ------------------------------------------------------------------ nav */}
      <nav className="border-b border-ink/10 bg-paper/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="#top" className="flex items-center" aria-label="Deedo — home">
            {/* The brand lockup is navy on transparent, so it only ever sits on
                paper. Height-constrained; width follows the intrinsic ratio. */}
            <img
              src={lockup}
              alt="Deedo"
              width={997}
              height={1182}
              className="h-11 w-auto sm:h-12"
            />
          </a>
          <a
            href="#demo"
            onClick={() => track('cta_click', { cta: 'talk_to_expert', location: 'nav' })}
            className="border border-ink/25 px-4 py-2 font-mono text-[11px] uppercase tracking-survey text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
          >
            Talk to an expert
          </a>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ hero */}
      <header className="surface-grid relative border-b border-ink/10">
        <div className="mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-16">
          <div>
            <div className="animate-rise-in" style={{ animationDelay: '80ms' }}>
              <Marker n="00" label="Deedo — AI for Real Estate" />
            </div>

            <h1
              className="animate-rise-in text-balance text-[2.6rem] leading-[1.03] tracking-[-0.02em] sm:text-6xl md:text-[4.1rem]"
              style={{ animationDelay: '160ms' }}
            >
              Put an AI Concierge
              <br />
              on Your Next{' '}
              <span className="relative whitespace-nowrap text-navy">
                Listing
                <span className="absolute -bottom-1 left-0 h-[3px] w-full origin-left animate-draw-x bg-clay" style={{ animationDelay: '760ms' }} />
              </span>
            </h1>

            <p
              className="animate-rise-in mt-7 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft"
              style={{ animationDelay: '260ms' }}
            >
              Upload your property disclosures, generate a custom QR code, and capture
              verified leads at your open house. Deedo&apos;s AI answers buyer questions
              instantly using only your approved documents — freeing you to close deals,
              not chase tire-kickers.
            </p>

            <div
              className="animate-rise-in mt-9 flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: '360ms' }}
            >
              <a
                href={DEEDO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('cta_click', { cta: 'claim_free_listing', location: 'hero' })}
                className="group inline-flex items-center justify-center gap-2 bg-clay px-7 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-clay-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
              >
                Claim Your Free Listing
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </a>
              <a
                href="#demo"
                onClick={() => track('cta_click', { cta: 'see_how_it_works', location: 'hero' })}
                className="inline-flex items-center justify-center border border-ink/25 px-7 py-3.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
              >
                See How the AI Works
              </a>
            </div>
          </div>

          {/* Listing spec sheet — shows the product rather than describing it. */}
          <div className="animate-rise-in" style={{ animationDelay: '460ms' }}>
            <div className="relative border border-ink/15 bg-paper shadow-[6px_6px_0_0_rgba(23,21,18,0.08)]">
              <div className="flex items-center justify-between border-b border-ink/12 px-5 py-3">
                <span className="marker">1247 Maple Grove Dr</span>
                <span className="marker text-navy">● Active</span>
              </div>

              <div className="flex gap-5 px-5 py-5">
                <div className="w-[92px] shrink-0">
                  <QrMark />
                  <p className="marker mt-2 block text-center text-[9px]">Scan to ask</p>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="marker">AI Readiness</span>
                    <span className="font-mono text-sm font-medium text-navy">94%</span>
                  </div>
                  <div className="h-1.5 w-full bg-ink/10">
                    <div className="h-full w-[94%] bg-navy" />
                  </div>

                  <div className="mt-5 space-y-3">
                    <div>
                      <p className="marker mb-1">Buyer</p>
                      <p className="border-l-2 border-ink/15 pl-3 text-sm text-ink">
                        When was the roof last replaced?
                      </p>
                    </div>
                    <div>
                      <p className="marker mb-1 text-navy">Deedo AI</p>
                      <p className="border-l-2 border-navy pl-3 text-sm text-ink">
                        2021. The inspection report lists a full tear-off and replacement
                        in June 2021.
                        <span className="ml-1 inline-block h-3.5 w-[7px] translate-y-[1px] animate-blink bg-navy align-baseline" />
                      </p>
                      <p className="marker mt-1.5 pl-3 text-[9px]">
                        Source — inspection-report.pdf · p.14
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-ink/12 px-5 py-2.5">
                <p className="marker text-[9px]">
                  Answers restricted to uploaded documents
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* trust strip */}
        <div className="border-t border-ink/10 bg-paper-deep">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-4 text-center font-mono text-[11px] uppercase tracking-survey text-ink-mute sm:flex-row sm:justify-center sm:gap-8">
            <span>Web · iOS · Android</span>
            <span className="hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <span>Verified phone-first accounts</span>
            <span className="hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <span>Grounded in Google Gemini</span>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------------- trust */}
      <Section
        n="01"
        label="Trust"
        title="Grounded in facts. Built for trust."
        lede="Deedo answers only from what you approve — so buyers get accurate information and you stay in control."
      >
        <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST.map((c, i) => (
            <Cell key={c.k} {...c} i={i} />
          ))}
        </div>
      </Section>

      {/* -------------------------------------------------------------- personas */}
      <Section
        n="02"
        label="Who it serves"
        title="Built for everyone in the deal."
        lede="One platform — with the right tools for agents, buyers, and the organizations behind them."
        tone="deep"
      >
        <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAS.map((c, i) => (
            <Cell key={c.k} {...c} i={i} />
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------------------ how it works */}
      <Section
        n="03"
        label="How it works"
        title="Open houses, redefined."
        lede="From documents to verified leads in four steps."
      >
        <ol className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li
              key={s.k}
              data-reveal
              style={{ '--reveal-delay': `${i * 90}ms` } as React.CSSProperties}
              className="border-t border-ink/15 pt-5"
            >
              <span className="font-display text-4xl leading-none text-clay">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 text-lg leading-snug">{s.k}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{s.v}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* -------------------------------------------------------------- pipeline */}
      <Section
        n="04"
        label="Pipeline"
        title="Total control over your pipeline."
        lede="Organize every conversation, tag interest, and reach the right buyers at the right moment."
        tone="navy"
      >
        <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((c, i) => (
            <Cell key={c.k} {...c} i={i} tone="paper" />
          ))}
        </div>
      </Section>

      {/* -------------------------------------------------------------- platform */}
      <Section
        n="05"
        label="Platform"
        title="A complete platform behind every listing."
        lede="Beyond the AI concierge — everything you need to run listings, teams, and buyer relationships."
        tone="deep"
      >
        <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM.map((c, i) => (
            <Cell key={c.k} {...c} i={i} />
          ))}
        </div>
      </Section>

      {/* --------------------------------------------------------------- pricing */}
      <Section
        n="06"
        label="Pricing"
        title="Predictable pricing. Zero friction."
      >
        <div className="mt-12 grid gap-12 lg:grid-cols-[auto_1fr] lg:gap-20">
          <div data-reveal>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-7xl leading-none tracking-tight text-navy sm:text-8xl">
                $40
              </span>
              <span className="marker">/mo</span>
            </div>
            <p className="marker mt-3">Per active property</p>
          </div>

          <div data-reveal style={{ '--reveal-delay': '90ms' } as React.CSSProperties}>
            <ul className="space-y-3">
              {PRICE_INCLUDES.map((item) => (
                <li key={item} className="flex gap-3 border-t border-ink/15 pt-3 text-sm">
                  <span aria-hidden="true" className="mt-1 text-clay">
                    ✓
                  </span>
                  <span className="text-ink-soft">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 border-l-2 border-clay bg-paper-deep px-5 py-4">
              <p className="text-sm leading-relaxed text-ink-soft">
                <strong className="font-semibold text-ink">
                  The FirstPropertyFree Guarantee:
                </strong>{' '}
                your first listing is 100% free for 30 days — no credit card to activate.
                Walk away before day 30 and pay nothing.
              </p>
            </div>

            <a
              href={DEEDO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('cta_click', { cta: 'phone_first_signup', location: 'pricing' })}
              className="group mt-8 inline-flex items-center gap-2 bg-ink px-7 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Start Your Phone-First Sign-Up
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </a>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------------ demo */}
      <section id="demo" className="surface-grid relative border-t border-ink/10 bg-paper">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:py-28 lg:grid-cols-2 lg:gap-20">
          <div data-reveal>
            <Marker n="07" label="Talk to us" />
            <h2 className="text-balance text-3xl leading-[1.1] sm:text-4xl md:text-[2.75rem]">
              Prefer a guided walkthrough?
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">
              Talk to an expert and we&apos;ll show you how Deedo works on your next
              listing — from document upload to the first verified lead.
            </p>

            <dl className="mt-10 space-y-4">
              {[
                ['Setup', 'Under 10 minutes per listing'],
                ['Coverage', 'United States & Canada'],
                ['First listing', 'Free for 30 days, no card'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-t border-ink/15 pt-3">
                  <dt className="marker">{k}</dt>
                  <dd className="font-mono text-xs text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div data-reveal style={{ '--reveal-delay': '120ms' } as React.CSSProperties}>
            <HubspotForm onSuccess={() => track('generate_lead', { form: 'talk_to_expert' })} />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- footer */}
      {/* Light on purpose: the lockup is navy with near-white interior detail, so
          on a dark band the house outline disappears and the letter counters read
          as floating white blobs. Paper is the only correct backdrop for it. */}
      <footer className="border-t border-ink/10 bg-paper-deep text-ink">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img src={lockup} alt="Deedo" width={997} height={1182} className="h-14 w-auto" />
            <p className="marker max-w-[10rem] leading-4">AI for Real Estate Listings</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a href={DEEDO_URL} target="_blank" rel="noopener noreferrer" className="marker transition-colors hover:text-ink">
              deedo.ai
            </a>
            <a href="https://deedo.ai/privacy" target="_blank" rel="noopener noreferrer" className="marker transition-colors hover:text-ink">
              Privacy
            </a>
            <a href="https://deedo.ai/terms" target="_blank" rel="noopener noreferrer" className="marker transition-colors hover:text-ink">
              Terms
            </a>
          </div>
        </div>
        <div className="border-t border-ink/10">
          <p className="mx-auto max-w-6xl px-6 py-4 font-mono text-[10px] uppercase tracking-survey text-ink-mute">
            © {new Date().getFullYear()} Deedo — United States &amp; Canada
          </p>
        </div>
      </footer>
    </div>
  );
}
