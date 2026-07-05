"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

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

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    // Let the slide-out animation play before the route (and this
    // component) unmounts — otherwise the sheet just vanishes.
    setOpen(false);
    setTimeout(() => router.back(), EXIT_MS);
  };

  return (
    // Non-modal: no overlay and no focus trap, so the map behind stays
    // fully interactive — clicking another station swaps the panel content.
    <Sheet open={open} modal={false} onOpenChange={(o) => !o && close()}>
      <SheetContent
        side="right"
        // Clicking the map must switch stations, not dismiss the sheet —
        // without this, Radix's interact-outside fires router.back() and
        // races the marker's own navigation.
        onInteractOutside={(e) => e.preventDefault()}
        className="w-full gap-0 overflow-y-auto p-6 duration-300 sm:max-w-md md:p-8"
      >
        <SheetTitle className="sr-only">Station details</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
