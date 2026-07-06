"use client";

import { MotionConfig } from "motion/react";

/** App-wide motion config. `reducedMotion="user"` makes every motion/react
 * animation (ExplorePanel tiles, StationPanel/Explore crossfades, the map
 * crawl route, StationMarker badges, PoiList reveal) honor the OS
 * "reduce motion" setting -- transform/layout animations snap to their end
 * state instead of easing. CSS-driven motion is handled separately by the
 * prefers-reduced-motion block in globals.css. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
