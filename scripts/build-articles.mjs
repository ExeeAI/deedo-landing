/**
 * build-articles.mjs — static SEO article generator for land.deedo.ai/articles/.
 *
 * Turns Markdown in content/articles/*.md into fast, fully static, SEO-optimized
 * HTML under public/articles/ (which Vite copies verbatim into dist/). No React,
 * no client JS — Google sees complete content instantly.
 *
 * What it generates from the content:
 *   /articles/                  index of all articles
 *   /articles/<slug>/           each article (full <head> SEO + schema)
 *   /articles/topics/<tag>/     a hub page per tag (internal-link magnet)
 *   /articles/article.css       shared brand stylesheet
 *   /sitemap.xml                every public URL (landing pages + articles)
 *
 * Interlinking (the thing that actually drives SEO) is systematic:
 *   - the index and topic hubs link to every article,
 *   - each article shows breadcrumbs + related articles (frontmatter `related`,
 *     else auto by shared tags),
 *   - authors link freely in Markdown with /articles/<slug>/ links.
 *
 * Add an article = drop content/articles/<slug>.md and rebuild. Runs as part of
 * `npm run build`, so pushing a new .md regenerates + deploys everything.
 *
 * Frontmatter (YAML) per file:
 *   title:        required. The <h1> and <title>.
 *   description:  required. Meta description + lede (~150-160 chars).
 *   date:         required. YYYY-MM-DD published date.
 *   updated:      optional. YYYY-MM-DD; defaults to date.
 *   tags:         optional. [list] — first tag is the eyebrow; each makes a hub.
 *   related:      optional. [slugs] — overrides the auto "related" picks.
 *   image:        optional. OG image path (default /og-image.png).
 *   author:       optional. Defaults to "Deedo".
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { marked } from 'marked';
import matter from 'gray-matter';

const SITE = 'https://land.deedo.ai';
const SIGNUP_URL = 'https://app.deedo.ai/signup';
const CONTENT_DIR = 'content/articles';
const OUT_DIR = 'public/articles';
const LOGO_SRC = 'src/assets/deedo-lockup.svg';

// Landing pages to include in the sitemap alongside the articles.
const LANDING_PAGES = ['/', '/tryus/', '/howitworks/', '/howitworks2/', '/talk/'];

const FONTS =
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,400..800,0..100,0..1&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap';

// ---------- helpers ---------------------------------------------------------
const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const slugify = (s = '') =>
  String(s).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

function readingTime(md) {
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Reduce inline Markdown to plain text for schema fields (links -> anchor text,
// drop emphasis/code markers, collapse whitespace).
function stripMd(s) {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pull Q&A pairs out of the article's "Frequently Asked Questions" section:
// the H2 whose text mentions FAQ, then each H3 is a question and the prose
// beneath it (until the next H3/H2) is the answer. Returns [] if there's none.
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

// YAML parses an unquoted `date: 2026-07-25` into a Date object, and
// String(Date) is a locale string, not ISO — which broke prettyDate (NaN) and
// the schema/sitemap dates. Normalize everything to a clean YYYY-MM-DD string.
function toISODate(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

// schema.org datePublished/dateModified and OG article:*_time want a full
// ISO 8601 datetime *with a timezone*. A bare YYYY-MM-DD is flagged invalid by
// validators, so anchor it to a fixed time in UTC.
function toISODateTime(d) {
  return `${d}T09:00:00+00:00`;
}

function prettyDate(iso) {
  // Deterministic, locale-independent (no Date locale calls that vary by host).
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[m - 1]} ${d}, ${y}`;
}

// Read intrinsic image dimensions from the file header — no image library
// needed. Emitting width/height prevents layout shift (CLS is a Core Web Vitals
// ranking signal). Supports PNG / JPEG / GIF / WebP; returns null otherwise.
function imageSize(file) {
  if (!existsSync(file)) return null;
  const b = readFileSync(file);
  try {
    if (b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
      return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; // PNG
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2; // JPEG: walk markers to the SOF frame
      while (i < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
          return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
    if (b.slice(0, 3).toString('ascii') === 'GIF')
      return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) }; // GIF
    if (b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP') {
      const fmt = b.slice(12, 16).toString('ascii');
      if (fmt === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
      if (fmt === 'VP8L') { const n = b.readUInt32LE(21); return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 }; }
      if (fmt === 'VP8X') return { w: ((b[24] | (b[25] << 8) | (b[26] << 16)) & 0xffffff) + 1, h: ((b[27] | (b[28] << 8) | (b[29] << 16)) & 0xffffff) + 1 };
    }
  } catch { /* fall through */ }
  return null;
}

