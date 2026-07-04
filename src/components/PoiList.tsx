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
          <div className="flex items-center justify-between gap-2">
            {poi.mapsUrl ? (
              <a
                href={poi.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-white underline-offset-4 hover:underline"
              >
                {poi.name}
              </a>
            ) : (
              <span className="font-medium text-white">{poi.name}</span>
            )}
            <span className="shrink-0 rounded-full bg-zinc-700 px-2 py-1 text-xs text-zinc-300">
              {poi.category}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">{poi.description}</p>
          {(poi.rating !== undefined || poi.walkMinutes !== undefined) && (
            <p className="mt-2 text-xs text-zinc-500">
              {[
                poi.rating !== undefined &&
                  `★ ${poi.rating.toFixed(1)}${
                    poi.reviewCount ? ` (${poi.reviewCount})` : ""
                  }`,
                poi.walkMinutes !== undefined && `${poi.walkMinutes} min walk`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      ))}
      {pois.length === 0 && (
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      )}
    </div>
  );
}
