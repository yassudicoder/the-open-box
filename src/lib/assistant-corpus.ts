/* =============================================================================
   THE CORPUS — everything the assistant is allowed to say, built from src/data.

   THE ANSWERS ARE GENERATED, NOT WRITTEN. Every claim below is assembled from
   clientTypes, serviceLines, pipeline, advantages and site — the same objects
   the pages render. That is the whole reason this file exists rather than a
   hand-typed list of replies: a hand-typed reply drifts the moment someone
   edits the data, and a studio site whose assistant contradicts its own pages
   is worse than one with no assistant. Change src/data, rebuild, and the
   answers change with it.

   THE TRIGGER TERMS ARE NOT CLAIMS. Synonyms like "dentist" or "kirana" exist
   so a visitor's own words reach the right entry. They describe queries, not
   the studio, and nothing in an answer comes from them.

   WHAT IS DELIBERATELY ABSENT. No price, no turnaround, no availability, no
   client list, no testimonial — because src/data holds none. Those four
   questions get REFUSALS, ranked above every topic so they win outright, each
   one saying plainly that the answer is not here and pointing at the brief.
   In the model-backed version this was a line in a system prompt and a hope.
   Here it is a branch, and a branch cannot be talked out of it.
   ========================================================================== */

import { clientTypes, serviceLines, pipeline, advantages } from "../data/services";
import { site } from "../data/site";
import { normalise, isMatchable, type Entry } from "./assistant-match";

const BRIEF = { href: "/build/#brief", label: "Send a brief" };

/** "HOURS · LOCATION" -> "hours and location" */
const readable = (label: string) =>
  label.toLowerCase().replace(/\s*·\s*/g, " and ").replace(/\s*\/\s*/g, " or ");

/* "a, b and c" — except when ANY item already contains an "and", where the
   terminal conjunction collides with it and you get the unreadable "hours and
   location and reserve or order". Then a plain comma list wins. Checking only
   the last item is not enough: the collision is caused by the item BEFORE the
   conjunction just as often as by the one after it. */
const listOf = (xs: readonly string[]) => {
  if (xs.length < 2) return xs[0] ?? "";
  if (xs.some((x) => / and /.test(x))) return xs.join(", ");
  return xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];
};

/* Small counts read as words in a sentence, not as digits. */
const COUNT = ["zero", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve"];
const count = (n: number) => COUNT[n] ?? String(n);
const up1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Drop a trailing full stop so a generated sentence can be joined onto. */
const trim = (s: string) => s.replace(/\.\s*$/, "");

/* Lowercase a leading capital so a Title Case item can sit mid-sentence —
   but never touch an acronym, or "UX structure" becomes "uX structure". */
const lower1 = (s: string) =>
  /^[A-Z][A-Z]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);

/* --- the words a visitor actually types ------------------------------------
   Keyed by clientTypes[].key so an added client type fails loudly here rather
   than silently answering nothing. */
const TRIGGERS: Record<string, string[]> = {
  "01": ["clinic", "doctor", "dentist", "dental", "physio", "physiotherapy", "physiotherapist",
    "medical practice", "surgery", "orthodontist", "chiropractor", "vet", "veterinary",
    "hospital", "patient", "healthcare", "dermatologist", "paediatrician", "ayurvedic",
    "eye clinic", "skin clinic", "diagnostic"],
  "02": ["cafe", "coffee shop", "restaurant", "bistro", "diner", "eatery", "bakery", "food",
    "kitchen", "pub", "takeaway", "catering", "menu", "dhaba", "tea shop", "juice",
    "cloud kitchen", "pizzeria", "canteen", "cafeteria"],
  "03": ["salon", "hair", "hairdresser", "barber", "beauty", "spa", "nail", "tattoo", "yoga",
    "gym", "fitness", "pilates", "massage", "makeup", "parlour", "parlor", "wellness",
    "dance", "studio", "photography studio", "recording studio"],
  "04": ["pharmacy", "chemist", "medical store", "drugstore", "druggist", "medicine",
    "prescription", "pharmacist", "medical shop"],
  "05": ["shop", "store", "retail", "boutique", "grocery", "florist", "bookshop", "hardware",
    "stationery", "furniture", "jewellery", "jeweller", "clothing", "kirana", "showroom",
    "walk in"],
  "06": ["startup", "saas", "portfolio site", "portfolio website", "landing page",
    "product site", "app", "personal brand", "freelance", "founder", "agency", "software",
    "tech company", "my portfolio", "side project"],
};

const stages = pipeline.map((p) => p.name).join(" → ");
const last = pipeline[pipeline.length - 1];
const build = serviceLines[0];   // A — Web Development
const design = serviceLines[1];  // B — UI/UX Design

