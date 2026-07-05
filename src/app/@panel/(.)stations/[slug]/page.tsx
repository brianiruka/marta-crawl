import { notFound } from "next/navigation";
import { LineAccent, LineBadges } from "@/components/LineBadges";
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
      <LineAccent lines={station.lines} className="mt-2" />
      <LineBadges lines={station.lines} />
      <div className="mt-8">
        <PoiList pois={pois} station={{ id: station.id, name: station.name }} />
      </div>
      {/* Plain <a>, not <Link>: the panel already lives at this URL, so a
          soft navigation is a no-op. A hard navigation skips the route
          interception and renders the standalone page. */}
      <a
        href={`/stations/${station.id}`}
        className="mt-6 inline-block text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        Open full station page
      </a>
    </StationPanel>
  );
}
