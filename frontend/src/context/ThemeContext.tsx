import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import i18n from "../i18n";

type Theme = "light" | "dark";
type PrimaryColor = "blue" | "green" | "orange";

interface ThemeContextValue {
  theme: Theme;
  primaryColor: PrimaryColor;
  toggleTheme: () => void;
  setPrimaryColor: (color: PrimaryColor) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("metrajx-theme") as Theme) ?? "light",
  );
  const [primaryColor, setPrimaryColorState] = useState<PrimaryColor>(
    () => (localStorage.getItem("metrajx-primary-color") as PrimaryColor) ?? "blue",
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("metrajx-theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (primaryColor === "blue") {
      root.removeAttribute("data-theme-color");
    } else {
      root.setAttribute("data-theme-color", primaryColor);
    }
    localStorage.setItem("metrajx-primary-color", primaryColor);
  }, [primaryColor]);

  const value = useMemo(
    () => ({
      theme,
      primaryColor,
      toggleTheme: () => setTheme((prev) => (prev === "light" ? "dark" : "light")),
      setPrimaryColor: setPrimaryColorState,
    }),
    [theme, primaryColor],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

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
