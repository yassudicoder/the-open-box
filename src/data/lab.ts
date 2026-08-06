/* =============================================================================
   LAB — what's being built next. Honest states. Entries graduate into tools.ts.
   ========================================================================== */

export type LabState = "research" | "building" | "soon";

export interface LabEntry {
  codename: string;
  blurb: string;
  state: LabState;
  stateLabel: string;
  /** 0..1 — drawn as a hairline progress score. */
  progress: number;
}

// Only future *tools* and their pipeline status. Entries graduate into
// tools.ts (and gain a VOL number) once they're real.
export const lab: LabEntry[] = [
  {
    codename: "VOL.05 · UNTITLED",
    blurb:
      "The next tool, still unnamed. A small local-first utility for a chore nobody enjoys — scoping it until it does exactly one thing well.",
    state: "research",
    stateLabel: "IN RESEARCH",
    progress: 0.28,
  },
  {
    codename: "VOL.06 · CANDIDATE",
    blurb:
      "On the shortlist: another small browser tool that deletes one repetitive step. Not committed yet — it has to earn its volume number.",
    state: "research",
    stateLabel: "EXPLORING",
    progress: 0.12,
  },
  {
    codename: "THE BACKLOG",
    blurb:
      "A running list of tiny annoyances worth a tool. Ideas graduate from here into the index the moment one is real enough to ship.",
    state: "research",
    stateLabel: "INTAKE",
    progress: 0.05,
  },
];
