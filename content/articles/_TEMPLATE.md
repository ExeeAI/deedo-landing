---
# Required
title: "Your SEO Title — front-load the primary keyword (≈55–60 chars)"
description: "Meta description that earns the click. Summarize the value in ~150–160 characters; this is what shows in Google results."
date: 2026-07-25            # YYYY-MM-DD, published date

# Optional
updated: 2026-07-25         # YYYY-MM-DD, last meaningful edit (defaults to date)
slug: my-article-slug       # URL becomes /articles/<slug>/ (defaults to filename)
author: Deedo
tags: [open house, lead capture]   # first tag = eyebrow; each tag gets a /articles/topics/<tag>/ hub
related: [other-slug]       # explicit "keep reading" picks; omit to auto-pick by shared tags
image: /og-image.png        # OG/social image (absolute path under public/); defaults to /og-image.png
---

Open with a strong first paragraph that restates the promise and includes the primary keyword naturally. Google often uses this in snippets.

## Use H2s for main sections

They become the on-page structure Google reads, and each gets an `id` so you can deep-link (e.g. `#use-h2s-for-main-sections`).

- Bullet points are great for skimmability and featured snippets.
- Keep paragraphs short.

### H3s for sub-points

**Internal linking is the whole game.** Link to other articles with root-absolute paths so the internal-link graph grows:
see our [guide to QR codes for listings](/articles/qr-codes-real-estate-listings/). The build FAILS-loud (warns) if you link to a slug that doesn't exist.

**Images** — store them in `public/img/articles/` (a committed folder — do NOT use `public/articles/`, which is generated/gitignored) and reference by absolute path. Use descriptive, keyword-rich file names. Alt text is required (it warns if missing); a title becomes a caption; width/height are read automatically to prevent layout shift:

![Descriptive alt text for SEO and accessibility](/img/articles/example.webp "Optional caption shown under the image")

**External links** automatically get `target="_blank" rel="noopener"`.

Close with a takeaway. The "Try it free" CTA and "Keep reading" related articles are added automatically — don't hand-write them.
