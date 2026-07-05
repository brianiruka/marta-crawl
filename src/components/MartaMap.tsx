"use client";

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

// A station's marker is one ring per line it serves -- for interchanges
// that's several rings spread around the crossing, each rendered (and
// independently hoverable) by StationMarker itself, so it needs its own
// station's full bulge list rather than a single point.
const bulgesByStation: Record<string, StationBulge[]> = {};
for (const b of stationBulges) {
  (bulgesByStation[b.stationId] ??= []).push(b);
}

export function MartaMap({ selectedStationId, onSelectStation }: MartaMapProps) {
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
    <div className="mx-auto aspect-[1959/2048] h-[85vh] max-h-[85vh] w-auto max-w-full">
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
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
