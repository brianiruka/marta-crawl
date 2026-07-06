"use client";

import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The map's one entry point into the Explore panel (favorites, been
 * there, up next, browse by category) — pinned to a corner so the map
 * otherwise has zero header chrome. Pushes (not replaces): opening from
 * fully closed is a genuine drill-down step, so Back correctly returns to
 * closed afterward. */
export function PanelTrigger() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => router.push("/?panel=home")}
      className="absolute top-4 right-4 z-10 bg-background/80 shadow-lg backdrop-blur"
    >
      <Compass aria-hidden="true" className="size-4" />
      Explore
    </Button>
  );
}
