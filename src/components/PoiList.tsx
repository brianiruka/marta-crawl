import type { Poi } from "@/data/pois";
import { categoryMeta, categoryOrder } from "@/data/poiCategories";

type PoiListProps = {
  pois: Poi[];
  emptyMessage?: string;
};

function PoiCard({ poi, isTopPick }: { poi: Poi; isTopPick: boolean }) {
  return (
    <div
      className={[
        "rounded-md p-4",
        isTopPick
          ? "bg-zinc-800 ring-1 ring-inset ring-zinc-600"
          : "bg-zinc-800/60",
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between gap-3">
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
        {isTopPick && (
          <span className="shrink-0 text-xs font-medium text-zinc-400">
            Top pick
          </span>
        )}
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
  );
}

export function PoiList({
  pois,
  emptyMessage = "No POIs added for this station yet.",
}: PoiListProps) {
  if (pois.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyMessage}</p>;
  }

  const sections = categoryOrder
    .map((category) => ({
      category,
      items: pois.filter((poi) => poi.category === category),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex flex-col gap-8">
      {sections.map(({ category, items }) => {
        const meta = categoryMeta[category];
        return (
          <div key={category}>
            <h3
              className={`mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide uppercase ${meta.accent}`}
            >
              <span aria-hidden="true">{meta.icon}</span>
              {meta.label}
            </h3>
            <div className="flex flex-col gap-2">
              {items.map((poi, i) => (
                <PoiCard key={poi.name} poi={poi} isTopPick={i === 0} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
