export const PRIMARY_PRESETS = [
  { id: "slate", hex: "#334155", rgb: "51 65 85" },
  { id: "blue", hex: "#3b82f6", rgb: "59 130 246" },
  { id: "green", hex: "#22c55e", rgb: "34 197 94" },
  { id: "rose", hex: "#f43f5e", rgb: "244 63 94" },
  { id: "orange", hex: "#f97316", rgb: "249 115 22" },
  { id: "purple", hex: "#a855f7", rgb: "168 85 247" },
  { id: "cyan", hex: "#06b6d4", rgb: "6 182 212" },
] as const;

export type PrimaryPresetId = (typeof PRIMARY_PRESETS)[number]["id"];

export function hexToRgb(hex: string): string | null {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function getPresetById(id: string) {
  return PRIMARY_PRESETS.find((preset) => preset.id === id) ?? PRIMARY_PRESETS[0];
}
