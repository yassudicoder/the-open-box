/* =============================================================================
   POST /api/chat — the studio's own assistant.

   A Vercel Serverless Function, in the same shape as api/brief.js and for the
   same reason: vercel.json sets `connect-src 'self'`, so the browser cannot
   call a model API directly even if we wanted it to. It shouldn't anyway — a
   key shipped to the browser is a key given away. This endpoint keeps it
   server-side and needs no CSP change at all.

   NO NPM DEPENDENCY. Both providers are reached over plain fetch.

   PROVIDER-AGNOSTIC ON PURPOSE. Set whichever key you have; the endpoint
   picks the provider from what is present, so switching later is an
   environment-variable change rather than a code change.

   ENV (Vercel → Project → Settings → Environment Variables):
     ANTHROPIC_API_KEY  use Claude. Takes precedence if both are set.
     OPENAI_API_KEY     use OpenAI.
     CHAT_MODEL         optional. Overrides the per-provider default below.
   With neither key set the endpoint answers 501 and the widget never mounts,
   so an unconfigured deploy shows no broken chat button.

   GET /api/chat returns a status object — provider and model, never the key —
   so a deployment can be verified in one click.

   WHAT IT IS ALLOWED TO SAY: _knowledge.json, generated at build time from
   src/data/. That file is the entire world as far as this assistant is
   concerned. It has no pricing, no turnaround times, no availability and no
   client list, because the site has none of those — and the system prompt
   below tells the model to say so rather than fill the gap. A studio site
   whose assistant invents a price is worse than a studio site with no
   assistant.
   ========================================================================== */

import knowledge from "./_knowledge.json" with { type: "json" };

const MODEL_DEFAULT = {
  anthropic: "claude-opus-5",
  openai: "gpt-4o-mini",
};

/** Hard caps. A visitor asking about a website does not need more room. */
const MAX_MESSAGE = 1200;
const MAX_TURNS = 12;
const MAX_BODY = 24000;
const MAX_OUTPUT = 700;

/* Best-effort rate limit, same caveat as api/brief.js: serverless instances
   are recycled, so this is a speed bump for a naive flood rather than a
   guarantee. It matters more here than on the brief form — an unauthenticated
   model endpoint on a public site is someone else's bill if it is left
   open. */
const HITS = new Map();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_PER_WINDOW = 20;

function rateLimited(ip) {
  const now = Date.now();
  const hits = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  HITS.set(ip, hits);
  if (HITS.size > 5000) HITS.clear(); // never let the map be the leak
  return hits.length > MAX_PER_WINDOW;
}

function providerOf() {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

const SYSTEM = `You are the assistant on ${knowledge.studio.name}, the website of ${knowledge.studio.maker}, who designs and builds websites for independent businesses.

Your job is to help a visitor work out whether this studio can build what they need, and to point them at the enquiry form when it can.

THE ONLY FACTS YOU HAVE are in the JSON below. It is generated from the site's own content.

${JSON.stringify(knowledge, null, 1)}

RULES, IN ORDER OF IMPORTANCE:

1. Never invent a fact about this studio. You do not know prices, day rates, quotes, turnaround times, deadlines, current availability, past clients, testimonials, or how many projects have shipped — none of that is in your JSON because the site does not claim it. If asked, say plainly that you do not have that and it is worth asking directly through the brief form at /build/#brief. Do not estimate. Do not say "typically" and then guess a number.
2. Never promise anything on ${knowledge.studio.maker}'s behalf — not a timeline, not a price, not that a job will be accepted.
3. If a question is outside this site, say so and steer back. You are not a general-purpose assistant, a search engine, or a coding helper.
4. Answer from the JSON in plain words. Short — two or three sentences is usually right, and never more than about 90 words. No markdown headings, no bullet lists unless the visitor asks for a list, no emoji.
5. When someone describes a business, say which of the client types it matches and what a site like that usually contains, using typicalSections. That is a description of shape, not a quote.
6. Point at the brief form (/build/#brief) when someone sounds ready to start. Do not push it into every reply.
7. If you are unsure, say you are unsure. "I don't know, ask Yash" is a good answer here and a bad one to fake your way past.
8. Write in British English, matching the site.`;

/* ---- providers ------------------------------------------------------------
   Both stream. The endpoint forwards plain text deltas as Server-Sent Events
   so the client needs no provider-specific parsing and a swap changes nothing
   in the browser. */

async function callAnthropic(messages, model) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT,
      system: SYSTEM,
      messages,
      stream: true,
    }),
  });
  return { res: r, kind: "anthropic" };
}

