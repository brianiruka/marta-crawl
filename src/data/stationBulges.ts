import type { LineId } from "@/data/stations";

export type StationBulge = {
  stationId: string;
  line: LineId;
  cx: number;
  cy: number;
};

// Position of each (station, line) marker, in the same coordinate space as
// martaLinePaths.json. Size is fixed in StationHole, not stored here.
export const stationBulges: StationBulge[] = [
  { stationId: "five-points", line: "red", cx: 983, cy: 1370 },
  { stationId: "west-end", line: "red", cx: 868, cy: 1503 },
  { stationId: "oakland-city", line: "red", cx: 869, cy: 1570 },
  { stationId: "lakewood-ft-mcpherson", line: "red", cx: 867, cy: 1626 },
  { stationId: "east-point", line: "red", cx: 868, cy: 1702 },
  { stationId: "college-park", line: "red", cx: 866, cy: 1808 },
  { stationId: "airport", line: "red", cx: 950, cy: 1970 },
  { stationId: "north-springs", line: "red", cx: 1152, cy: 85 },
  { stationId: "sandy-springs", line: "red", cx: 1184, cy: 179 },
  { stationId: "dunwoody", line: "red", cx: 1237, cy: 298 },
  { stationId: "medical-center", line: "red", cx: 1205, cy: 406 },
  { stationId: "buckhead", line: "red", cx: 1152, cy: 623 },
  { stationId: "lindbergh-center", line: "red", cx: 1078, cy: 769 },
  { stationId: "arts-center", line: "red", cx: 991, cy: 930 },
  { stationId: "midtown", line: "red", cx: 995, cy: 1004 },
  { stationId: "north-avenue", line: "red", cx: 992, cy: 1071 },
  { stationId: "civic-center", line: "red", cx: 992, cy: 1131 },
  { stationId: "peachtree-center", line: "red", cx: 991, cy: 1206 },
  { stationId: "garnett", line: "red", cx: 926, cy: 1431 },

  { stationId: "five-points", line: "gold", cx: 1023, cy: 1370 },
  { stationId: "west-end", line: "gold", cx: 908, cy: 1503 },
  { stationId: "oakland-city", line: "gold", cx: 909, cy: 1570 },
  { stationId: "lakewood-ft-mcpherson", line: "gold", cx: 907, cy: 1626 },
  { stationId: "east-point", line: "gold", cx: 908, cy: 1702 },
  { stationId: "college-park", line: "gold", cx: 906, cy: 1808 },
  { stationId: "airport", line: "gold", cx: 990, cy: 1970 },
  { stationId: "doraville", line: "gold", cx: 1431, cy: 456 },
  { stationId: "chamblee", line: "gold", cx: 1360, cy: 529 },
  { stationId: "brookhaven-oglethorpe", line: "gold", cx: 1311, cy: 578 },
  { stationId: "lenox", line: "gold", cx: 1242, cy: 649 },
  { stationId: "lindbergh-center", line: "gold", cx: 1118, cy: 769 },
  { stationId: "arts-center", line: "gold", cx: 1031, cy: 930 },
  { stationId: "midtown", line: "gold", cx: 1035, cy: 1004 },
  { stationId: "north-avenue", line: "gold", cx: 1032, cy: 1071 },
  { stationId: "civic-center", line: "gold", cx: 1032, cy: 1131 },
  { stationId: "peachtree-center", line: "gold", cx: 1031, cy: 1206 },
  { stationId: "garnett", line: "gold", cx: 966, cy: 1431 },

  { stationId: "georgia-state", line: "blue", cx: 1194, cy: 1317 },
  { stationId: "king-memorial", line: "blue", cx: 1270, cy: 1317 },
  { stationId: "inman-park-reynoldstown", line: "blue", cx: 1350, cy: 1323 },
  { stationId: "edgewood-candler-park", line: "blue", cx: 1436, cy: 1323 },
  { stationId: "east-lake", line: "blue", cx: 1520, cy: 1323 },
  { stationId: "decatur", line: "blue", cx: 1590, cy: 1323 },
  { stationId: "avondale", line: "blue", cx: 1670, cy: 1323 },
  { stationId: "kensington", line: "blue", cx: 1758, cy: 1323 },
  { stationId: "indian-creek", line: "blue", cx: 1771, cy: 1323 },
  { stationId: "five-points", line: "blue", cx: 969, cy: 1317 },
  { stationId: "hamilton-e-holmes", line: "blue", cx: 465.6, cy: 1322.9 },
  { stationId: "west-lake", line: "blue", cx: 715, cy: 1323 },
  { stationId: "ashby", line: "blue", cx: 790, cy: 1323 },
  { stationId: "vine-city", line: "blue", cx: 860, cy: 1323 },
  { stationId: "sec-district", line: "blue", cx: 930, cy: 1317 },

  { stationId: "georgia-state", line: "green", cx: 1234, cy: 1317 },
  { stationId: "king-memorial", line: "green", cx: 1310, cy: 1317 },
  { stationId: "inman-park-reynoldstown", line: "green", cx: 1390, cy: 1323 },
  { stationId: "edgewood-candler-park", line: "green", cx: 1476, cy: 1323 },
  { stationId: "five-points", line: "green", cx: 1009, cy: 1317 },
  { stationId: "ashby", line: "green", cx: 830, cy: 1323 },
  { stationId: "vine-city", line: "green", cx: 900, cy: 1323 },
  { stationId: "sec-district", line: "green", cx: 970, cy: 1317 },
  { stationId: "bankhead", line: "green", cx: 594, cy: 1206 },
];
