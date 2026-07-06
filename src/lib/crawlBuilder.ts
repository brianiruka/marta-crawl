"use client";

// Ordered-station companion to poiLists.ts. A "crawl" is a deliberately
// chosen SUBSET of the "Up next" (wantToGo) entries -- not the whole list --
// so it needs its own explicit membership, separate from bookmarking
// something as up next. This store holds that membership plus manual
// station-reorder overrides, following the same useSyncExternalStore +
// versioned-localStorage-JSON conventions as poiLists.ts, kept in a sibling
// module because the data shape (an ordered station list + a member-key
// set) doesn't fit that store's per-POI status map.
//
// A member key is only meaningful while its entry is still status ===
// "wantToGo" -- callers filter membership against current wantToGo status
// at read time (see ExplorePanel's CrawlView), so un-bookmarking something
// or marking it "been there" quietly drops it from the crawl with no
// cross-module cleanup needed here.
import { useSyncExternalStore } from "react";
import { lineOrder } from "@/data/lineOrder";
import type { LineId, Station } from "@/data/stations";

const STORAGE_KEY = "marta-crawl:crawl-order:v1";
// v2: added memberKeys (crawl is now an explicit subset, not "all of Up
// next") -- bumped to discard v1 data, which has no membership to migrate.
const VERSION = 2;

type CrawlState = { stationOrder: readonly string[]; memberKeys: readonly string[] };
const EMPTY_STATE: CrawlState = Object.freeze({
  stationOrder: Object.freeze([]),
  memberKeys: Object.freeze([]),
});

let state: CrawlState | null = null;
const listeners = new Set<() => void>();

function load(): CrawlState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as {
      version?: number;
      stationOrder?: string[];
      memberKeys?: string[];
    };
    if (parsed.version !== VERSION) return EMPTY_STATE;
    return Object.freeze({
      stationOrder: Object.freeze([...(parsed.stationOrder ?? [])]),
      memberKeys: Object.freeze([...(parsed.memberKeys ?? [])]),
    });
  } catch {
    return EMPTY_STATE;
  }
}

function persist(next: CrawlState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: VERSION, stationOrder: next.stationOrder, memberKeys: next.memberKeys }),
    );
  } catch {
    // Quota/blocked: keep the in-memory state so the session still works.
  }
}

function getSnapshot(): CrawlState {
  if (state === null) state = load();
  return state;
}

function notify() {
  for (const listener of listeners) listener();
}

let storageListenerAttached = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!storageListenerAttached && typeof window !== "undefined") {
    storageListenerAttached = true;
    window.addEventListener("storage", (e) => {
      if (e.key !== STORAGE_KEY) return;
      state = load();
      notify();
    });
  }
  return () => listeners.delete(listener);
}

/** Raw stored manual-reorder override (may reference stations no longer in
 * the crawl, or be missing ones just added) -- resolve with
 * resolveCrawlOrder() before rendering. */
export function useStationOrderOverride(): readonly string[] {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().stationOrder,
    () => EMPTY_STATE.stationOrder,
  );
}

/** POI keys explicitly added to the crawl -- the deliberate subset of
 * wantToGo entries, not all of them. */
export function useCrawlMemberKeys(): readonly string[] {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().memberKeys,
    () => EMPTY_STATE.memberKeys,
  );
}

export function setStationOrder(next: readonly string[]) {
  const current = getSnapshot();
  state = Object.freeze({ stationOrder: Object.freeze([...next]), memberKeys: current.memberKeys });
  persist(state);
  notify();
}

export function toggleCrawlMember(key: string) {
  const current = getSnapshot();
  const next = new Set(current.memberKeys);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  state = Object.freeze({ stationOrder: current.stationOrder, memberKeys: Object.freeze([...next]) });
  persist(state);
  notify();
}

/** Swaps stationId with its neighbor in `order` (a no-op at either end). */
export function moveStation(
  order: readonly string[],
  stationId: string,
  direction: "up" | "down",
): string[] {
  const i = order.indexOf(stationId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= order.length) return [...order];
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function primaryLine(stationIds: string[], stationsById: Map<string, Station>): LineId {
  const counts = new Map<LineId, number>();
  for (const id of stationIds) {
    for (const line of stationsById.get(id)?.lines ?? []) {
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }
  let best: LineId = stationsById.get(stationIds[0])?.lines[0] ?? "red";
  let bestCount = -1;
  for (const [line, count] of counts) {
    if (count > bestCount) {
      best = line;
      bestCount = count;
    }
  }
  return best;
}

/** Auto-orders stations along whichever line they share the most, appending
 * any station not on that line at the end (alphabetically). Pure -- no
 * store access -- so it can run inside a useMemo without side effects. */
export function orderStations(stationIds: string[], stations: Station[]): string[] {
  if (stationIds.length === 0) return [];
  const stationsById = new Map(stations.map((s) => [s.id, s]));
  const line = primaryLine(stationIds, stationsById);
  const sequence = lineOrder[line];
  const onLine = stationIds.filter((id) => sequence.includes(id));
  const offLine = stationIds.filter((id) => !sequence.includes(id));
  onLine.sort((a, b) => sequence.indexOf(a) - sequence.indexOf(b));
  offLine.sort((a, b) => (stationsById.get(a)?.name ?? a).localeCompare(stationsById.get(b)?.name ?? b));
  return [...onLine, ...offLine];
}

/** Combines the current crawl's station ids with any manual reorder
 * override: ids present in the override keep their relative order; ids not
 * in the override are auto-ordered (via orderStations) and appended; ids in
 * the override that are no longer part of the crawl are dropped. Pure --
 * call with useMemo, don't persist automatically (only moveStation does). */
export function resolveCrawlOrder(
  stationIds: string[],
  override: readonly string[],
  stations: Station[],
): string[] {
  const idSet = new Set(stationIds);
  const kept = override.filter((id) => idSet.has(id));
  const keptSet = new Set(kept);
  const remaining = stationIds.filter((id) => !keptSet.has(id));
  return [...kept, ...orderStations(remaining, stations)];
}
