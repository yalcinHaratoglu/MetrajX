import { Check, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { LanguageSelect } from "../ui/LanguageSelect";
import { useTheme } from "../../hooks/useTheme";
import { PRIMARY_PRESETS } from "../../utils/color";

export function AppearanceForm() {
  const { t } = useTranslation();
  const { theme, setTheme, primaryPreset, setPrimaryPreset, customHex, setCustomHex } = useTheme();

  return (
    <div className="form-stack">
      <div className="appearance-card">
        <h3 className="appearance-card-title">{t("settings.appearance.theme.title")}</h3>
        <p className="appearance-card-desc">{t("settings.appearance.theme.desc")}</p>
        <div className="theme-toggle-group">
          <button
            type="button"
            className={`theme-toggle-btn ${theme === "light" ? "theme-toggle-btn-active" : ""}`}
            onClick={() => setTheme("light")}
          >
            <Sun size={18} />
            {t("settings.appearance.theme.light")}
          </button>
          <button
            type="button"
            className={`theme-toggle-btn ${theme === "dark" ? "theme-toggle-btn-active" : ""}`}
            onClick={() => setTheme("dark")}
          >
            <Moon size={18} />
            {t("settings.appearance.theme.dark")}
          </button>
        </div>
      </div>

      <div className="appearance-card">
        <h3 className="appearance-card-title">{t("settings.appearance.language.title")}</h3>
        <p className="appearance-card-desc">{t("settings.appearance.language.desc")}</p>
        <LanguageSelect className="w-full" />
      </div>

      <div className="appearance-card">
        <h3 className="appearance-card-title">{t("settings.appearance.color.title")}</h3>
        <p className="appearance-card-desc">{t("settings.appearance.color.desc")}</p>

        <div className="color-swatches mb-4">
          {PRIMARY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`color-swatch-btn ${
                primaryPreset === preset.id ? "color-swatch-btn-active" : ""
              }`}
              style={{ backgroundColor: preset.hex }}
              onClick={() => setPrimaryPreset(preset.id)}
              aria-label={preset.id}
            >
              {primaryPreset === preset.id && <Check size={14} className="text-white" />}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="form-label flex-1 min-w-[200px]">
            <span className="form-label-text">{t("settings.appearance.color.custom")}</span>
            <div className="flex gap-2">
              <input
                type="color"
                className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border p-1"
                style={{ borderColor: "rgb(var(--border))" }}
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
              />
              <input
                className="input flex-1"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                placeholder="#334155"
              />
            </div>
          </label>
          <Button type="button">{t("settings.appearance.color.preview")}</Button>
        </div>
      </div>
    </div>
  );
}
