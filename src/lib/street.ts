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

   At the dwell depth of 13 the tallest building (9.6) must clear the top edge:
     (9.6 - EYE) * s <= 0.82 * 330   ->  s <= 34.0  ->  F <= 442
   and the identity band X in [3.9, 7.2] must stay on-frame:
     7.2 * s <= 0.96 * (vbw / 2)     ->  F <= 0.867 * vbw

   The vertical cap binds above vbw ~= 510; the horizontal cap binds on
   portrait phones, which is exactly where a fixed F would push the shopfront
   off the side of the frame. */
export const solveF = (vbw: number) => Math.min(442, 0.867 * vbw);

/* ---- the street ---------------------------------------------------------
   Right-handed metres. X lateral (right +), Y up (ground Y = 0), Z into the
   distance. Buildings stand on both kerbs; the camera drives down the middle. */

export const ROAD_HALF = 3.2;
export const KERB = 3.9;
export const NAMED_W = 12;
export const FILLER_W = 8;

export type Side = -1 | 1;
export type Slot = { key: string; side: Side; zf: number; zb: number; h: number };

/* Pairs are staggered by 4 units so a pair reads as a street rather than a
   gate. Heights are compositional and claim nothing about the businesses. */
export const SLOTS: Slot[] = [
  { key: "01", side: -1, zf: 26, zb: 40, h: 8.4 },
  { key: "02", side: 1, zf: 30, zb: 44, h: 7.2 },
  { key: "03", side: -1, zf: 52, zb: 66, h: 9.0 },
  { key: "04", side: 1, zf: 56, zb: 70, h: 7.6 },
  { key: "05", side: -1, zf: 78, zb: 92, h: 8.8 },
  { key: "06", side: 1, zf: 82, zb: 96, h: 9.6 },
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
  { side: -1, zf: 100, zb: 108, h: 6.4 },
  { side: 1, zf: 104, zb: 112, h: 5.6 },
  { side: -1, zf: 116, zb: 124, h: 6.8 },
  { side: 1, zf: 120, zb: 128, h: 5.2 },
];

/** Draw order is a build-time constant: same-side Z extents are disjoint, and
    while driving panX is 0 so left and right never overlap on screen. Far
    first. */
export const DRAW_ORDER = [...SLOTS, ...FILLERS].sort((a, b) => b.zb - a.zb);

/* ---- the camera curve ---------------------------------------------------
   Six legs: approach a pair, dwell on it, approach the next. Depth to the
   target facade is interpolated GEOMETRICALLY on approach legs, because
   perceived speed goes as d'/d — interpolating cz linearly makes the street
   appear to accelerate into your face at the end of every leg. */

type Leg = { p0: number; p1: number; z0: number; z1: number; zt?: number };

const LEGS: Leg[] = [
  { p0: 0.0, p1: 0.24, z0: -8, z1: 13, zt: 26 },
  { p0: 0.24, p1: 0.38, z0: 13, z1: 15 },
  { p0: 0.38, p1: 0.59, z0: 15, z1: 39, zt: 52 },
  { p0: 0.59, p1: 0.73, z0: 39, z1: 41 },
  { p0: 0.73, p1: 0.9, z0: 41, z1: 65, zt: 78 },
  { p0: 0.9, p1: 1.0, z0: 65, z1: 68 },
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
export const DWELLS = [0.31, 0.66, 0.95];

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
