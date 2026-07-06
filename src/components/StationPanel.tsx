"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
        // Same half-width sizing as ExplorePanel, so the panel doesn't
        // visually resize when navigating between Explore and a station.
        // Override has to match the base's exact data-[side=right]:sm:
        // variant chain for tailwind-merge to treat it as conflicting.
        className="w-full gap-0 overflow-y-auto p-6 duration-300 data-[side=right]:sm:w-1/2 data-[side=right]:sm:max-w-none md:p-8"
      >
        <SheetTitle className="sr-only">Station details</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
