/* =============================================================================
   THE DRIVE — one-point perspective for the district street.

   Imported by BOTH src/components/build/ClientTypes.astro (which bakes the
   first frame at build time) and that component's client script (which drives
   the camera). It must never be reimplemented on one side: if the two ever
   disagree the baked frame and the first runtime update differ by a jump, and
   only at one aspect ratio, which is the worst kind of bug to find.

   The whole engine is four lines of maths. A point at world (X, Y, Z) seen by
   a camera at (panX, EYE, cz) looking down +Z projects to

       s  = F / (Z - cz)          scale at that depth
       x  = s * (X - panX)
       y  = -s * (Y - EYE)

   panX is subtracted BEFORE the scale, so it is literally the camera's world
   X. There is no lateral compression term: an earlier draft had one, and it
   made the projection non-uniform, which in turn made every constant-Z group
   need scale(a, b) instead of scale(s) — turning circles into ellipses and
   costing the single-transform-write property the whole design rests on.
   Portrait framing is handled by varying F instead. See solveF.
   ========================================================================== */

export const EYE = 1.65;
/** Nothing closer than this is drawn; at Z - cz = 0 the projection explodes. */
export const NEAR = 1.4;
/** viewBox height is fixed; width follows the frame aspect, so
    preserveAspectRatio never engages and nothing is ever letterboxed. */
export const VBH = 580;
export const VB_TOP = -330;

export const sAt = (z: number, cz: number, F: number) => F / (z - cz);
export const sx = (s: number, X: number, panX: number) => s * (X - panX);
export const sy = (s: number, Y: number) => -s * (Y - EYE);
export const vbwOf = (w: number, h: number) => Math.round((VBH * w) / Math.max(1, h));

/* Focal length, derived — do not hand-tune without redoing both bounds.

   Buildings are NOT required to fit vertically any more. A street where every
   roofline is inside the frame is a model village; the references all run
   their towers off the top, and that crop is most of what makes them read as
   tall. What must stay on frame is the part carrying the meaning — shopfront,
   sign band, and a floor above:
     (7.6 - EYE) * s <= 0.82 * 330   ->  s <= 45.5   ->  F <= 546 at d = 12
   and the identity band — the bracket sign, which hangs out over the road
   between X = 1.3 and the kerb — must be laterally on frame:
     3.5 * s <= 0.96 * (vbw / 2)     ->  F <= 1.645 * vbw

   The vertical cap binds on anything wider than about 330 viewBox units; the
   lateral cap binds only on very narrow portrait frames. */
export const solveF = (vbw: number) => Math.min(546, 1.645 * vbw);

/* ---- the street ---------------------------------------------------------
   Right-handed metres. X lateral (right +), Y up (ground Y = 0), Z into the
   distance. Buildings stand on both kerbs; the camera drives down the middle. */

export const ROAD_HALF = 2.9;
export const KERB = 3.5;
/* How far a building reaches back from the kerb — the width of its END face.
   Kept narrow on purpose: a block 12 across and 8 tall reads as a cuboid with
   a picture on it. Narrow and tall reads as a building on a street, and it
   puts the long shopfronted side where you actually look. */
export const NAMED_W = 8;
export const FILLER_W = 6;

export type Side = -1 | 1;
export type Slot = { key: string; side: Side; zf: number; zb: number; h: number };

/* Pairs are staggered by 4 units so a pair reads as a street rather than a
   gate. Heights are compositional and claim nothing about the businesses. */
export const SLOTS: Slot[] = [
  { key: "01", side: -1, zf: 26, zb: 42, h: 11.2 },
  { key: "02", side: 1, zf: 30, zb: 46, h: 9.4 },
  { key: "03", side: -1, zf: 52, zb: 68, h: 14.5 },
  { key: "04", side: 1, zf: 56, zb: 72, h: 10.2 },
  { key: "05", side: -1, zf: 78, zb: 94, h: 12.0 },
  { key: "06", side: 1, zf: 82, zb: 98, h: 16.0 },
];

