"use client";

import { usePathname, useRouter } from "next/navigation";
import { MartaMap } from "@/components/MartaMap";
import { PageTransition } from "@/components/PageTransition";
import { PanelTrigger } from "@/components/PanelTrigger";
import { StationIndex } from "@/components/StationIndex";

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const selectedStationId = pathname.startsWith("/stations/")
    ? decodeURIComponent(pathname.split("/")[2] ?? "")
    : null;

  return (
    <PageTransition>
      <PanelTrigger />
      <div
        // The map "makes room" for the right-side panels so it stays
        // centered in the REMAINING viewport. Both panels broadcast their
        // open state as html[data-explore-open]/[data-station-open]
        // attributes, and .map-shell's CSS rule (globals.css) pads
        // accordingly at the same 300ms curve as the sheet slide — map and
        // drawer move together, no overlap. (An attribute+descendant CSS
        // rule outranks the md:p-16 shorthand here; a Tailwind pr- class
        // at a lower breakpoint would lose that cascade fight.)
        className="atmosphere-dots map-shell flex min-h-screen flex-col items-center gap-4 p-4 md:p-16"
      >
        {/* The searchable list is the accessible primary way to reach a
            station where the map's hover/precise-tap fails — touch and
            smaller screens. On desktop the map (with focusable markers +
            fisheye) is the hero, so the list is hidden there. */}
        <StationIndex className="lg:hidden" />
        <MartaMap
          selectedStationId={selectedStationId}
          onSelectStation={(id) => {
            const path = `/stations/${id}`;
            // If a panel is already open, replace so the history stays one
            // deep and "Back to the map" (router.back) always returns to "/",
            // not to the previously clicked station.
            if (selectedStationId) router.replace(path);
            else router.push(path);
          }}
        />
      </div>
    </PageTransition>
  );
}
