/* =============================================================================
   Writes api/_knowledge.json — everything the assistant is allowed to know.

   The assistant answers from THIS FILE and nothing else. That is the whole
   point of generating it rather than writing a system prompt by hand: the
   facts stay in src/data/, one copy, and a prompt cannot drift away from the
   site it is supposedly describing. Change the data, rebuild, and the
   assistant changes with it.

   Nothing is invented here — no pricing, no turnaround times, no client list,
   no availability. If a fact is not in src/data/ it is not in this file, and
   the system prompt tells the model to say it does not know rather than fill
   the gap.

   Run by `npm run build` ahead of `astro build`. The output is committed so
   the deployed function has it even if the build order ever changes.
   ========================================================================== */
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

/** Load a TypeScript data module by transpiling it in memory. */
async function load(rel) {
  const out = await build({
    entryPoints: [path.join(root, rel)],
    bundle: true,
    format: "esm",
    write: false,
    platform: "neutral",
    logLevel: "silent",
  });
  const b64 = Buffer.from(out.outputFiles[0].text).toString("base64");
  return import("data:text/javascript;base64," + b64);
}

const { site } = await load("src/data/site.ts");
const services = await load("src/data/services.ts");

const knowledge = {
  generated: "by scripts/build-knowledge.mjs — do not edit by hand",
  studio: {
    name: site.name,
    maker: site.maker,
    tagline: site.tagline,
    manifesto: site.manifesto,
    email: site.email,
    linkedin: site.linkedin,
    stack: site.stack,
    claims: site.claims,
  },
  clientTypes: (services.clientTypes ?? []).map((c) => ({
    key: c.key,
    name: c.name,
    line: c.line,
    typicalSections: c.sections.map((s) => s.label),
  })),
  serviceLines: (services.serviceLines ?? []).map((s) => ({
    code: s.code,
    name: s.name,
    summary: s.summary,
    items: s.items,
    deliverables: s.deliverables,
  })),
  pipeline: (services.pipeline ?? []).map((p) => ({
    n: p.n,
    name: p.name,
    what: p.what,
    output: p.output,
    track: p.track,
  })),
  advantages: (services.advantages ?? []).map((a) => ({
    title: a.title,
    body: a.body,
  })),
  briefOptions: services.briefOptions ?? null,
  pages: [
    { path: "/", what: "The studio's own tools, shipped off the shelf." },
    { path: "/build/", what: "Commissioned work — websites built to order." },
    { path: "/build/#who", what: "The kinds of business a commission is packed for." },
    { path: "/build/#services", what: "What a commission includes." },
    { path: "/build/#pipeline", what: "How a commission runs, from Figma to live." },
    { path: "/build/#brief", what: "The enquiry form. This is how someone starts a project." },
    { path: "/dispatches/", what: "Notes the studio has published." },
  ],
};

const outPath = path.join(root, "api", "_knowledge.json");
writeFileSync(outPath, JSON.stringify(knowledge, null, 2) + "\n", "utf8");

const bytes = Buffer.byteLength(JSON.stringify(knowledge));
console.log(
  `[knowledge] api/_knowledge.json — ${knowledge.clientTypes.length} client types, ` +
    `${knowledge.serviceLines.length} service lines, ${knowledge.pipeline.length} pipeline stages, ` +
    `${bytes} bytes`,
);
