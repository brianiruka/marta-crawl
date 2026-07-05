import Link from "next/link";
import { notFound } from "next/navigation";
import { LineBadges } from "@/components/LineBadges";
import { PoiList } from "@/components/PoiList";
import { StationPanel } from "@/components/StationPanel";
import { getPoisForStation, getStation, getStations } from "@/lib/data";

export async function generateStaticParams() {
  const stations = await getStations();
  return stations.map((station) => ({ slug: station.id }));
}

export default async function StationPanelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const station = await getStation(slug);
  if (!station) notFound();

  const pois = await getPoisForStation(slug);

  return (
    <StationPanel>
      <h2 className="font-display text-2xl font-semibold text-foreground">
        {station.name}
      </h2>
      <LineBadges lines={station.lines} />
      <div className="mt-8">
        <PoiList pois={pois} />
      </div>
      <Link
        href={`/stations/${station.id}`}
        className="mt-6 inline-block text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        Open full station page
      </Link>
    </StationPanel>
  );
}