const ENTRIES: Entry[] = [
  /* ---- the four refusals. Ranked above everything they could collide with. */
  {
    id: "price",
    chip: "What does it cost?",
    rank: 10,
    keys: ["price", "cost", "budget", "quote", "quotation", "how much", "rate", "charge",
      "pricing", "fee", "expensive", "cheap", "affordable", "day rate", "hourly", "estimate",
      "what do you charge", "ballpark", "package", "plan cost"],
    a: "I don't have prices. Nothing on this site quotes a figure, so any number from me would be invented — and an invented number is worse than none. Yash works it out per project once he knows what is involved.",
    link: BRIEF,
    next: ["what", "pipeline", "contact"],
  },
  {
    id: "timing",
    chip: "How long does it take?",
    rank: 10,
    keys: ["how long", "timeline", "deadline", "turnaround", "duration", "how soon",
      "lead time", "how many week", "how many day", "how many month", "when can", "when will",
      "delivery time", "urgent", "asap", "time frame", "timeframe"],
    a: `I don't have timings either — the site publishes none, and it would depend on the size of the job and how fast decisions come back. What I can tell you is that the brief asks for your timeline, and Yash replies within ${site.build.replyWithin}.`,
    link: BRIEF,
    next: ["pipeline", "price", "contact"],
  },
  {
    id: "availability",
    rank: 10,
    keys: ["available", "availability", "taking work", "taking on", "booked", "capacity",
      "accepting", "waitlist", "free right now", "start now", "how busy", "spare"],
    a: `I can't see a calendar, so I don't know what's open. That one has to come from Yash directly — the brief form reaches him and he replies within ${site.build.replyWithin}.`,
    link: BRIEF,
    next: ["contact", "what"],
  },
  {
    id: "work",
    chip: "Can I see past work?",
    rank: 10,
    keys: ["your portfolio", "past work", "previous work", "past project", "previous project",
      "example of", "examples", "case study", "case studies", "testimonial", "review",
      "worked with", "who have you", "your client", "your work", "show me work", "reference",
      "samples", "have you built"],
    a: "There is no client list or case-study page on this site, so I have nothing to point you at — and I'd rather say that than dress up something that isn't there. Ask Yash and he can talk you through whatever is relevant to your job.",
    link: BRIEF,
    next: ["why", "what", "contact"],
  },

  /* ---- what the studio does ---------------------------------------------- */
  {
    id: "what",
    chip: "What do you build?",
    keys: ["what do you build", "what do you do", "what do you offer", "service", "services",
      "what can you make", "offering", "what is on offer", "help me with"],
    a: `Two lines of work: ${build.name} and ${design.name}. ${build.summary} ${design.summary} Either can be commissioned on its own, or both together.`,
    next: ["line-build", "line-design", "pipeline"],
  },
  {
    id: "line-build",
    keys: ["web development", "development only", "build only", "developer", "coding",
      "build a site", "build my site", "website build", "responsive", "hosting", "deploy",
      "deployment", "code it", "speed", "performance", "mobile friendly", "fast"],
    a: `${build.name}. ${build.summary} It covers ${listOf(build.items.map(lower1))}.`,
    next: ["deliverables", "tech", "pipeline"],
  },
  {
    id: "line-design",
    keys: ["ui", "ux", "design", "figma", "wireframe", "prototype", "mockup", "user flow",
      "design only", "just design", "redesign", "user experience", "interface", "visual design"],
    a: `${design.name}. ${design.summary} It covers ${listOf(design.items.map(lower1))}.`,
    next: ["deliverables", "pipeline", "what"],
  },
  {
    id: "deliverables",
    chip: "What do I end up with?",
    keys: ["what do i get", "deliverable", "what i receive", "hand over", "handover",
      "own the code", "who owns", "source code", "keep the code", "what comes with",
      "end up with", "at the end"],
    a: `From the build: ${build.deliverables.map(lower1).join("; ")}. From the design: ${design.deliverables.map(lower1).join("; ")}.`,
    next: ["pipeline", "tech", "contact"],
  },
  {
    id: "pipeline",
    chip: "How does a job run?",
    keys: ["process", "how does it work", "how do you work", "step", "stage", "what happens",
      "figma to live", "workflow", "how it works", "start to finish", "what is involved",
      "next step", "get started"],
    a: `${up1(count(pipeline.length))} stages, ${stages}. Each one ends with something you can actually look at — stage ${pipeline[2].n} hands you ${lower1(trim(pipeline[2].output))}, and stage ${last.n} hands you ${lower1(trim(last.output))}.`,
    link: { href: "/build/#pipeline", label: "See the pipeline" },
    next: ["deliverables", "what", "contact"],
  },
  {
    id: "why",
    chip: "Why work with you?",
    keys: ["why you", "why work with", "why not an agency", "agency", "solo", "one person",
      "team", "how many people", "who does the work", "why should i", "freelancer or"],
    a: `${advantages.map((a, i) => (i ? lower1(trim(a.title)) : trim(a.title))).join("; ")}. ${advantages[0].body}`,
    link: { href: "/build/#why", label: "Why work with me" },
    next: ["what", "pipeline", "contact"],
  },
  {
    id: "tech",
    /* No "seo" and no "accessibility": src/data claims neither, so those
       questions must fall through to the honest miss rather than be answered
       with something adjacent. Speed and responsiveness moved to line-build,
       whose answer is the summary that actually mentions them. */
    keys: ["technology", "tech stack", "stack", "wordpress", "react", "shopify", "wix",
      "framework", "cms", "built with", "what do you use", "analytics", "domain", "ssl"],
    a: `The site you're reading runs on ${listOf([...site.stack])}. For a commission the tooling is picked to fit the job rather than out of habit, and stage ${pipeline[5].n} covers ${lower1(trim(pipeline[5].what))}.`,
    next: ["line-build", "deliverables", "pipeline"],
  },

  /* ---- the studio, and how to reach it ------------------------------------ */
  {
    id: "about",
    keys: ["who are you", "who is yash", "who built", "who made", "your name",
      "what is the open box", "open box", "yash", "tell me about", "your story"],
    a: `This is ${site.name} — ${site.maker}'s studio. ${site.makerNote} The /build/ side is commissioned work: sites designed and built to order. The home page is the studio's own tools, which are a different thing entirely.`,
    next: ["what", "why", "pages"],
  },
  {
    id: "contact",
    chip: "How do I start?",
    keys: ["contact", "email", "reach", "get in touch", "hire", "talk to", "speak to", "phone",
      "call you", "whatsapp", "your number", "message you", "how do i start", "start a project",
      "brief", "enquiry", "inquiry", "commission", "work together"],
    a:
      `The brief form is the way in — it asks the few things Yash needs, and he replies within ${site.build.replyWithin}. ` +
      `Email works too: ${site.email}.` +
      (site.build.whatsapp ? ` WhatsApp: +${site.build.whatsapp}.` : ""),
    link: BRIEF,
    next: ["pipeline", "what", "price"],
  },
  {
    id: "pages",
    keys: ["page", "sitemap", "site map", "what else", "navigate", "where is", "sections",
      "what is on this site", "menu of", "other page"],
    a: "Four places worth knowing: / is the studio's own tools, /build/ is commissioned work, /build/#brief is the enquiry form, and /dispatches/ is the notes.",
    link: { href: "/build/", label: "Built to order" },
    next: ["what", "about", "contact"],
  },
  {
    id: "region",
    keys: ["where are you", "location", "based", "country", "city", "remote", "timezone",
      "time zone", "abroad", "overseas", "india"],
    a: `The studio takes work from ${site.build.region}, and a job runs over email and Figma either way — nothing about it needs you in the same room. Anything more specific about your case is worth asking directly.`,
    link: BRIEF,
    next: ["contact", "pipeline"],
  },

  /* ---- civilities. Ranked below everything, so a real question inside a
         greeting still wins on score. */
  {
    id: "hello",
    rank: -1,
    keys: ["hi", "hello", "hey", "hiya", "namaste", "good morning", "good afternoon",
      "good evening", "greetings"],
    a: "Hello. Tell me what your business is and I'll say what a site for it usually carries — or ask what gets built, and how a job runs.",
    next: ["what", "pipeline", "price"],
  },
  {
    id: "thanks",
    rank: -1,
    keys: ["thanks", "thank you", "cheers", "bye", "goodbye", "appreciate it", "helpful"],
    a: "Any time. If you want to take it further, the brief form is the way — it goes straight to Yash.",
    link: BRIEF,
  },
];

