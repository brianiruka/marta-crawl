// Geometry for the crawl route overlay drawn on MartaMap: where each
// station's numbered badge sits (beside its label, opposite the leader
// line), and a polyline that connects those badges in crawl order while
// routing AROUND every station label so the line never crosses label text.
//
// The badge/label math is duplicated in spirit from StationMarker's
// buildLeader, but deliberately uses the ESTIMATED label width (not the
// runtime-measured one) so that this module -- which runs in MartaMap,
// where measured widths aren't available -- and StationMarker's rendered
// badge land on the exact same point. A few px of width error is
// invisible on a standalone badge; a mismatch between the badge and the
// line's endpoint would not be.
import type { Station } from "@/data/stations";

export type Pt = { x: number; y: number };

// Kept in sync with StationMarker's label constants (same font/size).
const FONT_SIZE = 20;
const CHAR_WIDTH = 0.56; // avg glyph width as a fraction of font size
const BASELINE_TO_CENTER = 0.35; // visual center sits this far above baseline
const LABEL_HALF_H = FONT_SIZE * 0.5; // half the label's obstacle height
const BADGE_VERT_HALF_H = FONT_SIZE * 0.4; // half-height used to offset a top/bottom badge

export const BADGE_R = 10;
const BADGE_GAP = 7; // clearance between the label edge and the badge

// Visibility-graph margins: route nodes sit NODE_MARGIN outside each label
// box; line-of-sight is tested against boxes expanded by the slightly
// smaller VIS_MARGIN, so a node placed at a box corner doesn't read as
// being inside its own box.
const NODE_MARGIN = 13;
const VIS_MARGIN = 10;

type Obb = { cx: number; cy: number; halfW: number; halfH: number; angle: number };

export function estimatedLabelWidth(name: string): number {
  return name.length * FONT_SIZE * CHAR_WIDTH;
}

