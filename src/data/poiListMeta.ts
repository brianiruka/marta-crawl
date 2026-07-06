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
    /** Literal hover: class so an ACTIVE button keeps its accent on hover —
     * the ghost Button variant's own hover:text-foreground would otherwise
     * wash the color out to white. (Literal strings, not composed, so
     * Tailwind's build-time scanner sees them.) */
    hoverAccent: string;
    /** Icon treatment when active. CircleCheck needs the check stroked in
     * the background color or the filled circle reads as a plain dot. */
    activeIconClass: string;
    toggleLabel: (name: string) => string;
  }
> = {
  favorites: {
    label: "Favorites",
    param: "favorites",
    icon: Heart,
    accent: "text-rose-400",
    hoverAccent: "hover:text-rose-400",
    activeIconClass: "fill-current",
    toggleLabel: (name) => `Favorite ${name}`,
  },
  visited: {
    label: "Been there",
    param: "been-there",
    icon: CircleCheck,
    accent: "text-emerald-400",
    hoverAccent: "hover:text-emerald-400",
    activeIconClass: "fill-current stroke-background",
    toggleLabel: (name) => `Mark ${name} as been there`,
  },
  wantToGo: {
    label: "Up next",
    param: "up-next",
    icon: Bookmark,
    accent: "text-sky-400",
    hoverAccent: "hover:text-sky-400",
    activeIconClass: "fill-current",
    toggleLabel: (name) => `Add ${name} to up next`,
  },
};
