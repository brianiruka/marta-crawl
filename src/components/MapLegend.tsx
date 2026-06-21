import type { LineId } from "@/data/stations";

const legendLines: { id: LineId; name: string; swatch: string }[] = [
  { id: "red", name: "Red Line", swatch: "bg-line-red" },
  { id: "gold", name: "Gold Line", swatch: "bg-line-gold" },
  { id: "blue", name: "Blue Line", swatch: "bg-line-blue" },
  { id: "green", name: "Green Line", swatch: "bg-line-green" },
];

export function MapLegend() {
  return (
    <ul className="flex flex-wrap gap-4 text-sm text-zinc-300">
      {legendLines.map((line) => (
        <li key={line.id} className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${line.swatch}`} aria-hidden="true" />
          {line.name}
        </li>
      ))}
    </ul>
  );
}
