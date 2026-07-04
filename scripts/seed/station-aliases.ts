// Manual overrides for station ids whose GTFS stop_name doesn't match after
// normalization (see normalizeGtfsName in ingest-gtfs.ts). Keys are station
// ids from src/data/stations.ts, values are exact GTFS stop_name strings.
// ingest-gtfs.ts fails loudly on unmatched ids AND on unused aliases, so
// keep this table minimal.
export const stationAliases: Record<string, string> = {
  "north-avenue": "NORTH AVE STATION",
};
