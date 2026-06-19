import GB from "country-flag-icons/react/3x2/GB";
import TR from "country-flag-icons/react/3x2/TR";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../hooks/useTheme";
import { Dropdown } from "./Dropdown";

interface LanguageSelectProps {
  className?: string;
  label?: string;
}

export function LanguageSelect({ className = "", label }: LanguageSelectProps) {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();

  const options = [
    {
      value: "tr" as const,
      label: t("settings.appearance.language.tr"),
      icon: <TR className="language-flag-sm" title="TR" />,
    },
    {
      value: "en" as const,
      label: t("settings.appearance.language.en"),
      icon: <GB className="language-flag-sm" title="GB" />,
    },
  ];

  return (
    <Dropdown
      className={className}
      label={label}
      value={language}
      onChange={changeLanguage}
      options={options}
      ariaLabel={t("header.language")}
    />
  );
}