const warnings = [];
const knownSlugs = new Set(); // filled after articles load, for link validation

const renderer = new marked.Renderer();

// Headings get stable ids so authors can deep-link (#section) and we can TOC.
renderer.heading = ({ tokens, depth }) => {
  const text = tokens.map((t) => t.raw ?? t.text ?? '').join('');
  const id = slugify(text.replace(/<[^>]+>/g, ''));
  return `<h${depth} id="${id}">${marked.parseInline(text)}</h${depth}>\n`;
};

// Images: lazy + async + intrinsic width/height (CLS), <figure>/<figcaption>
// when a title is given, and an alt-text warning (alt is required for SEO/a11y).
renderer.image = ({ href, title, text }) => {
  if (!text) warnings.push(`image missing alt text: ${href}`);
  let dim = '';
  if (href && href.startsWith('/')) {
    const size = imageSize(`public${href}`);
    if (size) dim = ` width="${size.w}" height="${size.h}"`;
    else warnings.push(`local image not found (no width/height emitted): ${href}`);
  }
  const img = `<img src="${esc(href)}" alt="${esc(text)}"${dim} loading="lazy" decoding="async" />`;
  return title
    ? `<figure>${img}<figcaption>${esc(title)}</figcaption></figure>`
    : img;
};

// Links: internal links validated (broken /articles/ links fail the build);
// external links get rel="noopener" (+ target=_blank) for safety/UX.
renderer.link = ({ href, title, tokens }) => {
  const inner = tokens?.length ? marked.parseInline(tokens.map((t) => t.raw ?? t.text ?? '').join('')) : esc(href);
  const t = title ? ` title="${esc(title)}"` : '';
  const isExternal = /^https?:\/\//.test(href) && !href.startsWith(SITE);
  if (href.startsWith('/articles/') && href !== '/articles/') {
    const slug = href.replace(/^\/articles\//, '').replace(/\/(#.*)?$/, '').replace(/#.*$/, '');
    if (slug && !slug.startsWith('topics/') && !knownSlugs.has(slug))
      warnings.push(`internal link to unknown article: ${href}`);
  }
  const rel = isExternal ? ' target="_blank" rel="noopener"' : '';
  return `<a href="${esc(href)}"${t}${rel}>${inner}</a>`;
};

marked.setOptions({ renderer, mangle: false, headerIds: false });

// ---------- load content ----------------------------------------------------
if (!existsSync(CONTENT_DIR)) {
  console.error(`No ${CONTENT_DIR}/ — nothing to build.`);
  process.exit(0);
}

const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md') && !f.startsWith('_'));

// Pass 1: parse frontmatter + collect every slug, so link validation during
// rendering (pass 2) knows which internal /articles/<slug>/ links are valid.
const parsed = files.map((file) => {
  const raw = readFileSync(`${CONTENT_DIR}/${file}`, 'utf8');
  const { data, content } = matter(raw);
  const slug = data.slug || file.replace(/\.md$/, '');
  for (const req of ['title', 'description', 'date']) {
    if (!data[req]) throw new Error(`${file}: missing required frontmatter "${req}"`);
  }
  knownSlugs.add(slug);
  return { file, data, content, slug };
});

// Pass 2: render Markdown (now that link validation can see all slugs).
const articles = parsed.map(({ data, content, slug }) => ({
  slug,
  title: data.title,
  // Optional SEO <title> distinct from the on-page <h1>. Used verbatim when set
  // (best-practice: optimise the SERP title separately from the reader-facing
  // headline). Falls back to "<title> — Deedo".
  seoTitle: data.seoTitle || null,
  description: data.description,
  date: toISODate(data.date),
  updated: toISODate(data.updated || data.date),
  author: data.author || 'Deedo',
  image: data.image || '/og-image.png',
  tags: Array.isArray(data.tags) ? data.tags : [],
  related: Array.isArray(data.related) ? data.related : null,
  html: marked.parse(content),
  readMins: readingTime(content),
  faq: extractFaq(content),
}));

// Newest first.
articles.sort((a, b) => (a.date < b.date ? 1 : -1));
const bySlug = Object.fromEntries(articles.map((a) => [a.slug, a]));

// Resolve related: explicit frontmatter, else most shared tags, else newest.
function relatedFor(a) {
  if (a.related) return a.related.map((s) => bySlug[s]).filter(Boolean).slice(0, 3);
  const scored = articles
    .filter((x) => x.slug !== a.slug)
    .map((x) => ({ x, score: x.tags.filter((t) => a.tags.includes(t)).length }))
    .sort((p, q) => q.score - p.score || (p.x.date < q.x.date ? 1 : -1));
  return scored.slice(0, 3).map((s) => s.x);
}

// All tags -> articles.
const tagMap = {};
for (const a of articles) for (const t of a.tags) (tagMap[t] ||= []).push(a);

// ---------- shared HTML fragments ------------------------------------------
const header = `
  <header class="site-header">
    <a href="/" class="brand" aria-label="Deedo — home"><img src="/articles/deedo-logo.svg" alt="Deedo" width="997" height="1182" /></a>
    <nav class="site-nav">
      <a href="/articles/">Articles</a>
      <a href="/howitworks2/">How it works</a>
      <a class="btn-cta" href="${SIGNUP_URL}" target="_blank" rel="noopener">Start free</a>
    </nav>
  </header>`;

const footer = `
  <footer class="site-footer">
    <div class="foot-in">
      <a href="/" class="brand"><img src="/articles/deedo-logo.svg" alt="Deedo" width="997" height="1182" /></a>
      <nav>
        <a href="/articles/">Articles</a>
        <a href="/howitworks2/">How it works</a>
        <a href="https://deedo.ai" target="_blank" rel="noopener">deedo.ai</a>
        <a href="https://app.deedo.ai/privacy-policy" target="_blank" rel="noopener">Privacy</a>
        <a href="/articles/rss.xml">RSS</a>
      </nav>
    </div>
    <p class="copyright">© ${new Date().getFullYear()} Deedo — AI for Real Estate Listings · United States &amp; Canada</p>
  </footer>`;

const ctaBlock = `
  <aside class="cta-band">
    <div>
      <p class="cta-kicker">Try it free</p>
      <h2 class="cta-title">Put an AI concierge on your next listing — free.</h2>
      <p class="cta-sub">Your first listing is free for 30 days. No credit card, no commitment.</p>
    </div>
    <a class="cta-btn" href="${SIGNUP_URL}" target="_blank" rel="noopener">Claim your free listing →</a>
  </aside>`;

const head = ({ title, description, url, image, extraMeta = '', jsonld = [] }) => `
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0B2049" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="alternate" type="application/rss+xml" title="Deedo Articles" href="${SITE}/articles/rss.xml" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <meta property="og:site_name" content="Deedo" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${SITE}${image}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${SITE}${image}" />
  ${extraMeta}
  ${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n  ')}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${FONTS}" />
  <link rel="stylesheet" href="/articles/article.css" />`;

const card = (a) => `
    <a class="card" href="/articles/${a.slug}/">
      ${a.tags[0] ? `<span class="card-tag">${esc(a.tags[0])}</span>` : ''}
      <h2 class="card-title">${esc(a.title)}</h2>
      <p class="card-desc">${esc(a.description)}</p>
      <span class="card-meta">${prettyDate(a.date)} · ${a.readMins} min read</span>
    </a>`;

// ---------- page builders ---------------------------------------------------
function articlePage(a) {
  const url = `${SITE}/articles/${a.slug}/`;
  const rel = relatedFor(a);
  const extraMeta =
    `<meta property="og:type" content="article" />\n` +
    `  <meta property="article:published_time" content="${toISODateTime(a.date)}" />\n` +
    `  <meta property="article:modified_time" content="${toISODateTime(a.updated)}" />\n` +
    `  <meta property="article:author" content="${esc(a.author)}" />\n` +
    a.tags.map((t) => `  <meta property="article:tag" content="${esc(t)}" />`).join('\n');

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: a.title,
    description: a.description,
    datePublished: toISODateTime(a.date),
    dateModified: toISODateTime(a.updated),
    author: { '@type': 'Organization', name: a.author, url: 'https://deedo.ai' },
    publisher: { '@type': 'Organization', name: 'Deedo', logo: { '@type': 'ImageObject', url: `${SITE}/articles/deedo-logo.svg` } },
    image: `${SITE}${a.image}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: a.tags.join(', '),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Articles', item: `${SITE}/articles/` },
      { '@type': 'ListItem', position: 3, name: a.title, item: url },
    ],
  };
  const faqSchema = a.faq.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: a.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  } : null;

  return `<!doctype html>
<html lang="en">
<head>${head({ title: a.seoTitle || `${a.title} — Deedo`, description: a.description, url, image: a.image, extraMeta, jsonld: [articleSchema, breadcrumbSchema, faqSchema].filter(Boolean) })}
</head>
<body>
  ${header}
  <main class="wrap">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a><span>/</span><a href="/articles/">Articles</a><span>/</span><span aria-current="page">${esc(a.title)}</span>
    </nav>
    <article>
      <header class="article-head">
        ${a.tags[0] ? `<a class="eyebrow" href="/articles/topics/${slugify(a.tags[0])}/">${esc(a.tags[0])}</a>` : ''}
        <h1>${esc(a.title)}</h1>
        <p class="lede">${esc(a.description)}</p>
        <p class="byline"><time datetime="${a.date}">${prettyDate(a.date)}</time> · ${a.readMins} min read</p>
      </header>
      <div class="prose">
${a.html}
      </div>
      ${a.tags.length ? `<div class="tag-row">${a.tags.map((t) => `<a href="/articles/topics/${slugify(t)}/">#${esc(t)}</a>`).join(' ')}</div>` : ''}
    </article>
    ${ctaBlock}
    ${rel.length ? `<section class="related">
      <h2 class="section-title">Keep reading</h2>
      <div class="card-grid">${rel.map(card).join('')}</div>
    </section>` : ''}
  </main>
  ${footer}
</body>
</html>`;
}

function indexPage() {
  const url = `${SITE}/articles/`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Deedo Articles',
    url,
    description: 'Guides and insights on AI, open houses, and lead capture for real-estate listing agents.',
    blogPost: articles.map((a) => ({ '@type': 'BlogPosting', headline: a.title, url: `${SITE}/articles/${a.slug}/`, datePublished: a.date })),
  };
  const topics = Object.keys(tagMap).sort();
  return `<!doctype html>
<html lang="en">
<head>${head({ title: 'Articles — Deedo', description: 'Guides and insights on AI, open houses, QR codes, and verified lead capture for real-estate listing agents.', url, image: '/og-image.png', jsonld: [schema] })}
</head>
<body>
  ${header}
  <main class="wrap">
    <div class="page-head">
      <p class="eyebrow-static">The Deedo blog</p>
      <h1>Insights for listing agents</h1>
      <p class="lede">Practical guides on AI concierges, open houses, QR codes, and turning listings into verified leads.</p>
      <p class="feed-link"><a href="/articles/rss.xml">Subscribe via RSS →</a></p>
    </div>
    ${topics.length ? `<nav class="topic-bar" aria-label="Topics">${topics.map((t) => `<a href="/articles/topics/${slugify(t)}/">${esc(t)}</a>`).join('')}</nav>` : ''}
    <div class="card-grid">
${articles.map(card).join('')}
    </div>
  </main>
  ${footer}
</body>
</html>`;
}

function topicPage(tag, list) {
  const url = `${SITE}/articles/topics/${slugify(tag)}/`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${tag} — Deedo Articles`,
    url,
    hasPart: list.map((a) => ({ '@type': 'BlogPosting', headline: a.title, url: `${SITE}/articles/${a.slug}/` })),
  };
  return `<!doctype html>
<html lang="en">
<head>${head({ title: `${tag} — Deedo Articles`, description: `Articles about ${tag} for real-estate listing agents from Deedo.`, url, image: '/og-image.png', jsonld: [schema] })}
</head>
<body>
  ${header}
  <main class="wrap">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a><span>/</span><a href="/articles/">Articles</a><span>/</span><span aria-current="page">${esc(tag)}</span>
    </nav>
    <div class="page-head">
      <p class="eyebrow-static">Topic</p>
      <h1>${esc(tag)}</h1>
    </div>
    <div class="card-grid">${list.map(card).join('')}</div>
  </main>
  ${footer}
</body>
</html>`;
}

function sitemap() {
  const urls = [
    ...LANDING_PAGES.map((p) => ({ loc: `${SITE}${p}`, lastmod: null, priority: '0.8' })),
    { loc: `${SITE}/articles/`, lastmod: articles[0]?.updated, priority: '0.7' },
    ...Object.keys(tagMap).map((t) => ({ loc: `${SITE}/articles/topics/${slugify(t)}/`, lastmod: null, priority: '0.4' })),
    ...articles.map((a) => ({ loc: `${SITE}/articles/${a.slug}/`, lastmod: a.updated, priority: '0.6' })),
  ];
  const body = urls
    .map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// RSS 2.0 feed of all articles (newest first), served at /articles/rss.xml.
// pubDate uses RFC-822 (toUTCString); dates are stamped at 09:00Z so the feed
// output stays deterministic across builds.
function rss() {
  const feedUrl = `${SITE}/articles/rss.xml`;
  const rfc822 = (d) => new Date(`${d}T09:00:00Z`).toUTCString();
  const items = articles
    .map((a) => {
      const url = `${SITE}/articles/${a.slug}/`;
      const cats = a.tags.map((t) => `\n      <category>${esc(t)}</category>`).join('');
      return `    <item>
      <title>${esc(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(a.date)}</pubDate>
      <description>${esc(a.description)}</description>${cats}
    </item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Deedo Articles</title>
    <link>${SITE}/articles/</link>
    <description>Guides and insights on AI, open houses, lead capture, and workflow automation for real-estate listing agents.</description>
    <language>en-us</language>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${rfc822(articles[0]?.date || '2026-01-01')}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

// ---------- write everything ------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(`${OUT_DIR}/topics`, { recursive: true });
copyFileSync(LOGO_SRC, `${OUT_DIR}/deedo-logo.svg`);
writeFileSync(`${OUT_DIR}/article.css`, readFileSync('scripts/article.css', 'utf8'));

for (const a of articles) {
  mkdirSync(`${OUT_DIR}/${a.slug}`, { recursive: true });
  writeFileSync(`${OUT_DIR}/${a.slug}/index.html`, articlePage(a));
}
writeFileSync(`${OUT_DIR}/index.html`, indexPage());
for (const [tag, list] of Object.entries(tagMap)) {
  mkdirSync(`${OUT_DIR}/topics/${slugify(tag)}`, { recursive: true });
  writeFileSync(`${OUT_DIR}/topics/${slugify(tag)}/index.html`, topicPage(tag, list));
}
writeFileSync('public/sitemap.xml', sitemap());
writeFileSync(`${OUT_DIR}/rss.xml`, rss());

console.log(
  `articles: ${articles.length} · topics: ${Object.keys(tagMap).length} · sitemap: ${LANDING_PAGES.length + articles.length + Object.keys(tagMap).length + 1} urls · rss: ${articles.length} items`
);
if (warnings.length) {
  console.warn(`\n⚠ ${warnings.length} SEO warning(s):`);
  for (const w of [...new Set(warnings)]) console.warn(`  - ${w}`);
}
