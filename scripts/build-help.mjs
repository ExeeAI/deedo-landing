/**
 * build-help.mjs — static help/support center for land.deedo.ai/help/.
 *
 * Mirrors the article generator (same brand styling via /articles/article.css)
 * but produces support docs under public/help/ with support-appropriate schema:
 *   /help/                 the help-center index (articles grouped by category)
 *   /help/<slug>/          each help article (Breadcrumb + HowTo + FAQPage)
 *   /sitemap-help.xml      every help URL (listed in robots.txt)
 *
 * Add a help doc = drop content/help/<slug>.md and rebuild. Runs as part of
 * `npm run build`.
 *
 * Frontmatter (YAML): title, description (required); date, updated, slug,
 *   category (section on the index), order (sort within category).
 * The first ordered list in the body becomes HowTo steps; a "Frequently Asked
 * Questions" section becomes FAQPage.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { marked } from 'marked';
import matter from 'gray-matter';

const SITE = 'https://land.deedo.ai';
const SIGNUP_URL = 'https://app.deedo.ai/signup';
const CONTENT_DIR = 'content/help';
const OUT_DIR = 'public/help';
const FONTS =
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,400..800,0..100,0..1&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap';

// ---------- helpers ---------------------------------------------------------
const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s = '') =>
  String(s).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
const toISODate = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));
const toISODateTime = (d) => `${d}T09:00:00+00:00`;
const prettyDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const stripMd = (s = '') =>
  s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/\s+/g, ' ').trim();

// First contiguous ordered list in the body -> HowTo steps.
function parseSteps(md) {
  const raw = [];
  let started = false;
  for (const line of md.split('\n')) {
    const m = line.match(/^\d+\.\s+(.*)/);
    if (m) { started = true; raw.push(m[1].trim()); }
    else if (started) break;
  }
  return raw.map((t) => {
    const b = t.match(/^\*\*(.+?)\*\*\s*(.*)/);
    const name = stripMd(b ? b[1].replace(/[.:]\s*$/, '') : t).slice(0, 110);
    return { name, text: stripMd(t) };
  });
}

// "Frequently Asked Questions" H2 -> Q&A pairs from following H3s.
function extractFaq(md) {
  const items = [];
  let inFaq = false, q = null, ans = [];
  const flush = () => { if (q && ans.join(' ').trim()) items.push({ q, a: ans.join(' ') }); q = null; ans = []; };
  for (const line of md.split('\n')) {
    const h2 = line.match(/^##\s+(.*)/);
    if (h2) { flush(); inFaq = /frequently asked questions|\bfaq\b/i.test(h2[1]); continue; }
    if (!inFaq) continue;
    const h3 = line.match(/^###\s+(.*)/);
    if (h3) { flush(); q = h3[1]; continue; }
    if (q) ans.push(line);
  }
  flush();
  return items.map((it) => ({ q: stripMd(it.q), a: stripMd(it.a) })).filter((it) => it.q && it.a);
}

// ---------- markdown rendering ---------------------------------------------
const renderer = new marked.Renderer();
renderer.heading = ({ tokens, depth }) => {
  const text = marked.Parser.parseInline(tokens);
  const id = slugify(text.replace(/<[^>]+>/g, ''));
  return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};
renderer.link = ({ href, title, tokens }) => {
  const text = marked.Parser.parseInline(tokens);
  const external = /^https?:\/\//.test(href) && !href.includes('deedo.ai/help');
  const attrs = external ? ' target="_blank" rel="noopener"' : '';
  return `<a href="${href}"${title ? ` title="${esc(title)}"` : ''}${attrs}>${text}</a>`;
};
marked.setOptions({ renderer, mangle: false, headerIds: false });

// ---------- load content ----------------------------------------------------
if (!existsSync(CONTENT_DIR)) { console.log('help: no content/help — nothing to build'); process.exit(0); }
const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md') && !f.startsWith('_'));
const docs = files.map((file) => {
  const { data, content } = matter(readFileSync(`${CONTENT_DIR}/${file}`, 'utf8'));
  for (const req of ['title', 'description']) if (!data[req]) throw new Error(`${file}: missing frontmatter "${req}"`);
  const date = toISODate(data.date || '2026-07-30');
  return {
    slug: data.slug || file.replace(/\.md$/, ''),
    title: data.title,
    description: data.description,
    category: data.category || 'General',
    order: typeof data.order === 'number' ? data.order : 99,
    date,
    updated: toISODate(data.updated || date),
    html: marked.parse(content),
    steps: parseSteps(content),
    faq: extractFaq(content),
  };
});
docs.sort((a, b) => a.category.localeCompare(b.category) || a.order - b.order || a.title.localeCompare(b.title));

// ---------- shared fragments ------------------------------------------------
const header = `
  <header class="site-header">
    <a href="/" class="brand" aria-label="Deedo — home"><img src="/articles/deedo-logo.svg" alt="Deedo" width="997" height="1182" /></a>
    <nav class="site-nav">
      <a href="/help/">Help</a>
      <a href="/articles/">Articles</a>
      <a class="btn-cta" href="${SIGNUP_URL}" target="_blank" rel="noopener">Start free</a>
    </nav>
  </header>`;
const footer = `
  <footer class="site-footer">
    <div class="foot-in">
      <a href="/" class="brand"><img src="/articles/deedo-logo.svg" alt="Deedo" width="997" height="1182" /></a>
      <nav>
        <a href="/help/">Help</a>
        <a href="/articles/">Articles</a>
        <a href="/howitworks2/">How it works</a>
        <a href="https://deedo.ai" target="_blank" rel="noopener">deedo.ai</a>
      </nav>
    </div>
    <p class="copyright">© ${new Date().getFullYear()} Deedo — AI for Real Estate Listings · United States &amp; Canada</p>
  </footer>`;
const ctaBlock = `
  <aside class="cta-band">
    <div>
      <p class="cta-kicker">Get started</p>
      <h2 class="cta-title">Create your Deedo agent account — free.</h2>
      <p class="cta-sub">Your first listing is free for 30 days. No credit card, no commitment.</p>
    </div>
    <a class="cta-btn" href="${SIGNUP_URL}" target="_blank" rel="noopener">Claim your free listing →</a>
  </aside>`;

const head = ({ title, description, url, jsonld = [], extraMeta = '' }) => `
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0B2049" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <meta property="og:site_name" content="Deedo" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${SITE}/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${SITE}/og-image.png" />
  ${extraMeta}
  ${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n  ')}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${FONTS}" />
  <link rel="stylesheet" href="/articles/article.css" />`;

// ---------- page builders ---------------------------------------------------
function helpPage(a) {
  const url = `${SITE}/help/${a.slug}/`;
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Help', item: `${SITE}/help/` },
      { '@type': 'ListItem', position: 3, name: a.title, item: url },
    ],
  };
  const howto = a.steps.length >= 2 ? {
    '@context': 'https://schema.org', '@type': 'HowTo', name: a.title, description: a.description,
    step: a.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text })),
  } : null;
  const faq = a.faq.length ? {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: a.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  } : null;
  const extraMeta =
    `<meta property="og:type" content="article" />\n` +
    `  <meta property="article:published_time" content="${toISODateTime(a.date)}" />\n` +
    `  <meta property="article:modified_time" content="${toISODateTime(a.updated)}" />`;

  return `<!doctype html>
<html lang="en">
<head>${head({ title: `${a.title} — Deedo Help`, description: a.description, url, extraMeta, jsonld: [breadcrumb, howto, faq].filter(Boolean) })}
</head>
<body>
  ${header}
  <main class="wrap">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a><span>/</span><a href="/help/">Help</a><span>/</span><span aria-current="page">${esc(a.title)}</span>
    </nav>
    <article>
      <header class="article-head">
        <a class="eyebrow" href="/help/">${esc(a.category)}</a>
        <h1>${esc(a.title)}</h1>
        <p class="lede">${esc(a.description)}</p>
        <p class="byline">Updated <time datetime="${a.updated}">${prettyDate(a.updated)}</time></p>
      </header>
      <div class="prose">
${a.html}
      </div>
    </article>
    ${ctaBlock}
    <p class="feed-link"><a href="/help/">← Back to all help articles</a></p>
  </main>
  ${footer}
</body>
</html>`;
}

function indexPage() {
  const url = `${SITE}/help/`;
  const cats = [...new Set(docs.map((d) => d.category))];
  const schema = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Deedo Help Center', url,
    hasPart: docs.map((d) => ({ '@type': 'WebPage', name: d.title, url: `${SITE}/help/${d.slug}/` })),
  };
  const section = (cat) => `
    <h2 class="section-title">${esc(cat)}</h2>
    <div class="card-grid">
${docs.filter((d) => d.category === cat).map((d) => `
      <a class="card" href="/help/${d.slug}/">
        <h2 class="card-title">${esc(d.title)}</h2>
        <p class="card-desc">${esc(d.description)}</p>
        <span class="card-meta">Read →</span>
      </a>`).join('')}
    </div>`;
  return `<!doctype html>
<html lang="en">
<head>${head({ title: 'Help Center — Deedo', description: 'Guides and answers for Deedo agents: account setup, listings, open-house check-ins, and the AI concierge.', url, jsonld: [schema] })}
</head>
<body>
  ${header}
  <main class="wrap">
    <div class="page-head">
      <p class="eyebrow-static">Deedo Help Center</p>
      <h1>How can we help?</h1>
      <p class="lede">Step-by-step guides for setting up your account, your listings, and Deedo's AI concierge.</p>
    </div>
    ${cats.map(section).join('')}
  </main>
  ${footer}
</body>
</html>`;
}

function sitemap() {
  const urls = [
    { loc: `${SITE}/help/`, lastmod: docs[0]?.updated, priority: '0.6' },
    ...docs.map((d) => ({ loc: `${SITE}/help/${d.slug}/`, lastmod: d.updated, priority: '0.5' })),
  ];
  const body = urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// ---------- write -----------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });
for (const a of docs) {
  mkdirSync(`${OUT_DIR}/${a.slug}`, { recursive: true });
  writeFileSync(`${OUT_DIR}/${a.slug}/index.html`, helpPage(a));
}
writeFileSync(`${OUT_DIR}/index.html`, indexPage());
writeFileSync('public/sitemap-help.xml', sitemap());
console.log(`help: ${docs.length} article(s) · ${new Set(docs.map((d) => d.category)).size} categor(y/ies) · sitemap-help: ${docs.length + 1} urls`);
