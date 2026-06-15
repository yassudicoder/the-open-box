/**
 * Subset the two self-hosted variable fonts to ONLY the glyphs the site uses,
 * and compute metric-matched fallback overrides so font-display: swap causes
 * zero layout shift. Same typefaces, smaller files, identical rendering.
 *
 *   node scripts/subset-fonts.mjs
 *
 * Outputs public/fonts/*-subset.woff2 (committed) and prints the fallback
 * @font-face block to paste into src/styles/global.css. Re-run if the source
 * fonts change or new glyphs/symbols appear on the site.
 */
import subsetFont from "subset-font";
import * as fontkit from "fontkit";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "fonts");

// Keep Basic Latin + Latin-1, plus the whole symbol blocks the site draws from
// (⌀ ✺ § ▸ ◂ ↑ ↓ ↵ ↪ · — – ∞ ⌘ › ‹ “ ” ‘ ’ … ©). Whole-block coverage = no
// on-page glyph can ever fall back, so rendering is byte-identical.
const range = (a, b) => {
  let s = "";
  for (let c = a; c <= b; c++) s += String.fromCodePoint(c);
  return s;
};
// Every non-ASCII glyph actually on the site (audited from source), plus the
// smartypants typography Markdown emits (– — ‘ ’ “ ” …). Keeping whole Latin-1
// is cheap insurance for European names in future content.
const SYMBOLS = "–—‘’“”…‹›↑→↓↪↵∞≥⌀⌘▸◂✺";
const KEEP =
  range(0x20, 0x7e) + // Basic Latin
  range(0xa0, 0xff) + // Latin-1 Supplement (§ © · × + accented letters)
  SYMBOLS;

// capsize-normalised metrics for likely system fallbacks
const FALLBACKS = {
  arial: { unitsPerEm: 2048, xWidthAvg: 904 },
  courier: { unitsPerEm: 2048, xWidthAvg: 1229 }, // Courier New (monospace)
};

const JOBS = [
  {
    src: "@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
    out: "space-grotesk-subset.woff2",
    family: "Space Grotesk Fallback",
    local: "Arial",
    fallback: FALLBACKS.arial,
  },
  {
    src: "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
    out: "jetbrains-mono-subset.woff2",
    family: "JetBrains Mono Fallback",
    local: "Courier New",
    fallback: FALLBACKS.courier,
  },
];

const avgLowercase = (font) => {
  let total = 0, n = 0;
  for (let c = 0x61; c <= 0x7a; c++) {
    try {
      const g = font.glyphForCodePoint(c);
      if (g?.advanceWidth) { total += g.advanceWidth; n++; }
    } catch {}
  }
  return n ? total / n : font.unitsPerEm * 0.5;
};

await mkdir(outDir, { recursive: true });
const cssBlocks = [];

for (const job of JOBS) {
  const buf = await readFile(join(root, "node_modules", job.src));
  const woff2 = await subsetFont(buf, KEEP, { targetFormat: "woff2" });
  await writeFile(join(outDir, job.out), woff2);
  console.log(
    `[fonts] ${job.out}: ${(buf.length / 1024).toFixed(1)} KiB -> ${(woff2.length / 1024).toFixed(1)} KiB`,
  );

  // read metrics from a TrueType subset (fontkit reads sfnt directly, no brotli)
  const ttf = await subsetFont(buf, KEEP, { targetFormat: "truetype" });
  const font = fontkit.create(ttf);
  const upm = font.unitsPerEm;
  const realAvg = font["OS/2"]?.xAvgCharWidth || avgLowercase(font);
  const sizeAdjust = realAvg / upm / (job.fallback.xWidthAvg / job.fallback.unitsPerEm);
  const pct = (x) => (x * 100).toFixed(2) + "%";
  cssBlocks.push(
    `@font-face {\n` +
      `  font-family: "${job.family}";\n` +
      `  src: local("${job.local}");\n` +
      `  size-adjust: ${pct(sizeAdjust)};\n` +
      `  ascent-override: ${pct(font.ascent / upm / sizeAdjust)};\n` +
      `  descent-override: ${pct(Math.abs(font.descent) / upm / sizeAdjust)};\n` +
      `  line-gap-override: ${pct(font.lineGap / upm / sizeAdjust)};\n` +
      `}`,
  );
}

console.log("\n/* ---- paste these metric-matched fallbacks into global.css ---- */\n");
console.log(cssBlocks.join("\n\n"));
