import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Station } from "@/data/stations";
import type { StationBulge } from "@/data/stationBulges";
import { StationHole } from "@/components/StationHole";
import type { Cursor } from "@/components/MartaMap";

type StationMarkerProps = {
  station: Station;
  bulges: StationBulge[];
  selected: boolean;
  onSelect: () => void;
  /** Pointer position in SVG units (null when the cursor is away or on
   * touch), driving the fisheye magnification. */
  cursor: Cursor;
  /** This station's 1-based position in the current crawl, if any --
   * renders a small numbered badge beside the label (see badgeCenter in
   * buildLeader) and pops it in/out when the crawl's membership changes. */
  crawlIndex?: number;
};

// Numbered crawl badge, positioned beside the label rather than at the
// marker (see buildLeader's badgeCenter) -- own radius/gap so it clears the
// label's edge instead of overlapping the text.
const BADGE_R = 10;
const BADGE_GAP = 7;

// Fisheye: stations within FISHEYE_RADIUS of the cursor magnify, peaking at
// +FISHEYE_BOOST right under it, easing to none at the radius. The whole
// marker scales as one rigid unit around its anchor ring, so the leader
// line keeps its exact gap from the label at any magnification.
const FISHEYE_RADIUS = 300;
const FISHEYE_BOOST = 0.6;

