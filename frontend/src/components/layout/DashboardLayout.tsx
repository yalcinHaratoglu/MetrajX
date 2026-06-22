import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

const SIDEBAR_COLLAPSED_KEY = "conmanage_sidebar_collapsed";

export function DashboardLayout() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((v) => !v), []);

  return (
    <div className={`dashboard-layout${sidebarCollapsed ? " is-sidebar-collapsed" : ""}`}>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={closeMobile}
          aria-label="close"
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onNavigate={closeMobile}
        onClose={closeMobile}
      />

      <button
        type="button"
        className="sidebar-rail-toggle"
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
        title={sidebarCollapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
      >
        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="dashboard-main">
        <Header onMenuOpen={() => setMobileOpen(true)} />
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