function rotateVec(v: Pt, angle: number): Pt {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/** Nearest bulge (marker ring) of a station to its label -- the leader
 * line and badge anchor here. Generic so callers keep their own bulge
 * type; only cx/cy are read. */
export function nearestBulge<T extends { cx: number; cy: number }>(
  bulges: readonly T[],
  target: Pt,
): T {
  return bulges.reduce((closest, b) => {
    const d = Math.hypot(b.cx - target.x, b.cy - target.y);
    const cd = Math.hypot(closest.cx - target.x, closest.cy - target.y);
    return d < cd ? b : closest;
  });
}

/** Where the station's numbered crawl badge sits: just past the label edge
 * OPPOSITE the leader line (which points toward the marker at anchorRing),
 * so it reads as "the far end of the label," not on the text. */
export function stationBadgeCenter(station: Station, anchorRing: Pt): Pt {
  const rotation = (station.angle * Math.PI) / 180;
  const rawDir = Math.atan2(station.y - anchorRing.y, station.x - anchorRing.x);
  const restDir = Math.round(rawDir / (Math.PI / 4)) * (Math.PI / 4);
  const localDir = restDir - rotation;
  const horizontal = Math.abs(Math.cos(localDir)) >= Math.abs(Math.sin(localDir));
  const halfW = estimatedLabelWidth(station.name) / 2;

  let local: Pt;
  if (horizontal) {
    // sx = which side of the label the marker is on (+x local or -x local).
    const sx: 1 | -1 = -Math.cos(localDir) >= 0 ? 1 : -1;
    local = { x: -sx * (halfW + BADGE_GAP + BADGE_R), y: -FONT_SIZE * BASELINE_TO_CENTER };
  } else {
    const sy: 1 | -1 = -Math.sin(localDir) >= 0 ? 1 : -1;
    local = { x: 0, y: -sy * (BADGE_VERT_HALF_H + BADGE_GAP + BADGE_R) };
  }
  const offset = rotateVec(local, rotation);
  return { x: station.x + offset.x, y: station.y + offset.y };
}

function stationLabelObb(station: Station): Obb {
  const rotation = (station.angle * Math.PI) / 180;
  // The obstacle box is centered on the label's visual center, which sits
  // above the text baseline (station.y) by BASELINE_TO_CENTER.
  const lift = rotateVec({ x: 0, y: -FONT_SIZE * BASELINE_TO_CENTER }, rotation);
  return {
    cx: station.x + lift.x,
    cy: station.y + lift.y,
    halfW: estimatedLabelWidth(station.name) / 2,
    halfH: LABEL_HALF_H,
    angle: rotation,
  };
}

function toLocal(p: Pt, o: Obb): Pt {
  const dx = p.x - o.cx;
  const dy = p.y - o.cy;
  const c = Math.cos(-o.angle);
  const s = Math.sin(-o.angle);
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}

function pointInObb(p: Pt, o: Obb, margin: number): boolean {
  const l = toLocal(p, o);
  return Math.abs(l.x) <= o.halfW + margin && Math.abs(l.y) <= o.halfH + margin;
}

/** True if segment a→b enters obb (expanded by margin). Liang–Barsky in
 * the box's local frame. */
function segIntersectsObb(a: Pt, b: Pt, o: Obb, margin: number): boolean {
  const la = toLocal(a, o);
  const lb = toLocal(b, o);
  const hw = o.halfW + margin;
  const hh = o.halfH + margin;
  const dx = lb.x - la.x;
  const dy = lb.y - la.y;
  const p = [-dx, dx, -dy, dy];
  const q = [la.x + hw, hw - la.x, la.y + hh, hh - la.y];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-9) {
      if (q[i] < 0) return false; // parallel and outside this slab
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return true;
}

function obbCorners(o: Obb, margin: number): Pt[] {
  const hw = o.halfW + margin;
  const hh = o.halfH + margin;
  const c = Math.cos(o.angle);
  const s = Math.sin(o.angle);
  const locals: Pt[] = [
    { x: hw, y: hh },
    { x: hw, y: -hh },
    { x: -hw, y: hh },
    { x: -hw, y: -hh },
  ];
  return locals.map((l) => ({ x: o.cx + l.x * c - l.y * s, y: o.cy + l.x * s + l.y * c }));
}

function clearSight(a: Pt, b: Pt, obstacles: Obb[]): boolean {
  return obstacles.every((o) => !segIntersectsObb(a, b, o, VIS_MARGIN));
}

/** Shortest badge-to-badge path that avoids the obstacle boxes, via a
 * visibility graph over the boxes' expanded corners (Dijkstra). Returns
 * [a, …waypoints…, b]; falls back to [a, b] when the straight line is
 * already clear or no detour is found. */
function routeSegment(a: Pt, b: Pt, obstacles: Obb[]): Pt[] {
  if (clearSight(a, b, obstacles)) return [a, b];

  const nodes: Pt[] = [a, b];
  for (const o of obstacles) {
    for (const corner of obbCorners(o, NODE_MARGIN)) {
      // Skip corners that fall inside another box -- unusable as waypoints.
      if (!obstacles.some((oo) => pointInObb(corner, oo, NODE_MARGIN - 3))) nodes.push(corner);
    }
  }

  const n = nodes.length;
  const dist = new Array<number>(n).fill(Infinity);
  const prev = new Array<number>(n).fill(-1);
  const done = new Array<boolean>(n).fill(false);
  dist[0] = 0;

  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      if (!done[i] && dist[i] < best) {
        best = dist[i];
        u = i;
      }
    }
    if (u === -1 || u === 1) break; // exhausted, or reached the goal
    done[u] = true;
    for (let v = 0; v < n; v++) {
      if (done[v] || !clearSight(nodes[u], nodes[v], obstacles)) continue;
      const w = dist[u] + Math.hypot(nodes[u].x - nodes[v].x, nodes[u].y - nodes[v].y);
      if (w < dist[v]) {
        dist[v] = w;
        prev[v] = u;
      }
    }
  }

  if (dist[1] === Infinity) return [a, b];
  const path: Pt[] = [];
  for (let at = 1; at !== -1; at = prev[at]) path.push(nodes[at]);
  path.reverse();
  return path;
}

function nearSegment(a: Pt, b: Pt, o: Obb, pad: number): boolean {
  return (
    o.cx >= Math.min(a.x, b.x) - pad &&
    o.cx <= Math.max(a.x, b.x) + pad &&
    o.cy >= Math.min(a.y, b.y) - pad &&
    o.cy <= Math.max(a.y, b.y) + pad
  );
}

/** SVG path `d` connecting the ordered crawl stations' badges, detouring
 * around every OTHER station's label. `anchorOf` gives a station's nearest
 * marker ring (for its badge position). */
export function computeCrawlPath(
  ordered: Station[],
  allStations: Station[],
  anchorOf: (s: Station) => Pt,
): string {
  if (ordered.length < 2) return "";
  const badges = ordered.map((s) => stationBadgeCenter(s, anchorOf(s)));
  const boxes = allStations.map((s) => ({ id: s.id, obb: stationLabelObb(s) }));

  const fmt = (p: Pt) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  let d = `M ${fmt(badges[0])}`;

  for (let i = 0; i < ordered.length - 1; i++) {
    const a = badges[i];
    const b = badges[i + 1];
    const skip = new Set([ordered[i].id, ordered[i + 1].id]);
    const obstacles = boxes
      .filter((bx) => !skip.has(bx.id))
      .map((bx) => bx.obb)
      // Drop boxes that already contain an endpoint (can't be avoided) or
      // that are nowhere near this segment (perf).
      .filter((o) => !pointInObb(a, o, 2) && !pointInObb(b, o, 2))
      .filter((o) => nearSegment(a, b, o, 90));

    const waypoints = routeSegment(a, b, obstacles);
    for (let k = 1; k < waypoints.length; k++) d += ` L ${fmt(waypoints[k])}`;
  }
  return d;
}
