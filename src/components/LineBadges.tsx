import type { LineId } from "@/data/stations";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

/** Thin gradient hairline built from a station's line colors — the
 * per-station accent that makes each page feel like *its* station.
 * Colors come from the design-token CSS variables, never hex. */
export function LineAccent({
  lines,
  className,
}: {
  lines: LineId[];
  className?: string;
}) {
  const stops = lines.map((line) => `var(--line-${line})`);
  const background =
    stops.length === 1
      ? stops[0]
      : `linear-gradient(90deg, ${stops.join(", ")})`;
  return (
    <div
      aria-hidden="true"
      className={cn("h-0.5 w-16 rounded-full", className)}
      style={{ background }}
    />
  );
}

export function LineBadges({ lines }: { lines: LineId[] }) {
  return (
    <div className="mt-3 flex gap-2">
      {lines.map((line) => (
        <Badge
          key={line}
          className={cn(
            "font-display font-semibold tracking-wide text-white",
            lineFill[line],
          )}
        >
          {lineLabel[line]}
        </Badge>
      ))}
    </div>
  );
}
