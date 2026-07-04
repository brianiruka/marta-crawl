/**
 * Builds src/data/pois.generated.ts from data/coffee-ga-seed.csv.
 *
 * Pipeline: parse CSV → filter to MARTA-served cities → geocode Place IDs
 * (cache-first) → assign each shop to its nearest station within
 * MAX_DISTANCE_MILES → emit a typed, generated POI module.
 *
 * Usage:
 *   npm run seed:pois            # DRY RUN (default): reports planned API
 *                                # calls and exits without any network I/O
 *   npm run seed:pois -- --execute --max-calls 150
 *
 * Cost guardrails (in order of defense):
 *   1. Dry run is the DEFAULT. Nothing touches the network without --execute.
 *   2. Cache-first: data/place-locations.json is committed; any Place ID in
 *      it is never re-fetched. After the first successful run, subsequent
 *      runs make 0 API calls.
 *   3. Essentials SKU only: the request sends `X-Goog-FieldMask: location`
 *      and nothing else. Location-only Place Details is in Google's
 *      Essentials tier (10,000 free calls/month). Do NOT add fields to the
 *      mask — richer fields move every call to the Pro/Enterprise SKU.
 *   4. --execute requires GOOGLE_PLACES_API_KEY to be set and honors
 *      --max-calls (default 150): the script hard-aborts at the cap.
 *
 * PRECONDITION before the first --execute run: set a budget alert in the
 * Google Cloud console for the project that owns the API key.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { stations } from "../../src/data/stations";
import { stationLocations } from "../../src/data/stationLocations";
import type { Poi } from "../../src/data/pois";

const CSV_PATH = "data/coffee-ga-seed.csv";
const CACHE_PATH = "data/place-locations.json";
const OUTPUT_PATH = "src/data/pois.generated.ts";
const MAX_DISTANCE_MILES = 0.75;
const WALK_MPH = 3;

// Cities with MARTA rail service. Anything else in the sheet (Marietta,
// Smyrna, Blue Ridge, ...) is out of range for a rail crawl.
const MARTA_CITIES = new Set([
  "Atlanta",
  "Decatur",
  "East Point",
  "College Park",
  "Chamblee",
  "Doraville",
  "Brookhaven",
  "Sandy Springs",
  "Dunwoody",
  "Avondale Estates",
]);

type CsvRow = {
  "Coffee Shop": string;
  Rating: string;
  "Review Count": string;
  City: string;
  Neighborhood: string;
  "Place ID": string;
  "Google Maps Link": string;
  Types: string;
  Hours: string;
  // "Rating × Reviews Score", "Biking Distance (Home)",
  // "Walking Distance (Work)", "Processed?" exist in the CSV but are
  // personal-context columns — intentionally never read or emitted.
};

type PlaceLocation = { lat: number; lng: number; fetchedAt: string };
type LocationCache = Record<string, PlaceLocation>;

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const maxCallsArg = args.indexOf("--max-calls");
const maxCalls = maxCallsArg >= 0 ? Number(args[maxCallsArg + 1]) : 150;

function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function categoryFor(types: string): Poi["category"] {
  const t = types.toLowerCase();
  if (t.includes("bakery")) return "bakery";
  if (t.includes("coffee_shop") || t.includes("cafe")) return "coffee";
  return "food";
}

async function fetchLocation(
  placeId: string,
  apiKey: string,
): Promise<PlaceLocation | null> {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        // Essentials SKU. Do not add fields.
        "X-Goog-FieldMask": "location",
      },
    },
  );
  if (!res.ok) {
    console.warn(`  ${placeId}: HTTP ${res.status} — skipping`);
    return null;
  }
  const body = (await res.json()) as {
    location?: { latitude: number; longitude: number };
  };
  if (!body.location) {
    console.warn(`  ${placeId}: no location in response — skipping`);
    return null;
  }
  return {
    lat: body.location.latitude,
    lng: body.location.longitude,
    fetchedAt: new Date().toISOString(),
  };
}

async function main() {
  const rows: CsvRow[] = parse(readFileSync(CSV_PATH, "utf8"), {
    columns: true,
    skip_empty_lines: true,
  });
  const inCities = rows.filter((r) => MARTA_CITIES.has(r.City.trim()));
  console.log(
    `${rows.length} rows in CSV; ${inCities.length} in MARTA-served cities (${rows.length - inCities.length} dropped)`,
  );

  const cache: LocationCache = existsSync(CACHE_PATH)
    ? JSON.parse(readFileSync(CACHE_PATH, "utf8"))
    : {};
  const uncached = inCities.filter((r) => !cache[r["Place ID"].trim()]);
  console.log(
    `Geocode cache: ${Object.keys(cache).length} entries; ${inCities.length - uncached.length} hits, ${uncached.length} misses`,
  );

  if (!execute) {
    console.log(
      `\nDRY RUN (default): would call Places API ${uncached.length} times.`,
    );
    console.log(
      "Rerun with --execute (requires GOOGLE_PLACES_API_KEY; optional --max-calls N, default 150).",
    );
    if (uncached.length === 0 && inCities.length > 0) {
      console.log("All locations cached — emitting output without network.");
    } else {
      return;
    }
  }

  if (execute && uncached.length > 0) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error("--execute requires GOOGLE_PLACES_API_KEY to be set.");
      process.exit(1);
    }
    if (uncached.length > maxCalls) {
      console.error(
        `Would make ${uncached.length} calls but --max-calls is ${maxCalls}. Aborting before any call.`,
      );
      process.exit(1);
    }
    let calls = 0;
    for (const row of uncached) {
      if (calls >= maxCalls) {
        console.error(`Hit --max-calls cap (${maxCalls}); stopping.`);
        break;
      }
      calls++;
      const placeId = row["Place ID"].trim();
      const loc = await fetchLocation(placeId, apiKey);
      if (loc) cache[placeId] = loc;
      // Persist after every call so an interrupted run loses nothing.
      writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n");
    }
    console.log(`Made ${calls} Places API calls (Essentials SKU).`);
  }

  // Assign each geocoded shop to its nearest station.
  const poisByStation: Record<string, Poi[]> = {};
  let assigned = 0;
  let tooFar = 0;
  let noLocation = 0;
  for (const row of inCities) {
    const loc = cache[row["Place ID"].trim()];
    if (!loc) {
      noLocation++;
      continue;
    }
    let nearest: { id: string; miles: number } | null = null;
    for (const station of stations) {
      const stationLoc = stationLocations[station.id];
      if (!stationLoc) continue;
      const miles = haversineMiles(loc, stationLoc);
      if (!nearest || miles < nearest.miles) nearest = { id: station.id, miles };
    }
    if (!nearest || nearest.miles > MAX_DISTANCE_MILES) {
      tooFar++;
      continue;
    }
    const miles = Math.round(nearest.miles * 100) / 100;
    const walkMinutes = Math.max(1, Math.round((nearest.miles / WALK_MPH) * 60));
    const poi: Poi = {
      name: row["Coffee Shop"].trim(),
      category: categoryFor(row.Types),
      description: `${row.Neighborhood.trim() || row.City.trim()} coffee stop, about a ${walkMinutes}-minute walk from the station.`,
      rating: Number(row.Rating) || undefined,
      reviewCount: Number(row["Review Count"]) || undefined,
      mapsUrl: row["Google Maps Link"].trim() || undefined,
      distanceMiles: miles,
      walkMinutes,
    };
    (poisByStation[nearest.id] ??= []).push(poi);
    assigned++;
  }
  for (const pois of Object.values(poisByStation)) {
    pois.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }
  console.log(
    `Assigned ${assigned} shops to ${Object.keys(poisByStation).length} stations (${tooFar} beyond ${MAX_DISTANCE_MILES} mi, ${noLocation} without a location).`,
  );

  const output = `// GENERATED by scripts/seed/build-pois.ts — do not edit by hand.
// Source: data/coffee-ga-seed.csv + data/place-locations.json.
// Regenerate with: npm run seed:pois
import type { Poi } from "./pois";

export const generatedPoisByStation: Record<string, Poi[]> = ${JSON.stringify(
    poisByStation,
    null,
    2,
  )};
`;
  writeFileSync(OUTPUT_PATH, output);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main();
