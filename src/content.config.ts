import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/* DISPATCHES — the blog / changelog hub. One MD/MDX file per post. */
const dispatches = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/dispatches" }),
  schema: z.object({
    title: z.string(),
    // "Field note number" — shows as DISPATCH §NNN
    n: z.number(),
    date: z.coerce.date(),
    summary: z.string(),
    /** Optional volume this dispatch is about, e.g. "VOL.02". */
    vol: z.string().optional(),
    tag: z.string().default("FIELD NOTE"),
    draft: z.boolean().default(false),
  }),
});

export const collections = { dispatches };
