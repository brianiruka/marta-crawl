/**
 * Discovers POIs near every station for one category via Nearby Search (New),
 * caching raw responses to data/discovery/<category>.json.
 *
 * Usage:
 *   npm run discover -- coffee                      # DRY RUN (default)
 *   npm run discover -- coffee --execute --max-calls 50
 *   npm run discover -- coffee --execute --refresh  # re-sweep cached stations
 *
 * Cost model (verified July 2026): one call per station per category. The
 * field mask includes rating/userRatingCount, which puts calls in the
 * Enterprise SKU — 1,000 free/month, $35/1K after. A full sweep is 38 calls.
 * Every executed run is appended to data/discovery/call-log.json and every
 * dry run prints the month-to-date tally against the free cap, so spend is
 * always visible in the terminal.
 *
 * Guardrails (same contract as build-pois.ts):
 *   1. Dry run is the DEFAULT — no network without --execute.
 *   2. Cache-first: stations already in the category cache are skipped
 *      unless --refresh is passed.
 *   3. Fixed field mask — do NOT add fields without rechecking SKU tiers.
 *   4. --execute requires GOOGLE_PLACES_API_KEY and honors --max-calls
 *      (default 50); hard-aborts before exceeding it.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stations } from "../../src/data/stations";
import { stationLocations } from "../../src/data/stationLocations";
import { discoveryCategories } from "./categories";

const DISCOVERY_DIR = "data/discovery";
const LEDGER_PATH = `${DISCOVERY_DIR}/call-log.json`;
const FREE_CAP_PER_MONTH = 1000;
const RADIUS_METERS = 1207; // 0.75 mi, matching the transform's cutoff
// Enterprise SKU because of rating/userRatingCount. Fixed — see header.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.businessStatus",
  // Same Enterprise SKU as rating/userRatingCount — no extra cost.
  "places.websiteUri",
].join(",");

export type RawPlace = {
  id: string;
  displayName?: { text?: string };
  location?: { latitude: number; longitude: number };
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  businessStatus?: string;
  websiteUri?: string;
};

export type CategoryCache = Record<
  string,
  { fetchedAt: string; places: RawPlace[] }
>;

type LedgerEntry = { date: string; category: string; calls: number };

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const category = positional[0];
const execute = args.includes("--execute");
const refresh = args.includes("--refresh");
const maxCallsArg = args.indexOf("--max-calls");
const maxCalls = maxCallsArg >= 0 ? Number(args[maxCallsArg + 1]) : 50;

if (!category || !discoveryCategories[category]) {
  console.error(
    `Usage: npm run discover -- <category> [--execute] [--refresh] [--max-calls N]\n` +
      `Categories: ${Object.keys(discoveryCategories).join(", ")}`,
  );
  process.exit(1);
}
const config = discoveryCategories[category];
const cachePath = `${DISCOVERY_DIR}/${category}.json`;

function monthToDateCalls(ledger: LedgerEntry[]): number {
  const prefix = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  return ledger
    .filter((e) => e.date.startsWith(prefix))
    .reduce((sum, e) => sum + e.calls, 0);
}

async function searchNearby(
  loc: { lat: number; lng: number },
  apiKey: string,
): Promise<RawPlace[] | null> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: config.includedTypes,
      maxResultCount: 20,
      rankPreference: "POPULARITY",
      locationRestriction: {
        circle: {
          center: { latitude: loc.lat, longitude: loc.lng },
          radius: RADIUS_METERS,
        },
      },
    }),
  });
  if (!res.ok) {
    console.warn(`  HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return null;
  }
  const body = (await res.json()) as { places?: RawPlace[] };
  return body.places ?? [];
}

async function main() {
  mkdirSync(DISCOVERY_DIR, { recursive: true });
  const cache: CategoryCache = existsSync(cachePath)
    ? JSON.parse(readFileSync(cachePath, "utf8"))
    : {};
  const ledger: LedgerEntry[] = existsSync(LEDGER_PATH)
    ? JSON.parse(readFileSync(LEDGER_PATH, "utf8"))
    : [];

  const pending = stations.filter((s) => refresh || !cache[s.id]);
  const mtd = monthToDateCalls(ledger);
  console.log(
    `Category "${category}" (${config.includedTypes.join(", ")}), radius ${RADIUS_METERS} m`,
  );
  console.log(
    `Cache: ${Object.keys(cache).length}/${stations.length} stations; planned calls: ${pending.length}`,
  );
  console.log(
    `Ledger: ${mtd}/${FREE_CAP_PER_MONTH} Enterprise-SKU calls used this month (free cap)`,
  );

  if (!execute) {
    console.log(
      `\nDRY RUN (default): would call Nearby Search ${pending.length} times ` +
        `(${mtd + pending.length}/${FREE_CAP_PER_MONTH} month-to-date after).`,
    );
    console.log("Rerun with --execute (requires GOOGLE_PLACES_API_KEY).");
    return;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("--execute requires GOOGLE_PLACES_API_KEY to be set.");
    process.exit(1);
  }
  if (pending.length > maxCalls) {
    console.error(
      `Would make ${pending.length} calls but --max-calls is ${maxCalls}. Aborting before any call.`,
    );
    process.exit(1);
  }
  if (mtd + pending.length > FREE_CAP_PER_MONTH) {
    console.error(
      `This run would exceed the monthly free cap (${mtd} used + ${pending.length} planned > ${FREE_CAP_PER_MONTH}). ` +
        `Aborting; pass a smaller scope or wait for the new month.`,
    );
    process.exit(1);
  }

  let calls = 0;
  for (const station of pending) {
    const loc = stationLocations[station.id];
    if (!loc) {
      console.warn(`  ${station.id}: no coordinates — skipping`);
      continue;
    }
    calls++;
    const places = await searchNearby(loc, apiKey);
    if (places !== null) {
      cache[station.id] = { fetchedAt: new Date().toISOString(), places };
      console.log(`  ${station.id}: ${places.length} places`);
    }
    // Persist after every call so an interrupted run loses nothing.
    writeFileSync(cachePath, JSON.stringify(cache, null, 2) + "\n");
  }
  ledger.push({
    date: new Date().toISOString().slice(0, 10),
    category,
    calls,
  });
  writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + "\n");
  console.log(
    `Made ${calls} calls (${monthToDateCalls(ledger)}/${FREE_CAP_PER_MONTH} month-to-date). ` +
      `Next: npm run seed:pois`,
  );
}

main();
