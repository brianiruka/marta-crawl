"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Compass, Star, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { Poi } from "@/data/pois";
import type { CategoryStationGroup } from "@/lib/data";
import { listMeta, listOrder, type ListId } from "@/data/poiListMeta";
import { categoryMeta, categoryOrder } from "@/data/poiCategories";
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

/** The single right-side panel: a Home menu (your lists + browse by
 * category), or one level in on a specific list/category. Station detail
 * is a separate level again, reached by pushing to /stations/[slug] — see
 * the module comment on the ExplorePanel component below for the full
 * navigation model. */
type Mode = { kind: "home" } | { kind: "list"; id: ListId } | { kind: "category"; id: Poi["category"] };

function sameMode(a: Mode | null, b: Mode | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === "home") return true;
  // TS can't narrow "a.kind === b.kind" across the union by itself here.
  return (a as { id: string }).id === (b as { id: string }).id;
}

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
            {/* Drills into the station's full detail (every category, not
                just this one) — one level deeper in the same panel. */}
            <Link
              href={`/stations/${entry.stationId}`}
              className="block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {entry.stationName}
            </Link>
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
            <Link href={`/stations/${stationId}`} className="underline-offset-4 hover:underline">
              {group[0].stationName}
            </Link>
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

function WantToGoList({ entries }: { entries: SavedPoi[] }) {
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
            <Link href={`/stations/${stationId}`} className="underline-offset-4 hover:underline">
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

function CategoryPoiRow({
  poi,
  stationId,
  stationName,
}: {
  poi: Poi;
  stationId: string;
  stationName: string;
}) {
  const href = poi.websiteUrl ?? poi.mapsUrl;
  return (
    // No station-name line here — these tiles always live under a station's
    // <details> header already, so repeating the name would just be noise.
    <Card className="gap-2 rounded-lg border-transparent bg-card/50 py-3">
      <CardContent className="flex flex-col gap-2 px-3">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {poi.name}
          </a>
        ) : (
          <span className="font-medium text-foreground">{poi.name}</span>
        )}
        {(poi.rating !== undefined || poi.walkMinutes !== undefined) && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            {poi.rating !== undefined && (
              <span className="flex items-center gap-1">
                <Star aria-hidden="true" className="size-3 fill-current" />
                {poi.rating.toFixed(1)}
                {poi.reviewCount ? ` (${poi.reviewCount})` : ""}
              </span>
            )}
            {poi.walkMinutes !== undefined && (
              <span className="whitespace-nowrap">{poi.walkMinutes} min walk</span>
            )}
          </p>
        )}
        <PoiStatusButtons
          poi={{
            name: poi.name,
            placeId: poi.placeId,
            stationId,
            stationName,
            category: poi.category,
            rating: poi.rating,
            reviewCount: poi.reviewCount,
            mapsUrl: poi.mapsUrl,
            websiteUrl: poi.websiteUrl,
            walkMinutes: poi.walkMinutes,
          }}
          className="justify-end"
        />
      </CardContent>
    </Card>
  );
}

