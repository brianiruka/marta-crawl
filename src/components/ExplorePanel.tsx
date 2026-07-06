"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Route,
  Star,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { Poi } from "@/data/pois";
import type { CategoryStationGroup } from "@/lib/data";
import { listMeta, listOrder, type ListId } from "@/data/poiListMeta";
import { categoryMeta, categoryOrder } from "@/data/poiCategories";
import { usePoiEntries, type SavedPoi } from "@/lib/poiLists";
import { useCoarsePointer } from "@/lib/useCoarsePointer";
import { stations, type LineId } from "@/data/stations";
import { lineOrder } from "@/data/lineOrder";
import { lineLabel } from "@/components/LineBadges";
import {
  moveStation,
  resolveCrawlOrder,
  setStationOrder,
  toggleCrawlMember,
  useCrawlMemberKeys,
  useStationOrderOverride,
} from "@/lib/crawlBuilder";
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
type Mode =
  | { kind: "home" }
  | { kind: "crawl" }
  | { kind: "list"; id: ListId }
  | { kind: "category"; id: Poi["category"] };

function sameMode(a: Mode | null, b: Mode | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === "home" || a.kind === "crawl") return true;
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

// Shared tile/group motion — a toggle removing something from a list (e.g.
// "been there" clearing an up-next tile) should ease out rather than snap,
// and remaining siblings should glide into the gap rather than jump.
// `layout` on every item is what drives that reflow; AnimatePresence is
// what lets `exit` run at all before the item leaves the tree.
const tileMotion = {
  layout: true,
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15, ease: "easeIn" } },
  transition: { duration: 0.2, ease: "easeOut" },
} as const;

