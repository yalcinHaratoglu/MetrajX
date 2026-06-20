import { useState } from "react";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function DashboardLayout() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="dashboard-layout">
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={closeMobile}
          aria-label="close"
        />
      )}

      <Sidebar mobileOpen={mobileOpen} onNavigate={closeMobile} onClose={closeMobile} />

      <div className="dashboard-main">
        <button
          type="button"
          className="mobile-menu-fab"
          onClick={() => setMobileOpen(true)}
          aria-label={t("nav.openMenu")}
        >
          <Menu size={20} />
        </button>
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
