export function heatLevel(score: number | null | undefined): "cold" | "low" | "mid" | "high" {
  const s = score ?? 0;
  if (s <= 0) return "cold";
  if (s <= 3) return "low";
  if (s <= 8) return "mid";
  return "high";
}

export function heatBadgeClass(score: number | null | undefined): string {
  const level = heatLevel(score);
  switch (level) {
    case "cold":
      return "bg-heat-cold/20 text-heat-cold border border-heat-cold/40";
    case "low":
      return "bg-heat-low/20 text-heat-low border border-heat-low/40";
    case "mid":
      return "bg-heat-mid/20 text-heat-mid border border-heat-mid/40";
    case "high":
      return "bg-heat-high/20 text-heat-high border border-heat-high/40";
  }
}
