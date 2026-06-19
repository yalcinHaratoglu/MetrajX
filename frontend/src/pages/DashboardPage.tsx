import { useTranslation } from "react-i18next";
import { LogOut, Moon, Sun } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { useLanguage, useTheme } from "../context/ThemeContext";

export function DashboardPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, changeLanguage } = useLanguage();

  return (
    <div className="min-h-screen p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--color-primary))]">{t("app.name")}</h1>
          <p className="text-sm opacity-70">{t("dashboard.title")}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value as "tr" | "en")}
            className="rounded-lg border border-[rgb(var(--border))] bg-transparent px-2 py-1.5 text-sm"
          >
            <option value="tr">TR</option>
            <option value="en">EN</option>
          </select>
          <Button variant="ghost" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </Button>
          <Button variant="ghost" onClick={() => void logout()}>
            <LogOut size={18} className="mr-1" />
            {t("auth.logout")}
          </Button>
        </div>
      </header>

      <Card>
        <h2 className="text-xl font-semibold">{t("dashboard.welcome")}</h2>
        {user && (
          <p className="mt-2 opacity-80">
            {user.first_name} {user.last_name} ({user.email})
          </p>
        )}
      </Card>
    </div>
  );
}
