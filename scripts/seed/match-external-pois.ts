/**
 * Matches every named entry from four external "best MARTA dining/
 * attractions" lists to a real Google Place via Text Search (New), so they
 * can carry the same rating/website/mapsUrl fields as every other POI and
 * so cross-source consensus (see build-pois.ts) can be computed.
 *
 * Sources (static seed files, no network to read them):
 *   data/roughdraft-seed.json      — Rough Draft Atlanta, station label only
 *   data/mymap-seed.json           — Google My Maps KML export, has lat/lng
 *   data/infatuation-seed.json     — The Infatuation, station label only
 *   data/discoveratlanta-seed.json — Discover Atlanta, station label only
 *
 * Usage:
 *   npm run match-external                          # DRY RUN (default)
 *   npm run match-external -- --execute --max-calls 400
 *   npm run match-external -- --execute --refresh    # re-match cached entries
 *
 * Cost model: one Text Search call per named entry. The field mask includes
 * rating/userRatingCount/websiteUri, which puts every call in the Enterprise
 * SKU — 1,000 free/month, $20/1K after, SHARED with discover-pois.ts's ledger
 * (data/discovery/call-log.json) — this is not a separate budget.
 *
 * Guardrails (same contract as discover-pois.ts / build-pois.ts):
 *   1. Dry run is the DEFAULT — no network without --execute.
 *   2. Cache-first: entries already in data/discovery/external-matches.json
 *      are skipped unless --refresh.
 *   3. Fixed field mask — do NOT add fields without rechecking SKU tiers.
 *   4. --execute requires GOOGLE_PLACES_API_KEY and honors --max-calls
 *      (default 50); hard-aborts before exceeding it or the shared free cap.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stationLocations } from "../../src/data/stationLocations";

const DISCOVERY_DIR = "data/discovery";
const CACHE_PATH = `${DISCOVERY_DIR}/external-matches.json`;
const LEDGER_PATH = `${DISCOVERY_DIR}/call-log.json`;
const FREE_CAP_PER_MONTH = 1000;
const SEARCH_RADIUS_METERS = 1207; // 0.75 mi, matching build-pois.ts's cutoff

// Enterprise SKU because of rating/userRatingCount/websiteUri. Fixed — see
// header. Same tier and same fields as discover-pois.ts's FIELD_MASK.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.businessStatus",
].join(",");

type SeedEntry = {
  name: string;
  stationId?: string;
  lat?: number;
  lng?: number;
  source: string;
};

type MatchStatus = "matched" | "low-confidence" | "no-match";

export type MatchResult = {
  status: MatchStatus;
  query: string;
  source: string;
  stationId?: string;
  placeId?: string;
  matchedName?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  reviewCount?: number;
  mapsUrl?: string;
  websiteUrl?: string;
  types?: string[];
  nameSimilarity?: number;
  distanceFromHintMiles?: number;
};

type MatchCache = Record<string, MatchResult>;
type LedgerEntry = { date: string; category: string; calls: number };

const SOURCE_FILES: Record<string, string> = {
  roughdraft: "data/roughdraft-seed.json",
  mymap: "data/mymap-seed.json",
  infatuation: "data/infatuation-seed.json",
  discoveratlanta: "data/discoveratlanta-seed.json",
};

function loadSeeds(): SeedEntry[] {
  const all: SeedEntry[] = [];
  for (const [source, path] of Object.entries(SOURCE_FILES)) {
    if (!existsSync(path)) continue;
    const rows = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>[];
    for (const row of rows) {
      all.push({
        name: row.name as string,
        stationId: row.stationId as string | undefined,
        lat: row.lat as number | undefined,
        lng: row.lng as number | undefined,
        source,
      });
    }
  }
  return all;
}

/** Cache key: source+name+station disambiguates the same chain name cited
 * near different stations (e.g. "The Flying Biscuit Cafe" at Buckhead vs.
 * at Edgewood/Candler Park must not collide into one cache entry). */
