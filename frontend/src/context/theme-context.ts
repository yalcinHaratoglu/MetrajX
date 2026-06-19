import { createContext } from "react";
import type { PrimaryPresetId } from "../utils/color";

export type Theme = "light" | "dark";

export interface ThemeContextValue {
  theme: Theme;
  primaryPreset: PrimaryPresetId;
  customHex: string;
  setTheme: (theme: Theme) => void;
  setPrimaryPreset: (preset: PrimaryPresetId) => void;
  setCustomHex: (hex: string) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
