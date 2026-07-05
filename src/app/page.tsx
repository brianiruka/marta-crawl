"use client";

import { usePathname, useRouter } from "next/navigation";
import { MartaMap } from "@/components/MartaMap";
import { MapLegend } from "@/components/MapLegend";

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const selectedStationId = pathname.startsWith("/stations/")
    ? decodeURIComponent(pathname.split("/")[2] ?? "")
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 p-4 md:p-16">
      <MapLegend />
      <MartaMap
        selectedStationId={selectedStationId}
        onSelectStation={(id) => {
          const path = `/stations/${id}`;
          // If a panel is already open, replace so the history stays one deep
          // and "Back to the map" (router.back) always returns to "/", not to
          // the previously clicked station.
          if (selectedStationId) router.replace(path);
          else router.push(path);
        }}
      />
    </div>
  );
}
