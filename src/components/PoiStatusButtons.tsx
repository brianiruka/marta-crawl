"use client";

import { listOrder, listMeta } from "@/data/poiListMeta";
import {
  poiKey,
  toggleFavorite,
  toggleStatus,
  usePoiEntry,
  type PoiStatus,
  type SavedPoiInput,
} from "@/lib/poiLists";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PoiStatusButtonsProps = {
  poi: SavedPoiInput;
  className?: string;
};

/** Three toggle buttons (favorite / been-there / up-next) for a POI. Meant
 * to sit outside any surrounding <a> — these are their own click targets,
 * not nested-interactive. */
export function PoiStatusButtons({ poi, className }: PoiStatusButtonsProps) {
  const key = poiKey(poi.stationId, poi);
  const entry = usePoiEntry(key);

  return (
    <div className={cn("flex items-center gap-0", className)}>
      {listOrder.map((id) => {
        const meta = listMeta[id];
        const Icon = meta.icon;
        const active =
          id === "favorites" ? !!entry?.favorited : entry?.status === id;
        return (
          <Button
            key={id}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-pressed={active}
            aria-label={meta.toggleLabel(poi.name)}
            title={meta.label}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (id === "favorites") toggleFavorite(poi);
              else toggleStatus(poi, id as PoiStatus);
            }}
            className={cn(
              // Active keeps its accent even on hover (the ghost variant's
              // hover:text-foreground would otherwise wash it to white);
              // inactive stays muted-then-white as before.
              active
                ? cn(meta.accent, meta.hoverAccent)
                : "text-muted-foreground/50 hover:text-foreground",
            )}
          >
            {/* key={active} remounts the icon when it turns on, restarting
                the pop keyframe (see globals.css) — the YouTube-like click
                burst. Turning OFF animates nothing, on purpose. */}
            <Icon
              key={active ? "on" : "off"}
              aria-hidden="true"
              className={cn(
                "size-4",
                active && meta.activeIconClass,
                active && "animate-[status-pop_320ms_ease-out]",
              )}
            />
          </Button>
        );
      })}
    </div>
  );
}
