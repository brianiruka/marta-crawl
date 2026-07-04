"use client";

import { useState } from "react";
import { MartaMap } from "@/components/MartaMap";
import { MapLegend } from "@/components/MapLegend";
import { stations } from "@/data/stations";
import { poisByStation } from "@/data/pois";
import { PoiList } from "@/components/PoiList";

export default function Home() {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const selectedStation = stations.find((s) => s.id === selectedStationId);
  const pois = selectedStationId ? poisByStation[selectedStationId] ?? [] : [];

  return (
    <div className="grid min-h-screen grid-cols-1 gap-8 bg-zinc-900 p-4 md:grid-cols-[1fr_420px] md:items-start md:gap-12 md:p-16">
      <div className="flex flex-col items-center gap-4">
        <MapLegend />
        <MartaMap
          selectedStationId={selectedStationId}
          onSelectStation={setSelectedStationId}
        />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-white">
          {selectedStation ? selectedStation.name : "Select a station"}
        </h2>
        {selectedStationId ? <PoiList pois={pois} /> : null}
      </div>
    </div>
  );
}
