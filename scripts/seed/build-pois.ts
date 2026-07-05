/**
 * Builds src/data/pois.generated.ts — a pure, offline transform. Never makes
 * network calls; discovery (network) lives in discover-pois.ts.
 *
 * Sources, merged and deduped by Place ID:
 *   1. data/coffee-ga-seed.csv + data/place-locations.json — the original
 *      hand-curated coffee sheet. Curated ⇒ BYPASSES quality floors.
 *   2. data/discovery/<category>.json — Nearby Search sweeps. Machine-found ⇒
 *      quality floors from scripts/seed/categories.ts apply.
 *   3. data/curation.json — editorial overlay: { "exclude": [placeIds],
 *      "pin": [placeIds] }. Excluded places are dropped from any source;
 *      pinned places bypass floors and sort first.
 *
 * Each place is assigned to its nearest station within MAX_DISTANCE_MILES,
 * categorized from its own `types` (see categoryForTypes), capped per
 * station per category, and sorted in crawl-day order.
 *
 * Usage: npm run seed:pois
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { stations } from "../../src/data/stations";
import { stationLocations } from "../../src/data/stationLocations";
import type { Poi } from "../../src/data/pois";
import {
  categoryForTypes,
  categoryOrder,
  discoveryCategories,
} from "./categories";
import type { CategoryCache } from "./discover-pois";

const CSV_PATH = "data/coffee-ga-seed.csv";
const LOCATION_CACHE_PATH = "data/place-locations.json";
const DISCOVERY_DIR = "data/discovery";
const CURATION_PATH = "data/curation.json";
const OUTPUT_PATH = "src/data/pois.generated.ts";
const MAX_DISTANCE_MILES = 0.75;
const WALK_MPH = 3;

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

type Candidate = {
  placeId: string;
  name: string;
  category: Poi["category"];
  rating?: number;
  reviewCount?: number;
  mapsUrl?: string;
  websiteUrl?: string;
  loc: { lat: number; lng: number };
  neighborhood?: string;
  curated: boolean;
};

type Curation = { exclude: string[]; pin: string[] };

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

function loadSheetCandidates(): Candidate[] {
  if (!existsSync(CSV_PATH) || !existsSync(LOCATION_CACHE_PATH)) return [];
  const locations: Record<string, { lat: number; lng: number }> = JSON.parse(
    readFileSync(LOCATION_CACHE_PATH, "utf8"),
  );
  const rows: Record<string, string>[] = parse(readFileSync(CSV_PATH, "utf8"), {
    columns: true,
    skip_empty_lines: true,
  });
  const candidates: Candidate[] = [];
  for (const row of rows) {
    if (!MARTA_CITIES.has(row.City?.trim())) continue;
    const placeId = row["Place ID"]?.trim();
    const loc = placeId ? locations[placeId] : undefined;
    if (!loc) continue;
    const types = (row.Types ?? "").split(",").map((t) => t.trim());
    candidates.push({
      placeId,
      name: row["Coffee Shop"].trim(),
      category: categoryForTypes(types),
      rating: Number(row.Rating) || undefined,
      reviewCount: Number(row["Review Count"]) || undefined,
      mapsUrl: row["Google Maps Link"]?.trim() || undefined,
      loc,
      neighborhood: row.Neighborhood?.trim() || undefined,
      curated: true, // hand-curated sheet bypasses quality floors
    });
  }
  return candidates;
}

function loadDiscoveryCandidates(): Candidate[] {
  if (!existsSync(DISCOVERY_DIR)) return [];
  const candidates: Candidate[] = [];
  for (const file of readdirSync(DISCOVERY_DIR)) {
    if (!file.endsWith(".json") || file === "call-log.json") continue;
    const cache: CategoryCache = JSON.parse(
      readFileSync(`${DISCOVERY_DIR}/${file}`, "utf8"),
    );
    for (const { places } of Object.values(cache)) {
      for (const place of places) {
        if (place.businessStatus && place.businessStatus !== "OPERATIONAL")
          continue;
        if (!place.location || !place.displayName?.text) continue;
        candidates.push({
          placeId: place.id,
          name: place.displayName.text,
          category: categoryForTypes(place.types ?? []),
          rating: place.rating,
          reviewCount: place.userRatingCount,
          mapsUrl: place.googleMapsUri,
          websiteUrl: place.websiteUri,
          loc: { lat: place.location.latitude, lng: place.location.longitude },
          curated: false,
        });
      }
    }
  }
  return candidates;
}

function passesFloor(c: Candidate): boolean {
  // Floors are defined per discovery category; map the candidate's Poi
  // category back to the closest config (food → eats, sight → sights, etc.).
  const configKey =
    c.category === "food"
      ? "eats"
      : c.category === "sight"
        ? "sights"
        : c.category === "bakery"
          ? "treats"
          : c.category;
  const config = discoveryCategories[configKey];
  if (!config) return true;
  return (
    (c.rating ?? 0) >= config.minRating &&
    (c.reviewCount ?? 0) >= config.minReviews
  );
}

function main() {
  const curation: Curation = existsSync(CURATION_PATH)
    ? JSON.parse(readFileSync(CURATION_PATH, "utf8"))
    : { exclude: [], pin: [] };
  const excluded = new Set(curation.exclude);
  const pinned = new Set(curation.pin);

  const sheet = loadSheetCandidates();
  const discovered = loadDiscoveryCandidates();
  console.log(
    `Candidates: ${sheet.length} from sheet (curated), ${discovered.length} from discovery caches`,
  );

  // Dedupe by Place ID. Sheet first: curated status wins over a discovery
  // duplicate of the same place, but missing fields (e.g. the sheet has no
  // website column) are filled in from the duplicate.
  const byPlaceId = new Map<string, Candidate>();
  for (const c of [...sheet, ...discovered]) {
    if (excluded.has(c.placeId)) continue;
    const existing = byPlaceId.get(c.placeId);
    if (!existing) {
      byPlaceId.set(c.placeId, c);
    } else {
      existing.websiteUrl ??= c.websiteUrl;
      existing.rating ??= c.rating;
      existing.reviewCount ??= c.reviewCount;
      existing.mapsUrl ??= c.mapsUrl;
    }
  }

  const perStation: Record<string, (Poi & { _pinned: boolean })[]> = {};
  const dropped = { floor: 0, distance: 0 };
  for (const c of byPlaceId.values()) {
    const isPinned = pinned.has(c.placeId);
    if (!c.curated && !isPinned && !passesFloor(c)) {
      dropped.floor++;
      continue;
    }
    let nearest: { id: string; miles: number } | null = null;
    for (const station of stations) {
      const stationLoc = stationLocations[station.id];
      if (!stationLoc) continue;
      const miles = haversineMiles(c.loc, stationLoc);
      if (!nearest || miles < nearest.miles) nearest = { id: station.id, miles };
    }
    if (!nearest || nearest.miles > MAX_DISTANCE_MILES) {
      dropped.distance++;
      continue;
    }
    const miles = Math.round(nearest.miles * 100) / 100;
    const walkMinutes = Math.max(1, Math.round((nearest.miles / WALK_MPH) * 60));
    const where = c.neighborhood ? `${c.neighborhood} — about` : "About";
    (perStation[nearest.id] ??= []).push({
      name: c.name,
      category: c.category,
      description: `${where} a ${walkMinutes}-minute walk from the station.`,
      placeId: c.placeId,
      rating: c.rating,
      reviewCount: c.reviewCount,
      mapsUrl: c.mapsUrl,
      websiteUrl: c.websiteUrl,
      distanceMiles: miles,
      walkMinutes,
      _pinned: isPinned,
    });
  }

  // Per station: crawl-day category order, pinned first within a category,
  // then rating; cap per category.
  const poisByStation: Record<string, Poi[]> = {};
  let total = 0;
  for (const [stationId, pois] of Object.entries(perStation)) {
    const kept: Poi[] = [];
    for (const category of categoryOrder) {
      const config =
        discoveryCategories[
          category === "food"
            ? "eats"
            : category === "sight"
              ? "sights"
              : category === "bakery"
                ? "treats"
                : category
        ];
      const cap = config?.maxPerStation ?? 8;
      const group = pois
        .filter((p) => p.category === category)
        .sort(
          (a, b) =>
            Number(b._pinned) - Number(a._pinned) ||
            (b.rating ?? 0) - (a.rating ?? 0),
        )
        .slice(0, cap);
      for (const entry of group) {
        const { _pinned: _, ...poi } = entry;
        void _;
        kept.push(poi);
      }
    }
    if (kept.length > 0) {
      poisByStation[stationId] = kept;
      total += kept.length;
    }
  }

  console.log(
    `Assigned ${total} POIs to ${Object.keys(poisByStation).length} stations ` +
      `(${dropped.floor} below quality floor, ${dropped.distance} beyond ${MAX_DISTANCE_MILES} mi).`,
  );

  const output = `// GENERATED by scripts/seed/build-pois.ts — do not edit by hand.
// Sources: data/coffee-ga-seed.csv, data/discovery/*.json, data/curation.json.
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
