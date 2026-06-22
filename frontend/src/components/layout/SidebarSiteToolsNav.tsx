import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronRight, ClipboardList, Package, Wallet, Wrench } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

interface SidebarSiteToolsNavProps {
  onNavigate?: () => void;
}

const SITE_TOOL_PATHS = ["/takvim", "/gunluk-rapor", "/demirbas", "/finans"];

export function SidebarSiteToolsNav({ onNavigate }: SidebarSiteToolsNavProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const showFinans =
    user?.role === "owner" || user?.role === "admin" || user?.role === "accountant";

  const toolsActive = useMemo(
    () => SITE_TOOL_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)),
    [pathname],
  );
  const [expanded, setExpanded] = useState(false);
  const showSub = expanded || toolsActive;

  const mainLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "sidebar-link-active sidebar-link-flex" : "sidebar-link sidebar-link-flex";

  const subLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "sidebar-link-sub-active sidebar-link-sub" : "sidebar-link-sub";

  return (
    <div className="sidebar-nav-group">
      <div className="sidebar-nav-group-header">
        <NavLink to="/takvim" className={mainLinkClass} onClick={onNavigate}>
          <Wrench size={18} />
          {t("nav.siteTools")}
        </NavLink>
        <button
          type="button"
          className="sidebar-nav-chevron"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={showSub}
          aria-label={t("nav.toggleSiteTools")}
        >
          <ChevronRight size={16} className={showSub ? "is-open" : ""} />
        </button>
      </div>
      {showSub && (
        <div className="sidebar-nav-sub">
          <NavLink to="/takvim" className={subLinkClass} onClick={onNavigate}>
            <CalendarDays size={16} />
            {t("nav.calendar")}
          </NavLink>
          <NavLink to="/gunluk-rapor" className={subLinkClass} onClick={onNavigate}>
            <ClipboardList size={16} />
            {t("nav.dailyLog")}
          </NavLink>
          <NavLink to="/demirbas" className={subLinkClass} onClick={onNavigate}>
            <Package size={16} />
            {t("nav.assets")}
          </NavLink>
          {showFinans && (
            <NavLink to="/finans" className={subLinkClass} onClick={onNavigate}>
              <Wallet size={16} />
              {t("nav.finans")}
            </NavLink>
          )}
        </div>
      )}
    </div>
  );
}
