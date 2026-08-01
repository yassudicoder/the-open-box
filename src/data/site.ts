/* =============================================================================
   SITE — global brand constants. Edit these to rebrand the whole hub.
   ========================================================================== */

export const site = {
  name: "The Open Box",
  shortName: "OPEN BOX",
  domain: "https://the-open-box.vercel.app", // production URL (swap for a custom domain once owned)
  tagline: "Small tools. Out of the box. Nothing hidden.",
  taglineAlt: "Open box. Local-first tools.",
  manifesto:
    "One maker, shipping small honest tools that run on your machine. No accounts. No servers. Nothing leaves your device.",
  maker: "Yash",
  makerNote: "Solo. Designed, built and shipped by one person.",
  email: "boxai5115@gmail.com", // contact email
  linkedin: "https://www.linkedin.com/in/yash-desai-1aa9b5310/",
  volume: "VOL.∞", // FIELD NOTES — VOL.∞
  // The dot-separated mono claims that run in the masthead ticker
  claims: [
    "LOCAL-FIRST",
    "NO ACCOUNTS",
    "NO SERVERS",
    "0 BYTES UPLOADED",
    "KEYBOARD-FIRST",
    "OPEN ABOUT EVERYTHING",
    "WORKS OUT OF THE BOX",
    "FREE WHAT WE CAN",
    "SHIP IN PUBLIC",
  ],
  links: {
    github: "", // optional
    linkedin: "https://www.linkedin.com/in/yash-desai-1aa9b5310/",
    rss: "/rss.xml",
  },
  // The technical "uses" line for the colophon
  stack: ["Astro", "Vanilla CSS", "CSS 3D transforms", "Vercel", "Google Analytics"],
} as const;

export type Site = typeof site;
