/* =============================================================================
   /assistant.json — the corpus, prerendered to a static file at build time.

   WHY A SEPARATE FILE and not an inline blob in the component: the assistant
   mounts on every page of the site, and most visitors will never open it.
   Inlining would put the whole corpus in every HTML document to serve the few
   who do. This way the launcher costs a button and a small matcher, and the
   answers are fetched once, same-origin, only when someone actually asks.

   It is a static asset, not a function — nothing here runs at request time,
   nothing costs anything per visit, and it works identically on a preview
   deploy, on production, and on `astro dev`.
   ========================================================================== */
import type { APIRoute } from "astro";
import { corpus, OPENERS } from "../lib/assistant-corpus";

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ corpus, openers: OPENERS }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
