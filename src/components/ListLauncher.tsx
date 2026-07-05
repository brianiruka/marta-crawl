"use client";

import { usePathname, useRouter } from "next/navigation";
import { listOrder, listMeta } from "@/data/poiListMeta";
import { usePoiEntries } from "@/lib/poiLists";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Opens each personal-list sheet (see ListSheet.tsx) via the ?list= query
 * param. Replaces the old line-color legend on the homepage — the map and
 * station badges already teach the line colors. */
export function ListLauncher() {
  const router = useRouter();
  const pathname = usePathname();
  const entries = usePoiEntries();

  const counts = {
    favorites: 0,
    visited: 0,
    wantToGo: 0,
  };
  for (const entry of Object.values(entries)) {
    if (entry.favorited) counts.favorites++;
    if (entry.status === "visited") counts.visited++;
    if (entry.status === "wantToGo") counts.wantToGo++;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {listOrder.map((id) => {
        const meta = listMeta[id];
        const Icon = meta.icon;
        const count = counts[id];
        return (
          <Button
            key={id}
            type="button"
            variant="outline"
            onClick={() => router.replace(`${pathname}?list=${meta.param}`)}
          >
            <Icon aria-hidden="true" className={cn("size-4", meta.accent)} />
            {meta.label}
            {count > 0 && (
              <Badge variant="secondary" className="ml-0.5">
                {count}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}