function smoothstep(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

const FONT_SIZE = 20;
// Rough average glyph width for this label font, as a fraction of font
// size -- just enough to size the leader line's attach point, not a real
// text measurement.
const CHAR_WIDTH = 0.56;
// A glyph's visual vertical center sits above its SVG baseline (the
// text's own y) by roughly this fraction of the font size.
const BASELINE_TO_CENTER = 0.35;
// Half the label's visual height, for top/bottom edge attachment on
// vertical connectors (the horizontal-connector equivalent of halfW).
const HALF_HEIGHT = FONT_SIZE * 0.4;

// Selected-station glow: a blurred capsule hugging the label like a soft
// border (see the rect inside the label group below).
const GLOW_PAD_X = 12;
const GLOW_HEIGHT = FONT_SIZE * 1.5;

const RING_R = 15; // matches StationHole's OUTER_R
const RING_GAP = 4; // leader line clears the marker ring by this much
const LABEL_GAP = 4; // leader line clears the label's near edge by this much
const HOVER_SCALE = 1.18; // how much the label grows on hover
const HOVER_OUTWARD_SHIFT = 30; // how much farther out the label moves on hover
// Invisible hover target over each ring. Bigger than the ring itself
// (RING_R) for two reasons: so an interchange's adjacent rings' hit
// circles overlap rather than leaving a sliver of uncovered space
// between them (rings sit ~40 units apart center-to-center; without the
// overlap, moving between two rings of the same station passes through a
// gap neither covers, firing a spurious mouseleave/enter); and so the
// target is comfortably bigger than what it looks like on screen -- at
// typical map zoom the visual ring is only a few screen pixels across,
// and a target that small flickers in and out under perfectly normal
// mouse jitter even while the cursor is "still on the point" as far as
// the user can tell. 26 is as big as this can go without two DIFFERENT
// stations' rings starting to overlap each other (the closest pair,
// excluding Five Points which is a known special case, is 56 units
// apart -- half of that is 28).
const HOVER_HIT_R = 26;
// How much the attach point slides along the label's left/right edge on
// hover, as a fraction of how far the label moved vertically -- and in
// the opposite direction, like a tether lagging behind. A label that
// swings upward drags its attach point down (and vice versa) instead of
// the point just tracking the label's vertical center.
const DRAG_FACTOR = 0.4;

const CONNECTOR_WIDTH = 6; // interchange ring-to-ring connector, at rest
const CONNECTOR_HOVER_WIDTH = 10; // ...and on hover

// Per-station hover-swing angle, in degrees, ADDED to each station's own
// rest direction (not an absolute angle) -- every label keeps swinging
// out from wherever it already sits relative to its marker, just tilted
// slightly further around the ring on hover, matching SVG's y-down
// convention (positive = clockwise). Defaults to -5 for every station;
// a station can get a different swing by changing its own entry.
const HOVER_DIRECTION_OVERRIDES: Record<string, number> = {
  "north-springs": -5,
  "sandy-springs": -5,
  dunwoody: 0,
  "medical-center": -5,
  buckhead: -5,
  doraville: -5,
  chamblee: -5,
  "brookhaven-oglethorpe": -5,
  lenox: -5,
  "lindbergh-center": -5,
  "arts-center": -5,
  midtown: -5,
  "north-avenue": -5,
  "civic-center": -5,
  "peachtree-center": -5,
  "five-points": -5,
  garnett: -5,
  "west-end": -5,
  "oakland-city": -5,
  "lakewood-ft-mcpherson": -5,
  "east-point": -5,
  "college-park": -5,
  airport: -5,
  bankhead: -5,
  "hamilton-e-holmes": -5,
  "west-lake": -5,
  ashby: -5,
  "vine-city": -5,
  "sec-district": -5,
  "georgia-state": -5,
  "king-memorial": -5,
  "inman-park-reynoldstown": -5,
  "edgewood-candler-park": -5,
  "east-lake": -5,
  decatur: -5,
  avondale: -5,
  kensington: -5,
  "indian-creek": -5,
};

function handleKeyDown(onSelect: () => void) {
  return (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };
}

function rotateVec(v: { x: number; y: number }, angle: number) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/**
 * The point on a label's box where its leader line attaches: the left or
 * right edge for a horizontal connector, the top or bottom edge for a
 * vertical one -- whichever the marker actually sits along, in the
 * label's own pre-rotation frame (so this still works for rotated
 * labels). Never a corner: `direction` is snapped to an exact cardinal
 * angle by the caller, so it's always unambiguously one or the other.
 * `drag` (see DRAG_FACTOR) slides that point along the chosen edge, away
 * from the hover movement. On the horizontal edge, the box's local y=0 is
 * lifted off the text's SVG baseline up to the glyphs' visual middle
 * first, or the point reads as drifting low regardless of `drag`.
 */
function cardinalAttach(
  direction: number,
  rotation: number,
  halfW: number,
  halfH: number,
  drag: { x: number; y: number },
) {
  const localDir = direction - rotation;
  const horizontal = Math.abs(Math.cos(localDir)) >= Math.abs(Math.sin(localDir));
  if (horizontal) {
    // +1 if the marker is on the local +x side of the label, else -1.
    const sx: 1 | -1 = -Math.cos(localDir) >= 0 ? 1 : -1;
    const local = { x: sx * halfW, y: -FONT_SIZE * BASELINE_TO_CENTER + drag.y };
    const retreatLocal = { x: -sx * LABEL_GAP, y: 0 };
    return {
      point: rotateVec(local, rotation),
      retreat: rotateVec(retreatLocal, rotation),
      horizontal,
      side: sx,
    };
  }
  // +1 if the marker is on the local +y side (below) of the label, else -1.
  const sy: 1 | -1 = -Math.sin(localDir) >= 0 ? 1 : -1;
  const local = { x: drag.x, y: sy * halfH };
  const retreatLocal = { x: 0, y: -sy * LABEL_GAP };
  return {
    point: rotateVec(local, rotation),
    retreat: rotateVec(retreatLocal, rotation),
    horizontal,
    side: sy,
  };
}

/**
 * Builds the leader line's rest/hover path data and the label's hover
 * translation, for one station.
 *
 * The model: a label has a rest position, and a hover destination --
 * HOVER_OUTWARD_SHIFT farther from the marker than its rest distance,
 * along a direction tilted away from its own rest direction by that
 * station's HOVER_DIRECTION_OVERRIDES swing angle (default -5°). No
 * second "how far the attach point moves" parameter is needed: the
 * leader line's marker-side point is always defined as "the ring point
 * facing the label," so it automatically sweeps along the ring to match
 * whatever direction the label currently occupies, rest or hover.
 *
 * The label's own rotation (station.angle) never changes between rest
 * and hover in this model -- only its position and size do -- so the
 * label-side attach point is found the same way in both states: see
 * `cardinalAttach`.
 *
 * The rest direction is snapped to the nearest 45° increment (0, 45, 90,
 * 135, 180, 225, 270, or 315) before anything else is computed from it --
 * both the ring point and the attach point derive from this single
 * snapped value, which is what guarantees the rest-state line comes out
 * perfectly horizontal/vertical or perfectly diagonal instead of off by a
 * few degrees. station.x/y are expected to already sit (almost) exactly
 * along one of those rays from the anchor ring; snapping just removes the
 * residual fractional-degree error that'd otherwise come from the
 * text-baseline correction.
 */
function buildLeader(station: Station, labelWidth: number, anchorRing: { x: number; y: number }) {
  const markerCenter = anchorRing;
  const rotation = (station.angle * Math.PI) / 180;
  const restCenter = { x: station.x, y: station.y };
  const rawRestDir = Math.atan2(restCenter.y - markerCenter.y, restCenter.x - markerCenter.x);
  const restDir = Math.round(rawRestDir / (Math.PI / 4)) * (Math.PI / 4);
  const restDist = Math.hypot(restCenter.x - markerCenter.x, restCenter.y - markerCenter.y);
  const isHorizontal = Math.abs(Math.cos(restDir - rotation)) >= Math.abs(Math.sin(restDir - rotation));

  const swingDeg = HOVER_DIRECTION_OVERRIDES[station.id] ?? -5;
  const hoverDir = restDir + (swingDeg * Math.PI) / 180;
  const hoverDist = restDist + HOVER_OUTWARD_SHIFT;
  const hoverCenter = {
    x: markerCenter.x + hoverDist * Math.cos(hoverDir),
    y: markerCenter.y + hoverDist * Math.sin(hoverDir),
  };

  // The label sits inside a <g> rotated by `rotation` around its own rest
  // point -- so a CSS translate on that <g> moves it along the ROTATED
  // local axes, not the absolute ones. Un-rotating the absolute hover
  // delta gives the local translate that reproduces it once the ancestor
  // rotation is re-applied -- and also tells us how far the label moved
  // in its own frame, which is what drives the attach point's drag (see
  // DRAG_FACTOR): along whichever axis is NOT the edge it's attached to
  // (vertical drag for a horizontal edge, horizontal drag for a vertical
  // one), opposing that movement.
  const deltaAbs = { x: hoverCenter.x - restCenter.x, y: hoverCenter.y - restCenter.y };
  const deltaLocal = rotateVec(deltaAbs, -rotation);
  const hoverDrag = isHorizontal
    ? { x: 0, y: -deltaLocal.y * DRAG_FACTOR }
    : { x: -deltaLocal.x * DRAG_FACTOR, y: 0 };

  const halfW = labelWidth / 2;

  function leaderPath(dir: number, center: { x: number; y: number }, hw: number, hh: number, drag: { x: number; y: number }) {
    const ring = {
      x: markerCenter.x + (RING_R + RING_GAP) * Math.cos(dir),
      y: markerCenter.y + (RING_R + RING_GAP) * Math.sin(dir),
    };
    const { point, retreat } = cardinalAttach(dir, rotation, hw, hh, drag);
    const lineEnd = { x: center.x + point.x + retreat.x, y: center.y + point.y + retreat.y };
    return `M ${ring.x.toFixed(2)} ${ring.y.toFixed(2)} L ${lineEnd.x.toFixed(2)} ${lineEnd.y.toFixed(2)}`;
  }

  const zero = { x: 0, y: 0 };
  const restD = leaderPath(restDir, restCenter, halfW, HALF_HEIGHT, zero);
  const hoverD = leaderPath(hoverDir, hoverCenter, halfW * HOVER_SCALE, HALF_HEIGHT * HOVER_SCALE, hoverDrag);

  // Crawl badge: sits just past the label's edge OPPOSITE the leader
  // line's attach point (cardinalAttach's `side`, flipped) -- same
  // vertical/horizontal centering as the attach point, so it reads as
  // "the other end of the label" rather than landing on the text itself.
  const restAttach = cardinalAttach(restDir, rotation, halfW, HALF_HEIGHT, zero);
  const badgeLocal = restAttach.horizontal
    ? { x: -restAttach.side * (halfW + BADGE_GAP + BADGE_R), y: -FONT_SIZE * BASELINE_TO_CENTER }
    : { x: 0, y: -restAttach.side * (HALF_HEIGHT + BADGE_GAP + BADGE_R) };
  const badgeOffset = rotateVec(badgeLocal, rotation);
  const badgeCenter = { x: restCenter.x + badgeOffset.x, y: restCenter.y + badgeOffset.y };

  return { restD, hoverD, deltaLocal, badgeCenter };
}

// Each station can serve several lines, each with its own physical ring
// (StationHole) at a slightly different position -- there's no single
// "the marker" for an interchange. The leader line and hover-sweep math
// anchor to whichever ring sits closest to the label (anchorRing); every
// ring still gets its own hit-circle so hovering ANY of them (not just
// the one nearest the label) triggers the shared hover state.
function nearestBulge(bulges: StationBulge[], target: { x: number; y: number }) {
  return bulges.reduce((closest, b) => {
    const d = Math.hypot(b.cx - target.x, b.cy - target.y);
    const closestD = Math.hypot(closest.cx - target.x, closest.cy - target.y);
    return d < closestD ? b : closest;
  });
}

/**
 * The set of edges connecting every ring of a multi-line station to every
 * other one, with no redundant connections -- a minimum spanning tree, so
 * a 2-ring interchange gets a single bar between them and a 4-ring one
 * (Five Points) gets the 3 shortest edges that still reach every ring,
 * instead of all 6 possible pairs criss-crossing each other.
 */
function spanningEdges(bulges: StationBulge[]): [StationBulge, StationBulge][] {
  // Four rings in a 2×2 rectangle (Five Points) → draw all four perimeter
  // edges to form a complete square. The MST would only give 3 edges and
  // always misses one side.
  if (bulges.length === 4) {
    const xs = [...new Set(bulges.map((b) => b.cx))].sort((a, b) => a - b);
    const ys = [...new Set(bulges.map((b) => b.cy))].sort((a, b) => a - b);
    if (xs.length === 2 && ys.length === 2) {
      const at = (x: number, y: number) => bulges.find((b) => b.cx === x && b.cy === y)!;
      const [x0, x1] = xs;
      const [y0, y1] = ys;
      return [
        [at(x0, y0), at(x1, y0)],
        [at(x0, y0), at(x0, y1)],
        [at(x1, y0), at(x1, y1)],
        [at(x0, y1), at(x1, y1)],
      ];
    }
  }
  const remaining = bulges.slice(1);
  const connected = [bulges[0]];
  const edges: [StationBulge, StationBulge][] = [];
  while (remaining.length > 0) {
    let best = { from: connected[0], toIndex: 0, dist: Infinity };
    for (const from of connected) {
      remaining.forEach((to, i) => {
        const d = Math.hypot(from.cx - to.cx, from.cy - to.cy);
        if (d < best.dist) best = { from, toIndex: i, dist: d };
      });
    }
    const [to] = remaining.splice(best.toIndex, 1);
    edges.push([best.from, to]);
    connected.push(to);
  }
  return edges;
}

export function StationMarker({
  station,
  bulges,
  selected,
  onSelect,
  cursor,
  crawlIndex,
}: StationMarkerProps) {
  const anchorRing = useMemo(
    () => nearestBulge(bulges, { x: station.x, y: station.y }),
    [bulges, station.x, station.y],
  );

  // The leader line attaches to the label's edge, so the gap between them
  // is only consistent if labelWidth is the label's REAL width. A flat
  // per-char estimate (CHAR_WIDTH) under/overshoots depending on the word's
  // glyphs (wide "Dunwoody"/"Chamblee" vs narrow "Doraville"), leaving the
  // line touching some labels and far from others. So estimate for the SSR
  // first paint, then measure the rendered text and recompute.
  const textRef = useRef<SVGTextElement>(null);
  const estimatedWidth = station.name.length * FONT_SIZE * CHAR_WIDTH;
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    // Re-measure on selection change too: the selected label renders bold,
    // which is a touch wider than the regular weight.
    if (textRef.current) setMeasuredWidth(textRef.current.getComputedTextLength());
  }, [selected]);

  const labelWidth = measuredWidth ?? estimatedWidth;
  // Memoized so per-frame cursor updates (fisheye) don't rebuild the path;
  // the leader is independent of the fisheye scale (the whole marker scales
  // rigidly around the ring).
  const leader = useMemo(
    () => buildLeader(station, labelWidth, { x: anchorRing.cx, y: anchorRing.cy }),
    [station, labelWidth, anchorRing.cx, anchorRing.cy],
  );

  // Fisheye magnification from cursor proximity to this station's ring.
  let fisheye = 1;
  if (cursor) {
    const dist = Math.hypot(cursor.x - anchorRing.cx, cursor.y - anchorRing.cy);
    fisheye = 1 + FISHEYE_BOOST * smoothstep(1 - dist / FISHEYE_RADIUS);
  }
  const cx = anchorRing.cx;
  const cy = anchorRing.cy;

  // The ring(s) glow white for the duration of a hover gesture, full
  // stop -- a click turns the glow off immediately even if the mouse
  // never left, but the NEXT mouseenter (a fresh hover, regardless of
  // whether this station is still `selected` from that earlier click)
  // lights it right back up. That's simpler than it sounds: glowing
  // just tracks "is the mouse currently over this station AND hasn't
  // clicked during this particular hover," reset on every entry.
  const [glowing, setGlowing] = useState(false);

  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={station.name}
      onClick={() => {
        setGlowing(false);
        onSelect();
      }}
      onKeyDown={handleKeyDown(onSelect)}
      onMouseEnter={() => setGlowing(true)}
      onMouseLeave={() => setGlowing(false)}
      className="group station-leader-hover cursor-pointer focus:outline-none"
      style={{
        // Rigid fisheye scale around the anchor ring (explicit
        // translate/scale/translate so the origin is the ring in user
        // units, independent of transform-box). Re-set every frame under
        // the cursor; the short transition smooths it into a trailing
        // follow rather than a snap.
        transform: `translate(${cx}px, ${cy}px) scale(${fisheye.toFixed(3)}) translate(${-cx}px, ${-cy}px)`,
        transition: "transform 140ms ease-out",
      }}
    >
      {/* Hover triggers live on the marker points only, not the label --
          the CSS below uses the general sibling selector (~), which only
          reaches LATER siblings, so these have to come first in the
          markup for the rings/line/label after them to react to
          hovering any of them. */}
      {bulges.map((b) => (
        <circle
          key={`hit-${b.line}`}
          className="station-leader-hit"
          cx={b.cx}
          cy={b.cy}
          r={HOVER_HIT_R}
          fill="transparent"
        />
      ))}
      {bulges.map((b) => (
        <StationHole key={`hole-${b.line}`} line={b.line} cx={b.cx} cy={b.cy} glowing={glowing} />
      ))}
      {/* Connects an interchange's rings into one combined marker --
          rendered after the rings so it paints in front of them, on top
          of their edges. pointer-events: none for the same reason as the
          rings themselves (see StationHole): without it, hovering the
          connector would hit it instead of the invisible hit-circle
          beneath, splitting hover into yet another inconsistent zone. */}
      {bulges.length > 1 &&
        spanningEdges(bulges).map(([a, b], i) => (
          <line
            key={`connector-${i}`}
            x1={a.cx}
            y1={a.cy}
            x2={b.cx}
            y2={b.cy}
            stroke="currentColor"
            strokeWidth={glowing ? CONNECTOR_HOVER_WIDTH : CONNECTOR_WIDTH}
            strokeLinecap="round"
            className={glowing ? "text-white" : "text-gray-600"}
            style={{ pointerEvents: "none", transition: "stroke-width 0.4s ease-out, color 0.4s ease-out" }}
          />
        ))}
      <path
        className="station-leader-line stroke-white"
        fill="none"
        strokeWidth={1.5}
        style={
          {
            "--leader-rest-d": `path("${leader.restD}")`,
            "--leader-hover-d": `path("${leader.hoverD}")`,
          } as CSSProperties
        }
      />
      <g
        className="station-leader-label"
        style={
          {
            transformOrigin: `${station.x}px ${station.y}px`,
            "--leader-rotation": `${station.angle}deg`,
            "--leader-hover-translate": `${leader.deltaLocal.x.toFixed(2)}px, ${leader.deltaLocal.y.toFixed(2)}px`,
          } as CSSProperties
        }
      >
        {/* Selected-station glow: a blurred capsule wrapping the label like
            a soft border, in the station's first line color. Lives inside
            the rotated label group so it tracks the label's angle, and
            stays mounted so its opacity can fade in/out. */}
        <rect
          aria-hidden="true"
          x={station.x - labelWidth / 2 - GLOW_PAD_X}
          y={station.y - FONT_SIZE * BASELINE_TO_CENTER - GLOW_HEIGHT / 2}
          width={labelWidth + 2 * GLOW_PAD_X}
          height={GLOW_HEIGHT}
          rx={GLOW_HEIGHT / 2}
          filter="url(#station-glow-blur)"
          className="transition-opacity duration-500"
          style={{
            fill: `var(--line-${station.lines[0]})`,
            opacity: selected ? 0.45 : 0,
            pointerEvents: "none",
          }}
        />
        <text
          ref={textRef}
          x={station.x}
          y={station.y}
          textAnchor="middle"
          fontSize={FONT_SIZE}
          fontWeight={selected ? 700 : 400}
          className="fill-white station-label-text"
        >
          {station.name}
        </text>
      </g>
      {/* Crawl position badge -- beside the label, opposite its leader
          line (see badgeCenter in buildLeader), not on the marker itself.
          Pops in/out (not just appears) so adding/removing a station from
          the crawl reads as a live event, not a static state. */}
      <AnimatePresence>
        {crawlIndex !== undefined && (
          <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ transformOrigin: `${leader.badgeCenter.x}px ${leader.badgeCenter.y}px` }}
          >
            <circle
              cx={leader.badgeCenter.x}
              cy={leader.badgeCenter.y}
              r={BADGE_R}
              className="fill-violet-400"
            />
            <text
              x={leader.badgeCenter.x}
              y={leader.badgeCenter.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
              fontWeight={600}
              className="fill-background"
            >
              {crawlIndex}
            </text>
          </motion.g>
        )}
      </AnimatePresence>
    </g>
  );
}