function seedKey(entry: SeedEntry): string {
  return `${entry.source}:${entry.name}:${entry.stationId ?? `${entry.lat},${entry.lng}`}`;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Cheap token-overlap similarity — good enough for ~450 short business
 * names, no fuzzy-matching library needed. */
function nameSimilarity(a: string, b: string): number {
  const ta = new Set(normalize(a).split(" ").filter(Boolean));
  const tb = new Set(normalize(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  return overlap / Math.max(ta.size, tb.size);
}

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function monthToDateCalls(ledger: LedgerEntry[]): number {
  const prefix = new Date().toISOString().slice(0, 7);
  return ledger.filter((e) => e.date.startsWith(prefix)).reduce((sum, e) => sum + e.calls, 0);
}

type RawTextSearchPlace = {
  id: string;
  displayName?: { text?: string };
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  types?: string[];
};

async function searchText(
  query: string,
  bias: { lat: number; lng: number },
  apiKey: string,
): Promise<RawTextSearchPlace | null> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: bias.lat, longitude: bias.lng },
          radius: SEARCH_RADIUS_METERS,
        },
      },
      maxResultCount: 1,
    }),
  });
  if (!res.ok) {
    console.warn(`  HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return null;
  }
  const body = (await res.json()) as { places?: RawTextSearchPlace[] };
  return body.places?.[0] ?? null;
}

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const refresh = args.includes("--refresh");
const maxCallsArg = args.indexOf("--max-calls");
const maxCalls = maxCallsArg >= 0 ? Number(args[maxCallsArg + 1]) : 50;

async function main() {
  mkdirSync(DISCOVERY_DIR, { recursive: true });
  const cache: MatchCache = existsSync(CACHE_PATH)
    ? JSON.parse(readFileSync(CACHE_PATH, "utf8"))
    : {};
  const ledger: LedgerEntry[] = existsSync(LEDGER_PATH)
    ? JSON.parse(readFileSync(LEDGER_PATH, "utf8"))
    : [];

  const seeds = loadSeeds();
  const bySource = new Map<string, number>();
  for (const s of seeds) bySource.set(s.source, (bySource.get(s.source) ?? 0) + 1);

  const pending = seeds.filter((s) => refresh || !cache[seedKey(s)]);
  const mtd = monthToDateCalls(ledger);

  console.log("Seed counts by source:");
  for (const [source, count] of bySource) console.log(`  ${source}: ${count}`);
  console.log(`Total named entries: ${seeds.length}`);
  console.log(`Cache: ${Object.keys(cache).length} already matched; planned calls: ${pending.length}`);
  console.log(`Ledger: ${mtd}/${FREE_CAP_PER_MONTH} Enterprise-SKU calls used this month (shared with discover-pois.ts)`);

  if (!execute) {
    console.log(
      `\nDRY RUN (default): would call Text Search ${pending.length} times ` +
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
    console.error(`Would make ${pending.length} calls but --max-calls is ${maxCalls}. Aborting before any call.`);
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
  for (const entry of pending) {
    const bias =
      entry.lat && entry.lng
        ? { lat: entry.lat, lng: entry.lng }
        : entry.stationId
          ? stationLocations[entry.stationId]
          : undefined;
    if (!bias) {
      console.warn(`  ${entry.name} (${entry.source}): no location hint — skipping`);
      continue;
    }
    calls++;
    const query = `${entry.name} Atlanta GA`;
    const result = await searchText(query, bias, apiKey);
    const key = seedKey(entry);
    if (!result) {
      cache[key] = { status: "no-match", query, source: entry.source, stationId: entry.stationId };
      console.log(`  no-match: ${entry.name} (${entry.source})`);
    } else {
      const resultLoc = result.location
        ? { lat: result.location.latitude, lng: result.location.longitude }
        : bias;
      const similarity = nameSimilarity(entry.name, result.displayName?.text ?? "");
      const distanceFromHintMiles = haversineMiles(bias, resultLoc);
      const status: MatchStatus =
        similarity >= 0.6 && distanceFromHintMiles <= 2 ? "matched" : "low-confidence";
      cache[key] = {
        status,
        query,
        source: entry.source,
        stationId: entry.stationId,
        placeId: result.id,
        matchedName: result.displayName?.text,
        lat: resultLoc.lat,
        lng: resultLoc.lng,
        rating: result.rating,
        reviewCount: result.userRatingCount,
        mapsUrl: result.googleMapsUri,
        websiteUrl: result.websiteUri,
        types: result.types,
        nameSimilarity: Math.round(similarity * 100) / 100,
        distanceFromHintMiles: Math.round(distanceFromHintMiles * 100) / 100,
      };
      console.log(
        `  ${status}: ${entry.name} (${entry.source}) -> ${result.displayName?.text ?? "?"} ` +
          `[sim ${similarity.toFixed(2)}, ${distanceFromHintMiles.toFixed(2)} mi]`,
      );
    }
    // Persist after every call so an interrupted run loses nothing.
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n");
  }

  ledger.push({ date: new Date().toISOString().slice(0, 10), category: "external-match", calls });
  writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + "\n");

  const values = Object.values(cache);
  const matched = values.filter((v) => v.status === "matched").length;
  const lowConf = values.filter((v) => v.status === "low-confidence").length;
  const noMatch = values.filter((v) => v.status === "no-match").length;
  console.log(`\nMade ${calls} calls (${monthToDateCalls(ledger)}/${FREE_CAP_PER_MONTH} month-to-date).`);
  console.log(`Results: ${matched} matched, ${lowConf} low-confidence (review), ${noMatch} no-match.`);
  if (lowConf > 0 || noMatch > 0) {
    console.log("\nLow-confidence / no-match entries for manual review:");
    for (const [key, v] of Object.entries(cache)) {
      if (v.status === "matched") continue;
      console.log(`  [${v.status}] ${key} — query: "${v.query}"${v.matchedName ? ` — closest: "${v.matchedName}"` : ""}`);
    }
  }
  console.log("\nNext: npm run seed:pois");
}

main();
