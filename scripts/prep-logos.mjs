/**
 * prep-logos.mjs — turn the raw brand exports in media/ into web assets.
 *
 * Run:  npm i -D sharp && node scripts/prep-logos.mjs
 * Outputs are committed, so this only needs re-running when media/ changes.
 *
 * Why this exists
 * ---------------
 * The supplied brand files can't be shipped as-is:
 *
 *  1. The Canva `.svg` exports are not vectors — each is a ~250-350KB wrapper
 *     around a base64 <image>, and its mask + feColorMatrix composite does not
 *     survive rasterisation (it renders washed-out grey with no wordmark).
 *  2. `deedolog1by1n.svg` IS a real vector, but it's a 998KB auto-trace with a
 *     baked opaque background — too heavy, and it can't sit on the paper bg.
 *  3. Every high-res PNG has an OPAQUE cool-white background (~#EFF2F7), so
 *     dropping one onto the warm paper (#F5F2EB) shows a visible cold box.
 *
 * So: take the highest-resolution PNG lockup and key its background out.
 *
 * A naive "make near-white transparent" would punch holes through the logo —
 * the circuit traces and the letter counters are near-white too. Instead we
 * flood-fill inward from the border, so only background-CONNECTED pixels are
 * cleared and interior detail survives. The alpha ramp keeps anti-aliased edges
 * from turning into a hard, jagged cutout.
 */

import sharp from 'sharp';
import { trace } from 'potrace';
import { optimize } from 'svgo';
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';

const SRC_LOCKUP = 'media/deedologo1by1.png'; // 1276x1276, highest-res clean lockup
const SRC_SOCIAL = 'media/logo-social.png'; // already exactly 1200x630 (OG spec)
const SRC_FAVICON = 'media/logo-favicon.ico';

