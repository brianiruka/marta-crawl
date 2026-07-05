"use client";

import * as React from "react";

// React's <ViewTransition> ships in the canary React that Next's App Router
// vendors (enabled via experimental.viewTransition), but @types/react doesn't
// declare it yet — hence the runtime lookup with a pass-through fallback.
const ViewTransition = (
  React as unknown as {
    ViewTransition?: React.ComponentType<{ children: React.ReactNode }>;
  }
).ViewTransition;

export function PageTransition({ children }: { children: React.ReactNode }) {
  if (!ViewTransition) return <>{children}</>;
  return <ViewTransition>{children}</ViewTransition>;
}
