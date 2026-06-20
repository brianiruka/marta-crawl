"use client";

import { useState } from "react";
import { StationBadge } from "@/components/StationBadge";
import { stations, redLinePath } from "@/data/stations";

type MartaMapProps = {
  selectedStationId: string | null;
  onSelectStation: (id: string) => void;
};

export function MartaMap({ selectedStationId, onSelectStation }: MartaMapProps) {
  return (
    <div className="relative h-[520px] w-[400px]">
      <svg
        viewBox="0 0 400 500"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <polyline
          points={redLinePath}
          fill="none"
          className="stroke-line-red"
          strokeWidth={6}
          strokeLinecap="round"
        />
      </svg>

      {stations.map((station) => (
        <div
          key={station.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: station.x, top: station.y }}
        >
          <StationBadge
            line={station.lines[0]}
            interchange={station.interchange}
            selected={station.id === selectedStationId}
            label={station.name}
            onClick={() => onSelectStation(station.id)}
          />
          <span className="absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap text-sm text-white">
            {station.name}
          </span>
        </div>
      ))}
    </div>
  );
}