/* Anonymous infill so six buildings on a road read as a district. They carry
   no name, no key, no copy and no data — they invent nothing.

   They all stand BEYOND the last pair, and that is a hard constraint, not a
   composition choice. The camera dwells 12 units short of the pair it is
   showing, so anything standing in that gap is nearer than the thing you came
   to look at and fills the frame with a blank wall. Put one between the pairs
   — which is where they look like they belong on a plan — and every dwell is
   blocked by a building with no name on it. Out here they do the opposite
   job: they carry the street past the last shopfront instead of stopping it
   dead at the vanishing point. */
export const FILLERS: { side: Side; zf: number; zb: number; h: number }[] = [
  { side: -1, zf: 102, zb: 114, h: 9.5 },
  { side: 1, zf: 106, zb: 118, h: 13.0 },
  { side: -1, zf: 122, zb: 134, h: 11.0 },
  { side: 1, zf: 126, zb: 138, h: 8.0 },
];

/** Draw order is a build-time constant: same-side Z extents are disjoint, and
    while driving panX is 0 so left and right never overlap on screen. Far
    first. */
export const DRAW_ORDER = [...SLOTS, ...FILLERS].sort((a, b) => b.zb - a.zb);

/* ---- the camera curve ---------------------------------------------------
   Six legs: approach a pair, dwell on it, approach the next. Depth to the
   target facade is interpolated GEOMETRICALLY on approach legs, because
   perceived speed goes as d'/d — interpolating cz linearly makes the street
   appear to accelerate into your face at the end of every leg.

   The drive starts already in the street, 21 units off the first pair rather
   than 34. Further back the buildings render at about a third of the size
   they reach at a stop, and the opening frame is mostly bare paper — the
   first thing a visitor sees should be the street, not the space above it. */

type Leg = { p0: number; p1: number; z0: number; z1: number; zt?: number };

const LEGS: Leg[] = [
  /* The first leg is SHORT in scroll as well as in distance. Starting in the
     street leaves only 4 units to cover before the first pair, and spending a
     quarter of the drive on them made the opening feel stuck. The travel
     belongs on legs two and three, which cover 24 units each. */
  { p0: 0.0, p1: 0.12, z0: 9, z1: 13, zt: 26 },
  { p0: 0.12, p1: 0.3, z0: 13, z1: 15 },
  { p0: 0.3, p1: 0.56, z0: 15, z1: 39, zt: 52 },
  { p0: 0.56, p1: 0.72, z0: 39, z1: 41 },
  { p0: 0.72, p1: 0.92, z0: 41, z1: 65, zt: 78 },
  { p0: 0.92, p1: 1.0, z0: 65, z1: 68 },
];

export const czOf = (p: number): number => {
  const q = p < 0 ? 0 : p > 1 ? 1 : p;
  for (let i = 0; i < LEGS.length; i++) {
    const L = LEGS[i];
    if (q > L.p1 && i < LEGS.length - 1) continue;
    const t0 = (q - L.p0) / (L.p1 - L.p0);
    const t = t0 < 0 ? 0 : t0 > 1 ? 1 : t0;
    if (L.zt === undefined) return L.z0 + (L.z1 - L.z0) * t;
    const d0 = L.zt - L.z0;
    const d1 = L.zt - L.z1;
    return L.zt - d0 * Math.pow(d1 / d0, t);
  }
  return LEGS[LEGS.length - 1].z1;
};

/** The three dwell midpoints, for tests and for the no-scroll pager. */
export const DWELLS = [0.21, 0.64, 0.96];

/* ---- projection of the two element forms -------------------------------- */

const f1 = (n: number) => (Math.abs(n) < 1e5 ? n.toFixed(1) : n > 0 ? "99999" : "-99999");

/**
 * A quad with exactly TWO distinct Z values — the only depth-spanning form
 * allowed. Geometry that spans depth converges on the vanishing point and so
 * is not affine; it cannot be a transform and must have its points rewritten.
 * Restricting it to two Z values is what makes the near-plane clip correct:
 * with more, the clipped cross-section is no longer a simple interpolation.
 *
 * Corners are P1,P2 on the near edge (zA) and Q1,Q2 on the far edge (zB),
 * emitted P1 P2 Q2 Q1 so the ring never self-intersects.
 * Returns null when the whole quad is behind the near plane.
 */
