"use client";

import { useEffect, useRef, useState } from "react";
import { StationMarker } from "@/components/StationMarker";
import { stations, type LineId } from "@/data/stations";
import { stationBulges, type StationBulge } from "@/data/stationBulges";
import linePaths from "@/data/martaLinePaths.json";
import { cn } from "@/lib/utils";

type MartaMapProps = {
  selectedStationId: string | null;
  onSelectStation: (id: string) => void;
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

// Station labels are drawn at BASE_FONT_SIZE=20 user units; at typical
// rendered map widths that lands well under comfortable reading size (e.g.
// ~8px on a 1440px desktop, ~4px on a phone). Scale labels up so they render
// at roughly LABEL_TARGET_PX on any device, capped so dense clusters don't
// collide. Passed down to StationMarker, which derives ALL label geometry
// (leader-line attach points, hover math) from this same scaled size, so
// the connector always meets the label's actual rendered edge.
const LABEL_BASE = 20;
const LABEL_TARGET_PX = 11;
const LABEL_MAX_SCALE = 2.25;

// A station's marker is one ring per line it serves -- for interchanges
// that's several rings spread around the crossing, each rendered (and
// independently hoverable) by StationMarker itself, so it needs its own
// station's full bulge list rather than a single point.
const bulgesByStation: Record<string, StationBulge[]> = {};
for (const b of stationBulges) {
  (bulgesByStation[b.stationId] ??= []).push(b);
}

export function MartaMap({ selectedStationId, onSelectStation }: MartaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [labelScale, setLabelScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const renderedScale = entry.contentRect.width / VIEW_W;
      if (renderedScale <= 0) return;
      const needed = LABEL_TARGET_PX / (LABEL_BASE * renderedScale);
      setLabelScale(Math.min(LABEL_MAX_SCALE, Math.max(1, needed)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const selected = selectedStationId
    ? stations.find((s) => s.id === selectedStationId)
    : undefined;

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
    <div
      ref={containerRef}
      className="mx-auto aspect-[1959/2048] h-[85vh] max-h-[85vh] w-auto max-w-full"
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        <defs>
          <filter id="station-glow-blur" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <g
          style={{
            transform: cameraTransform,
            transition: "transform 600ms cubic-bezier(0.3, 0.7, 0.2, 1)",
          }}
        >
          {/* Radial glow under the selected station, in its first line's
              color — kept mounted so its opacity can fade in/out. */}
          <circle
            aria-hidden="true"
            cx={selected?.x ?? VIEW_W / 2}
            cy={selected?.y ?? VIEW_H / 2}
            r={22}
            filter="url(#station-glow-blur)"
            className="transition-opacity duration-500"
            style={{
              fill: selected ? `var(--line-${selected.lines[0]})` : "transparent",
              opacity: selected ? 0.35 : 0,
            }}
          />

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
                labelScale={labelScale}
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
