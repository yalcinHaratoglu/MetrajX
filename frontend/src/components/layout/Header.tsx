import { Menu, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { LanguageSelect } from "../ui/LanguageSelect";

interface HeaderProps {
  onMenuOpen?: () => void;
}

export function Header({ onMenuOpen }: HeaderProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
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
        <div>
          <p className="text-sm text-muted">{t("header.welcome")}</p>
          <p className="font-medium">
            {user?.first_name} {user?.last_name}
          </p>
        </div>
      </div>

      <div className="header-actions">
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
      </div>
    </header>
  );
}
