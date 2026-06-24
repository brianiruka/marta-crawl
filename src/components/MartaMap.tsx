"use client";

import { StationMarker } from "@/components/StationMarker";
import { stations, type LineId } from "@/data/stations";
import { stationBulges, type StationBulge } from "@/data/stationBulges";
import linePaths from "@/data/martaLinePaths.json";

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

// A station's marker is one ring per line it serves -- for interchanges
// that's several rings spread around the crossing, each rendered (and
// independently hoverable) by StationMarker itself, so it needs its own
// station's full bulge list rather than a single point.
const bulgesByStation: Record<string, StationBulge[]> = {};
for (const b of stationBulges) {
  (bulgesByStation[b.stationId] ??= []).push(b);
}

export function MartaMap({ selectedStationId, onSelectStation }: MartaMapProps) {
  return (
    <div className="mx-auto aspect-[1959/2048] h-[85vh] max-h-[85vh] w-auto max-w-full">
      <svg viewBox="0 0 1959 2048" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        {renderedLines.map((line) => (
          <g key={line} className={lineFillClass[line]}>
            {(linePaths[line] as string[]).map((d, i) => (
              <path key={i} d={d} fillRule="evenodd" />
            ))}
          </g>
        ))}

        {stations.map((station) => (
          <StationMarker
            key={station.id}
            station={station}
            bulges={bulgesByStation[station.id]}
            selected={station.id === selectedStationId}
            onSelect={() => onSelectStation(station.id)}
          />
        ))}
      </svg>
    </div>
  );
}
