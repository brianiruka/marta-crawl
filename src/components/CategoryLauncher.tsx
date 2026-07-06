"use client";

import { usePathname, useRouter } from "next/navigation";
import { categoryOrder, categoryMeta } from "@/data/poiCategories";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Opens the category-browse sheet (see ListSheet.tsx) via the ?category=
 * query param — every POI of that category, system-wide, sectioned by
 * station. Sits below ListLauncher on the homepage, using the same icons
 * already shown on every POI card's category header. */
export function CategoryLauncher() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {categoryOrder.map((id) => {
        const meta = categoryMeta[id];
        const Icon = meta.icon;
        return (
          <Button
            key={id}
            type="button"
            variant="outline"
            onClick={() => router.replace(`${pathname}?category=${id}`)}
          >
            <Icon aria-hidden="true" className={cn("size-4", meta.accent)} />
            {meta.label}
          </Button>
        );
      })}
    </div>
  );
}