export const quadPoints = (
  p1x: number, p1y: number, p2x: number, p2y: number, zA: number,
  q1x: number, q1y: number, q2x: number, q2y: number, zB: number,
  cz: number, panX: number, F: number,
): string | null => {
  if (zB - cz < NEAR) return null;
  let ax = p1x, ay = p1y, bx = p2x, by = p2y, zn = zA;
  if (zA - cz < NEAR) {
    const span = zB - zA;
    const t = span > 1e-6 ? (cz + NEAR - zA) / span : 0;
    ax = p1x + (q1x - p1x) * t;
    ay = p1y + (q1y - p1y) * t;
    bx = p2x + (q2x - p2x) * t;
    by = p2y + (q2y - p2y) * t;
    zn = cz + NEAR;
  }
  const s1 = sAt(zn, cz, F);
  const s2 = sAt(zB, cz, F);
  return (
    `${f1(sx(s1, ax, panX))},${f1(sy(s1, ay))} ` +
    `${f1(sx(s1, bx, panX))},${f1(sy(s1, by))} ` +
    `${f1(sx(s2, q2x, panX))},${f1(sy(s2, q2y))} ` +
    `${f1(sx(s2, q1x, panX))},${f1(sy(s2, q1y))}`
  );
};

/** A rib: a quad whose cross-section is constant along Z. */
export const ribPoints = (
  ax: number, ay: number, bx: number, by: number, zA: number, zB: number,
  cz: number, panX: number, F: number,
) => quadPoints(ax, ay, bx, by, zA, ax, ay, bx, by, zB, cz, panX, F);

/**
 * Anything sharing one Z collapses to a UNIFORM scale about the vanishing
 * point, so it is authored once in local coordinates and placed with a single
 * transform write. Uniform — never scale(a, b).
 */
export const cardTransform = (
  X: number, Y: number, z: number, cz: number, panX: number, F: number,
): string | null => {
  /* Same near-plane rule as the quads, and for the same reason: at z == cz
     the scale is infinite. The camera parks on cz = 68 at the end of the
     drive, which is exactly one filler's facade, so this is reachable in
     normal use rather than only in theory. */
  if (z - cz < NEAR) return null;
  const s = sAt(z, cz, F);
  return `translate(${f1(sx(s, X, panX))}px,${f1(sy(s, Y))}px) scale(${s.toFixed(4)})`;
};

/* ---- ribs of one building ------------------------------------------------
   The flank is the wall that runs down the street; it is what actually sells
   the travel, because it is the only surface whose shape changes as you pass.
   The chamfer is a canted corner that turns the shopfront toward the road, so
   a business addresses passing traffic instead of presenting a gable end. */

export type Ribs = { flank: number[]; base: number[] };

/**
 * The only two surfaces a driver can see.
 *
 * The flank is the wall running down the street; it is what actually sells
 * the travel, because it is the only surface whose shape changes as you pass.
 * The base is the pavement strip, visible because the eye is above it.
 *
 * There is deliberately no roof and no string course. Both sit well above
 * EYE, so from the road you are underneath them and they are not in view at
 * all — drawn anyway they project as big pale wedges sweeping across the
 * facade, which is what they did in the first build of this.
 */
export const ribsOf = (s: { side: Side; zf: number; zb: number; h: number }, w: number): Ribs => {
  const xi = KERB * s.side;
  const xo = (KERB + w) * s.side;
  return {
    // [ax, ay, bx, by, zA, zB]
    flank: [xi, 0, xi, s.h, s.zf, s.zb],
    base: [xi, 0, xo, 0, s.zf, s.zb],
  };
};

