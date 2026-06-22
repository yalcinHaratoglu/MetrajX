import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Boxes, Building2, HardHat, LayoutDashboard, LogOut, Ruler, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { SidebarApplicationsNav } from "./SidebarApplicationsNav";
import { SidebarSiteToolsNav } from "./SidebarSiteToolsNav";

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}

export function Sidebar({ collapsed = false, mobileOpen = false, onNavigate, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "sidebar-link-active" : "sidebar-link";

  const displayName =
    user?.company_name?.trim() ||
    `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() ||
    user?.email ||
    "";

  return (
    <aside
      className={`sidebar${collapsed ? " is-collapsed" : ""}${mobileOpen ? " sidebar-mobile-open" : ""}`}
    >
      <div className="sidebar-mobile-header">
        <span className="sidebar-brand">{t("app.name")}</span>
        <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label={t("nav.closeMenu")}>
          <X size={20} />
        </button>
      </div>

      <div className="sidebar-brand-block">
        <div className="sidebar-logo">
          <Boxes size={22} />
        </div>
        <div>
          <div className="sidebar-brand">{t("app.name")}</div>
          <div className="sidebar-tagline">{t("app.tagline")}</div>
        </div>
      </div>

      {displayName && (
        <div className="sidebar-user">
          <p className="sidebar-user-label">{t("header.welcome")}</p>
          <p className="sidebar-user-name">{displayName}</p>
        </div>
      )}

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={linkClass} onClick={onNavigate}>
          <LayoutDashboard size={18} />
          {t("nav.dashboard")}
        </NavLink>
        <NavLink to="/sites" className={linkClass} onClick={onNavigate}>
          <Building2 size={18} />
          {t("nav.sites")}
        </NavLink>
        <NavLink to="/metraj" className={linkClass} onClick={onNavigate}>
          <Ruler size={18} />
          {t("nav.metraj")}
        </NavLink>
        <NavLink to="/puantaj" className={linkClass} onClick={onNavigate}>
          <HardHat size={18} />
          {t("nav.puantaj")}
        </NavLink>
        <SidebarSiteToolsNav onNavigate={onNavigate} />
        <SidebarApplicationsNav onNavigate={onNavigate} />
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
