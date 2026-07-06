export type Poi = {
  name: string;
  category: "bakery" | "coffee" | "food" | "sight" | "treats" | "drinks";
  description: string;
  placeId?: string;
  rating?: number;
  reviewCount?: number;
  mapsUrl?: string;
  websiteUrl?: string;
  distanceMiles?: number;
  walkMinutes?: number;
  /** True iff this place is independently cited by >=3 of the 4 curated
   * external "best MARTA dining/attractions" lists (see
   * scripts/seed/build-pois.ts). Drives the "Top pick" badge — no longer
   * inferred from sort position. */
  topPickEligible?: boolean;
  /** Human-readable source labels, e.g. ["Rough Draft Atlanta", "The
   * Infatuation", "Discover Atlanta"] — only set when topPickEligible. */
  topPickSources?: string[];
};

export const poisByStation: Record<string, Poi[]> = {
  "arts-center": [
    {
      name: "High Museum of Art",
      category: "sight",
      description: "Major art museum, short walk from the station.",
    },
    {
      name: "Caribou Coffee",
      category: "coffee",
      description: "Quick coffee stop on the way to the Woodruff Arts Center.",
    },
  ],
  midtown: [
    {
      name: "Piedmont Park",
      category: "sight",
      description: "Atlanta's flagship park, a few blocks east.",
    },
    {
      name: "Highland Bakery",
      category: "bakery",
      description: "Brunch spot known for biscuits and pastries.",
    },
  ],
  "five-points": [
    {
      name: "Underground Atlanta",
      category: "sight",
      description: "Historic shopping district right above the station.",
    },
  ],
};
