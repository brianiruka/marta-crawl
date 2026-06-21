import type { LineId } from "@/data/stations";

type StationHoleProps = {
  line: LineId;
  cx: number;
  cy: number;
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

export function StationHole({ line, cx, cy }: StationHoleProps) {
  return <path d={ringPath(cx, cy)} fillRule="evenodd" className={ringFillClass[line]} />;
}
