/* =============================================================================
   BUILT TO ORDER — the commissioned side of the studio.

   The catalog (tools.ts) is what ships OFF THE SHELF. This file is everything
   the studio builds TO ORDER for a client. All copy for /build/ lives here so
   the page never needs layout surgery to change.

   Rules that hold here as everywhere else on this site: no invented clients,
   no invented metrics, no invented testimonials, no guaranteed outcomes.
   ========================================================================== */

/* ---------------------------------------------------------------------------
   WHO IT'S FOR — the kinds of business a commission is packed for.

   `sections` is the honest answer to "what would my site actually contain?" —
   it renders as a small hairline page-skeleton preview on each card, so an
   owner sees the shape of their own site before they ever get in touch.
   ------------------------------------------------------------------------ */
export interface ClientType {
  /** Short label, mono caps. */
  key: string;
  /** What the card says it is. */
  name: string;
  /** One sentence, plain. */
  line: string;
  /** The page skeleton a site like this usually needs. `w` = width %. */
  sections: { label: string; w: number }[];
}

export const clientTypes: ClientType[] = [
  {
    key: "01",
    name: "Clinics & Healthcare",
    line: "For doctors, dentists, physios and clinics — the site a patient checks before they call.",
    sections: [
      { label: "WHO YOU ARE", w: 100 },
      { label: "TREATMENTS", w: 72 },
      { label: "THE DOCTORS", w: 58 },
      { label: "BOOK / CALL", w: 84 },
      { label: "HOURS · LOCATION", w: 66 },
    ],
  },
  {
    key: "02",
    name: "Cafes & Restaurants",
    line: "Menu, hours and where you are — the three things people actually open your site to find.",
    sections: [
      { label: "THE PLACE", w: 100 },
      { label: "MENU", w: 88 },
      { label: "GALLERY", w: 54 },
      { label: "HOURS · LOCATION", w: 70 },
      { label: "RESERVE / ORDER", w: 62 },
    ],
  },
  {
    key: "03",
    name: "Salons & Parlours",
    line: "Your service list, your work, and an easy way to book — presented like the room feels.",
    sections: [
      { label: "THE SALON", w: 100 },
      { label: "SERVICES · RATES", w: 80 },
      { label: "THE WORK", w: 68 },
      { label: "APPOINTMENT", w: 76 },
      { label: "HOURS · LOCATION", w: 58 },
    ],
  },
  {
    key: "04",
    name: "Medical Stores",
    line: "What you stock, how to reach you, and whether you deliver — clear enough to trust.",
    sections: [
      { label: "THE STORE", w: 100 },
      { label: "WHAT WE STOCK", w: 74 },
      { label: "PRESCRIPTION ENQUIRY", w: 66 },
      { label: "DELIVERY AREA", w: 52 },
      { label: "HOURS · LOCATION", w: 70 },
    ],
  },
  {
    key: "05",
    name: "Local Shops",
    line: "For businesses that live on walk-ins — a proper online presence, not a social profile.",
    sections: [
      { label: "THE SHOP", w: 100 },
      { label: "WHAT WE SELL", w: 78 },
      { label: "WHY VISIT", w: 56 },
      { label: "HOURS · LOCATION", w: 72 },
      { label: "CALL / MESSAGE", w: 60 },
    ],
  },
  {
    key: "06",
    name: "Startups & Personal Brands",
    line: "Landing pages, product sites and portfolios — built to explain the thing and convert.",
    sections: [
      { label: "THE PROPOSITION", w: 100 },
      { label: "HOW IT WORKS", w: 76 },
      { label: "WHAT YOU GET", w: 64 },
      { label: "PRICING / SIGN-UP", w: 70 },
      { label: "CONTACT", w: 48 },
    ],
  },
];

/* ---------------------------------------------------------------------------
   WHAT I DO — two lines of work. Either can be commissioned on its own, or
   both together, which is the point of the pipeline section.
   ------------------------------------------------------------------------ */
export interface ServiceLine {
  code: string;
  name: string;
  /** What the client is actually buying, in one sentence. */
  summary: string;
  items: string[];
  /** What lands in the client's hands at the end. */
  deliverables: string[];
}

export const serviceLines: ServiceLine[] = [
  {
    code: "A",
    name: "Web Development",
    summary:
      "The working website — built responsive, fast, and on technology chosen to fit the job rather than a habit.",
    items: [
      "Business websites",
      "Landing pages",
      "Web applications",
      "Website redesigns",
      "Responsive development",
      "Performance work",
      "Deployment & hosting setup",
    ],
    deliverables: [
      "A live site on your own domain",
      "Works on phone, tablet and desktop",
      "The code, and the keys to it",
      "A short handover on how to update it",
    ],
  },
  {
    code: "B",
    name: "UI/UX Design",
    summary:
      "The design itself, in Figma — structured so it can be built, by me or by whoever you hand it to.",
    items: [
      "Website & app UI design",
      "UX structure and user flows",
      "Wireframes",
      "High-fidelity prototypes",
      "Design systems",
      "Responsive layouts",
      "Redesign of an existing site",
    ],
    deliverables: [
      "A Figma file you own, not a flattened image",
      "Mobile, tablet and desktop layouts",
      "Components and styles a developer can use",
      "A clickable prototype to try before it's built",
    ],
  },
];

