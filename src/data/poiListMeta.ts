import { Bookmark, CircleCheck, Heart, type LucideIcon } from "lucide-react";

/** The three personal lists, in display order. "visited" and "wantToGo" are
 * mutually exclusive statuses; "favorites" is independent (see
 * src/lib/poiLists.ts). Labels/icons/accents live here only — rename freely. */
export const listOrder = ["favorites", "visited", "wantToGo"] as const;
export type ListId = (typeof listOrder)[number];

export const listMeta: Record<
  ListId,
  {
    label: string;
    /** URL value for the ?list= query param. */
    param: string;
    icon: LucideIcon;
    accent: string;
    toggleLabel: (name: string) => string;
  }
> = {
  favorites: {
    label: "Favorites",
    param: "favorites",
    icon: Heart,
    accent: "text-rose-400",
    toggleLabel: (name) => `Favorite ${name}`,
  },
  visited: {
    label: "Been there",
    param: "been-there",
    icon: CircleCheck,
    accent: "text-emerald-400",
    toggleLabel: (name) => `Mark ${name} as been there`,
  },
  wantToGo: {
    label: "Up next",
    param: "up-next",
    icon: Bookmark,
    accent: "text-sky-400",
    toggleLabel: (name) => `Add ${name} to up next`,
  },
};
