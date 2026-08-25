/* =============================================================================
   POST /api/brief — the project brief, delivered as email.

   A Vercel Serverless Function. It exists so the enquiry form can send on its
   own instead of handing the visitor off to their mail client.

   WHY A FIRST-PARTY ENDPOINT RATHER THAN FORMSPREE / WEB3FORMS:
   vercel.json sets `connect-src 'self'` and `form-action 'self'`. A browser
   would refuse to POST this form to a third-party form service without
   widening that policy — and widening the CSP of a site whose whole argument
   is "nothing leaves your device" is a bad trade. Same-origin is already
   allowed, so this endpoint needs no CSP change at all. It also keeps the API
   key server-side: nothing secret is ever shipped to the browser.

   NO NPM DEPENDENCY. Resend is reached over plain fetch.

   ENV (set these in Vercel → Project → Settings → Environment Variables):
     RESEND_API_KEY  required. Without it the endpoint reports 501 and the
                     form quietly falls back to opening the visitor's mail app,
                     so an enquiry is never lost while this is unconfigured.
     MAIL_TO         optional. Defaults to the studio address below.
     MAIL_FROM       optional. Defaults to Resend's shared onboarding sender,
                     which can only deliver to the Resend account owner's own
                     address — which is exactly this use case. Point it at a
                     verified domain once one exists.

   GET /api/brief returns a status object (never the key) so deployment can be
   verified in one click.
   ========================================================================== */

const TO_DEFAULT = "boxai5115@gmail.com";
const FROM_DEFAULT = "The Open Box <onboarding@resend.dev>";
const SUBJECT_PREFIX = "Project enquiry";

/** Hard caps. Anything longer is a bot or a paste accident, not a brief. */
const LIMITS = {
  name: 120,
  business: 160,
  type: 60,
  need: 60,
  timing: 60,
  budget: 60,
  existing: 300,
  reply_to: 200,
  message: 6000,
  total: 20000,
};

/* --- best-effort rate limit. Serverless instances are recycled, so this is a
   speed bump for a naive flood, not a guarantee. The real defences are the
   honeypot, the dwell check and the origin check. ---------------------------- */
const HITS = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip) {
  const now = Date.now();
  const hits = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  HITS.set(ip, hits);
  if (HITS.size > 5000) HITS.clear(); // never let the map grow unbounded
  return hits.length > MAX_PER_WINDOW;
}

function clean(v, max) {
  if (typeof v !== "string") return "";
  // strip control characters, collapse runs of blank lines, trim, cap
  return v
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, max);
}

/** Header injection guard: a subject or reply-to may never span lines. */
function oneLine(v) {
  return v.replace(/[\r\n]+/g, " ").trim();
}

function looksLikeEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/** The brief, as plain text — the same shape the on-page preview showed. */
function compose(f) {
  const rows = [
    ["Name", f.name],
    ["Business", f.business],
    ["Type", f.type],
    ["Needs", f.need],
    ["Timing", f.timing],
    ["Budget", f.budget],
    ["Existing site", f.existing],
    ["Reach me at", f.reply_to],
  ].filter(([, v]) => v);

  const width = rows.reduce((w, [k]) => Math.max(w, k.length), 0);
  const parts = ["PROJECT BRIEF — THE OPEN BOX", ""];
  if (rows.length) parts.push(rows.map(([k, v]) => `${k.padEnd(width)} : ${v}`).join("\n"), "");
  if (f.message) parts.push("WHAT THE SITE HAS TO DO", f.message, "");
  parts.push("— Sent from the brief form at /build/");
  return parts.join("\n");
}

/** Vercel parses JSON and urlencoded bodies, but not always — be defensive. */
async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body) {
    try {
      return JSON.parse(req.body);
    } catch {
      return Object.fromEntries(new URLSearchParams(req.body));
    }
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > LIMITS.total) throw new Error("payload too large");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  const ct = String(req.headers["content-type"] || "");
  if (ct.includes("application/json")) return JSON.parse(raw);
  return Object.fromEntries(new URLSearchParams(raw));
}