/* ---- the road surface ----------------------------------------------------
   A line running along Z at lateral offset X projects to a ray from the
   vanishing point whose slope is EYE / X. That is geometry, not layout: it
   does NOT depend on the viewBox width. The first version drew the kerbs to
   the frame corners instead, which put the road edge at a slope of 0.28 where
   the buildings actually stand on 0.42 — the road and the buildings it served
   were two unrelated drawings sharing a frame. */
export const rayEnd = (X: number): [number, number] => {
  const k = (VB_TOP + VBH) / EYE;
  return [X * k, VB_TOP + VBH];
};

/** Centre-line markings. A dash lies flat on the road and runs ALONG Z, so it
    is a rib — the cross-section is the width of the paint. */
export const DASH_LEN = 1.7;
export const DASH_PITCH = 4.2;
export const DASH_N = 22;
export const DASH_HALF = 0.15;

/** Paint holds its brightness further down the road than masonry does, so it
    gets its own, gentler falloff — under the building haze the centre line
    petered out a third of the way to the vanishing point. */
export const paintHaze = (d: number) => {
  if (d <= 0) return 0;
  const o = (140 - d) / 46;
  return o < 0 ? 0 : o > 1 ? 1 : o;
};

/** Z of dash i, recycled ahead of the camera so a handful of marks paint an
    endless road. */
export const dashZ = (i: number, cz: number) =>
  Math.floor((cz + NEAR) / DASH_PITCH) * DASH_PITCH + i * DASH_PITCH;

export type Cap = "flat" | "cornice" | "stepped";
export type Win = "grid" | "ribbon" | "tall" | "curtain";
export type Style = { win: Win; floors: number; cols: number; bays: number; awning: boolean; cap: Cap };

/* Variation is the point: six identical grids read as one building repeated. */
export const STYLES: Record<string, Style> = {
  "01": { win: "ribbon", floors: 2, cols: 4, bays: 4, awning: false, cap: "cornice" },
  "02": { win: "grid", floors: 2, cols: 5, bays: 3, awning: true, cap: "cornice" },
  "03": { win: "tall", floors: 3, cols: 5, bays: 3, awning: false, cap: "flat" },
  "04": { win: "grid", floors: 2, cols: 4, bays: 4, awning: true, cap: "stepped" },
  "05": { win: "grid", floors: 2, cols: 3, bays: 2, awning: true, cap: "cornice" },
  "06": { win: "curtain", floors: 3, cols: 6, bays: 4, awning: false, cap: "flat" },
};
export const FILLER_STYLES: Style[] = [
  { win: "grid", floors: 2, cols: 3, bays: 0, awning: false, cap: "cornice" },
  { win: "tall", floors: 2, cols: 4, bays: 0, awning: false, cap: "flat" },
  { win: "ribbon", floors: 2, cols: 3, bays: 0, awning: false, cap: "flat" },
  { win: "grid", floors: 3, cols: 3, bays: 0, awning: false, cap: "stepped" },
];

export const SHOP_H = 2.9;
export const SIGN_H = 0.72;

/** One mark on the road-facing wall: a band of wall between two heights,
    across a stretch of depth. `lod` is the depth tier it survives to. */
export type FRib = { c: string; y0: number; y1: number; z0: number; z1: number; lod: 0 | 1 | 2 };

