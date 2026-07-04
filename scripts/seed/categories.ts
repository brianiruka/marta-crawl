import type { Poi } from "../../src/data/pois";

/**
 * Discovery categories, ordered as a crawl day: coffee → treats → eats →
 * sights → drinks. Each maps to one Nearby Search sweep (38 calls, one per
 * station). `minRating`/`minReviews` are quality floors applied ONLY to
 * API-discovered places during the transform — hand-curated sources (the
 * original sheet, pins in data/curation.json) bypass them.
 */
export type DiscoveryCategory = {
  /** Table A place types for Nearby Search includedTypes. */
  includedTypes: string[];
  minRating: number;
  minReviews: number;
  maxPerStation: number;
};

export const discoveryCategories: Record<string, DiscoveryCategory> = {
  coffee: {
    includedTypes: ["coffee_shop", "cafe"],
    minRating: 4.2,
    minReviews: 30,
    maxPerStation: 8,
  },
  treats: {
    includedTypes: [
      "bakery",
      "dessert_shop",
      "donut_shop",
      "ice_cream_shop",
      "bagel_shop",
    ],
    minRating: 4.3,
    minReviews: 30,
    maxPerStation: 5,
  },
  eats: {
    includedTypes: ["restaurant"],
    minRating: 4.4,
    minReviews: 150,
    maxPerStation: 6,
  },
  sights: {
    includedTypes: ["museum", "art_gallery", "tourist_attraction", "park"],
    minRating: 4.3,
    minReviews: 25,
    maxPerStation: 5,
  },
  drinks: {
    includedTypes: ["bar", "pub", "wine_bar", "brewery"],
    minRating: 4.3,
    minReviews: 50,
    maxPerStation: 5,
  },
};

/**
 * Maps a place's own `types` array to our Poi category, so a place found by
 * two sweeps (or the legacy sheet) gets one deterministic category. Order
 * matters: specific before general (a bakery-café is treats, a brewpub
 * restaurant is drinks).
 */
const typeToCategory: [string[], Poi["category"]][] = [
  [["bakery", "dessert_shop", "donut_shop", "ice_cream_shop", "bagel_shop"], "treats"],
  [["coffee_shop", "cafe"], "coffee"],
  [["bar", "pub", "wine_bar", "brewery"], "drinks"],
  [["museum", "art_gallery", "tourist_attraction", "park"], "sight"],
];

export function categoryForTypes(types: string[]): Poi["category"] {
  for (const [candidates, category] of typeToCategory) {
    if (types.some((t) => candidates.includes(t))) return category;
  }
  return "food";
}

/** Display order on station pages: the crawl-day arc. */
export const categoryOrder: Poi["category"][] = [
  "coffee",
  "treats",
  "bakery",
  "food",
  "sight",
  "drinks",
];
