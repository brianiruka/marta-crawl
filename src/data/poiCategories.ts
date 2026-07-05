import type { Poi } from "./pois";

/** Display order on station pages: the crawl-day arc. Also the canonical
 * sweep order for scripts/seed/discover-pois.ts. */
export const categoryOrder: Poi["category"][] = [
  "coffee",
  "treats",
  "bakery",
  "food",
  "sight",
  "drinks",
];

export const categoryMeta: Record<
  Poi["category"],
  { label: string; icon: string; accent: string }
> = {
  coffee: { label: "Coffee", icon: "☕", accent: "text-amber-400" },
  treats: { label: "Treats", icon: "🍩", accent: "text-pink-400" },
  bakery: { label: "Bakeries", icon: "🥐", accent: "text-orange-400" },
  food: { label: "Eats", icon: "🍽️", accent: "text-rose-400" },
  sight: { label: "Sights", icon: "🏛️", accent: "text-sky-400" },
  drinks: { label: "Drinks", icon: "🍸", accent: "text-violet-400" },
};
