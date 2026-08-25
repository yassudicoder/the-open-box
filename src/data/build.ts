/* =============================================================================
   BUILD — the showroom that lives on its own domain.

   The catalogue itself is a separate site (open-box-build), because every demo
   in it has to be free to look nothing like this one. This file is only what
   the hub needs in order to point at it honestly: the counts, the trades, and
   the one design that is finished.

   Keep `trades` in step with the showroom's own src/data/demos.ts.
   ========================================================================== */

export const build = {
  /** The catalogue's production URL. */
  url: "https://open-box-build.vercel.app",

  /** Designs finished, and trades listed — both shown in the section header. */
  live: 1,
  listed: 6,

  featured: {
    trade: "Beauty salon",
    business: "Maison Lumière",
    url: "https://open-box-build.vercel.app/demos/beauty-salon",
  },

  trades: [
    { name: "Beauty salon", live: true },
    { name: "Dental clinic", live: false },
    { name: "Café", live: false },
    { name: "Medical store", live: false },
    { name: "Gym / fitness studio", live: false },
    { name: "Boutique retail", live: false },
  ],
} as const;

export type Build = typeof build;
