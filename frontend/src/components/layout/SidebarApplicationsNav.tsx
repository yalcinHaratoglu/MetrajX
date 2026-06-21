import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { APPLICATIONS, isApplicationsPath } from "../../config/applications";

interface SidebarApplicationsNavProps {
  onNavigate?: () => void;
}

export function SidebarApplicationsNav({ onNavigate }: SidebarApplicationsNavProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const appsActive = isApplicationsPath(pathname);
  const [expanded, setExpanded] = useState(false);
  const showSub = expanded || appsActive;

  const mainLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "sidebar-link-active sidebar-link-flex" : "sidebar-link sidebar-link-flex";

  const subLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "sidebar-link-sub-active sidebar-link-sub" : "sidebar-link-sub";

  return (
    <div className="sidebar-nav-group">
      <div className="sidebar-nav-group-header">
        <NavLink to="/applications" className={mainLinkClass} onClick={onNavigate}>
          <LayoutGrid size={18} />
          {t("nav.applications")}
        </NavLink>
        <button
          type="button"
          className="sidebar-nav-chevron"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={showSub}
          aria-label={t("nav.toggleApplications")}
        >
          <ChevronRight size={16} className={showSub ? "is-open" : ""} />
        </button>
      </div>
      {showSub && (
        <div className="sidebar-nav-sub">
          {APPLICATIONS.map((app) => {
            const Icon = app.icon;
            return (
              <NavLink key={app.id} to={app.path} className={subLinkClass} onClick={onNavigate}>
                <Icon size={16} />
                {t(app.titleKey)}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
