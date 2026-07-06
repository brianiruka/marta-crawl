// Data-access seam: pages and components read stations/POIs only through
// these functions. Today they serve flat-file data (deterministic, so pages
// prerender fully static). When the CMS lands, only the internals here change
// to fetches wrapped in 'use cache' + cacheTag — no page code moves.
import { stations, type Station } from "@/data/stations";
import { poisByStation, type Poi } from "@/data/pois";
import { generatedPoisByStation } from "@/data/pois.generated";
import { categoryOrder } from "@/data/poiCategories";
import { lineOrder } from "@/data/lineOrder";

export async function getStations(): Promise<Station[]> {
  return stations;
}

export async function getStation(slug: string): Promise<Station | undefined> {
  return stations.find((s) => s.id === slug);
}

export async function getPoisForStation(slug: string): Promise<Poi[]> {
  // Curated entries (hand-written sights) first, then the generated
  // coffee-shop dataset, deduped by name in case a shop is in both.
  const curated = poisByStation[slug] ?? [];
  const curatedNames = new Set(curated.map((p) => p.name));
  const generated = (generatedPoisByStation[slug] ?? []).filter(
    (p) => !curatedNames.has(p.name),
  );
  return [...curated, ...generated];
}

/** Per-station POI totals, used as the "x of y" denominator in the "Been
 * there" sidebar. Computed at build time from the same merge/dedupe as
 * getPoisForStation, so it never drifts from what a station page shows. */
export async function getPoiCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const station of stations) {
    counts[station.id] = (await getPoisForStation(station.id)).length;
  }
  return counts;
}

export type NearbyStation = { id: string; name: string; stops: number };

/** Nearest stations, on any line the given station serves, that actually
 * have POIs — so an empty station page can point somewhere instead of
 * dead-ending. Walks outward in lineOrder from the station's position on
 * each of its lines, keeps the smallest stop-distance per station, and
 * returns the closest few. */
export async function getNearbyStationsWithPois(
  slug: string,
  limit = 3,
): Promise<NearbyStation[]> {
  const station = stations.find((s) => s.id === slug);
  if (!station) return [];
  const counts = await getPoiCounts();
  const byId = new Map(stations.map((s) => [s.id, s]));

  // Smallest stop-distance found for each candidate station id.
  const best = new Map<string, number>();
  for (const line of station.lines) {
    const sequence = lineOrder[line];
    const here = sequence.indexOf(slug);
    if (here === -1) continue;
    for (let i = 0; i < sequence.length; i++) {
      const id = sequence[i];
      if (id === slug || (counts[id] ?? 0) === 0) continue;
      const stops = Math.abs(i - here);
      if (!best.has(id) || stops < best.get(id)!) best.set(id, stops);
    }
  }

  return [...best.entries()]
    .map(([id, stops]) => ({ id, name: byId.get(id)?.name ?? id, stops }))
    .sort((a, b) => a.stops - b.stops || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export type CategoryStationGroup = {
  stationId: string;
  stationName: string;
  pois: Poi[];
};

/** Every POI, system-wide, grouped by category then by station (stations
 * sorted alphabetically) — feeds the category browse sidebar. Built from
 * the same getPoisForStation merge/dedupe as everything else. */
export async function getPoisByCategory(): Promise<
  Record<Poi["category"], CategoryStationGroup[]>
> {
  const result = Object.fromEntries(
    categoryOrder.map((category) => [category, [] as CategoryStationGroup[]]),
  ) as Record<Poi["category"], CategoryStationGroup[]>;

  for (const station of stations) {
    const pois = await getPoisForStation(station.id);
    const byCategory = new Map<Poi["category"], Poi[]>();
    for (const poi of pois) {
      const list = byCategory.get(poi.category);
      if (list) list.push(poi);
      else byCategory.set(poi.category, [poi]);
    }
    for (const [category, list] of byCategory) {
      result[category].push({ stationId: station.id, stationName: station.name, pois: list });
    }
  }

  for (const category of categoryOrder) {
    result[category].sort((a, b) => a.stationName.localeCompare(b.stationName));
  }
  return result;
}
