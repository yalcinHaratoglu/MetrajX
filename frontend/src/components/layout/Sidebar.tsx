import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HardHat, LayoutDashboard, LogOut, Settings, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

interface SidebarProps {
  mobileOpen?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onNavigate, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "sidebar-link-active" : "sidebar-link";

  return (
    <aside className={`sidebar ${mobileOpen ? "sidebar-mobile-open" : ""}`}>
      <div className="sidebar-mobile-header">
        <span className="sidebar-brand">{t("app.name")}</span>
        <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label={t("nav.closeMenu")}>
          <X size={20} />
        </button>
      </div>

      <div className="sidebar-brand-block">
        <div className="sidebar-logo">
          <HardHat size={22} />
        </div>
        <div>
          <div className="sidebar-brand">{t("app.name")}</div>
          <div className="sidebar-tagline">{t("app.tagline")}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={linkClass} onClick={onNavigate}>
          <LayoutDashboard size={18} />
          {t("nav.dashboard")}
        </NavLink>
        <NavLink to="/settings" className={linkClass} onClick={onNavigate}>
          <Settings size={18} />
          {t("nav.settings")}
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-logout"
          onClick={() => {
            void logout();
            onNavigate?.();
          }}
        >
          <LogOut size={18} />
          {t("auth.logout")}
        </button>
      </div>
    </aside>
  );
}
