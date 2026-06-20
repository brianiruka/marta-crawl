"use client";

import { useState } from "react";
import { MartaMap } from "@/components/MartaMap";
import { stations } from "@/data/stations";
import { poisByStation } from "@/data/pois";

export default function Home() {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const selectedStation = stations.find((s) => s.id === selectedStationId);
  const pois = selectedStationId ? poisByStation[selectedStationId] ?? [] : [];

  return (
    <div className="flex min-h-screen items-start justify-center gap-12 bg-zinc-900 p-16">
      <MartaMap
        selectedStationId={selectedStationId}
        onSelectStation={setSelectedStationId}
      />

      <div className="w-80">
        <h2 className="mb-4 text-xl font-semibold text-white">
          {selectedStation ? selectedStation.name : "Select a station"}
        </h2>
        <div className="flex flex-col gap-3">
          {pois.map((poi) => (
            <div key={poi.name} className="rounded-md bg-zinc-800 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{poi.name}</span>
                <span className="rounded-full bg-zinc-700 px-2 py-1 text-xs text-zinc-300">
                  {poi.category}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-400">{poi.description}</p>
            </div>
          ))}
          {selectedStationId && pois.length === 0 && (
            <p className="text-sm text-zinc-500">No POIs added for this station yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