/** No-JS submissions get a real page back, in the site's own voice. */
function htmlPage(title, body, status) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · The Open Box</title>
<style>
  :root{color-scheme:light dark}
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:2rem;
       background:#fff;color:#000;font:16px/1.55 ui-monospace,"JetBrains Mono",Menlo,monospace}
  @media(prefers-color-scheme:dark){body{background:#000;color:#fff}}
  .b{max-width:46ch;border:1.5px solid currentColor;border-radius:2px;padding:1.5rem}
  h1{font-size:1.1rem;letter-spacing:.14em;text-transform:uppercase;margin:0 0 .9rem}
  p{margin:0 0 1rem;opacity:.8}
  a{color:inherit}
</style></head><body><div class="b"><h1>${title}</h1>${body}
<p><a href="/build/">&#9666; BACK TO BUILT TO ORDER</a></p></div></body></html>`;
}

export default async function handler(req, res) {
  /* ---- status probe: confirm the function deployed, without leaking the key */
  if (req.method === "GET") {
    return res.status(200).json({
      endpoint: "/api/brief",
      deployed: true,
      configured: Boolean(process.env.RESEND_API_KEY),
      deliversTo: (process.env.MAIL_TO || TO_DEFAULT).replace(/^(.).*(@.*)$/, "$1***$2"),
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const wantsJson = String(req.headers["accept"] || "").includes("application/json");
  const fail = (status, error, human) =>
    wantsJson
      ? res.status(status).json({ ok: false, error })
      : res.status(status).send(htmlPage("Not sent", `<p>${human}</p>`));

  /* ---- same-origin only. A form on someone else's page is not this form. --- */
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const origin = req.headers.origin || req.headers.referer || "";
  if (origin && host) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      /* malformed — treated as a mismatch below */
    }
    if (originHost !== host) return fail(403, "bad_origin", "That request did not come from this site.");
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return fail(413, "too_large", "That message was too large to accept.");
  }

  /* ---- quiet bot traps: answer 200 so a bot learns nothing from the response */
  const ok = () =>
    wantsJson
      ? res.status(200).json({ ok: true })
      : res.status(200).send(
          htmlPage(
            "Brief sent",
            `<p>It went straight to the studio inbox &mdash; no form service, nothing stored here.</p>
             <p>You&rsquo;ll get a reply within one working day.</p>`,
          ),
        );

  if (clean(body.company_website, 200)) return ok(); // honeypot: humans never see this field
  const dwell = Number(body.t) > 0 ? Date.now() - Number(body.t) : null;
  if (dwell !== null && dwell < 2500) return ok(); // nobody reads and fills a brief in 2.5s

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return fail(429, "rate_limited", "Too many briefs from here just now. Try again shortly.");

  /* ---- validate ---------------------------------------------------------- */
  const f = {};
  for (const key of Object.keys(LIMITS)) {
    if (key === "total") continue;
    f[key] = clean(body[key], LIMITS[key]);
  }
  if (!f.name || !f.message || !f.reply_to) {
    return fail(400, "missing_fields", "Name, what the site has to do, and how to reach you are all required.");
  }
  if (f.message.length < 10) return fail(400, "message_too_short", "Tell me a little more about the project.");

  /* ---- configured? ------------------------------------------------------- */
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Not an error the visitor caused. The client falls back to mailto on 501.
    return wantsJson
      ? res.status(501).json({ ok: false, error: "not_configured" })
      : res.status(501).send(
          htmlPage(
            "Not sent yet",
            `<p>Automatic sending is not switched on for this deployment.</p>
             <p><a href="mailto:${process.env.MAIL_TO || TO_DEFAULT}">Email the brief directly &#9666;</a></p>`,
          ),
        );
  }

  /* ---- send -------------------------------------------------------------- */
  const replyTo = oneLine(f.reply_to);
  const subject = oneLine(
    `${SUBJECT_PREFIX} — ${f.name}${f.business ? ` · ${f.business}` : ""}`,
  ).slice(0, 160);

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || FROM_DEFAULT,
        to: [process.env.MAIL_TO || TO_DEFAULT],
        subject,
        text: compose(f),
        // so hitting Reply in the inbox goes to the client, when they gave an address
        ...(looksLikeEmail(replyTo) ? { reply_to: replyTo } : {}),
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("resend failed", r.status, detail.slice(0, 400));
      return fail(502, "send_failed", "The brief could not be sent just now.");
    }
  } catch (err) {
    console.error("resend threw", err);
    return fail(502, "send_failed", "The brief could not be sent just now.");
  }

  return ok();
}
