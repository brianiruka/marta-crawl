"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { motion } from "motion/react";
import type { Poi } from "@/data/pois";
import type { NearbyStation } from "@/lib/data";
import { categoryMeta, categoryOrder } from "@/data/poiCategories";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PoiStatusButtons } from "@/components/PoiStatusButtons";
import { cn } from "@/lib/utils";

type StationRef = { id: string; name: string };

type PoiListProps = {
  pois: Poi[];
  station: StationRef;
  emptyMessage?: string;
  /** When this station has no POIs, nearby stations that do — rendered as
   * links so the page isn't a dead end. */
  nearbyStations?: NearbyStation[];
};

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 28 },
  },
} as const;

function PoiCard({
  poi,
  station,
  isTopPick,
}: {
  poi: Poi;
  station: StationRef;
  isTopPick: boolean;
}) {
  // The name links to the place's own website when it has one. When it
  // doesn't, the name stays plain text and the "Maps" chip below is the
  // explicit link out — rather than silently making the name a Maps link
  // with no label saying so.
  const primaryHref = poi.websiteUrl;
  const hasMeta =
    poi.rating !== undefined ||
    poi.walkMinutes !== undefined ||
    poi.distanceMiles !== undefined ||
    poi.mapsUrl !== undefined;
  return (
    <Card
      className={cn(
        "gap-0 rounded-lg py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        isTopPick
          ? "hover:border-ring"
          : "border-transparent bg-card/50 hover:border-border hover:bg-card",
      )}
    >
      <CardContent className="flex flex-col gap-0.5 px-4">
        <div className="flex items-baseline justify-between gap-3">
          {primaryHref ? (
            <a
              href={primaryHref}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {poi.name}
            </a>
          ) : (
            <span className="font-medium text-foreground">{poi.name}</span>
          )}
          {isTopPick && (
            <Badge
              variant="secondary"
              className="shrink-0"
              title={
                poi.topPickSources
                  ? `Featured in ${poi.topPickSources.join(", ")}`
                  : undefined
              }
            >
              Top pick
            </Badge>
          )}
        </div>
        {isTopPick && poi.topPickSources && (
          // Same claim as the badge's hover title, spelled out so it's
          // visible without hover (hover doesn't exist on touch).
          <p className="text-xs text-muted-foreground">
            Featured in {poi.topPickSources.join(", ")}
          </p>
        )}
        <p className="text-sm text-muted-foreground">{poi.description}</p>
        {hasMeta && (
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground/70">
          {poi.rating !== undefined && (
            <span className="flex items-center gap-1">
              <Star aria-hidden="true" className="size-3 fill-current" />
              {poi.rating.toFixed(1)}
              {poi.reviewCount ? ` (${poi.reviewCount})` : ""}
            </span>
          )}
          {poi.walkMinutes !== undefined && (
            <>
              {poi.rating !== undefined && <span aria-hidden="true">·</span>}
              <span>{poi.walkMinutes} min walk</span>
            </>
          )}
          {poi.distanceMiles !== undefined && (
            <>
              {(poi.rating !== undefined || poi.walkMinutes !== undefined) && (
                <span aria-hidden="true">·</span>
              )}
              <span>{poi.distanceMiles.toFixed(1)} mi</span>
            </>
          )}
          {poi.mapsUrl && (
            <>
              {(poi.rating !== undefined ||
                poi.walkMinutes !== undefined ||
                poi.distanceMiles !== undefined) && <span aria-hidden="true">·</span>}
              <a
                href={poi.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Maps
              </a>
            </>
          )}
        </p>
        )}
        <PoiStatusButtons
          poi={{
            name: poi.name,
            placeId: poi.placeId,
            stationId: station.id,
            stationName: station.name,
            category: poi.category,
            rating: poi.rating,
            reviewCount: poi.reviewCount,
            mapsUrl: poi.mapsUrl,
            websiteUrl: poi.websiteUrl,
            walkMinutes: poi.walkMinutes,
          }}
          className="-mb-1 justify-end"
        />
      </CardContent>
    </Card>
  );
}

export function PoiList({
  pois,
  station,
  emptyMessage = "No POIs added for this station yet.",
  nearbyStations = [],
}: PoiListProps) {
  if (pois.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        {nearbyStations.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Nearby stops with places to crawl:</p>
            <ul className="flex flex-col gap-1.5">
              {nearbyStations.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/stations/${s.id}`}
                    className="inline-flex items-baseline gap-2 font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {s.name}
                    <span className="text-xs font-normal text-muted-foreground">
                      {s.stops} stop{s.stops === 1 ? "" : "s"} away
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const sections = categoryOrder
    .map((category) => ({
      category,
      items: pois.filter((poi) => poi.category === category),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <motion.div
      className="flex flex-col gap-8"
      variants={listVariants}
      initial="hidden"
      animate="show"
    >
      {sections.map(({ category, items }) => {
        const meta = categoryMeta[category];
        const Icon = meta.icon;
        return (
          <motion.div key={category} variants={sectionVariants}>
            <h3
              className={cn(
                "mb-3 flex items-center gap-2 font-display text-sm font-semibold tracking-widest uppercase",
                meta.accent,
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              {meta.label}
            </h3>
            <div className="flex flex-col gap-2">
              {items.map((poi, i) => (
                <PoiCard
                  key={poi.name}
                  poi={poi}
                  station={station}
                  isTopPick={i === 0 && poi.topPickEligible === true}
                />
              ))}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
