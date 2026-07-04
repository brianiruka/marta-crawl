"use client";

import { useRouter } from "next/navigation";

type StationPanelProps = {
  children: React.ReactNode;
};

export function StationPanel({ children }: StationPanelProps) {
  const router = useRouter();

  return (
    <aside
      role="dialog"
      aria-modal="false"
      className="fixed inset-y-0 right-0 z-10 w-full max-w-md overflow-y-auto border-l border-zinc-800 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur md:p-8"
    >
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Close station panel"
        className="mb-4 rounded-md px-2 py-1 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        &larr; Back to the map
      </button>
      {children}
    </aside>
  );
}
