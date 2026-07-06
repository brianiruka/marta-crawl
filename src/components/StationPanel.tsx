"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useCoarsePointer } from "@/lib/useCoarsePointer";

type StationPanelProps = {
  children: React.ReactNode;
};

// How long the sheet's slide-out runs before we pop the route. Matches the
// duration-300 on SheetContent and the map's padding transition.
const EXIT_MS = 300;

export function StationPanel({ children }: StationPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const closing = useRef(false);
  // Touch/small screens: modal (scrim + focus trap + inert background —
  // there's no "click the map to switch stations" gesture to preserve
  // there, and background content should be hidden from assistive tech).
  // Desktop stays non-modal so map clicks can swap the panel's station.
  const isCoarse = useCoarsePointer();

  // Same mechanism as ExplorePanel: broadcast open state so the homepage
  // shell pads the map into the remaining viewport (globals.css .map-shell).
  // Keyed on `open` so the padding recedes in sync with the slide-out.
  useEffect(() => {
    if (open) document.documentElement.setAttribute("data-station-open", "");
    else document.documentElement.removeAttribute("data-station-open");
    return () => document.documentElement.removeAttribute("data-station-open");
  }, [open]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    // Let the slide-out animation play before the route (and this
    // component) unmounts — otherwise the sheet just vanishes.
    setOpen(false);
    setTimeout(() => router.back(), EXIT_MS);
  };

  return (
    <Sheet open={open} modal={isCoarse} onOpenChange={(o) => !o && close()}>
      <SheetContent
        side="right"
        // On desktop, clicking the map must switch stations, not dismiss
        // the sheet — without this, Radix's interact-outside fires
        // router.back() and races the marker's own navigation. On touch
        // there's no such gesture, so the scrim can dismiss normally.
        onInteractOutside={(e) => {
          if (!isCoarse) e.preventDefault();
        }}
        // Same third-width sizing as ExplorePanel, so the panel doesn't
        // visually resize when navigating between Explore and a station.
        // Override has to match the base's exact data-[side=right]:sm:
        // variant chain for tailwind-merge to treat it as conflicting.
        // -full slide classes = real drawer slide, not the base 10-unit nudge.
        className="w-full gap-0 overflow-y-auto p-5 duration-300 ease-in-out data-[side=right]:sm:w-1/3 data-[side=right]:sm:max-w-none data-[side=right]:data-open:slide-in-from-right-full data-[side=right]:data-closed:slide-out-to-right-full md:p-6"
      >
        <SheetTitle className="sr-only">Station details</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
