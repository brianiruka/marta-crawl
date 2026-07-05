"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { stations, type LineId } from "@/data/stations";
import { lineLabel } from "@/components/LineBadges";
import { cn } from "@/lib/utils";

const FILTER_LINES = ["red", "gold", "blue", "green"] as const satisfies LineId[];

const lineDot: Record<LineId, string> = {
  red: "bg-line-red",
  gold: "bg-line-gold",
  blue: "bg-line-blue",
  green: "bg-line-green",
  streetcar: "bg-line-streetcar",
};

/**
 * Accessible, searchable station index — the primary way to reach a station
 * without the map's precise-tap/hover interactions (essential on touch and
 * for keyboard/screen-reader users). Native input + real links + an
 * aria-live result count; each link navigates to /stations/[id] exactly like
 * a marker click, so selection, the panel, and the camera flight all work
 * the same way.
 */
export function StationIndex({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [activeLines, setActiveLines] = useState<Set<LineId>>(new Set());
  const inputId = useId();
  const countId = useId();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stations
      .filter((s) => (q ? s.name.toLowerCase().includes(q) : true))
      .filter(
        (s) =>
          activeLines.size === 0 || s.lines.some((l) => activeLines.has(l)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [query, activeLines]);

  function toggleLine(line: LineId) {
    setActiveLines((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  }

  return (
    <section
      aria-label="Find a station"
      className={cn(
        "w-full max-w-md rounded-lg border border-border bg-card/60 p-3",
        className,
      )}
    >
      <label htmlFor={inputId} className="sr-only">
        Search stations
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stations…"
          autoComplete="off"
          aria-describedby={countId}
          className="h-11 w-full rounded-md border border-input bg-background pr-3 pl-9 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by line">
        {FILTER_LINES.map((line) => {
          const active = activeLines.has(line);
          return (
            <button
              key={line}
              type="button"
              onClick={() => toggleLine(line)}
              aria-pressed={active}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                active
                  ? "border-foreground/30 bg-secondary text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn("size-2.5 rounded-full", lineDot[line])}
              />
              {lineLabel[line]}
            </button>
          );
        })}
      </div>

      <p id={countId} aria-live="polite" className="sr-only">
        {results.length} station{results.length === 1 ? "" : "s"} found
      </p>

      <ul className="mt-3 max-h-72 overflow-y-auto">
        {results.map((station) => (
          <li key={station.id}>
            <Link
              href={`/stations/${station.id}`}
              className="flex min-h-11 items-center justify-between gap-3 rounded-md px-2 py-2 text-foreground transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span>{station.name}</span>
              <span className="flex shrink-0 gap-1" aria-hidden="true">
                {station.lines.map((line) => (
                  <span
                    key={line}
                    className={cn("size-2.5 rounded-full", lineDot[line])}
                  />
                ))}
              </span>
            </Link>
          </li>
        ))}
        {results.length === 0 && (
          <li className="px-2 py-3 text-sm text-muted-foreground">
            No stations match “{query}”.
          </li>
        )}
      </ul>
    </section>
  );
}
