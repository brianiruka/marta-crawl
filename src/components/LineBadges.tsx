import type { LineId } from "@/data/stations";

export const lineLabel: Record<LineId, string> = {
  red: "Red Line",
  gold: "Gold Line",
  blue: "Blue Line",
  green: "Green Line",
  streetcar: "Streetcar",
};

const lineFill: Record<LineId, string> = {
  red: "bg-line-red",
  gold: "bg-line-gold",
  blue: "bg-line-blue",
  green: "bg-line-green",
  streetcar: "bg-line-streetcar",
};

export function LineBadges({ lines }: { lines: LineId[] }) {
  return (
    <div className="mt-3 flex gap-2">
      {lines.map((line) => (
        <span
          key={line}
          className={`rounded-full px-3 py-1 text-xs font-medium text-white ${lineFill[line]}`}
        >
          {lineLabel[line]}
        </span>
      ))}
    </div>
  );
}
