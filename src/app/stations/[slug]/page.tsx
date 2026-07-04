import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PoiList } from "@/components/PoiList";
import { getPoisForStation, getStation, getStations } from "@/lib/data";
import type { LineId } from "@/data/stations";

const lineLabel: Record<LineId, string> = {
  red: "Red Line",
  gold: "Gold Line",
  blue: "Blue Line",
  green: "Green Line",
  streetcar: "Streetcar",
};

const lineFill: Record<LineId, string> = {
  red: "bg-line-red",
  gold: "bg-line-gold",
  blue: "bg-line-blue",
  green: "bg-line-green",
  streetcar: "bg-line-streetcar",
};

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

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl bg-zinc-900 p-4 md:p-16">
      <Link
        href="/"
        className="text-sm text-zinc-400 transition-colors hover:text-white"
      >
        &larr; Back to the map
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <h1 className="text-3xl font-semibold text-white">{station.name}</h1>
      </div>
      <div className="mt-3 flex gap-2">
        {station.lines.map((line) => (
          <span
            key={line}
            className={`rounded-full px-3 py-1 text-xs font-medium text-white ${lineFill[line]}`}
          >
            {lineLabel[line]}
          </span>
        ))}
      </div>
      <h2 className="mt-10 mb-4 text-xl font-semibold text-white">
        Nearby stops
      </h2>
      <PoiList pois={pois} />
    </main>
  );
}
