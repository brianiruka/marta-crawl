type LineColor = "red" | "gold" | "blue" | "green" | "streetcar";

type StationBadgeProps = {
  line: LineColor;
  selected?: boolean;
  interchange?: boolean;
  onClick?: () => void;
  label?: string;
};

const lineColorClass: Record<LineColor, { ring: string; fill: string }> = {
  red: { ring: "ring-line-red", fill: "bg-line-red" },
  gold: { ring: "ring-line-gold", fill: "bg-line-gold" },
  blue: { ring: "ring-line-blue", fill: "bg-line-blue" },
  green: { ring: "ring-line-green", fill: "bg-line-green" },
  streetcar: { ring: "ring-line-streetcar", fill: "bg-line-streetcar" },
};

export function StationBadge({
  line,
  selected = false,
  interchange = false,
  onClick,
  label,
}: StationBadgeProps) {
  const { ring, fill } = lineColorClass[line];

  if (interchange) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={selected}
        className="h-6 w-6 rounded-md border-4 border-brand-black bg-white"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      className={[
        "rounded-full transition-all",
        selected
          ? `h-7 w-7 ${fill} ring-4 ring-offset-2 ring-offset-white ${ring}`
          : `h-5 w-5 bg-white border-4 ${ring.replace("ring-", "border-")}`,
      ].join(" ")}
    />
  );
}
