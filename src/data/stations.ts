export type LineId = "red" | "gold" | "blue" | "green" | "streetcar";

export type Station = {
  id: string;
  name: string;
  lines: LineId[];
  interchange?: boolean;
  terminal?: boolean;
  // Live <text> label anchor (text-anchor: middle) + rotation, extracted
  // from the source map's converted-text glyph clusters by bounding-box
  // centroid + PCA-fit angle. The line art itself already shows each
  // station as a bulge in its line's outline, so this is the only position
  // a station needs -- there's no separate marker to place.
  x: number;
  y: number;
  angle: number;
};

export const stations: Station[] = [
  { id: "north-springs", name: "North Springs", lines: ["red"], terminal: true, x: 1276, y: 86, angle: 0 },
  { id: "sandy-springs", name: "Sandy Springs", lines: ["red"], x: 1312, y: 179, angle: 0 },
  { id: "dunwoody", name: "Dunwoody", lines: ["red"], x: 1342, y: 299, angle: 0 },
  { id: "medical-center", name: "Medical Center", lines: ["red"], x: 1075, y: 406, angle: 0 },
  { id: "buckhead", name: "Buckhead", lines: ["red"], x: 1055, y: 621, angle: 0 },
  { id: "doraville", name: "Doraville", lines: ["gold"], terminal: true, x: 1524, y: 454, angle: 0 },
  { id: "chamblee", name: "Chamblee", lines: ["gold"], x: 1460, y: 527, angle: 0 },
  { id: "brookhaven-oglethorpe", name: "Brookhaven/Oglethorpe", lines: ["gold"], x: 1499, y: 579, angle: 0 },
  { id: "lenox", name: "Lenox", lines: ["gold"], x: 1318, y: 645, angle: 0 },
  { id: "lindbergh-center", name: "Lindbergh Center", lines: ["red", "gold"], interchange: true, x: 1268, y: 770, angle: 0 },
  { id: "arts-center", name: "Arts Center", lines: ["red", "gold"], interchange: true, x: 894, y: 932, angle: 0 },
  { id: "midtown", name: "Midtown", lines: ["red", "gold"], interchange: true, x: 910, y: 993, angle: 0 },
  { id: "north-avenue", name: "North Avenue", lines: ["red", "gold"], interchange: true, x: 879, y: 1054, angle: 0 },
  { id: "civic-center", name: "Civic Center", lines: ["red", "gold"], interchange: true, x: 888, y: 1114, angle: 0 },
  { id: "peachtree-center", name: "Peachtree Center", lines: ["red", "gold"], interchange: true, x: 855, y: 1204, angle: 0 },
  { id: "five-points", name: "Five Points", lines: ["red", "gold", "blue", "green"], interchange: true, x: 1102, y: 1217, angle: -45 },
  { id: "garnett", name: "Garnett", lines: ["red", "gold"], interchange: true, x: 1059, y: 1409, angle: 0 },
  { id: "west-end", name: "West End", lines: ["red", "gold"], interchange: true, x: 1001, y: 1502, angle: 0 },
  { id: "oakland-city", name: "Oakland City", lines: ["red", "gold"], interchange: true, x: 1021, y: 1573, angle: 0 },
  { id: "lakewood-ft-mcpherson", name: "Lakewood/Ft. McPherson", lines: ["red", "gold"], interchange: true, x: 1104, y: 1626, angle: 0 },
  { id: "east-point", name: "East Point", lines: ["red", "gold"], interchange: true, x: 1006, y: 1702, angle: 0 },
  { id: "college-park", name: "College Park", lines: ["red", "gold"], interchange: true, x: 1021, y: 1810, angle: 0 },
  { id: "airport", name: "Airport", lines: ["red", "gold"], interchange: true, x: 1054, y: 1981, angle: 0 },
  { id: "bankhead", name: "Bankhead", lines: ["green"], terminal: true, x: 466, y: 1174, angle: 0 },
  { id: "hamilton-e-holmes", name: "Hamilton E. Holmes", lines: ["blue"], terminal: true, x: 306, y: 1475, angle: -45 },
  { id: "west-lake", name: "West Lake", lines: ["blue"], x: 565, y: 1410, angle: -44 },
  { id: "ashby", name: "Ashby", lines: ["blue", "green"], interchange: true, x: 678, y: 1376, angle: -46 },
  { id: "vine-city", name: "Vine City", lines: ["blue", "green"], interchange: true, x: 740, y: 1386, angle: -44 },
  { id: "sec-district", name: "SEC District", lines: ["blue", "green"], interchange: true, x: 809, y: 1400, angle: -44 },
  { id: "georgia-state", name: "Georgia State", lines: ["blue", "green"], interchange: true, x: 1207, y: 1205, angle: -45 },
  { id: "king-memorial", name: "King Memorial", lines: ["blue", "green"], interchange: true, x: 1286, y: 1236, angle: -45 },
  { id: "inman-park-reynoldstown", name: "Inman Park/Reynoldstown", lines: ["blue", "green"], interchange: true, x: 1388, y: 1179, angle: -45 },
  { id: "edgewood-candler-park", name: "Edgewood/Candler Park", lines: ["blue", "green"], interchange: true, x: 1501, y: 1087, angle: -45 },
  { id: "east-lake", name: "East Lake", lines: ["blue"], x: 1503, y: 1253, angle: -44 },
  { id: "decatur", name: "Decatur", lines: ["blue"], x: 1583, y: 1260, angle: -45 },
  { id: "avondale", name: "Avondale", lines: ["blue"], x: 1677, y: 1256, angle: -46 },
  { id: "kensington", name: "Kensington", lines: ["blue"], x: 1770, y: 1246, angle: -45 },
  { id: "indian-creek", name: "Indian Creek", lines: ["blue"], terminal: true, x: 1864, y: 1228, angle: -44 },
];

export type LineLabel = {
  line: LineId;
  text: string;
  x: number;
  y: number;
  angle: number;
};

// The four inline "Red/Gold/Blue/Green Line" captions drawn directly on the
// source map next to their line, rather than in a separate legend.
export const lineLabels: LineLabel[] = [
  { line: "red", text: "Red Line", x: 1152, y: 28, angle: 0 },
  { line: "gold", text: "Gold Line", x: 1464, y: 405, angle: 0 },
  { line: "blue", text: "Blue Line", x: 329, y: 1323, angle: 0 },
  { line: "green", text: "Green Line", x: 552, y: 1126, angle: 0 },
];
