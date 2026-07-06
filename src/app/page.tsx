"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { stations, type Station } from "@/data/stations";
import { resolveCrawlOrder, useCrawlMemberKeys, useStationOrderOverride } from "@/lib/crawlBuilder";
import { usePoiEntries } from "@/lib/poiLists";
import { useCoarsePointer } from "@/lib/useCoarsePointer";
import { MartaMap } from "@/components/MartaMap";
import { PageTransition } from "@/components/PageTransition";
import { PanelTrigger } from "@/components/PanelTrigger";
import { StationIndex } from "@/components/StationIndex";

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  // The map's fisheye/hover wayfinding is mouse-only, so coarse-pointer
  // devices need the searchable list regardless of width. Fine pointers
  // keep it below lg only (the map is the hero on desktop). Without this,
  // a landscape tablet >=lg gets neither affordance.
  const isCoarse = useCoarsePointer();
  const selectedStationId = pathname.startsWith("/stations/")
    ? decodeURIComponent(pathname.split("/")[2] ?? "")
    : null;

  // The crawl route overlay is a standing feature of the map whenever the
  // user has any crawl members at all -- not gated to only showing while
  // the crawl panel itself happens to be open. Gating it that way made
  // adding something to the crawl from the Up Next panel look like nothing
  // had happened, since the map wouldn't reflect it until you separately
  // navigated to the crawl panel.
  const entriesMap = usePoiEntries();
  const memberKeys = useCrawlMemberKeys();
  const override = useStationOrderOverride();
  const crawlStations = useMemo(() => {
    const memberSet = new Set(memberKeys);
    const stationIds = new Set<string>();
    for (const entry of Object.values(entriesMap)) {
      if (entry.status === "wantToGo" && memberSet.has(entry.key)) stationIds.add(entry.stationId);
    }
    if (stationIds.size === 0) return undefined;
    const order = resolveCrawlOrder([...stationIds], override, stations);
    return order
      .map((id) => stations.find((s) => s.id === id))
      .filter((s): s is Station => s !== undefined);
  }, [entriesMap, memberKeys, override]);

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
        <StationIndex className={isCoarse ? undefined : "lg:hidden"} />
        <MartaMap
          selectedStationId={selectedStationId}
          crawlStations={crawlStations}
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
