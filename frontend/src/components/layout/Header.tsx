import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";

interface HeaderProps {
  onMenuOpen?: () => void;
}

export function Header({ onMenuOpen }: HeaderProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

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
    </header>
  );
}
