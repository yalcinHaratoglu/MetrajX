import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import GB from "country-flag-icons/react/3x2/GB";
import TR from "country-flag-icons/react/3x2/TR";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../hooks/useTheme";

const LANGUAGES = [
  { code: "tr" as const, Icon: TR, labelKey: "settings.appearance.language.tr" },
  { code: "en" as const, Icon: GB, labelKey: "settings.appearance.language.en" },
];

interface LanguageSelectProps {
  className?: string;
}

export function LanguageSelect({ className = "" }: LanguageSelectProps) {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((lang) => lang.code === language) ?? LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={`lang-dropdown ${className}`.trim()}>
      <button
        type="button"
        className="lang-dropdown-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("header.language")}
      >
        <current.Icon className="language-flag" title={t(current.labelKey)} />
        <span className="lang-dropdown-label">{t(current.labelKey)}</span>
        <ChevronDown size={16} className={`lang-dropdown-chevron ${open ? "is-open" : ""}`} />
      </button>

      {open && (
        <ul className="lang-dropdown-menu" role="listbox">
          {LANGUAGES.map(({ code, Icon, labelKey }) => {
            const isActive = language === code;
            return (
              <li key={code} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={`lang-dropdown-option ${isActive ? "is-active" : ""}`}
                  onClick={() => {
                    changeLanguage(code);
                    setOpen(false);
                  }}
                >
                  <Icon className="language-flag-sm" title={t(labelKey)} />
                  <span>{t(labelKey)}</span>
                  {isActive && <Check size={16} className="lang-dropdown-check" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
