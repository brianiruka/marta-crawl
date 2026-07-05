"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Star } from "lucide-react";
import Link from "next/link";
import { listMeta, listOrder, type ListId } from "@/data/poiListMeta";
import { categoryMeta } from "@/data/poiCategories";
import { usePoiEntries, type SavedPoi } from "@/lib/poiLists";
import { useCoarsePointer } from "@/lib/useCoarsePointer";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PoiStatusButtons } from "@/components/PoiStatusButtons";
import { cn } from "@/lib/utils";

const paramToList: Record<string, ListId> = Object.fromEntries(
  listOrder.map((id) => [listMeta[id].param, id]),
);

function groupByStation(entries: SavedPoi[]): [string, SavedPoi[]][] {
  const groups = new Map<string, SavedPoi[]>();
  for (const entry of entries) {
    (groups.get(entry.stationId) ?? groups.set(entry.stationId, []).get(entry.stationId)!).push(
      entry,
    );
  }
  return [...groups.entries()];
}

function SavedPoiRow({ entry }: { entry: SavedPoi }) {
  const meta = categoryMeta[entry.category];
  const Icon = meta.icon;
  const href = entry.websiteUrl ?? entry.mapsUrl;
  return (
    // Stacked, not side-by-side with the toggle buttons: the sidebar is
    // narrow (sm:max-w-sm) and a horizontal split there squeezed names like
    // "Foxtail Coffee Co." into a 3-line wrap. A footer row gives the name
    // and meta line the full card width instead.
    <Card className="gap-2 rounded-lg border-transparent bg-card/50 py-3">
      <CardContent className="flex flex-col gap-2 px-3">
        <div className="flex items-start gap-2">
          <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", meta.accent)} />
          <div className="min-w-0 flex-1">
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {entry.name}
              </a>
            ) : (
              <span className="font-medium text-foreground">{entry.name}</span>
            )}
            <p className="text-xs text-muted-foreground">{entry.stationName}</p>
          </div>
        </div>
        {(entry.rating !== undefined || entry.walkMinutes !== undefined) && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            {entry.rating !== undefined && (
              <span className="flex items-center gap-1">
                <Star aria-hidden="true" className="size-3 fill-current" />
                {entry.rating.toFixed(1)}
                {entry.reviewCount ? ` (${entry.reviewCount})` : ""}
              </span>
            )}
            {entry.walkMinutes !== undefined && (
              <span className="whitespace-nowrap">{entry.walkMinutes} min walk</span>
            )}
          </p>
        )}
        <PoiStatusButtons
          poi={{
            name: entry.name,
            stationId: entry.stationId,
            stationName: entry.stationName,
            category: entry.category,
            rating: entry.rating,
            reviewCount: entry.reviewCount,
            mapsUrl: entry.mapsUrl,
            websiteUrl: entry.websiteUrl,
            walkMinutes: entry.walkMinutes,
          }}
          className="justify-end"
        />
      </CardContent>
    </Card>
  );
}

