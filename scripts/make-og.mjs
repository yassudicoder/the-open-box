/**
 * Rasterize the branded OG cover (public/og-cover.svg → public/og-cover.png).
 * Most social platforms (Twitter/X, Facebook, LinkedIn) won't render SVG OG
 * images, so we ship a PNG. Uses sharp, which Astro already depends on.
 *
 *   node scripts/make-og.mjs
 *
 * Runs automatically before `astro build` (see package.json "build" script).
 * Edit public/og-cover.svg and re-run to regenerate.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = join(root, "public", "og-cover.svg");
const pngPath = join(root, "public", "og-cover.png");

try {
  const { default: sharp } = await import("sharp");
  const svg = await readFile(svgPath);
  await sharp(svg, { density: 200 })
    .resize(1200, 630, { fit: "fill" })
    .png({ quality: 92 })
    .toFile(pngPath);
  console.log("[make-og] wrote public/og-cover.png");
} catch (err) {
  // Non-fatal: the SVG cover still ships and works on platforms that accept it.
  console.warn(
    "[make-og] skipped PNG generation (" +
      (err?.message || err) +
      "). SVG OG cover will be used.",
  );
}
