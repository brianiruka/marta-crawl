import {
  Coffee,
  Croissant,
  Donut,
  Landmark,
  Martini,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
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
  { label: string; icon: LucideIcon; accent: string }
> = {
  coffee: { label: "Coffee", icon: Coffee, accent: "text-amber-400" },
  treats: { label: "Treats", icon: Donut, accent: "text-pink-400" },
  bakery: { label: "Bakeries", icon: Croissant, accent: "text-orange-400" },
  food: { label: "Eats", icon: UtensilsCrossed, accent: "text-rose-400" },
  sight: { label: "Sights", icon: Landmark, accent: "text-sky-400" },
  drinks: { label: "Drinks", icon: Martini, accent: "text-violet-400" },
};