function CategoryList({ groups }: { groups: CategoryStationGroup[] }) {
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">No places in this category yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        // Native <details>/<summary>: collapsible, keyboard-operable, and
        // expanded by default with zero extra state. The station name is a
        // nested Link with stopPropagation, so clicking it drills into the
        // station's full detail without also toggling the collapse state
        // that a click anywhere else on the summary row triggers.
        <details
          key={group.stationId}
          open
          className="group/station rounded-lg border border-border/50"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 transition-transform group-open/station:rotate-90"
              />
              <Link
                href={`/stations/${group.stationId}`}
                onClick={(e) => e.stopPropagation()}
                className="underline-offset-4 hover:underline"
              >
                {group.stationName}
              </Link>
            </span>
            <Badge variant="secondary">{group.pois.length}</Badge>
          </summary>
          <div className="flex flex-col gap-2 px-3 pb-3">
            {group.pois.map((poi) => (
              <CategoryPoiRow
                key={poi.placeId ?? poi.name}
                poi={poi}
                stationId={group.stationId}
                stationName={group.stationName}
              />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function HomeMenu({
  poisByCategory,
}: {
  poisByCategory: Record<Poi["category"], CategoryStationGroup[]>;
}) {
  const router = useRouter();
  const entriesMap = usePoiEntries();

  const listCounts: Record<ListId, number> = { favorites: 0, visited: 0, wantToGo: 0 };
  for (const entry of Object.values(entriesMap)) {
    if (entry.favorited) listCounts.favorites++;
    if (entry.status) listCounts[entry.status]++;
  }

  function MenuRow({
    icon: Icon,
    accent,
    label,
    count,
    onClick,
  }: {
    icon: LucideIcon;
    accent: string;
    label: string;
    count?: number;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 rounded-lg border border-transparent bg-card/50 px-4 py-3 text-left transition-colors hover:border-border hover:bg-card"
      >
        <Icon aria-hidden="true" className={cn("size-5 shrink-0", accent)} />
        <span className="flex-1 font-medium text-foreground">{label}</span>
        {!!count && (
          <Badge variant="secondary" className="shrink-0">
            {count}
          </Badge>
        )}
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="mb-3 font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          Your lists
        </h3>
        <div className="flex flex-col gap-2">
          {listOrder.map((id) => {
            const meta = listMeta[id];
            return (
              <MenuRow
                key={id}
                icon={meta.icon}
                accent={meta.accent}
                label={meta.label}
                count={listCounts[id]}
                onClick={() => router.push(`/?panel=${meta.param}`)}
              />
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="mb-3 font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          Browse by category
        </h3>
        <div className="flex flex-col gap-2">
          {categoryOrder.map((id) => {
            const meta = categoryMeta[id];
            const total = poisByCategory[id].reduce((sum, g) => sum + g.pois.length, 0);
            return (
              <MenuRow
                key={id}
                icon={meta.icon}
                accent={meta.accent}
                label={meta.label}
                count={total}
                onClick={() => router.push(`/?panel=${id}`)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * The single right-side panel. Navigation model (so browser Back always
 * does the right thing with no extra client-side stack bookkeeping):
 *
 *   Closed  -> Home              push   (the map's Explore trigger)
 *   Home    -> Browse            push   (pick a list/category)
 *   Browse  -> different Browse  replace (lateral tab switch, same depth)
 *   Browse  -> Station           push   (drill into a station group)
 *   Closed  -> Station           push   (click a marker on the map)
 *   Station -> different Station replace (click another marker while open)
 *
 * "<- Back" inside the panel and the Sheet's own X/Esc/scrim-dismiss all
 * just call router.back() — because of the push/replace discipline above,
 * that always pops exactly one level, whichever level you're on.
 */
export function ExplorePanel({
  counts,
  poisByCategory,
}: {
  counts: Record<string, number>;
  poisByCategory: Record<Poi["category"], CategoryStationGroup[]>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCoarse = useCoarsePointer();
  const entriesMap = usePoiEntries();
  const entries = useMemo(() => Object.values(entriesMap), [entriesMap]);

  const panelParam = searchParams.get("panel");
  const activeMode: Mode | null =
    panelParam === "home"
      ? { kind: "home" }
      : panelParam && panelParam in paramToList
        ? { kind: "list", id: paramToList[panelParam] }
        : panelParam && panelParam in categoryMeta
          ? { kind: "category", id: panelParam as Poi["category"] }
          : null;

  // Keep the last non-null mode rendered while the sheet slides closed, so
  // content doesn't blank out mid-animation. React's documented "adjust
  // state during render" pattern (not an effect, so no one-frame flash) —
  // safe because the write is conditional and settles after one render.
  const [renderedMode, setRenderedMode] = useState<Mode | null>(activeMode);
  if (activeMode && !sameMode(activeMode, renderedMode)) setRenderedMode(activeMode);

  if (!renderedMode) return null;

  const title =
    renderedMode.kind === "home"
      ? "Explore"
      : renderedMode.kind === "list"
        ? listMeta[renderedMode.id].label
        : categoryMeta[renderedMode.id].label;
  const TitleIcon =
    renderedMode.kind === "home"
      ? Compass
      : renderedMode.kind === "list"
        ? listMeta[renderedMode.id].icon
        : categoryMeta[renderedMode.id].icon;
  const titleAccent =
    renderedMode.kind === "home"
      ? "text-foreground"
      : renderedMode.kind === "list"
        ? listMeta[renderedMode.id].accent
        : categoryMeta[renderedMode.id].accent;

  return (
    <Sheet open={!!activeMode} modal={isCoarse} onOpenChange={(o) => !o && router.back()}>
      <SheetContent
        side="right"
        onInteractOutside={(e) => {
          if (!isCoarse) e.preventDefault();
        }}
        // Half the screen at sm+ (the base component hardcodes
        // data-[side=right]:sm:max-w-sm — the override has to match that
        // exact variant chain, not just "sm:", or tailwind-merge won't
        // recognize the two as conflicting and the base one silently wins).
        className="w-full gap-0 overflow-y-auto p-6 duration-300 data-[side=right]:sm:w-1/2 data-[side=right]:sm:max-w-none md:p-8"
      >
        <div className="flex items-center gap-1">
          {renderedMode.kind !== "home" && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Back to Explore"
              onClick={() => router.back()}
              className="-ml-2"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </Button>
          )}
          <SheetTitle className="flex items-center gap-2 font-display text-2xl font-semibold text-foreground">
            <TitleIcon aria-hidden="true" className={cn("size-5", titleAccent)} />
            {title}
          </SheetTitle>
        </div>
        <div className="mt-6">
          {renderedMode.kind === "home" && <HomeMenu poisByCategory={poisByCategory} />}
          {renderedMode.kind === "list" && renderedMode.id === "favorites" && (
            <FavoritesList entries={entries} />
          )}
          {renderedMode.kind === "list" && renderedMode.id === "visited" && (
            <VisitedList entries={entries} counts={counts} />
          )}
          {renderedMode.kind === "list" && renderedMode.id === "wantToGo" && (
            <WantToGoList entries={entries} />
          )}
          {renderedMode.kind === "category" && (
            <CategoryList groups={poisByCategory[renderedMode.id]} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
