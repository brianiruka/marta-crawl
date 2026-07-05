"use client";

import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

type StationPanelProps = {
  children: React.ReactNode;
};

export function StationPanel({ children }: StationPanelProps) {
  const router = useRouter();

  return (
    // Non-modal: no overlay and no focus trap, so the map behind stays
    // fully interactive — clicking another station swaps the panel content.
    <Sheet open modal={false} onOpenChange={(open) => !open && router.back()}>
      <SheetContent
        side="right"
        // Clicking the map must switch stations, not dismiss the sheet —
        // without this, Radix's interact-outside fires router.back() and
        // races the marker's own navigation.
        onInteractOutside={(e) => e.preventDefault()}
        className="w-full gap-0 overflow-y-auto p-6 sm:max-w-md md:p-8"
      >
        <SheetTitle className="sr-only">Station details</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