export const flankRibs = (b: { zf: number; zb: number; h: number }, st: Style, named: boolean): FRib[] => {
  const out: FRib[] = [];
  const m = 0.35;
  const z0 = b.zf + m;
  const z1 = b.zb - m;
  const span = z1 - z0;
  const put = (c: string, y0: number, y1: number, za: number, zb2: number, lod: 0 | 1 | 2) =>
    out.push({ c, y0, y1, z0: za, z1: zb2, lod });

  if (named) {
    /* the glazed ground floor, its bays, and the door */
    put("st-glass", 0.18, SHOP_H, z0, z1, 0);
    const bw = span / st.bays;
    for (let k = 0; k < st.bays; k++) {
      const a = z0 + k * bw + 0.16;
      put("st-pane", 0.42, SHOP_H - 0.22, a, a + bw - 0.32, 1);
    }
    put("st-door", 0, 2.35, b.zf + 0.55, b.zf + 1.8, 1);
    put("st-doorlite", 0.7, 2.1, b.zf + 0.72, b.zf + 1.63, 2);
    put("st-signband", SHOP_H, SHOP_H + SIGN_H, b.zf, b.zb, 0);
    if (st.awning) put("st-awning", SHOP_H - 0.34, SHOP_H - 0.06, z0 + 0.4, z1 - 0.4, 1);
    put("st-course", SHOP_H + SIGN_H, SHOP_H + SIGN_H + 0.16, b.zf, b.zb, 0);
  } else {
    put("st-course", 0, 0.5, b.zf, b.zb, 0);
  }

  /* the floors above */
  const top = b.h - (st.cap === "flat" ? 0.22 : 0.5);
  const base = named ? SHOP_H + SIGN_H + 0.45 : 0.8;
  const zone = top - base - 0.25;
  if (zone > 0.6) {
    if (st.win === "curtain") {
      /* full-height glazing split by mullions — one plane, then the piers */
      put("st-glass", base, top - 0.15, z0, z1, 0);
      const cw = span / st.cols;
      for (let k = 1; k < st.cols; k++) put("st-pier", base, top - 0.15, z0 + k * cw - 0.07, z0 + k * cw + 0.07, 1);
      for (let f = 1; f < st.floors; f++) {
        const y = base + (zone * f) / st.floors;
        put("st-pier", y - 0.07, y + 0.07, z0, z1, 1);
      }
    } else {
      const fh = zone / st.floors;
      for (let f = 0; f < st.floors; f++) {
        const y = base + f * fh;
        if (st.win === "ribbon") {
          put("st-glass", y + fh * 0.16, y + fh * 0.74, z0, z1, 1);
          const cw = span / st.cols;
          for (let k = 1; k < st.cols; k++) put("st-pier", y + fh * 0.16, y + fh * 0.74, z0 + k * cw - 0.06, z0 + k * cw + 0.06, 2);
        } else {
          const cw = span / st.cols;
          const ww = st.win === "tall" ? cw * 0.42 : cw * 0.58;
          const wy0 = y + fh * (st.win === "tall" ? 0.1 : 0.2);
          const wy1 = y + fh * (st.win === "tall" ? 0.86 : 0.74);
          for (let k = 0; k < st.cols; k++) {
            const a = z0 + k * cw + (cw - ww) / 2;
            put("st-glass", wy0, wy1, a, a + ww, 2);
          }
        }
        if (f > 0) put("st-course", y - 0.09, y + 0.09, b.zf, b.zb, 2);
      }
    }
  }

  /* what tops it off */
  if (st.cap === "cornice") {
    put("st-course", b.h - 0.42, b.h - 0.18, b.zf - 0.1, b.zb + 0.1, 0);
  } else if (st.cap === "stepped") {
    put("st-course", b.h - 0.5, b.h - 0.24, b.zf, b.zb, 0);
    put("st-course", b.h - 0.24, b.h, b.zf + span * 0.28, b.zb - span * 0.28, 1);
  } else {
    put("st-course", b.h - 0.2, b.h, b.zf, b.zb, 1);
  }
  return out;
};

/* ---- depth cues ---------------------------------------------------------- */

/** Atmosphere: far buildings sit back toward the paper rather than popping in
    at full strength. Also does the appearing: nothing is visible past 86. */
export const hazeOf = (d: number) => {
  if (d <= 0) return 0;
  const o = (86 - d) / 34;
  return o < 0 ? 0 : o > 1 ? 1 : o;
};

/** Projected CSS width of a building front, for pointer gating. A target
    smaller than 44px is not a touch target and must not swallow taps. */
export const widthOf = (d: number, F: number, frameW: number, vbw: number) =>
  d < NEAR ? 0 : ((F / d) * NAMED_W * frameW) / vbw;

export const MIN_TAP = 44;

/** easeInOutCubic — the same curve the hero already uses. */
export const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
