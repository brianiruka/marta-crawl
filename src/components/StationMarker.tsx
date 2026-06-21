import type { KeyboardEvent } from "react";
import type { Station } from "@/data/stations";

type StationMarkerProps = {
  station: Station;
  selected: boolean;
  onSelect: () => void;
};

const FONT_SIZE = 20;
const LABEL_PAD = 6;
// Rough average glyph width for this label font, as a fraction of font
// size -- just enough to size a generous click/tap target under each
// station name, not a real text measurement.
const CHAR_WIDTH = 0.56;

function handleKeyDown(onSelect: () => void) {
  return (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };
}

// The line art renders each station as a bulge (hollow-centered ones are
// cut directly into the line path's own geometry, not drawn here) -- this
// component only adds the live <text> label and a hit target around it.
export function StationMarker({ station, selected, onSelect }: StationMarkerProps) {
  const labelWidth = station.name.length * FONT_SIZE * CHAR_WIDTH;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={station.name}
      onClick={onSelect}
      onKeyDown={handleKeyDown(onSelect)}
      className="group cursor-pointer focus:outline-none"
      transform={station.angle ? `rotate(${station.angle} ${station.x} ${station.y})` : undefined}
    >
      <rect
        x={station.x - labelWidth / 2 - LABEL_PAD}
        y={station.y - FONT_SIZE - LABEL_PAD}
        width={labelWidth + LABEL_PAD * 2}
        height={FONT_SIZE + LABEL_PAD * 2}
        rx={4}
        className={
          selected
            ? "fill-white/20 stroke-white opacity-100"
            : "fill-transparent stroke-white opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-100"
        }
        strokeWidth={2}
      />
      <text
        x={station.x}
        y={station.y}
        textAnchor="middle"
        fontSize={FONT_SIZE}
        fontWeight={selected ? 700 : 400}
        className="fill-white"
      >
        {station.name}
      </text>
    </g>
  );
}
