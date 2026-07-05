"use client";

import { usePathname, useRouter } from "next/navigation";
import { MartaMap } from "@/components/MartaMap";
import { MapLegend } from "@/components/MapLegend";
import { PageTransition } from "@/components/PageTransition";
import { cn } from "@/lib/utils";

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const selectedStationId = pathname.startsWith("/stations/")
    ? decodeURIComponent(pathname.split("/")[2] ?? "")
    : null;

  return (
    <PageTransition>
      <div
        // The map "makes room" for the station sheet: padding animates in
        // sync with the sheet's slide-in (both 300ms ease-in-out) so the two
        // read as one choreographed motion instead of an overlay covering
        // the map.
        className={cn(
          "atmosphere-dots flex min-h-screen flex-col items-center gap-4 p-4 transition-[padding] duration-300 ease-in-out md:p-16",
          selectedStationId && "md:pr-[28rem]",
        )}
      >
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
    </PageTransition>
  );
}
