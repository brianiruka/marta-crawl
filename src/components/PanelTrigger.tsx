"use client";

import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The one entry point into the Explore panel (favorites, been there, up
 * next, browse by category) — pinned to the viewport's top-right corner so
 * the map itself has zero chrome. Sits below the sheets' z-50, so an open
 * panel covers it. Pushes (not replaces): opening from fully closed is a
 * genuine drill-down step, so Back correctly returns to closed afterward. */
export function PanelTrigger() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => router.push("/?panel=home")}
      className="fixed top-4 right-4 z-40 bg-background/80 shadow-lg backdrop-blur"
    >
      <Compass aria-hidden="true" className="size-4" />
      Explore
    </Button>
  );
}
