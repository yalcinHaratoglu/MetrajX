import { useContext } from "react";
import i18n from "../i18n";
import { ThemeContext } from "../context/theme-context";

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export function useLanguage() {
  const changeLanguage = (lng: "tr" | "en") => {
    void i18n.changeLanguage(lng);
    localStorage.setItem("metrajx-language", lng);
  };

  return {
    language: i18n.language as "tr" | "en",
    changeLanguage,
  };
}

export type { PrimaryPresetId } from "../utils/color";
export type { Theme } from "../context/theme-context";