type SortKey = "date" | "rating" | "reviews" | "alpha";
const sortLabels: Record<SortKey, string> = {
  date: "Recent",
  rating: "Rating",
  reviews: "Reviews",
  alpha: "A–Z",
};
const sortFns: Record<SortKey, (a: SavedPoi, b: SavedPoi) => number> = {
  date: (a, b) => (b.favoritedAt ?? 0) - (a.favoritedAt ?? 0),
  rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
  reviews: (a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
  alpha: (a, b) => a.name.localeCompare(b.name),
};

function FavoritesList({ entries }: { entries: SavedPoi[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const favorites = useMemo(
    () => entries.filter((e) => e.favorited).sort(sortFns[sortKey]),
    [entries, sortKey],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Sort favorites">
        {(Object.keys(sortLabels) as SortKey[]).map((key) => (
          <Button
            key={key}
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={sortKey === key}
            onClick={() => setSortKey(key)}
            className={cn(sortKey === key && "bg-secondary text-foreground")}
          >
            {sortLabels[key]}
          </Button>
        ))}
      </div>
      {favorites.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tap the heart on any place to save it here.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {favorites.map((entry) => (
            <SavedPoiRow key={entry.key} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function VisitedList({
  entries,
  counts,
}: {
  entries: SavedPoi[];
  counts: Record<string, number>;
}) {
  const visited = useMemo(() => entries.filter((e) => e.status === "visited"), [entries]);
  const groups = useMemo(() => {
    const grouped = groupByStation(visited);
    grouped.sort((a, b) => a[1][0].stationName.localeCompare(b[1][0].stationName));
    return grouped;
  }, [visited]);

  if (visited.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Mark places as been-there to track your crawl.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {visited.length} place{visited.length === 1 ? "" : "s"} visited across{" "}
        {groups.length} station{groups.length === 1 ? "" : "s"}
      </p>
      {groups.map(([stationId, group]) => (
        <div key={stationId}>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            {group[0].stationName}
            <Badge variant="secondary">
              {group.length} of {counts[stationId] ?? group.length}
            </Badge>
          </h4>
          <div className="flex flex-col gap-2">
            {group.map((entry) => (
              <SavedPoiRow key={entry.key} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WantToGoList({
  entries,
  onNavigate,
}: {
  entries: SavedPoi[];
  onNavigate: () => void;
}) {
  const wantToGo = useMemo(() => entries.filter((e) => e.status === "wantToGo"), [entries]);
  const groups = useMemo(() => {
    const grouped = groupByStation(wantToGo);
    grouped.sort((a, b) => b[1].length - a[1].length || a[1][0].stationName.localeCompare(b[1][0].stationName));
    return grouped;
  }, [wantToGo]);

  if (wantToGo.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Bookmark places you want to visit and they&apos;ll show up here, grouped by station.
      </p>
    );
  }

  const [topStationId, topGroup] = groups[0];

  return (
    <div className="flex flex-col gap-6">
      {groups.length > 1 && (
        <Card className="border-sky-400/30 bg-sky-400/10">
          <CardContent className="px-4">
            <p className="text-xs font-medium tracking-wide text-sky-400 uppercase">
              Recommended next crawl
            </p>
            <Link
              href={`/stations/${topStationId}`}
              onClick={onNavigate}
              className="mt-1 block font-display text-lg font-semibold text-foreground underline-offset-4 hover:underline"
            >
              {topGroup[0].stationName}
            </Link>
            <p className="text-sm text-muted-foreground">
              {topGroup.length} places on your list here — the most of any station.
            </p>
          </CardContent>
        </Card>
      )}
      {groups.map(([stationId, group]) => (
        <div key={stationId}>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Link
              href={`/stations/${stationId}`}
              onClick={onNavigate}
              className="underline-offset-4 hover:underline"
            >
              {group[0].stationName}
            </Link>
            <Badge variant="secondary">{group.length}</Badge>
          </h4>
          <div className="flex flex-col gap-2">
            {group.map((entry) => (
              <SavedPoiRow key={entry.key} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSheet({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isCoarse = useCoarsePointer();
  const entriesMap = usePoiEntries();
  const entries = useMemo(() => Object.values(entriesMap), [entriesMap]);

  const param = searchParams.get("list");
  const activeList = param ? (paramToList[param] ?? null) : null;

  // Keep the last non-null list rendered while the sheet slides closed, so
  // content doesn't blank out mid-animation. This is React's documented
  // "adjust state during render" pattern (not an effect, so there's no
  // one-frame flash) — safe because the write is conditional and settles
  // after at most one extra render.
  const [renderedList, setRenderedList] = useState<ListId | null>(activeList);
  if (activeList && activeList !== renderedList) setRenderedList(activeList);

  function close() {
    router.replace(pathname);
  }

  if (!renderedList) return null;
  const meta = listMeta[renderedList];

  return (
    <Sheet open={!!activeList} modal={isCoarse} onOpenChange={(o) => !o && close()}>
      <SheetContent
        side="left"
        onInteractOutside={(e) => {
          if (!isCoarse) e.preventDefault();
        }}
        className="w-full gap-0 overflow-y-auto p-6 duration-300 sm:max-w-sm md:p-8"
      >
        <SheetTitle className="flex items-center gap-2 font-display text-2xl font-semibold text-foreground">
          <meta.icon aria-hidden="true" className={cn("size-5", meta.accent)} />
          {meta.label}
        </SheetTitle>
        <div className="mt-6">
          {renderedList === "favorites" && <FavoritesList entries={entries} />}
          {renderedList === "visited" && <VisitedList entries={entries} counts={counts} />}
          {renderedList === "wantToGo" && (
            <WantToGoList entries={entries} onNavigate={close} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