/* --- one entry per client type, generated ---------------------------------- */
const TYPE_ENTRIES: Entry[] = clientTypes.map((c) => {
  const keys = TRIGGERS[c.key];
  if (!keys) throw new Error(`assistant-corpus: no trigger terms for client type ${c.key} (${c.name})`);
  return {
    id: `type-${c.key}`,
    chip: c.name,
    keys,
    a: `${c.line} A site like that usually carries ${listOf(c.sections.map((s) => readable(s.label)))}.`,
    link: { href: "/build/#who", label: "See the six" },
    next: ["pipeline", "price", "contact"],
  };
});

export const corpus: Entry[] = [...ENTRIES, ...TYPE_ENTRIES];

/** Chips shown before anyone has asked anything. */
export const OPENERS = ["what", "pipeline", "price", "work"];

/* --- build-time self-checks -------------------------------------------------
   These throw during `astro build`, which is the point: a corpus that can
   never match a term, or two entries fighting over the same id, should stop
   the build rather than quietly answer nothing on the live site. */
for (const e of corpus) {
  for (const k of e.keys) {
    if (normalise(k) !== k) {
      throw new Error(`assistant-corpus: key "${k}" (${e.id}) is not normalised — it can never match`);
    }
    if (!isMatchable(k)) {
      throw new Error(`assistant-corpus: key "${k}" (${e.id}) is a stop word — it is dropped before matching`);
    }
  }
  if (!e.a.trim()) throw new Error(`assistant-corpus: entry ${e.id} has no answer`);
}
{
  const ids = new Set<string>();
  for (const e of corpus) {
    if (ids.has(e.id)) throw new Error(`assistant-corpus: duplicate id ${e.id}`);
    ids.add(e.id);
  }
  for (const e of corpus) {
    for (const n of e.next ?? []) {
      if (!ids.has(n)) throw new Error(`assistant-corpus: ${e.id} points at unknown entry ${n}`);
    }
  }
  for (const o of OPENERS) {
    if (!ids.has(o)) throw new Error(`assistant-corpus: opener ${o} is not an entry`);
  }
}
