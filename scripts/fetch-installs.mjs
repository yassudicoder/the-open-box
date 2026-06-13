/**
 * Build-time install-count fetcher for The Open Box ledger.
 *
 * Reads src/data/tools.json, fetches each tool's Chrome Web Store listing HTML,
 * parses the public "N users" count, and writes the number back into tools.json.
 * The page reads the baked number at build time and sums it for TOTAL INSTALLS —
 * there is NO client-side analytics call and NO runtime backend.
 *
 * Resilience contract:
 *   - On ANY failure (network, changed markup, no match) it logs a warning and
 *     KEEPS the existing committed number. It never zeroes a count and never
 *     throws — the build must not fail because a listing was unreachable.
 *
 * Runs as a prebuild step (see package.json "build"). Run manually with:
 *   node scripts/fetch-installs.mjs
 *
 * TODO(active-users): a separate "active users" metric (DAU/WAU) would come from
 * a dedicated serverless function querying a privacy-respecting source — NOT an
 * analytics SDK on the site, and NOT this script. Left intentionally unbuilt.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "src", "data", "tools.json");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const TIMEOUT_MS = 12000;

/**
 * Pull the public install/user count out of a Chrome Web Store listing's HTML.
 * The listing exposes it as e.g. "4 users", "1,000+ users". Markup changes over
 * time, so try several shapes and bail (return null) rather than guess wrong.
 * A bucketed "1,000+" is stored as its floor (1000).
 */
function parseUsers(html) {
  const patterns = [
    /([\d,]+)\s*\+?\s*users\b/i,
    />\s*([\d,]+)\s*\+?\s*users\s*</i,
    /"user_?count"\s*:\s*"?([\d,]+)/i,
    /\b([\d,]+)\s*\+?\s*weekly active users\b/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const n = parseInt(m[1].replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }
  return null;
}

async function fetchUsers(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const n = parseUsers(html);
    if (n === null) throw new Error("no user count found in markup");
    return n;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  let raw;
  try {
    raw = await readFile(dataPath, "utf8");
  } catch (err) {
    console.warn(`[installs] cannot read tools.json (${err.message}); skipping.`);
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.warn(`[installs] tools.json is not valid JSON (${err.message}); skipping.`);
    return;
  }

  const tools = Array.isArray(data.tools) ? data.tools : [];
  let changed = false;

  for (const tool of tools) {
    if (!tool || !tool.cwsUrl) continue;
    try {
      const n = await fetchUsers(tool.cwsUrl);
      if (n !== tool.installs) {
        console.log(`[installs] ${tool.name}: ${tool.installs} -> ${n}`);
        tool.installs = n;
        changed = true;
      } else {
        console.log(`[installs] ${tool.name}: ${n} (unchanged)`);
      }
    } catch (err) {
      // KEEP the committed number. Never zero, never fail the build.
      console.warn(
        `[installs] ${tool.name}: keeping committed ${tool.installs} (${err.message})`,
      );
    }
  }

  if (changed) {
    data.updated = new Date().toISOString().slice(0, 10);
    try {
      await writeFile(dataPath, JSON.stringify(data, null, 2) + "\n", "utf8");
      console.log("[installs] wrote src/data/tools.json");
    } catch (err) {
      console.warn(`[installs] could not write tools.json (${err.message}).`);
    }
  } else {
    console.log("[installs] no changes.");
  }
}

// Last-resort guard so the prebuild step can never crash the build.
main().catch((err) => {
  console.warn(
    `[installs] unexpected error, keeping committed numbers: ${err?.message || err}`,
  );
});
