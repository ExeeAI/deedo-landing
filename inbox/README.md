# inbox/ — drop article drafts & instructions here

This is a **local staging folder**. Drop raw material here and I'll turn it into
a proper, SEO-optimized article.

**Nothing you put in here is committed to git** (except this README). It's your
private scratch space — drafts, notes, pasted HTML, briefs, keyword lists.

## What you can drop

- **`.txt`** — a rough draft, an outline, bullet notes, or instructions like
  "write a 900-word article on staging tips, target keyword 'home staging
  checklist', link it to the open-house article."
- **`.html`** — content pasted/exported from somewhere (a Google Doc, another
  CMS, a Word export). I'll extract the text and reformat it.
- **`.md`** — a partial draft you want cleaned up and SEO-optimized.

## The workflow

1. Save your file(s) in this folder (e.g. `inbox/staging-tips.txt`).
2. Tell me: *"turn inbox/staging-tips.txt into an article."*
3. I read it, write a finished `content/articles/<slug>.md` with proper SEO
   frontmatter (title, meta description, tags, related links), and regenerate
   the site. The article goes live at `land.deedo.ai/articles/<slug>/`.

The **source draft stays here (uncommitted)**; only the polished article
Markdown in `content/articles/` gets committed and published.

## Tips for better output

- Mention the **target keyword / search intent** if you have one.
- Say which existing articles it should **link to** (internal linking = SEO).
- Note any **must-include** facts, stats, or product points.
- Images: drop them in `public/articles/images/` and tell me the alt text.
