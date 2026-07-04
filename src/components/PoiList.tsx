import type { Poi } from "@/data/pois";

type PoiListProps = {
  pois: Poi[];
  emptyMessage?: string;
};

export function PoiList({
  pois,
  emptyMessage = "No POIs added for this station yet.",
}: PoiListProps) {
  return (
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
      {pois.length === 0 && (
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      )}
    </div>
  );
}
