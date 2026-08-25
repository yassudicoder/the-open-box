/* =============================================================================
   THE MATCHER — the only part of the assistant that ships to the browser.

   NO IMPORTS ON PURPOSE. Its sibling assistant-corpus.ts pulls in src/data,
   and if the two lived in one module Vite would drag the whole data layer into
   the client bundle to get at these forty lines. Keep them apart and the
   browser downloads a matcher; the corpus arrives separately, as JSON, and
   only for someone who actually opens the panel.

   HOW IT SCORES. Every entry carries trigger terms. A one-word term is worth
   two points; a phrase is worth two plus two per word, so "how much" (6) beats
   a bare "shop" (2) when someone asks what a shop site costs — which is the
   behaviour you want, because the honest refusal has to win over the topic.
   Below the threshold nothing is returned at all and the caller says so.
   ========================================================================== */

export interface Entry {
  id: string;
  /** Suggestion-chip label. Omitted = answerable but never suggested. */
  chip?: string;
  /** Trigger terms, pre-normalised. A term with a space matches as a phrase. */
  keys: string[];
  /** The answer. Rendered with textContent — never parsed as markup. */
  a: string;
  /** Optional call to action rendered as a real link under the answer. */
  link?: { href: string; label: string };
  /** Entry ids to offer as chips after this answer. */
  next?: string[];
  /** Breaks ties at equal score. Refusals sit above topics. */
  rank?: number;
}

/* Words carrying no topic. Dropped before matching so "how do I contact you"
   and "contact" score the same. */
const STOP = new Set(
  ("a about all also am an and any are as at be been but by can could did do does" +
    " for from get got had has have he her him his how i if in into is it its just" +
    " me my need no not of on or our out own said say she should so some than that" +
    " the their them then there these they this to too us want was we were what" +
    " when where which who why will with would you your").split(" "),
);

/** Lowercase, drop punctuation, collapse runs of space. */
export function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

/* Crude suffix stripping — not linguistics, just enough that "clinics",
   "pharmacies" and "bookings" reach the same bucket as their singulars. */
function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 3 && w.endsWith("es")) {
    /* "boxes"/"churches" drop the -es; "packages"/"wireframes" only drop the
       -s, because their singular already ends in e. Getting this wrong meant
       a key and its own plural stemmed to different strings and never met. */
    const base = w.slice(0, -2);
    return /(s|x|z|ch|sh)$/.test(base) ? base : w.slice(0, -1);
  }
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

/** False for a one-word key that is a stop word — it could never match. */
export function isMatchable(key: string): boolean {
  return key.includes(" ") || !STOP.has(normalise(key));
}

export function tokens(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of normalise(s).split(" ")) {
    if (w && !STOP.has(w)) out.add(stem(w));
  }
  return out;
}

const WORD = 2;
export const THRESHOLD = WORD;

export function score(e: Entry, q: string, t: Set<string>): number {
  let n = 0;
  for (const key of e.keys) {
    if (key.includes(" ")) {
      /* Substring, not token, so "how many weeks" still contains "how many
         week" and a stemmed phrase key keeps working. */
      if (q.includes(key)) n += WORD + WORD * key.split(" ").length;
    } else if (t.has(stem(key))) {
      n += WORD;
    }
  }
  return n;
}

/** Best entry, plus the runners-up worth offering as follow-up chips. */
export function match(corpus: Entry[], input: string): { hit: Entry | null; also: Entry[] } {
  const q = normalise(input);
  const t = tokens(input);
  const ranked = corpus
    .map((e) => ({ e, s: score(e, q, t) }))
    .filter((x) => x.s >= THRESHOLD)
    .sort((a, b) => b.s - a.s || (b.e.rank ?? 0) - (a.e.rank ?? 0));

  if (!ranked.length) return { hit: null, also: [] };
  return {
    hit: ranked[0].e,
    also: ranked.slice(1, 4).map((x) => x.e).filter((e) => e.chip),
  };
}
