"use client";

import { StationMarker } from "@/components/StationMarker";
import { stations, lineLabels, type LineId } from "@/data/stations";
import linePaths from "@/data/martaLinePaths.json";

type MartaMapProps = {
  selectedStationId: string | null;
  onSelectStation: (id: string) => void;
};

const LINE_LABEL_FONT_SIZE = 24;

const renderedLines = ["red", "gold", "blue", "green"] as const satisfies LineId[];

const lineFillClass: Record<LineId, string> = {
  red: "fill-line-red",
  gold: "fill-line-gold",
  blue: "fill-line-blue",
  green: "fill-line-green",
  streetcar: "fill-line-streetcar",
};

export function MartaMap({ selectedStationId, onSelectStation }: MartaMapProps) {
  return (
    <div className="aspect-[1959/2048] max-h-[85vh] w-full max-w-4xl">
      <svg viewBox="0 0 1959 2048" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        {renderedLines.map((line) => (
          <g key={line} className={lineFillClass[line]}>
            {(linePaths[line] as string[]).map((d, i) => (
              <path key={i} d={d} fillRule="evenodd" />
            ))}
          </g>
        ))}

        {lineLabels.map((label) => (
          <text
            key={label.line}
            x={label.x}
            y={label.y}
            fontSize={LINE_LABEL_FONT_SIZE}
            fontWeight={700}
            className="fill-white"
            transform={label.angle ? `rotate(${label.angle} ${label.x} ${label.y})` : undefined}
          >
            {label.text}
          </text>
        ))}

        {stations.map((station) => (
          <StationMarker
            key={station.id}
            station={station}
            selected={station.id === selectedStationId}
            onSelect={() => onSelectStation(station.id)}
          />
        ))}
      </svg>
    </div>
  );
}
