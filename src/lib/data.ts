// Data-access seam: pages and components read stations/POIs only through
// these functions. Today they serve flat-file data (deterministic, so pages
// prerender fully static). When the CMS lands, only the internals here change
// to fetches wrapped in 'use cache' + cacheTag — no page code moves.
import { stations, type Station } from "@/data/stations";
import { poisByStation, type Poi } from "@/data/pois";

export async function getStations(): Promise<Station[]> {
  return stations;
}

export async function getStation(slug: string): Promise<Station | undefined> {
  return stations.find((s) => s.id === slug);
}

export async function getPoisForStation(slug: string): Promise<Poi[]> {
  return poisByStation[slug] ?? [];
}
