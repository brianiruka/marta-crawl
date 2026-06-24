import type { LineId } from "@/data/stations";

type StationHoleProps = {
  line: LineId;
  cx: number;
  cy: number;
  glowing: boolean;
};

const OUTER_R = 15;
const INNER_R = 6;

const ringFillClass: Record<LineId, string> = {
  red: "fill-line-red",
  gold: "fill-line-gold",
  blue: "fill-line-blue",
  green: "fill-line-green",
  streetcar: "fill-line-streetcar",
};

function circle(cx: number, cy: number, r: number) {
  return `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} Z`;
}

function ringPath(cx: number, cy: number) {
  return `${circle(cx, cy, OUTER_R)} ${circle(cx, cy, INNER_R)}`;
}

export function StationHole({ line, cx, cy, glowing }: StationHoleProps) {
  return (
    <>
      {/* pointer-events: none on both -- otherwise hovering the visible
          ring hits THIS path instead of the invisible hit-circle behind
          it (a sibling, rendered first in StationMarker), and the
          hit-circle is what the leader-line/label hover CSS keys off of
          via a sibling selector. Without this, hovering the ring itself
          (as opposed to the gap around it that only the hit-circle
          covers) silently fails to trigger that effect -- two different
          hover behaviors depending on which pixel of the same point you
          land on. */}
      <path
        d={ringPath(cx, cy)}
        fillRule="evenodd"
        className={ringFillClass[line]}
        style={{ pointerEvents: "none" }}
      />
      <path
        d={ringPath(cx, cy)}
        fillRule="evenodd"
        className="fill-white station-ring-glow"
        style={{ opacity: glowing ? 1 : 0, pointerEvents: "none" }}
      />
    </>
  );
}
