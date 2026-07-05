// Data-access seam: pages and components read stations/POIs only through
// these functions. Today they serve flat-file data (deterministic, so pages
// prerender fully static). When the CMS lands, only the internals here change
// to fetches wrapped in 'use cache' + cacheTag — no page code moves.
import { stations, type Station } from "@/data/stations";
import { poisByStation, type Poi } from "@/data/pois";
import { generatedPoisByStation } from "@/data/pois.generated";

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
