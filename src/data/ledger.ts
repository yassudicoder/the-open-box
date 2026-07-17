/* =============================================================================
   LEDGER — the packing manifest / shipping slip.

   TOTAL INSTALLS is the ONLY real metric: the sum of `installs` across the
   committed tools.json (refreshed at build time by scripts/fetch-installs.mjs
   from the Chrome Web Store — no client-side analytics, no runtime backend).

   SERVERS / BYTES UPLOADED / ACCOUNTS are CONSTANTS — the brand promise. They
   are hardcoded 0, never fetched, never computed.
   ========================================================================== */

import { liveTools } from "./tools";
import toolsData from "./tools.json";

// The only real number: sum of per-tool install counts (baked at build time).
const installsTotal = (toolsData.tools ?? []).reduce(
  (sum, t) => sum + (Number.isFinite(t?.installs) ? Number(t.installs) : 0),
  0,
);

// Format for display. Chrome Web Store buckets large counts as "1,000+"; the
// fetch script stores the floor, so a comma-grouped figure reads honestly.
function formatInstalls(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toLocaleString("en-US");
}

// TODO(active-users): a separate "active users" (DAU/WAU) metric would be served
// by a dedicated serverless function — NOT an analytics SDK on the site. Not
// built here on purpose; this ledger only sums shipped install counts.

export const ledger = {
  // Derived — do not hand-edit.
  toolsShipped: liveTools.length,
  totalInstalls: formatInstalls(installsTotal),
  installsTotalRaw: installsTotal,

  // CONSTANTS — the brand promise. Hardcoded; never fetched, never computed.
  servers: 0,
  bytesUploaded: 0,
  accounts: 0,

  // Maintained by hand on each shipment.
  lastShipped: "2026-07-17", // ISO date of the most recent shipment
  lastShippedVol: "VOL.03",
  since: "2026",

  /**
   * Manifest rows render in order. `fixed: true` marks the local-first
   * constants (rendered as a flat 0 with a "by design" caption).
   */
  manifest(): { label: string; value: string; fixed?: boolean }[] {
    return [
      { label: "TOOLS SHIPPED", value: String(this.toolsShipped).padStart(2, "0") },
      { label: "TOTAL INSTALLS", value: this.totalInstalls },
      { label: "SERVERS RUN", value: "0", fixed: true },
      { label: "BYTES UPLOADED", value: "0", fixed: true },
      { label: "ACCOUNTS REQUIRED", value: "0", fixed: true },
      { label: "LAST SHIPPED", value: `${this.lastShipped} · ${this.lastShippedVol}` },
      { label: "MANIFEST SINCE", value: this.since },
    ];
  },
} as const;
