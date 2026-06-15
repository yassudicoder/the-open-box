// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

// The canonical production domain. Change this one line when the domain is final.
export const SITE = "https://the-open-box.vercel.app";

// https://astro.build/config
export default defineConfig({
  site: SITE,
  trailingSlash: "ignore",
  integrations: [mdx(), sitemap()],
  build: {
    inlineStylesheets: "auto",
  },
});
