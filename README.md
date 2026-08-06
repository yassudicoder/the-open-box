# The Open Box

The umbrella studio site for **The Open Box** — one maker (Yash) shipping small,
honest, **local-first** tools. This hub is the *publisher* of the series; each
tool (VOL.01, VOL.02, …) has its own site, and this is where they unpack out of
**the open box**.

> Small tools. Out of the box. Nothing hidden.

Built with [Astro](https://astro.build) — static, fast, zero required JS for the
core, MDX-powered changelog. The signature graphic (an isometric matte carton
that unboxes on interaction and hands its contents to the catalog) is pure
**CSS 3D** — no WebGL, no heavy dependency, fully reduced-motion aware. Each
tool in the catalog then proves itself with a small animated **working
demonstration** instead of a screenshot.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # → ./dist  (also regenerates the OG PNG)
npm run preview    # serve the production build locally
```

Node 20+ recommended.

---

## The signature: the open box

The hero box lives in [`src/components/OpenBox.astro`](src/components/OpenBox.astro).
It is one self-contained component built on the idea of **unboxing on
interaction** — it starts sealed and opens when you arrive or touch it.

- **Carton** — opaque, matte, three-tone CSS-3D faces with hairline edges and
  four lid flaps that hinge at the top rim.
- **Sealed (default)** — closed, with a centre seam, sealing tape, and a
  `⌀ SEALED` badge; the product modules are collapsed inside but stay in the
  DOM as real focusable links.
- **Unbox** — on the first of {hover · focus · tap · arriving after a short
  sealed beat}, the flaps hinge open and the modules rise, fan out, and settle.
  Once open it stays open; a gentle bob and a damped cursor parallax follow
  (desktop only).
- **Scroll handoff** — as you scroll into **THE CONTENTS**, each module
  detaches and flies into its real catalog bay (matched by `data-vol`),
  docking as the catalog takes over. Skipped on mobile / reduced-motion /
  no-JS.
- **Reduced motion / no JS** — the box renders already open and static with
  its modules placed; nothing is ever trapped inside a sealed box.

## The demonstrations

Each shipped tool in **01 / THE CONTENTS** is a *bay*: an identity plate
(codename, specs, platforms, links) beside a **FIG. plate that demonstrates the
tool instead of describing it** (`src/components/demos/`):

- **FIG.01 CANNED** — the same reply gets typed twice, so you save it as a
  `;intro` template (locally), and from then on one shortcut expands it whole
  at the cursor.
- **FIG.02 CONTINUE** — a conversation in Model A is packed into a structured
  context capsule, crosses the seam, and is rebuilt in Model B — where it
  simply keeps going.
- **FIG.03 BULK** — a page is swept by a scanline, every image (incl. lazy +
  background) is extracted into a sorted field, duplicates struck, keepers
  checked, and the lot compressed into one ZIP.

All three run on a shared cancellable timeline runner
([`src/scripts/demo.ts`](src/scripts/demo.ts)): they play only while on
screen, pause when the tab hides, loop with a REPLAY control, and under
reduced motion ship as static composed end-states (`data-phase="static"`).

The site ends by completing the metaphor: the footer lays out the **complete
contents, unpacked** — one tile per volume, rendered straight from
`tools.ts`, so it stays aligned and simply grows a row as more tools ship
(shipped tools read `OUT ✓` and stay clickable; anything unshipped stays
`SEALED`). Then the last line of the slip: `The box is open. Nothing left
inside.`

The same line-art box is the **logo** (`src/components/BoxMark.astro`), the
**favicon** (`public/favicon.svg`), and the **OG cover** (`public/og-cover.svg`
→ rasterized to `.png`).

---

## Editing content — everything is one file

All copy and data live in `src/data/` and `src/content/`. Layout never needs to
change to add a tool, a principle, or a post.

### ▸ Add a tool (publish VOL.04)

Edit **[`src/data/tools.ts`](src/data/tools.ts)** and append one entry to the
`tools` array:

```ts
{
  vol: "VOL.04",
  codename: "SHORTNAME",                 // big label in the index + on the module
  title: "Full Product Title",
  oneLiner: "One sentence describing it.",
  status: "live",                        // live | submitted | lab | research
  statusLabel: "LIVE",                   // pill text
  platforms: ["CHROME", "GMAIL"],
  installs: "1,200",                     // optional; "" to hide
  site: "https://your-product-site/",    // "" if not public yet
  store: "https://chromewebstore.google.com/detail/…",
  kind: "Browser extension",
  shipped: true,                         // true → counts on the ledger + JSON-LD
  specs: ["ALT+A INSERTS", "LOCAL-FIRST"], // mono spec lines on inspect
},
```

That single edit updates: **THE CONTENTS**, the floating **box modules** (first
three entries), the **ledger** tool count, the **command palette**, the
**maker** links, and the per-tool **JSON-LD** `SoftwareApplication`. No layout
surgery.

> A new volume renders as a bay without a FIG. plate until you give it one:
> add a demo component under `src/components/demos/` and map it by codename in
> `Contents.astro` (see how CANNED / CONTINUE / BULK are wired).

If the new tool is in the Chrome Web Store, also add a `{ name, cwsUrl, installs }`
entry to [`src/data/tools.json`](src/data/tools.json) so its installs are counted
in the ledger's TOTAL INSTALLS (see "The ledger metrics" below).

### ▸ The ledger metrics

The **packing manifest** ([`TheLedger.astro`](src/components/TheLedger.astro),
data in [`ledger.ts`](src/data/ledger.ts)) has two kinds of numbers:

**Constants — the brand promise.** `SERVERS RUN`, `BYTES UPLOADED`, and
`ACCOUNTS REQUIRED` are hardcoded **0** with a "by design — local-first" caption.
They are never fetched and never computed. Leave them at 0.

**TOTAL INSTALLS — the only real metric.** It's the **sum** of `installs` across
[`src/data/tools.json`](src/data/tools.json):

```jsonc
{ "name": "Canned Responses", "cwsUrl": "https://chromewebstore.google.com/…", "installs": 4 }
```

A build-time Node script, [`scripts/fetch-installs.mjs`](scripts/fetch-installs.mjs),
runs as a **prebuild** step (first thing in `npm run build`, also `npm run installs`).
It fetches each tool's Chrome Web Store listing, parses the public `N users` count,
and writes it back into `tools.json`. On **any** failure (network, changed markup,
no match) it logs a warning and **keeps the committed number** — it never zeroes a
value and never fails the build. So `installs` doubles as a hand-editable fallback.

The figure is **baked at build time** — it does not come from site analytics and
there is **no runtime backend** behind it. (Other ledger fields — `lastShipped`,
`lastShippedVol`, `since` — are still maintained by hand in `ledger.ts`.)

> A separate "active users" metric, if ever wanted, would come from a dedicated
> serverless function — not an analytics SDK on the site. There's a `TODO` marker
> for it in `fetch-installs.mjs`; nothing is wired up.

### ▸ Edit the doctrine / lab

- Principles: **[`src/data/doctrine.ts`](src/data/doctrine.ts)** (renders as
  numbered `01..N`).
- Lab entries: **[`src/data/lab.ts`](src/data/lab.ts)** (`research | building |
  soon`, each with a progress value `0..1`).

### ▸ Publish a dispatch (changelog / blog post)

Add a Markdown (or `.mdx`) file to
**[`src/content/dispatches/`](src/content/dispatches/)**:

```markdown
---
title: VOL.04 — shipped
n: 4                       # field-note number → shows as §004, also orders RSS
date: 2026-07-01
summary: One line for the index, RSS, and meta description.
vol: VOL.04                # optional, tags the post to a volume
tag: SHIP                  # FIELD NOTE | SHIP | NOTE …
draft: false               # true hides it from build + RSS
---

Body in Markdown. Code fences, lists, and headings are all styled.
```

It automatically appears on the home page (latest 4), on `/dispatches/`, in the
`/rss.xml` feed, and gets its own page at `/dispatches/<filename>/`.

### ▸ Rebrand / change the domain

Edit **[`src/data/site.ts`](src/data/site.ts)** (name, tagline, email, claims,
stack) and set the production domain in **two** places that must match:

- `domain` in `src/data/site.ts`
- `SITE` in `astro.config.mjs`

These feed canonical URLs, OG tags, the sitemap, and RSS.

### ▸ Regenerate the OG cover

The cover art is an editable SVG at **[`public/og-cover.svg`](public/og-cover.svg)**.
Most social platforms need a raster image, so a PNG is generated from it:

```bash
npm run og        # public/og-cover.svg → public/og-cover.png  (via sharp)
```

This also runs automatically as part of `npm run build`. Edit the SVG, re-run,
done. (If `sharp` is unavailable in your environment the step no-ops and the SVG
cover is used as a fallback.)

---

## Project structure

```
public/
  favicon.svg          animated open-box line icon (mask-icon + apple-touch)
  og-cover.svg         editable branded OG cover (source)
  og-cover.png         generated raster cover (1200×630)
  robots.txt
scripts/
  make-og.mjs          SVG → PNG OG rasterizer (sharp)
src/
  data/                site.ts · tools.ts · doctrine.ts · ledger.ts · lab.ts
  content/
    dispatches/        one Markdown file per changelog post
  content.config.ts    dispatches collection schema
  scripts/demo.ts      the shared demo timeline runner (IO-gated, cancellable)
  styles/global.css    the whole design system (tokens, themes, grain, motion,
                       reveal/stamp system, FIG. plate chrome)
  components/          OpenBox, Contents, demos/{DemoCanned,DemoContinue,DemoBulk},
                       BoxMark, Masthead, Ticker, SectionHeader, CreaseDivider,
                       TheLedger, TheDoctrine, InTheLab, Dispatches, Colophon,
                       CommandPalette, Seo, Footer
  layouts/Base.astro   <head>, no-flash theme, masthead, footer, palette
  pages/
    index.astro        the one long scroll (the box → 01 CONTENTS → 06 MAKER)
    dispatches/        index + [slug] post template
    rss.xml.js · 404.astro
astro.config.mjs       SITE domain + integrations (mdx, sitemap)
netlify.toml           build + caching + security headers
```

---

## Design system

`src/styles/global.css` is the single source of truth.

- **Type** — headlines in **Space Grotesk** (sharp neo-grotesk); every label, nav
  item, number, and metadata string in **JetBrains Mono**. Both self-hosted via
  `@fontsource-variable` (no runtime third-party requests).
- **Themes** — one light "blueprint paper" theme and one true dark theme. Respects
  `prefers-color-scheme`; a manual toggle persists to `localStorage` and is applied
  before first paint (no flash). WCAG AA contrast in both.
- **One accent** — a single signal orange, reserved for **live / active** states
  only (the `LIVE` pill, focus rings, the box interior glow, key numerals).
- **Texture** — 0.5–1px hairline rules, a rigid baseline grid, subtle CSS film
  grain, box-fold **crease dividers** between sections. No soft shadows, no glass,
  no decorative gradients.
- **Tokens you'll touch most**: `--accent` / `--accent-text` (bright surface
  orange vs AA print orange), `--box-*` (the carton faces), `--interior`
  (inside the box), `--ink/-2/-3`, `--line/-2`, `--paper/-2`.

### Keyboard-first, made literal

- **⌘K / Ctrl+K** (or `/`) opens the **command palette** — jump to any section,
  tool site, or store listing. It also hides a small **console**: type `help`,
  `ship`, `vol 1`, `open index`, `doctrine`, `theme`, `whoami`, or `box`.
- The box modules and the index rows are fully operable with `↑ ↓` + `↵`.
- Skip link, visible focus rings, semantic landmarks throughout.

---

## Performance & accessibility

- The core renders with **no blocking JS**. The only external script is the
  command palette (~6 KB gz ~2.6 KB); the box and index enhancers are tiny inline
  modules. The 3D box is CSS — it never blocks LCP.
- Dimensions are reserved for the box stage, so there is **no layout shift**.
- Every animation is gated behind `prefers-reduced-motion`.
- The 3D scene is `aria-hidden`; the interactive modules are real, labelled,
  focusable links.

Target: Lighthouse ≥ 95 across Performance / Accessibility / Best Practices / SEO.

---

## Deploy (Netlify)

`netlify.toml` is included: build `npm run build`, publish `dist`, with immutable
caching for hashed assets and sensible security headers.

1. Point the domain (`SITE` in `astro.config.mjs` and `domain` in
   `src/data/site.ts`) at your final host.
2. Connect the repo to Netlify (or `netlify deploy --prod`). No env vars needed —
   there is no backend, by design.

### Cross-linking the series

This hub is the studio's canonical home. To make the publisher relationship
explicit for search engines, point the two existing extension sites'
`<link rel="canonical">`/footer "made by" link back here. The JSON-LD already
declares The Open Box as the `publisher` of each `SoftwareApplication`.

---

## License / contact

Made by **Yash**, solo — [LinkedIn](https://www.linkedin.com/in/yash-desai-1aa9b5310/).
Contact: boxai5115@gmail.com.
Local-first · no account · nothing leaves your device.