/* ---------------------------------------------------------------------------
   FROM FIGMA TO LIVE — the pipeline. `track` marks which half of the job a
   stage belongs to; the point of the section is that one person covers both.
   ------------------------------------------------------------------------ */
export interface Stage {
  n: string;
  name: string;
  /** What happens at this station. */
  what: string;
  /** What exists at the end of it. */
  output: string;
  track: "design" | "build";
}

export const pipeline: Stage[] = [
  {
    n: "01",
    name: "Idea",
    what: "You describe the business and what the site has to do.",
    output: "A written brief we both agree on",
    track: "design",
  },
  {
    n: "02",
    name: "UX / Structure",
    what: "Pages, order, and the path a customer takes through them.",
    output: "Sitemap and user flows",
    track: "design",
  },
  {
    n: "03",
    name: "Figma Design",
    what: "The real design — every screen, every breakpoint.",
    output: "A Figma file and a clickable prototype",
    track: "design",
  },
  {
    n: "04",
    name: "Development",
    what: "The design becomes a working, responsive site.",
    output: "A working build you can visit",
    track: "build",
  },
  {
    n: "05",
    name: "Testing",
    what: "Responsiveness, speed, links, forms, real devices.",
    output: "A checked build, problems fixed",
    track: "build",
  },
  {
    n: "06",
    name: "Deployment",
    what: "Hosting, domain, SSL, analytics if you want it.",
    output: "Live on your own domain",
    track: "build",
  },
  {
    n: "07",
    name: "Live",
    what: "Handover, and a walkthrough of how to keep it updated.",
    output: "The site, and the keys to it",
    track: "build",
  },
];

/* ---------------------------------------------------------------------------
   HOW I WORK — the client-facing process. Deliberately short.
   ------------------------------------------------------------------------ */
export const process: { n: string; name: string; body: string }[] = [
  {
    n: "01",
    name: "Discover",
    body: "Understand the business, the customers it wants, and what the site is actually for.",
  },
  {
    n: "02",
    name: "Plan",
    body: "Agree the pages, the features, the content needed, and the technical direction.",
  },
  {
    n: "03",
    name: "Design",
    body: "Design it in Figma and refine it with you before a line of code is written.",
  },
  {
    n: "04",
    name: "Build",
    body: "Develop the site responsively, on technology suited to the job.",
  },
  {
    n: "05",
    name: "Test",
    body: "Check it on real devices — layout, speed, links, forms, the lot.",
  },
  {
    n: "06",
    name: "Launch",
    body: "Deploy it, hand it over, and make sure you can run it afterwards.",
  },
];

/* ---------------------------------------------------------------------------
   WHY WORK WITH ME — advantages that are actually true of a solo studio.
   No guarantees, no superlatives, nothing unmeasurable.
   ------------------------------------------------------------------------ */
export const advantages: { title: string; body: string }[] = [
  {
    title: "Design and development, one person",
    body: "The person drawing it in Figma is the person building it. Nothing is lost in the handover, because there isn't one.",
  },
  {
    title: "Built around your business",
    body: "The structure comes from what your customers need to do — book, call, find you, read the menu — not from a template that was already lying around.",
  },
  {
    title: "Responsive by default",
    body: "Most of your customers will open it on a phone. It's designed for that first, not shrunk down afterwards.",
  },
  {
    title: "Technology that fits the job",
    body: "A five-page site for a cafe and a web application are not the same problem. The stack is chosen per project.",
  },
  {
    title: "You talk to the person building it",
    body: "No account manager, no relay. Questions go straight to the person doing the work.",
  },
  {
    title: "No features you don't need",
    body: "If a thing doesn't earn its place — a login, a blog, an animation — it doesn't get built. Less to maintain, less to go wrong.",
  },
];

/* ---------------------------------------------------------------------------
   THE BRIEF — options offered by the inquiry form. Kept short on purpose;
   a long form loses the enquiry.
   ------------------------------------------------------------------------ */
export const briefOptions = {
  businessTypes: [
    "Clinic / healthcare",
    "Cafe / restaurant",
    "Salon / parlour",
    "Medical store",
    "Local shop",
    "Startup",
    "Personal brand",
    "Something else",
  ],
  needs: ["Website (design + build)", "UI/UX design only", "Development only", "Redesign of an existing site", "Not sure yet"],
  timelines: ["As soon as possible", "Within a month", "1–3 months", "Just planning ahead"],
  budgets: ["Not sure yet", "Prefer to discuss", "I have a budget in mind"],
} as const;
