export type LineId = "red" | "gold" | "blue" | "green" | "streetcar";

export type Station = {
  id: string;
  name: string;
  lines: LineId[];
  interchange?: boolean;
  terminal?: boolean;
  // Live <text> label anchor (text-anchor: middle) + rotation. Derived from
  // each station's marker center (the average of its per-line bulges in
  // stationBulges.ts) offset by a fixed gap along a clean direction --
  // 0/180 (horizontal, trunk stations) or -45/135 (diagonal, the densely
  // spaced blue/green stretch) -- so every label sits the same distance
  // from its marker regardless of name length, instead of the hand-placed
  // coordinates this used to hold.
  x: number;
  y: number;
  angle: number;
};

export const stations: Station[] = [
  { id: "north-springs", name: "North Springs", lines: ["red"], terminal: true, x: 1280, y: 92, angle: 0 },
  { id: "sandy-springs", name: "Sandy Springs", lines: ["red"], x: 1320, y: 186, angle: 0 },
  { id: "dunwoody", name: "Dunwoody", lines: ["red"], x: 1350, y: 305, angle: 0 },
  { id: "medical-center", name: "Medical Center", lines: ["red"], x: 1060, y: 413, angle: 0 },
  { id: "buckhead", name: "Buckhead", lines: ["red"], x: 1040, y: 630, angle: 0 },
  { id: "doraville", name: "Doraville", lines: ["gold"], terminal: true, x: 1540, y: 463, angle: 0 },
  { id: "chamblee", name: "Chamblee", lines: ["gold"], x: 1470, y: 536, angle: 0 },
  { id: "brookhaven-oglethorpe", name: "Brookhaven/Oglethorpe", lines: ["gold"], x: 1490, y: 585, angle: 0 },
  { id: "lenox", name: "Lenox", lines: ["gold"], x: 1333, y: 656, angle: 0 },
  { id: "lindbergh-center", name: "Lindbergh Center", lines: ["red", "gold"], interchange: true, x: 1261, y: 776, angle: 0 },
  { id: "arts-center", name: "Arts Center", lines: ["red", "gold"], interchange: true, x: 906, y: 937, angle: 0 },
  { id: "midtown", name: "Midtown", lines: ["red", "gold"], interchange: true, x: 933, y: 1011, angle: 0 },
  { id: "north-avenue", name: "North Avenue", lines: ["red", "gold"], interchange: true, x: 902, y: 1078, angle: 0 },
  { id: "civic-center", name: "Civic Center", lines: ["red", "gold"], interchange: true, x: 902, y: 1138, angle: 0 },
  { id: "peachtree-center", name: "Peachtree Center", lines: ["red", "gold"], interchange: true, x: 878, y: 1213, angle: 0 },
  { id: "five-points", name: "Five Points", lines: ["red", "gold", "blue", "green"], interchange: true, x: 1100, y: 1222, angle: -45 },
  { id: "garnett", name: "Garnett", lines: ["red", "gold"], interchange: true, x: 1028, y: 1438, angle: 0 },
  { id: "west-end", name: "West End", lines: ["red", "gold"], interchange: true, x: 976, y: 1510, angle: 0 },
  { id: "oakland-city", name: "Oakland City", lines: ["red", "gold"], interchange: true, x: 999, y: 1577, angle: 0 },
  { id: "lakewood-ft-mcpherson", name: "Lakewood/Ft. McPherson", lines: ["red", "gold"], interchange: true, x: 1053, y: 1633, angle: 0 },
  { id: "east-point", name: "East Point", lines: ["red", "gold"], interchange: true, x: 987, y: 1709, angle: 0 },
  { id: "college-park", name: "College Park", lines: ["red", "gold"], interchange: true, x: 996, y: 1815, angle: 0 },
  { id: "airport", name: "Airport", lines: ["red", "gold"], interchange: true, x: 1052, y: 1977, angle: 0 },
  { id: "bankhead", name: "Bankhead", lines: ["green"], terminal: true, x: 506, y: 1213, angle: 0 },
  { id: "hamilton-e-holmes", name: "Hamilton E. Holmes", lines: ["blue"], terminal: true, x: 369, y: 1430, angle: -45 },
  { id: "west-lake", name: "West Lake", lines: ["blue"], x: 654, y: 1394, angle: -45 },
  { id: "ashby", name: "Ashby", lines: ["blue", "green"], interchange: true, x: 754, y: 1369, angle: -45 },
  { id: "vine-city", name: "Vine City", lines: ["blue", "green"], interchange: true, x: 808, y: 1385, angle: -45 },
  { id: "sec-district", name: "SEC District", lines: ["blue", "green"], interchange: true, x: 866, y: 1397, angle: -45 },
  { id: "georgia-state", name: "Georgia State", lines: ["blue", "green"], interchange: true, x: 1272, y: 1215, angle: -45 },
  { id: "king-memorial", name: "King Memorial", lines: ["blue", "green"], interchange: true, x: 1348, y: 1215, angle: -45 },
  { id: "inman-park-reynoldstown", name: "Inman Park/Reynoldstown", lines: ["blue", "green"], interchange: true, x: 1467, y: 1176, angle: -45 },
  { id: "edgewood-candler-park", name: "Edgewood/Candler Park", lines: ["blue", "green"], interchange: true, x: 1545, y: 1184, angle: -45 },
  { id: "east-lake", name: "East Lake", lines: ["blue"], x: 1591, y: 1262, angle: -45 },
  { id: "decatur", name: "Decatur", lines: ["blue"], x: 1653, y: 1270, angle: -45 },
  { id: "avondale", name: "Avondale", lines: ["blue"], x: 1737, y: 1266, angle: -45 },
  { id: "kensington", name: "Kensington", lines: ["blue"], x: 1833, y: 1258, angle: -45 },
  { id: "indian-creek", name: "Indian Creek", lines: ["blue"], terminal: true, x: 1933, y: 1250, angle: -45 },
];