async function callOpenAI(messages, model) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT,
      messages: [{ role: "system", content: SYSTEM }, ...messages],
      stream: true,
    }),
  });
  return { res: r, kind: "openai" };
}

/** Pull the text out of one provider SSE payload. Shapes differ; this is the
    only place that knows about either. */
function deltaOf(kind, obj) {
  if (kind === "anthropic") {
    if (obj.type === "content_block_delta" && obj.delta?.type === "text_delta") return obj.delta.text;
    return "";
  }
  return obj.choices?.[0]?.delta?.content || "";
}

function clean(v, max) {
  /* Strip control characters, including the CR/LF that would let a crafted
     message forge extra SSE frames on the way back out. */
  return String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export default async function handler(req, res) {
  const provider = providerOf();

  if (req.method === "GET") {
    return res.status(provider ? 200 : 501).json({
      ok: Boolean(provider),
      provider: provider ?? null,
      model: provider ? process.env.CHAT_MODEL || MODEL_DEFAULT[provider] : null,
      knowledge: {
        clientTypes: knowledge.clientTypes.length,
        serviceLines: knowledge.serviceLines.length,
        pipeline: knowledge.pipeline.length,
      },
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  /* Same-origin only. This endpoint spends money; it is not a public API. */
  const host = req.headers.host || "";
  const origin = req.headers.origin || req.headers.referer || "";
  if (origin && host) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = "";
    }
    if (originHost !== host) {
      return res.status(403).json({ ok: false, error: "bad_origin" });
    }
  }

  if (!provider) {
    return res.status(501).json({ ok: false, error: "not_configured" });
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: "rate_limited" });
  }

  let body = req.body;
  if (typeof body === "string") {
    if (body.length > MAX_BODY) return res.status(413).json({ ok: false, error: "too_large" });
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: "bad_json" });
    }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ ok: false, error: "bad_body" });
  }

  /* Only the two roles, only the last few turns, each one capped. Anything
     else the client sends is dropped rather than trusted. */
  const turns = Array.isArray(body.messages) ? body.messages : [];
  const messages = turns
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: clean(m.content, MAX_MESSAGE) }))
    .filter((m) => m.content);

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ ok: false, error: "no_message" });
  }

  const model = process.env.CHAT_MODEL || MODEL_DEFAULT[provider];

  let upstream;
  try {
    upstream =
      provider === "anthropic"
        ? await callAnthropic(messages, model)
        : await callOpenAI(messages, model);
  } catch {
    return res.status(502).json({ ok: false, error: "upstream_unreachable" });
  }

  if (!upstream.res.ok || !upstream.res.body) {
    /* Never forward the provider's error body — it can carry account detail.
       The status is enough for the client to show something useful. */
    return res.status(502).json({ ok: false, error: "upstream_error", status: upstream.res.status });
  }

  res.setHeader("content-type", "text/event-stream; charset=utf-8");
  res.setHeader("cache-control", "no-cache, no-transform");
  res.setHeader("connection", "keep-alive");

  const reader = upstream.res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      /* SSE frames are separated by a blank line; a chunk can split one, so
         keep the tail in the buffer until its terminator arrives. */
      const frames = buf.split("\n\n");
      buf = frames.pop() ?? "";
      for (const frame of frames) {
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let obj;
          try {
            obj = JSON.parse(payload);
          } catch {
            continue;
          }
          const text = deltaOf(upstream.kind, obj);
          if (text) res.write(`data: ${JSON.stringify({ t: text })}\n\n`);
        }
      }
    }
    res.write("data: [DONE]\n\n");
  } catch {
    res.write(`data: ${JSON.stringify({ e: "stream_failed" })}\n\n`);
  }
  res.end();
}
