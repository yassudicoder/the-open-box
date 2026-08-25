/* =============================================================================
   COMMISSIONS — selected client work for /build/.

   THIS ARRAY IS EMPTY ON PURPOSE. There is no real client work to show yet,
   and this site does not invent clients, screenshots, logos or results.

   While it is empty the section renders RESERVED slots — the same "sealed,
   not yet" language the catalog uses for an unshipped volume. That is honest
   and on-brand, and it reads as a studio with room on the bench rather than
   a studio pretending to have a portfolio.

   TO ADD A REAL PROJECT: append one entry below. The section switches from
   reserved slots to real cards automatically — no layout changes needed.

   {
     slug: "riverside-clinic",
     name: "Riverside Clinic",          // or "Clinic Website" if unnamed
     category: "Healthcare",            // shown as a tag
     services: ["UI/UX", "Development"],
     summary: "One sentence on what the site had to do.",
     stack: ["Astro", "Vanilla CSS"],   // optional
     year: "2026",                      // optional
     live: "https://…",                 // optional — omit if not public
     figma: "https://…",                // optional
     caseStudy: "",                     // optional route, e.g. "/build/riverside-clinic/"
     image: "/work/riverside-clinic.png", // optional; put the file in public/work/
     imageAlt: "Home page of the Riverside Clinic website on desktop and mobile.",
   }
   ========================================================================== */

export interface Commission {
  slug: string;
  name: string;
  category: string;
  services: string[];
  summary: string;
  stack?: string[];
  year?: string;
  live?: string;
  figma?: string;
  caseStudy?: string;
  image?: string;
  imageAlt?: string;
}

export const commissions: Commission[] = [];

/** How many reserved slots to draw while the shelf is still empty. */
export const RESERVED_SLOTS = 3;

/** The kind of work each reserved slot is waiting for — labels only, no claims. */
export const reservedSlots: { category: string; services: string }[] = [
  { category: "Healthcare", services: "UI/UX + DEVELOPMENT" },
  { category: "Food & Hospitality", services: "UI/UX + DEVELOPMENT" },
  { category: "Beauty & Services", services: "UI/UX + DEVELOPMENT" },
];
