import { Link } from "react-router-dom";
import { Menu, Moon, Settings, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../hooks/useTheme";
import { LanguageSelect } from "../ui/LanguageSelect";
import { SiteSelector } from "./SiteSelector";
import { TodayEventsPopover } from "./TodayEventsPopover";

interface HeaderProps {
  onMenuOpen?: () => void;
}

export function Header({ onMenuOpen }: HeaderProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-left">
        <button
          type="button"
          className="header-menu-btn"
          onClick={onMenuOpen}
          aria-label={t("nav.openMenu")}
        >
          <Menu size={20} />
        </button>
        <div className="header-site-selector">
          <SiteSelector variant="header" />
        </div>
      </div>

      <div className="header-actions">
        <TodayEventsPopover />
        <div className="header-lang">
          <LanguageSelect />
        </div>
        <button
          type="button"
          className="btn-icon"
          onClick={toggleTheme}
          aria-label={t("header.toggleTheme")}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Link to="/settings" className="btn-icon header-settings-btn" aria-label={t("nav.settings")}>
          <Settings size={18} />
        </Link>
      </div>
    </header>
  );
}
