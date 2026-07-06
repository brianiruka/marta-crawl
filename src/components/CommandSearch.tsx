"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { Poi } from "@/data/pois";
import type { LineId } from "@/data/stations";
import type { CategoryStationGroup } from "@/lib/data";
import { categoryMeta } from "@/data/poiCategories";
import { lineLabel } from "@/components/LineBadges";
import { cn } from "@/lib/utils";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type StationRef = { id: string; name: string; lines: LineId[] };

type CommandSearchProps = {
  stations: StationRef[];
  poisByCategory: Record<Poi["category"], CategoryStationGroup[]>;
};

type FlatPoi = {
  key: string;
  name: string;
  stationId: string;
  stationName: string;
  category: Poi["category"];
};

/** Global search palette (⌘K / Ctrl-K, plus a visible trigger for touch).
 * Searches every station and every POI by name; selecting a result opens
 * that station's panel. Navigation-only for now — no inline favorite/status
 * actions. */
export function CommandSearch({ stations, poisByCategory }: CommandSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // The full POI set is already serialized to the client for the Explore
  // panel; flatten it (deduped by key) rather than fetching again.
  const pois = useMemo<FlatPoi[]>(() => {
    const seen = new Set<string>();
    const flat: FlatPoi[] = [];
    for (const groups of Object.values(poisByCategory)) {
      for (const g of groups) {
        for (const p of g.pois) {
          const key = p.placeId ?? `${g.stationId}:${p.name}`;
          if (seen.has(key)) continue;
          seen.add(key);
          flat.push({
            key,
            name: p.name,
            stationId: g.stationId,
            stationName: g.stationName,
            category: p.category,
          });
        }
      }
    }
    return flat.sort((a, b) => a.name.localeCompare(b.name));
  }, [poisByCategory]);

  function go(stationId: string) {
    setOpen(false);
    router.push(`/stations/${stationId}`);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Search stations and places"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-40 flex size-12 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-lg backdrop-blur transition-colors hover:bg-card"
      >
        <Search aria-hidden="true" className="size-5" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search stations and places…" />
        <CommandList>
          <CommandEmpty>No matches.</CommandEmpty>
          <CommandGroup heading="Stations">
            {stations.map((s) => (
              <CommandItem
                key={s.id}
                value={s.id}
                keywords={[s.name, ...s.lines.map((l) => lineLabel[l])]}
                onSelect={() => go(s.id)}
              >
                <span className="font-medium">{s.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {s.lines.map((l) => lineLabel[l]).join(" · ")}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Places">
            {pois.map((p) => {
              const Icon = categoryMeta[p.category].icon;
              return (
                <CommandItem
                  key={p.key}
                  value={p.key}
                  keywords={[p.name, p.stationName]}
                  onSelect={() => go(p.stationId)}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn(categoryMeta[p.category].accent)}
                  />
                  <span>{p.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{p.stationName}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
