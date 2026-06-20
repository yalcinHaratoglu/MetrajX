import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getPresetById,
  hexToRgb,
  type PrimaryPresetId,
} from "../utils/color";
import { ThemeContext, type Theme } from "./theme-context";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem("conmanage-theme") as Theme) ?? "light",
  );
  const [primaryPreset, setPrimaryPresetState] = useState<PrimaryPresetId>(
    () => (localStorage.getItem("conmanage-primary-preset") as PrimaryPresetId) ?? "blueprint",
  );
  const [customHex, setCustomHexState] = useState(
    () => localStorage.getItem("conmanage-custom-hex") ?? "#0284c7",
  );
  const [useCustom, setUseCustom] = useState(
    () => localStorage.getItem("conmanage-use-custom-color") === "true",
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("conmanage-theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const rgb = useCustom
      ? hexToRgb(customHex) ?? getPresetById(primaryPreset).rgb
      : getPresetById(primaryPreset).rgb;
    root.style.setProperty("--color-primary", rgb);
    localStorage.setItem("conmanage-primary-preset", primaryPreset);
    localStorage.setItem("conmanage-custom-hex", customHex);
    localStorage.setItem("conmanage-use-custom-color", String(useCustom));
  }, [primaryPreset, customHex, useCustom]);

  const value = useMemo(
    () => ({
      theme,
      primaryPreset,
      customHex,
      setTheme: setThemeState,
      setPrimaryPreset: (preset: PrimaryPresetId) => {
        setUseCustom(false);
        setPrimaryPresetState(preset);
      },
      setCustomHex: (hex: string) => {
        setUseCustom(true);
        setCustomHexState(hex);
      },
      toggleTheme: () => setThemeState((prev) => (prev === "light" ? "dark" : "light")),
    }),
    [theme, primaryPreset, customHex],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
