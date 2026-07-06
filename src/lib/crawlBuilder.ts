"use client";

// Ordered-station companion to poiLists.ts. A "crawl" is the existing
// wantToGo ("Up next") entries, grouped by station and put in a sensible
// order -- not a separate saved list. This store only persists manual
// reorder overrides (which station comes before which), following the same
// useSyncExternalStore + versioned-localStorage-JSON conventions as
// poiLists.ts, kept in a sibling module because the data shape (an ordered
// array of station ids) doesn't fit that store's per-POI status map.
import { useSyncExternalStore } from "react";
import { lineOrder } from "@/data/lineOrder";
import type { LineId, Station } from "@/data/stations";

const STORAGE_KEY = "marta-crawl:crawl-order:v1";
const VERSION = 1;

type StoredOrder = readonly string[];
const EMPTY: StoredOrder = Object.freeze([]);

let order: StoredOrder | null = null;
const listeners = new Set<() => void>();

function load(): StoredOrder {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as { version?: number; stationOrder?: string[] };
    if (parsed.version !== VERSION || !Array.isArray(parsed.stationOrder)) return EMPTY;
    return Object.freeze([...parsed.stationOrder]);
  } catch {
    return EMPTY;
  }
}

function persist(next: StoredOrder) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, stationOrder: next }));
  } catch {
    // Quota/blocked: keep the in-memory state so the session still works.
  }
}

function getSnapshot(): StoredOrder {
  if (order === null) order = load();
  return order;
}

function getServerSnapshot(): StoredOrder {
  return EMPTY;
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
      order = load();
      notify();
    });
  }
  return () => listeners.delete(listener);
}

/** Raw stored manual-reorder override (may reference stations no longer in
 * the crawl, or be missing ones just added) -- resolve with
 * resolveCrawlOrder() before rendering. */
export function useStationOrderOverride(): StoredOrder {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setStationOrder(next: readonly string[]) {
  order = Object.freeze([...next]);
  persist(order);
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
