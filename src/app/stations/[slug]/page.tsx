import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LineAccent, LineBadges, lineLabel } from "@/components/LineBadges";
import { PageTransition } from "@/components/PageTransition";
import { PoiList } from "@/components/PoiList";
import {
  getNearbyStationsWithPois,
  getPoisForStation,
  getStation,
  getStations,
} from "@/lib/data";

type StationPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const stations = await getStations();
  return stations.map((station) => ({ slug: station.id }));
}

export async function generateMetadata({
  params,
}: StationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const station = await getStation(slug);
  if (!station) return {};
  return {
    title: station.name,
    description: `Points of interest near ${station.name} station on the MARTA ${station.lines
      .map((line) => lineLabel[line])
      .join(" and ")}.`,
  };
}

export default async function StationPage({ params }: StationPageProps) {
  const { slug } = await params;
  const station = await getStation(slug);
  if (!station) notFound();

  const pois = await getPoisForStation(slug);
  const nearbyStations = pois.length === 0 ? await getNearbyStationsWithPois(slug) : [];

  return (
    <PageTransition>
      <main className="mx-auto min-h-screen w-full max-w-2xl p-4 md:p-16">
      <Link
        href="/"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        &larr; Back to the map
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          {station.name}
        </h1>
      </div>
      <LineAccent lines={station.lines} className="mt-3 w-24" />
      <LineBadges lines={station.lines} />
      <h2 className="mt-10 mb-4 font-display text-xl font-semibold text-foreground">
        Nearby stops
      </h2>
        <PoiList
          pois={pois}
          station={{ id: station.id, name: station.name }}
          nearbyStations={nearbyStations}
        />
      </main>
    </PageTransition>
  );
}
