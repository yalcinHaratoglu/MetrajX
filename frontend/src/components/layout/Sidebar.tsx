import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, LogOut, Settings } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export function Sidebar() {
  const { t } = useTranslation();
  const { logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "sidebar-link-active" : "sidebar-link";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">{t("app.name")}</div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={linkClass}>
          <LayoutDashboard size={18} />
          {t("nav.dashboard")}
        </NavLink>
        <NavLink to="/settings" className={linkClass}>
          <Settings size={18} />
          {t("nav.settings")}
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-logout" onClick={() => void logout()}>
          <LogOut size={18} />
          {t("auth.logout")}
        </button>
      </div>
    </aside>
  );
}
