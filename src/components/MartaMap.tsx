"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { StationMarker } from "@/components/StationMarker";
import { stations, type LineId, type Station } from "@/data/stations";
import { stationBulges, type StationBulge } from "@/data/stationBulges";
import { computeCrawlPath, nearestBulge } from "@/lib/crawlRoute";
import linePaths from "@/data/martaLinePaths.json";
import { cn } from "@/lib/utils";

type MartaMapProps = {
  selectedStationId: string | null;
  onSelectStation: (id: string) => void;
  // Ordered stations of the crawl currently being built, if the Explore
  // panel's crawl view is open. Highlighted as a route overlay -- a
  // "planned path" distinct from the line art, not another transit line, so
  // it gets its own color (violet-400, unclaimed elsewhere) rather than
  // reusing sky-400 (already "Up next"'s accent in poiListMeta.ts).
  crawlStations?: Station[];
};

const renderedLines = ["red", "gold", "blue", "green"] as const satisfies LineId[];

const lineFillClass: Record<LineId, string> = {
  red: "fill-line-red",
  gold: "fill-line-gold",
  blue: "fill-line-blue",
  green: "fill-line-green",
  streetcar: "fill-line-streetcar",
};

const VIEW_W = 1959;
const VIEW_H = 2048;

// Camera flight: how far to zoom toward a selected station.
const ZOOM = 1.7;

export type Cursor = { x: number; y: number } | null;

// A station's marker is one ring per line it serves -- for interchanges
// that's several rings spread around the crossing, each rendered (and
// independently hoverable) by StationMarker itself, so it needs its own
// station's full bulge list rather than a single point.
const bulgesByStation: Record<string, StationBulge[]> = {};
for (const b of stationBulges) {
  (bulgesByStation[b.stationId] ??= []).push(b);
}

export function MartaMap({ selectedStationId, onSelectStation, crawlStations }: MartaMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  // Cursor position in SVG user units, driving the fisheye magnification.
  // Null when the pointer is away (or on touch, where mousemove never
  // fires) so every station eases back to its natural size.
  const [cursor, setCursor] = useState<Cursor>(null);
  const pendingCursor = useRef<Cursor>(null);
  const rafId = useRef<number | null>(null);

  const selected = selectedStationId
    ? stations.find((s) => s.id === selectedStationId)
    : undefined;

  // Fisheye is a hover interaction only; suppress it while a station is
  // selected (the camera flight owns the view then). Suppressing at render
  // time means a stale cursor can't leak back in when deselected — the next
  // pointer move refreshes it.
  const fisheyeCursor = selected ? null : cursor;

  // 1-based position of each station in the current crawl, for the badge
  // StationMarker renders beside its own label -- keyed by id so lookups
  // don't care about the array reference identity.
  const crawlIndexByStation = useMemo(() => {
    const map = new Map<string, number>();
    crawlStations?.forEach((s, i) => map.set(s.id, i + 1));
    return map;
  }, [crawlStations]);
  // Re-runs (and replays the reveal) whenever the crawl's station set/order
  // changes. The path connects each station's numbered badge and detours
  // around every label's box so it never crosses label text (see
  // computeCrawlPath).
  const crawlPathKey = crawlStations?.map((s) => s.id).join(",") ?? "";
  const crawlPath = useMemo(() => {
    if (!crawlStations || crawlStations.length < 2) return "";
    const anchorOf = (s: Station): { x: number; y: number } => {
      const nb = nearestBulge(bulgesByStation[s.id], { x: s.x, y: s.y });
      return { x: nb.cx, y: nb.cy };
    };
    return computeCrawlPath(crawlStations, stations, anchorOf);
  }, [crawlStations]);

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    // Coarse pointers (touch) don't get the fisheye — it needs a hovering
    // cursor, and on touch every "move" is a drag mid-gesture.
    if (e.pointerType !== "mouse") return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // Container is aspect-locked to the viewBox (no letterboxing), so screen
    // position maps to SVG units by simple proportion.
    pendingCursor.current = {
      x: ((e.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((e.clientY - rect.top) / rect.height) * VIEW_H,
    };
    // Throttle to one state update per frame.
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        setCursor(pendingCursor.current);
      });
    }
  }

  useEffect(() => {
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // Camera flight: scale about the origin, then translate so the selected
  // station lands at the viewBox center — clamped so the flight never pans
  // past the map's own edges (edge stations like Airport).
  let cameraTransform = "translate(0px, 0px) scale(1)";
  if (selected) {
    const tx = Math.min(0, Math.max(VIEW_W * (1 - ZOOM), VIEW_W / 2 - ZOOM * selected.x));
    const ty = Math.min(0, Math.max(VIEW_H * (1 - ZOOM), VIEW_H / 2 - ZOOM * selected.y));
    cameraTransform = `translate(${tx}px, ${ty}px) scale(${ZOOM})`;
  }

  return (
    <div className="mx-auto aspect-[1959/2048] h-[85vh] max-h-[85vh] w-auto max-w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setCursor(null)}
      >
        <defs>
          <filter id="station-glow-blur" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          {/* Progressive "draw-on" reveal for the crawl route: a fat white
              stroke along the same path, animated from pathLength 0→1, used
              as a mask over the dotted violet line. As the mask draws from
              the first stop to the last, the dots appear one after another
              — "connecting the points" — rather than the whole line just
              fading in. Keyed so it replays when the route changes. */}
          {crawlPath && (
            <mask
              id="crawl-reveal"
              maskUnits="userSpaceOnUse"
              x={0}
              y={0}
              width={VIEW_W}
              height={VIEW_H}
            >
              <motion.path
                key={crawlPathKey}
                d={crawlPath}
                fill="none"
                stroke="white"
                strokeWidth={18}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, ease: "easeInOut" }}
              />
            </mask>
          )}
        </defs>

        <g
          style={{
            transform: cameraTransform,
            transition: "transform 600ms cubic-bezier(0.3, 0.7, 0.2, 1)",
          }}
        >
          {renderedLines.map((line) => (
            <g
              key={line}
              className={cn(
                lineFillClass[line],
                "transition-opacity duration-500",
                selected && !selected.lines.includes(line) && "opacity-20",
              )}
            >
              {(linePaths[line] as string[]).map((d, i) => (
                <path key={i} d={d} fillRule="evenodd" />
              ))}
            </g>
          ))}

          {stations.map((station) => (
            <g
              key={station.id}
              className={cn(
                "transition-opacity duration-500",
                selected && station.id !== selected.id && "opacity-40",
              )}
            >
              <StationMarker
                station={station}
                bulges={bulgesByStation[station.id]}
                selected={station.id === selectedStationId}
                onSelect={() => onSelectStation(station.id)}
                cursor={fisheyeCursor}
                crawlIndex={crawlIndexByStation.get(station.id)}
              />
            </g>
          ))}

          {crawlPath && (
            <path
              d={crawlPath}
              fill="none"
              className="stroke-violet-400 pointer-events-none"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="2 14"
              opacity={0.85}
              mask="url(#crawl-reveal)"
            />
          )}
        </g>
      </svg>
    </div>
  );
}
