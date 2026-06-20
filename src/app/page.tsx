import { StationBadge } from "@/components/StationBadge";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-900 p-16">
      <h1 className="text-2xl font-semibold text-white">Station Badge — preview</h1>
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <StationBadge line="red" label="Default" />
          <span className="text-sm text-zinc-400">default</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <StationBadge line="red" selected label="Selected" />
          <span className="text-sm text-zinc-400">selected</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <StationBadge line="gold" interchange label="Interchange" />
          <span className="text-sm text-zinc-400">interchange</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <StationBadge line="blue" label="Blue line" />
          <span className="text-sm text-zinc-400">blue line</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <StationBadge line="green" selected label="Green line selected" />
          <span className="text-sm text-zinc-400">green selected</span>
        </div>
      </div>
    </div>
  );
}
