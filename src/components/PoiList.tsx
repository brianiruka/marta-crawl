"use client";

import { Star } from "lucide-react";
import { motion } from "motion/react";
import type { Poi } from "@/data/pois";
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
  // Website first (the card is an unfurl-style link preview of the place's
  // own site); Maps becomes the secondary link when both exist.
  const primaryHref = poi.websiteUrl ?? poi.mapsUrl;
  return (
    <Card
      className={cn(
        "gap-1 rounded-lg py-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        isTopPick
          ? "hover:border-ring"
          : "border-transparent bg-card/50 hover:border-border hover:bg-card",
      )}
    >
      <CardContent className="flex flex-col gap-1 px-4">
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
            <Badge variant="secondary" className="shrink-0">
              Top pick
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{poi.description}</p>
        {(poi.rating !== undefined ||
          poi.walkMinutes !== undefined ||
          (poi.websiteUrl && poi.mapsUrl)) && (
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground/70">
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
          {poi.websiteUrl && poi.mapsUrl && (
            <>
              <span aria-hidden="true">·</span>
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
          className="mt-1 justify-end"
        />
      </CardContent>
    </Card>
  );
}

export function PoiList({
  pois,
  station,
  emptyMessage = "No POIs added for this station yet.",
}: PoiListProps) {
  if (pois.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
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
                <PoiCard key={poi.name} poi={poi} station={station} isTopPick={i === 0} />
              ))}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
