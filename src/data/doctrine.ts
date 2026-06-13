/* =============================================================================
   DOCTRINE — the studio's operating principles. Terse, engineering-manual voice.
   Edit / reorder freely; they render as numbered entries 01..N.
   ========================================================================== */

export interface Principle {
  title: string;
  body: string;
}

export const doctrine: Principle[] = [
  {
    title: "Local-first by default",
    body: "The tool runs on your machine. Your data is computed where it lives and stays there. The network is opt-in, never assumed.",
  },
  {
    title: "No accounts",
    body: "Nothing to sign up for, nothing to log into. Install it and it works. There is no server holding your stuff hostage.",
  },
  {
    title: "Keyboard-first",
    body: "Hands stay on the keys. Every action has a shortcut; the mouse is optional. Speed is a feature, not a setting.",
  },
  {
    title: "Open about everything",
    body: "What it does, what it touches, what it sends — stated plainly. Nothing hidden. If a thing leaves your device, you put it there.",
  },
  {
    title: "Free what we can",
    body: "Small tools should be cheap or free. We charge only where it keeps the lights on, and we say which parts those are.",
  },
  {
    title: "Ship in public",
    body: "Built in the open, shipped when honest, changed in the changelog. No vapor. The ledger is the receipt.",
  },
];
