export const PRIMARY_PRESETS = [
  { id: "blueprint", hex: "#0284c7", rgb: "2 132 199" },
  { id: "cyan", hex: "#0891b2", rgb: "8 145 178" },
  { id: "steel", hex: "#475569", rgb: "71 85 105" },
  { id: "amber", hex: "#d97706", rgb: "217 119 6" },
  { id: "blue", hex: "#2563eb", rgb: "37 99 235" },
  { id: "teal", hex: "#0d9488", rgb: "13 148 136" },
  { id: "orange", hex: "#ea580c", rgb: "234 88 12" },
  { id: "concrete", hex: "#78716c", rgb: "120 113 108" },
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
