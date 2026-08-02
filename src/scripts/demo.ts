/* =============================================================================
   DEMO RUNNER — the machinery behind every FIG. demonstration plate.

   Each demo is an async `run(ctx, root)` script that steps the plate through
   named phases (root.dataset.phase drives all CSS), types text, and updates
   counters. This module handles everything else:

   - starts a demo only while it is on screen (IntersectionObserver)
   - stops + unwinds it the moment it scrolls away or the tab hides
   - loops it with a pause between runs
   - wires the REPLAY button
   - never runs under prefers-reduced-motion — the markup ships with
     data-phase="static", a composed end-state, and stays there
   ========================================================================== */

export type DemoCtx = {
  /** Cancellable sleep. Throws (unwinds the run) when the demo is stopped. */
  sleep: (ms: number) => Promise<void>;
  /** Type text into an element, character by character. */
  type: (el: Element | null, text: string, cps?: number) => Promise<void>;
  /** Set an element's text immediately. */
  set: (el: Element | null, text: string) => void;
  /** Advance the plate to a named phase (drives CSS). */
  phase: (name: string) => void;
};

class DemoCancelled extends Error {
  constructor() {
    super("demo cancelled");
  }
}

export function attachDemo(
  root: HTMLElement,
  run: (ctx: DemoCtx, root: HTMLElement) => Promise<void>,
  opts: { loopDelay?: number } = {},
): void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const replay = root.querySelector<HTMLElement>("[data-replay]");
  if (reduce.matches) {
    // static plate; the replay control is meaningless without motion
    replay?.setAttribute("hidden", "");
    return;
  }

  let cancelled = false;
  let running = false;
  let inView = false;
  const pending = new Set<() => void>();

  const sleep = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      if (cancelled) return reject(new DemoCancelled());
      const t = window.setTimeout(() => {
        pending.delete(cancel);
        resolve();
      }, ms);
      const cancel = () => {
        window.clearTimeout(t);
        pending.delete(cancel);
        reject(new DemoCancelled());
      };
      pending.add(cancel);
    });

  const ctx: DemoCtx = {
    sleep,
    async type(el, text, cps = 34) {
      if (!el) return;
      el.textContent = "";
      for (const ch of text) {
        el.textContent += ch;
        await sleep(1000 / cps);
      }
    },
    set(el, text) {
      if (el) el.textContent = text;
    },
    phase(name) {
      root.dataset.phase = name;
    },
  };

  async function loop() {
    if (running) return;
    running = true;
    cancelled = false;
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        await run(ctx, root);
        await sleep(opts.loopDelay ?? 2600);
      }
    } catch (e) {
      if (!(e instanceof DemoCancelled)) throw e;
    } finally {
      running = false;
    }
  }

  function stop() {
    cancelled = true;
    // settle every in-flight sleep so the run unwinds immediately
    [...pending].forEach((cancel) => cancel());
  }

  function startSoon() {
    // let the previous run finish unwinding before restarting
    window.setTimeout(() => {
      if (inView && !document.hidden) loop();
    }, 40);
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        inView = e.isIntersecting;
        if (inView && !document.hidden) startSoon();
        else stop();
      });
    },
    { threshold: 0.35 },
  );
  io.observe(root);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (inView) startSoon();
  });

  replay?.addEventListener("click", () => {
    stop();
    startSoon();
  });
}
