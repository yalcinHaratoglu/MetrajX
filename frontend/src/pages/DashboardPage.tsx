import { useTranslation } from "react-i18next";
import { Card } from "../components/ui/Card";
import { useAuth } from "../hooks/useAuth";

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="form-stack">
      <div>
        <h1 className="section-title">{t("dashboard.title")}</h1>
        <p className="text-muted">{t("dashboard.welcome")}</p>
      </div>

      <Card variant="wide">
        {user && (
          <p>
            {user.first_name} {user.last_name} — {user.email}
          </p>
        )}
      </Card>
    </div>
  );
}
