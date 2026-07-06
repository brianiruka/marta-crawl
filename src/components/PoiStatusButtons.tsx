"use client";

import { listMeta, type ListId } from "@/data/poiListMeta";
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

// This tile's own display order -- favorite, then up-next, then been-there,
// matching the natural favorite -> plan to go -> actually went workflow.
// Deliberately separate from poiListMeta's `listOrder`, which still drives
// the Home menu's "Your lists" order and shouldn't change alongside this.
const iconOrder: ListId[] = ["favorites", "wantToGo", "visited"];

/** Three toggle buttons (favorite / up-next / been-there) for a POI. Meant
 * to sit outside any surrounding <a> — these are their own click targets,
 * not nested-interactive. */
export function PoiStatusButtons({ poi, className }: PoiStatusButtonsProps) {
  const key = poiKey(poi.stationId, poi);
  const entry = usePoiEntry(key);

  return (
    <div className={cn("flex items-center gap-0", className)}>
      {iconOrder.map((id) => {
        const meta = listMeta[id];
        const Icon = meta.icon;
        const active =
          id === "favorites" ? !!entry?.favorited : entry?.status === id;
        return (
          <Button
            key={id}
            type="button"
            variant="ghost"
            // icon-xs (24px box) rather than icon-sm (28px): the icon's own
            // explicit size-4 class is unaffected by button size, so this
            // just trims the surrounding hit-box padding, tightening the
            // visual gap between the three icons without shrinking them.
            size="icon-xs"
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
