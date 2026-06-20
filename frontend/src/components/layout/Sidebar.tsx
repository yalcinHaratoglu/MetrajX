import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Boxes, FolderKanban, LayoutDashboard, LogOut, Moon, Settings, Sun, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { LanguageSelect } from "../ui/LanguageSelect";

interface SidebarProps {
  mobileOpen?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onNavigate, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "sidebar-link-active" : "sidebar-link";

  const displayName =
    user?.company_name?.trim() ||
    `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() ||
    user?.email ||
    "";

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
        <NavLink to="/projects" className={linkClass} onClick={onNavigate}>
          <FolderKanban size={18} />
          {t("nav.projects")}
        </NavLink>
        <NavLink to="/settings" className={linkClass} onClick={onNavigate}>
          <Settings size={18} />
          {t("nav.settings")}
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-utilities">
          <LanguageSelect className="sidebar-lang" />
          <button
            type="button"
            className="btn-icon sidebar-theme-btn"
            onClick={toggleTheme}
            aria-label={t("header.toggleTheme")}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
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