/** Squared colour distance, ignoring alpha. */
function dist2(r, g, b, [br, bg, bb]) {
  return (r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2;
}

/**
 * Clear the background-connected region, feathering the boundary.
 * NEAR: at/below this distance from the bg colour => fully transparent.
 * FAR:  above this => keep. Between the two, ramp alpha so AA pixels fade.
 */
function keyOutBackground(data, info, { near = 14, far = 46 } = {}) {
  const { width: w, height: h, channels: ch } = info;
  const bg = [data[0], data[1], data[2]];
  const near2 = near ** 2;
  const far2 = far ** 2;

  const inRegion = new Uint8Array(w * h);
  const queue = [];

  const consider = (x, y) => {
    const p = y * w + x;
    if (inRegion[p]) return;
    const i = p * ch;
    if (dist2(data[i], data[i + 1], data[i + 2], bg) > far2) return; // real logo pixel
    inRegion[p] = 1;
    queue.push(p);
  };

  for (let x = 0; x < w; x++) {
    consider(x, 0);
    consider(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    consider(0, y);
    consider(w - 1, y);
  }

  // BFS. Only pixels reachable from the border get cleared, so enclosed
  // near-white detail (traces, counters) is preserved.
  while (queue.length) {
    const p = queue.pop();
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) consider(x - 1, y);
    if (x < w - 1) consider(x + 1, y);
    if (y > 0) consider(x, y - 1);
    if (y < h - 1) consider(x, y + 1);
  }

  let cleared = 0;
  for (let p = 0; p < w * h; p++) {
    if (!inRegion[p]) continue;
    const i = p * ch;
    const d2 = dist2(data[i], data[i + 1], data[i + 2], bg);
    if (d2 <= near2) {
      data[i + 3] = 0;
      cleared++;
    } else {
      // Feather: fade anti-aliased edge pixels proportionally.
      const t = (Math.sqrt(d2) - near) / (far - near);
      data[i + 3] = Math.round(Math.max(0, Math.min(1, t)) * 255);
    }
  }
  return cleared;
}

mkdirSync('public', { recursive: true });
mkdirSync('src/assets', { recursive: true });

// ---- 1. OG card ------------------------------------------------------------
// Flatten onto white: platforms that ignore alpha would otherwise render black.
await sharp(SRC_SOCIAL).flatten({ background: '#ffffff' }).png().toFile('public/og-image.png');
console.log('public/og-image.png          1200x630 (OG spec, flattened)');

// ---- 2. Favicon ------------------------------------------------------------
// Copied verbatim: sharp can't read .ico, and browsers consume it directly.
copyFileSync(SRC_FAVICON, 'public/favicon.ico');
console.log('public/favicon.ico           (copied verbatim)');

// ---- 3. Traced vector lockup (the asset the app actually ships) -------------
/*
 * Why re-trace instead of using media/deedolog1by1n.svg: that file IS a real
 * vector, but it's a 998KB auto-trace in which 927 of its 1065 paths (812KB,
 * 87% of the file) are near-white background artefacts — anti-aliasing noise
 * quantised into 30 near-identical off-white shades. Not salvageable.
 *
 * Instead: separate the artwork into its two real ink colours and trace each as
 * one shape. The white circuit traces and letter counters are deliberately NOT
 * traced — leaving them transparent lets the paper show through, which is what
 * they should be on a printed sheet anyway. potrace emits holes via
 * fill-rule="evenodd", so the traces stay as cut-outs in the navy.
 */
// Both sampled from the artwork's dominant pixels, not eyeballed.
const NAVY = '#123368';
const GREY = '#6E7683';

/** Classify a pixel into an ink layer. Mirrors the measured colour clusters. */
function layerOf(r, g, b, a) {
  if (a < 128) return null;
  const lum = (r + g + b) / 3;
  const blueBias = b - r;
  if (lum < 110 && blueBias > 25) return 'navy';
  if (lum >= 110 && lum < 200 && Math.abs(blueBias) < 45) return 'grey';
  return null; // white detail + background -> transparent
}

/** Build a 1-bit mask PNG (shape = black, rest = white) for one layer. */
async function maskFor(layer, px, w, h, ch) {
  const mask = Buffer.alloc(w * h, 255);
  for (let p = 0; p < w * h; p++) {
    const i = p * ch;
    if (layerOf(px[i], px[i + 1], px[i + 2], px[i + 3]) === layer) mask[p] = 0;
  }
  return sharp(mask, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
}

/** potrace a mask and return just its path data. */
function tracePath(pngBuffer) {
  return new Promise((resolve, reject) => {
    trace(
      pngBuffer,
      {
        threshold: 128,
        blackOnWhite: true,
        turdSize: 4, // drop speckles smaller than this (AA crumbs)
        alphaMax: 1,
        optCurve: true,
        optTolerance: 0.35, // higher = fewer, smoother segments = smaller file
      },
      (err, svg) => {
        if (err) return reject(err);
        resolve((svg.match(/ d="([^"]+)"/) || [])[1] ?? '');
      }
    );
  });
}

// Key + trim at FULL resolution so the trace follows clean, high-res edges.
const full = await sharp(SRC_LOCKUP).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
keyOutBackground(full.data, full.info);

const trimmed = await sharp(full.data, {
  raw: { width: full.info.width, height: full.info.height, channels: full.info.channels },
})
  .trim({ threshold: 1 })
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width: TW, height: TH, channels: TC } = trimmed.info;

const [navyPath, greyPath] = await Promise.all([
  maskFor('navy', trimmed.data, TW, TH, TC).then(tracePath),
  maskFor('grey', trimmed.data, TW, TH, TC).then(tracePath),
]);

// Grey (the D) paints over navy, matching the original stacking order.
const rawSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TW} ${TH}" role="img" aria-label="Deedo">` +
  `<path fill="${NAVY}" fill-rule="evenodd" d="${navyPath}"/>` +
  `<path fill="${GREY}" fill-rule="evenodd" d="${greyPath}"/>` +
  `</svg>`;

const { data: optimised } = optimize(rawSvg, {
  multipass: true,
  floatPrecision: 1, // 1dp is plenty at logo scale and cuts the path data hard
  plugins: [{ name: 'preset-default' }, 'removeDimensions'],
});

writeFileSync('src/assets/deedo-lockup.svg', optimised);
console.log(
  `src/assets/deedo-lockup.svg  ${TW}x${TH}  ${(optimised.length / 1024).toFixed(1)}KB  ` +
    `(raw trace ${(rawSvg.length / 1024).toFixed(1)}KB)`
);
