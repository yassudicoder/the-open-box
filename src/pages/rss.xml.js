import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { site } from "../data/site.ts";

export async function GET(context) {
  const posts = (await getCollection("dispatches", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );

  return rss({
    title: `${site.name} — Dispatches`,
    description: "Changelog and field notes from The Open Box. Every ship, in public.",
    site: context.site,
    items: posts.map((post) => ({
      title: `§${String(post.data.n).padStart(3, "0")} — ${post.data.title}`,
      description: post.data.summary,
      pubDate: post.data.date,
      link: `/dispatches/${post.id}/`,
      categories: [post.data.tag, post.data.vol].filter(Boolean),
    })),
    customData: `<language>en-us</language>`,
  });
}