function SavedPoiRow({ entry }: { entry: SavedPoi }) {
  const meta = categoryMeta[entry.category];
  const Icon = meta.icon;
  const href = entry.websiteUrl ?? entry.mapsUrl;
  const memberKeys = useCrawlMemberKeys();
  const inCrawl = entry.status === "wantToGo" && memberKeys.includes(entry.key);
  return (
    <Card className="gap-0 rounded-lg border-transparent bg-card/50 py-2.5">
      <CardContent className="flex flex-col gap-1 px-3">
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
        {/* Only wantToGo entries are crawl-eligible: this is the one new
            step distinguishing "up next" (a broad someday-wishlist) from
            "crawl" (a deliberately chosen subset for a specific outing) —
            scoped to this row rather than added as a 4th icon on
            PoiStatusButtons, which appears on every POI card everywhere. */}
        {entry.status === "wantToGo" && (
          <button
            type="button"
            aria-pressed={inCrawl}
            onClick={() => toggleCrawlMember(entry.key)}
            className={cn(
              "flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
              inCrawl
                ? "border-violet-400/40 bg-violet-400/10 text-violet-400"
                : "border-border/50 text-muted-foreground hover:border-violet-400/40 hover:text-violet-400",
            )}
          >
            <Route aria-hidden="true" className="size-3" />
            {inCrawl ? "In crawl" : "Add to crawl"}
          </button>
        )}
        <PoiStatusButtons
          poi={{
            name: entry.name,
            placeId: entry.placeId,
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
          <AnimatePresence initial={false} mode="popLayout">
            {favorites.map((entry) => (
              <motion.div key={entry.key} {...tileMotion}>
                <SavedPoiRow entry={entry} />
              </motion.div>
            ))}
          </AnimatePresence>
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
      <AnimatePresence initial={false} mode="popLayout">
        {groups.map(([stationId, group]) => (
          <motion.div key={stationId} {...tileMotion}>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Link href={`/stations/${stationId}`} className="underline-offset-4 hover:underline">
                {group[0].stationName}
              </Link>
              <Badge variant="secondary">
                {group.length} of {counts[stationId] ?? group.length}
              </Badge>
            </h4>
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false} mode="popLayout">
                {group.map((entry) => (
                  <motion.div key={entry.key} {...tileMotion}>
                    <SavedPoiRow entry={entry} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function WantToGoList({ entries }: { entries: SavedPoi[] }) {
  const wantToGo = useMemo(() => entries.filter((e) => e.status === "wantToGo"), [entries]);
  const groups = useMemo(() => {
    const grouped = groupByStation(wantToGo);
    grouped.sort((a, b) => a[1][0].stationName.localeCompare(b[1][0].stationName));
    return grouped;
  }, [wantToGo]);

  if (wantToGo.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Bookmark places you want to visit and they&apos;ll show up here, grouped by station. Add
        any of them to your crawl when you&apos;re ready to plan a route.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence initial={false} mode="popLayout">
        {groups.map(([stationId, group]) => (
          <motion.div key={stationId} {...tileMotion}>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Link href={`/stations/${stationId}`} className="underline-offset-4 hover:underline">
                {group[0].stationName}
              </Link>
              <Badge variant="secondary">{group.length}</Badge>
            </h4>
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false} mode="popLayout">
                {group.map((entry) => (
                  <motion.div key={entry.key} {...tileMotion}>
                    <SavedPoiRow entry={entry} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function CrawlView({ entries }: { entries: SavedPoi[] }) {
  const searchParams = useSearchParams();
  const sharedParam = searchParams.get("stations");
  const memberKeys = useCrawlMemberKeys();
  const memberSet = useMemo(() => new Set(memberKeys), [memberKeys]);

  // A crawl member is only meaningful while its entry is still up-next --
  // un-bookmarking or marking it visited quietly drops it here, no separate
  // cleanup needed in crawlBuilder.ts.
  const crawlEntries = useMemo(
    () => entries.filter((e) => e.status === "wantToGo" && memberSet.has(e.key)),
    [entries, memberSet],
  );
  const groups = useMemo(() => groupByStation(crawlEntries), [crawlEntries]);
  const stationIds = useMemo(() => groups.map(([id]) => id), [groups]);
  const override = useStationOrderOverride();
  const order = useMemo(
    () => resolveCrawlOrder(stationIds, override, stations),
    [stationIds, override],
  );
  const groupsByStation = useMemo(() => new Map(groups), [groups]);
  const orderedGroups = useMemo(
    () => order.map((id) => [id, groupsByStation.get(id)!] as const),
    [order, groupsByStation],
  );

  const [copied, setCopied] = useState(false);
  function handleShare() {
    const url = `${window.location.origin}/?panel=crawl&stations=${order.join(",")}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  // A shared link always shows the route that was shared, regardless of the
  // viewer's own crawl — read-only, station names only (no POI resolution
  // across the whole system exists yet, and isn't needed for a "check out
  // this route" preview).
  if (sharedParam) {
    const ids = sharedParam.split(",").filter(Boolean);
    const named = ids.map((id) => ({ id, name: stations.find((s) => s.id === id)?.name ?? id }));
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          A shared crawl route — {named.length} stop{named.length === 1 ? "" : "s"}.
        </p>
        <ol className="flex flex-col gap-2">
          {named.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 px-3 py-2"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-400 text-xs font-semibold text-background">
                {i + 1}
              </span>
              <Link
                href={`/stations/${s.id}`}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {s.name}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (crawlEntries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add places from &quot;Up next&quot; to start building a crawl you can order, view on the
        map, and share.
      </p>
    );
  }

  const walkMinutes = crawlEntries.reduce((sum, e) => sum + (e.walkMinutes ?? 0), 0);
  const rideMinutes = order.length > 1 ? (order.length - 1) * 3 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          ~{walkMinutes} min walking
          {rideMinutes > 0 ? ` · ~${rideMinutes} min riding, estimated` : ""}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={handleShare}>
          {copied ? "Copied!" : "Share crawl"}
        </Button>
      </div>
      <AnimatePresence initial={false} mode="popLayout">
        {orderedGroups.map(([stationId, group], i) => (
          <motion.div key={stationId} {...tileMotion}>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-400 text-xs font-semibold text-background">
                {i + 1}
              </span>
              <h4 className="flex flex-1 items-center gap-2 text-sm font-semibold text-foreground">
                <Link href={`/stations/${stationId}`} className="underline-offset-4 hover:underline">
                  {group[0].stationName}
                </Link>
                <Badge variant="secondary">{group.length}</Badge>
              </h4>
              <div className="flex gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${group[0].stationName} earlier in the crawl`}
                  disabled={i === 0}
                  onClick={() => setStationOrder(moveStation(order, stationId, "up"))}
                >
                  <ChevronUp aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${group[0].stationName} later in the crawl`}
                  disabled={i === orderedGroups.length - 1}
                  onClick={() => setStationOrder(moveStation(order, stationId, "down"))}
                >
                  <ChevronDown aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {group.map((entry) => (
                <SavedPoiRow key={entry.key} entry={entry} />
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
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
    <Card className="gap-0 rounded-lg border-transparent bg-card/50 py-2.5">
      <CardContent className="flex flex-col gap-1 px-3">
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
      className="flex items-center gap-3 rounded-lg border border-transparent bg-card/50 px-4 py-2.5 text-left transition-colors hover:border-border hover:bg-card"
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

function HomeMenu({
  poisByCategory,
}: {
  poisByCategory: Record<Poi["category"], CategoryStationGroup[]>;
}) {
  const router = useRouter();
  const entriesMap = usePoiEntries();
  const memberKeys = useCrawlMemberKeys();

  const listCounts: Record<ListId, number> = { favorites: 0, visited: 0, wantToGo: 0 };
  const visitedStationIds = new Set<string>();
  const crawlStationIds = new Set<string>();
  const memberSet = new Set(memberKeys);
  for (const entry of Object.values(entriesMap)) {
    if (entry.favorited) listCounts.favorites++;
    if (entry.status) listCounts[entry.status]++;
    if (entry.status === "visited") visitedStationIds.add(entry.stationId);
    if (entry.status === "wantToGo" && memberSet.has(entry.key)) crawlStationIds.add(entry.stationId);
  }

  // Best-progress line among lines with at least one visited station, for
  // the "X% crawled" stat — a simple "most complete line" readout, not a
  // ranking of every line at once.
  let lineProgress: { line: LineId; pct: number } | null = null;
  for (const line of Object.keys(lineOrder) as LineId[]) {
    const sequence = lineOrder[line];
    if (sequence.length === 0) continue;
    const visitedOnLine = sequence.filter((id) => visitedStationIds.has(id)).length;
    if (visitedOnLine === 0) continue;
    const pct = Math.round((visitedOnLine / sequence.length) * 100);
    if (!lineProgress || pct > lineProgress.pct) lineProgress = { line, pct };
  }

  return (
    <div className="flex flex-col gap-8">
      {listCounts.visited > 0 && (
        <p className="text-sm text-muted-foreground">
          {listCounts.visited} place{listCounts.visited === 1 ? "" : "s"} visited across{" "}
          {visitedStationIds.size} station{visitedStationIds.size === 1 ? "" : "s"}
          {lineProgress ? ` · ${lineLabel[lineProgress.line]} ${lineProgress.pct}% crawled` : ""}
        </p>
      )}
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
          <MenuRow
            icon={Route}
            accent="text-violet-400"
            label="Build a crawl"
            count={crawlStationIds.size}
            onClick={() => router.push("/?panel=crawl")}
          />
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
      : panelParam === "crawl"
        ? { kind: "crawl" }
        : panelParam && panelParam in paramToList
          ? { kind: "list", id: paramToList[panelParam] }
          : panelParam && panelParam in categoryMeta
            ? { kind: "category", id: panelParam as Poi["category"] }
            : null;
  const isOpen = activeMode !== null;

  // Broadcast open state so the homepage shell can pad the map into the
  // remaining viewport (html[data-explore-open] .map-shell in globals.css).
  // CSS reacts to the attribute, so the map recenters in the same 300ms
  // as the sheet slide — no overlap, no re-render plumbing.
  useEffect(() => {
    if (isOpen) document.documentElement.setAttribute("data-explore-open", "");
    else document.documentElement.removeAttribute("data-explore-open");
    return () => document.documentElement.removeAttribute("data-explore-open");
  }, [isOpen]);

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
      : renderedMode.kind === "crawl"
        ? "Your crawl"
        : renderedMode.kind === "list"
          ? listMeta[renderedMode.id].label
          : categoryMeta[renderedMode.id].label;
  const TitleIcon =
    renderedMode.kind === "home"
      ? Compass
      : renderedMode.kind === "crawl"
        ? Route
        : renderedMode.kind === "list"
          ? listMeta[renderedMode.id].icon
          : categoryMeta[renderedMode.id].icon;
  // Drives the content crossfade below: distinct per mode (and per list/
  // category id within a mode), so Home->Coffee and Coffee->Sights both
  // register as a change, not just the first Home->Browse transition.
  const modeKey =
    renderedMode.kind === "home" || renderedMode.kind === "crawl"
      ? renderedMode.kind
      : `${renderedMode.kind}:${renderedMode.id}`;
  const titleAccent =
    renderedMode.kind === "home"
      ? "text-foreground"
      : renderedMode.kind === "crawl"
        ? "text-violet-400"
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
        // A third of the screen at sm+ (the base component hardcodes
        // data-[side=right]:sm:max-w-sm — the override has to match that
        // exact variant chain, not just "sm:", or tailwind-merge won't
        // recognize the two as conflicting and the base one silently wins).
        // The -full slide classes replace the base's subtle 10-unit nudge
        // with a real full-distance drawer slide.
        className="w-full gap-0 overflow-y-auto p-5 duration-300 ease-in-out data-[side=right]:sm:w-1/3 data-[side=right]:sm:max-w-none data-[side=right]:data-open:slide-in-from-right-full data-[side=right]:data-closed:slide-out-to-right-full md:p-6"
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
        {/* Keyed on the mode (not just "kind"): Home->Browse and Browse->a
            different Browse both need a fresh crossfade, not just the
            first transition. mode="wait" (not popLayout) — this is a
            single content block being swapped for another, not a list, so
            there's no sibling reflow to preserve; waiting avoids the two
            versions ever double-rendering on top of each other. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={modeKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15, ease: "easeIn" } }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-5"
          >
            {renderedMode.kind === "home" && <HomeMenu poisByCategory={poisByCategory} />}
            {renderedMode.kind === "crawl" && <CrawlView entries={entries} />}
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
          </motion.div>
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
