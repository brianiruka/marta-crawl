export type LineId = "red" | "gold" | "blue" | "green" | "streetcar";

export type Station = {
  id: string;
  name: string;
  x: number;
  y: number;
  lines: LineId[];
  interchange?: boolean;
};

// Proof-of-concept slice: Red Line, North Springs down to Five Points.
// Coordinates are hand-placed to roughly match the official MARTA map proportions.
export const stations: Station[] = [
  { id: "north-springs", name: "North Springs", x: 300, y: 20, lines: ["red"] },
  { id: "sandy-springs", name: "Sandy Springs", x: 290, y: 90, lines: ["red"] },
  { id: "dunwoody", name: "Dunwoody", x: 280, y: 160, lines: ["red"] },
  { id: "medical-center", name: "Medical Center", x: 260, y: 230, lines: ["red"] },
  { id: "buckhead", name: "Buckhead", x: 250, y: 300, lines: ["red"] },
  { id: "arts-center", name: "Arts Center", x: 230, y: 370, lines: ["red"] },
  { id: "midtown", name: "Midtown", x: 230, y: 420, lines: ["red"] },
  {
    id: "five-points",
    name: "Five Points",
    x: 230,
    y: 480,
    lines: ["red", "gold", "blue", "green"],
    interchange: true,
  },
];

export const redLinePath = stations.map((s) => `${s.x},${s.y}`).join(" ");
