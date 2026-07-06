"use client";

// Local-first store for the personal POI lists (favorites / been-there /
// up-next), persisted to localStorage and read via useSyncExternalStore.
// No login yet: the payload is versioned so a future account/CMS backend
// can migrate it.
//
// Design notes:
// - Entries hold a display SNAPSHOT of the POI (name, station, rating, …)
//   so the list sheets can render without importing the ~267KB generated
//   dataset client-side. Snapshots can go stale if the dataset changes;
//   they still render, and toggling from a card refreshes them.
// - `status` is a single field, so "visited" and "wantToGo" are mutually
//   exclusive by construction. `favorited` is independent.
// - Curated POIs have no placeId, so their key falls back to
//   `${stationId}:${name}` — renaming one orphans its saved entry
//   (harmless: it still renders from the snapshot).
// - `placeId` is persisted on the entry itself (not just used transiently
//   to compute the key) so any UI that reconstructs a SavedPoiInput FROM
//   an already-stored entry — e.g. a tile inside the Favorites/Been-there/
//   Up-next sidebars — can recompute the SAME key poiKey() originally
//   produced. Dropping it here once caused toggles from inside those
//   sidebars to silently operate on a different (wrong) key than the one
//   the entry actually lives under.
import { useSyncExternalStore } from "react";
import type { Poi } from "@/data/pois";

export type PoiStatus = "visited" | "wantToGo";

export type SavedPoi = {
  key: string;
  placeId?: string;
  name: string;
  stationId: string;
  stationName: string;
  category: Poi["category"];
  rating?: number;
  reviewCount?: number;
  mapsUrl?: string;
  websiteUrl?: string;
  walkMinutes?: number;
  favorited: boolean;
  favoritedAt?: number;
  status?: PoiStatus;
  statusAt?: number;
};

export type SavedPoiInput = Omit<
  SavedPoi,
  "key" | "favorited" | "favoritedAt" | "status" | "statusAt"
> & { placeId?: string };

type Entries = Readonly<Record<string, SavedPoi>>;

const STORAGE_KEY = "marta-crawl:poi-lists:v1";
// v2: SavedPoi now persists placeId (see the comment above) — bumped to
// discard any v1 data, which may have accumulated wrong-keyed duplicate/
// orphaned entries from the bug that fix closes.
const VERSION = 2;
const EMPTY: Entries = Object.freeze({});

export function poiKey(
  stationId: string,
  poi: Pick<Poi, "placeId" | "name">,
): string {
  return poi.placeId ?? `${stationId}:${poi.name}`;
}

// Module-level cache. getSnapshot MUST return a stable reference between
// mutations or useSyncExternalStore re-renders forever.
let entries: Entries | null = null;
const listeners = new Set<() => void>();

function load(): Entries {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as { version?: number; entries?: Record<string, SavedPoi> };
    if (parsed.version !== VERSION || typeof parsed.entries !== "object") return EMPTY;
    return Object.freeze({ ...parsed.entries });
  } catch {
    // Unreadable/blocked storage (e.g. Safari private mode): in-memory only.
    return EMPTY;
  }
}

function persist(next: Entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, entries: next }));
  } catch {
    // Quota/blocked: keep the in-memory state so the session still works.
  }
}

function getSnapshot(): Entries {
  if (entries === null) entries = load();
  return entries;
}

function getServerSnapshot(): Entries {
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
      entries = load();
      notify();
    });
  }
  return () => listeners.delete(listener);
}

function mutate(key: string, update: (current: SavedPoi) => SavedPoi, input: SavedPoiInput) {
  const current = getSnapshot();
  const base: SavedPoi = current[key] ?? {
    key,
    placeId: input.placeId,
    name: input.name,
    stationId: input.stationId,
    stationName: input.stationName,
    category: input.category,
    rating: input.rating,
    reviewCount: input.reviewCount,
    mapsUrl: input.mapsUrl,
    websiteUrl: input.websiteUrl,
    walkMinutes: input.walkMinutes,
    favorited: false,
  };
  const updated = update(base);
  const next: Record<string, SavedPoi> = { ...current };
  // Prune entries that are neither favorited nor statused.
  if (!updated.favorited && !updated.status) delete next[key];
  else next[key] = updated;
  entries = Object.freeze(next);
  persist(entries);
  notify();
}

export function toggleFavorite(input: SavedPoiInput) {
  const key = poiKey(input.stationId, input);
  mutate(
    key,
    (current) => ({
      ...current,
      favorited: !current.favorited,
      favoritedAt: current.favorited ? undefined : Date.now(),
    }),
    input,
  );
}

/** Same status again → clears it; the other status → overwrites it (the
 * single `status` field is what makes been-there/up-next exclusive). */
export function toggleStatus(input: SavedPoiInput, status: PoiStatus) {
  const key = poiKey(input.stationId, input);
  mutate(
    key,
    (current) => ({
      ...current,
      status: current.status === status ? undefined : status,
      statusAt: current.status === status ? undefined : Date.now(),
    }),
    input,
  );
}

export function usePoiEntries(): Entries {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function usePoiEntry(key: string): SavedPoi | undefined {
  return usePoiEntries()[key];
}
