"use client";

import { useSyncExternalStore } from "react";

// Touch devices and small screens: where hover doesn't exist and sheets
// should be modal (scrim + focus trap + inert background for AT).
const QUERY = "(pointer: coarse), (max-width: 640px)";

function subscribe(listener: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", listener);
  return () => mql.removeEventListener("change", listener);
}

export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
