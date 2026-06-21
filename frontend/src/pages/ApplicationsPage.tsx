import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutGrid } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { APPLICATIONS } from "../config/applications";
import { EmptyState } from "../components/ui/EmptyState";

export function ApplicationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="page-stack">
      <PageHeader title={t("applications.title")} subtitle={t("applications.subtitle")} />

      {APPLICATIONS.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid size={28} />}
          title={t("applications.empty")}
          description={t("applications.emptyDesc")}
        />
      ) : (
        <div className="project-grid">
          {APPLICATIONS.map((app) => {
            const Icon = app.icon;
            return (
              <button
                key={app.id}
                type="button"
                className="project-card project-card-button app-card"
                onClick={() => navigate(app.path)}
              >
                <div className="app-card-icon">
                  <Icon size={24} />
                </div>
                <div className="project-card-header">
                  <span className="project-card-title">{t(app.titleKey)}</span>
                </div>
                <p className="text-sm text-muted app-card-desc">{t(app.descKey)}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
