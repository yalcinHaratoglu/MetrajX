import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SiteProvider } from "./context/SiteContext";
import { ThemeProvider } from "./context/ThemeContext";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ToastViewport } from "./components/ui/ToastViewport";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import { AcceptInvitePage } from "./pages/AcceptInvitePage";
import { ActivatePage } from "./pages/ActivatePage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { MetrajPage } from "./pages/MetrajPage";
import { RebarPage } from "./pages/RebarPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SitesPage } from "./pages/SitesPage";
import "./i18n";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SiteProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>
              <Route path="/activate/:token" element={<ActivatePage />} />
              <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/sites" element={<SitesPage />} />
                  <Route path="/metraj" element={<MetrajPage />} />
                  <Route path="/applications" element={<ApplicationsPage />} />
                  <Route path="/rebar" element={<RebarPage />} />
                  <Route path="/sites/:id" element={<Navigate to="/metraj" replace />} />
                  <Route path="/projects" element={<Navigate to="/sites" replace />} />
                  <Route path="/projects/:id" element={<Navigate to="/sites" replace />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
          <ToastViewport />
        </SiteProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
