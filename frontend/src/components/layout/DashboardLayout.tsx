import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function DashboardLayout() {
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
        <Header onMenuOpen={() => setMobileOpen(true)} />
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
