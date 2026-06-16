/* =============================================================================
   TOOLS — the catalog. THIS IS THE FILE.
   To publish VOL.04: copy a block below, bump the `vol`, fill it in, set status.
   Everything downstream (THE INDEX, the open-box modules, JSON-LD, the ledger
   count, the command palette) reads from this array. No layout surgery needed.
   ========================================================================== */

export type ToolStatus = "live" | "submitted" | "lab" | "research";

export interface Tool {
  /** Catalog number, e.g. "VOL.01". Drives ordering + the module label. */
  vol: string;
  /** Short codename shown big in the index + on the floating module. */
  codename: string;
  /** Full product title. */
  title: string;
  /** One sentence. Shown on hover/inspect and in the index row. */
  oneLiner: string;
  /** LIVE | SUBMITTED | IN LAB | IN RESEARCH */
  status: ToolStatus;
  /** Human label for the status pill. */
  statusLabel: string;
  /** Platform tags, monospace caps. */
  platforms: string[];
  /** Optional install count (string so we control formatting). */
  installs?: string;
  /** Product site. Empty string = not yet public. */
  site?: string;
  /** Chrome Web Store listing. Empty = not yet listed. */
  store?: string;
  /** Short kind for JSON-LD / metadata. */
  kind: string;
  /** Is this a real shipped product (counts in the ledger)? */
  shipped: boolean;
  /** A few mono spec lines shown when the module/row is inspected. */
  specs?: string[];
}

export const tools: Tool[] = [
  {
    vol: "VOL.01",
    codename: "CANNED",
    title: "Canned Responses & Email Templates for Gmail & LinkedIn",
    oneLiner:
      "Insert any saved reply at your cursor in one keystroke — variables, abbreviations, local-first, 7 languages.",
    status: "live",
    statusLabel: "LIVE",
    platforms: ["CHROME", "GMAIL", "LINKEDIN"],
    installs: "",
    site: "https://email-templets-extension.vercel.app/",
    store:
      "https://chromewebstore.google.com/detail/email-templates-canned-re/amhocmgofedeoapkokhjpiklnphpafcl",
    kind: "Browser extension",
    shipped: true,
    specs: [
      "ALT+A INSERTS AT CURSOR",
      "{ VARIABLES } + ;ABBREVIATIONS",
      "7 LANGUAGES",
      "0 BYTES UPLOADED",
    ],
  },
  {
    vol: "VOL.02",
    codename: "CONTINUE",
    title: "Continue AI — move your AI chat to another model",
    oneLiner:
      "Continue any AI conversation on ChatGPT, Claude, or Gemini without losing context — one click, local-first, no account.",
    status: "live",
    statusLabel: "LIVE",
    platforms: ["CHROME", "CHATGPT", "CLAUDE", "GEMINI"],
    installs: "",
    site: "https://continue-ai-lilac.vercel.app/",
    store:
      "https://chromewebstore.google.com/detail/continue-ai-%E2%80%94-move-your-a/cojmibmimpeakmgllhpolgbjienedfkf",
    kind: "Browser extension",
    shipped: true,
    specs: [
      "ONE-CLICK HANDOFF",
      "KEEPS FULL CONTEXT",
      "PDF · MD · JSON",
      "NO ACCOUNT",
    ],
  },
  {
    vol: "VOL.03",
    codename: "————",
    title: "In research",
    oneLiner: "Something small and honest is taking shape. Not ready to name yet.",
    status: "research",
    statusLabel: "IN RESEARCH",
    platforms: ["TBD"],
    site: "",
    store: "",
    kind: "Unannounced",
    shipped: false,
    specs: ["SCOPE: SMALL", "ETHOS: LOCAL-FIRST", "STATUS: STILL THINKING"],
  },
];

/** Ordering helper used across the site. */
export const statusOrder: Record<ToolStatus, number> = {
  live: 0,
  submitted: 1,
  lab: 2,
  research: 3,
};

export const liveTools = tools.filter((t) => t.shipped);
