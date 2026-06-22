import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, LayoutGrid, Trash2 } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { appFromCatalogEntry } from "../config/applications";
import { useMarketplaceApps } from "../hooks/useMarketplaceApps";
import { useSite } from "../hooks/useSite";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

export function ApplicationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedSiteId, sites } = useSite();
  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const { catalog, loading, install, uninstall } = useMarketplaceApps();

  if (!selectedSiteId) {
    return (
      <div className="dashboard-page">
        <PageHeader title={t("applications.title")} subtitle={t("applications.subtitle")} />
        <EmptyState
          icon={<LayoutGrid size={28} />}
          title={t("applications.selectSiteTitle")}
          description={t("applications.selectSiteDesc")}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title={t("applications.title")}
        subtitle={t("applications.subtitleForSite", { site: selectedSite?.name ?? "" })}
      />

      {loading ? (
        <p className="text-muted">{t("common.loading")}</p>
      ) : catalog.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid size={28} />}
          title={t("applications.empty")}
          description={t("applications.emptyDesc")}
        />
      ) : (
        <div className="project-grid">
          {catalog.map((entry) => {
            const app = appFromCatalogEntry(entry);
            const Icon = app.icon;
            return (
              <div key={entry.slug} className="project-card app-card">
                <div className="app-card-icon">
                  <Icon size={24} />
                </div>
                <div className="project-card-header">
                  <span className="project-card-title">{t(app.titleKey)}</span>
                  {entry.is_installed && (
                    <span className="puantaj-badge is-approved">{t("applications.installedBadge")}</span>
                  )}
                </div>
                <p className="text-sm text-muted app-card-desc">{t(app.descKey)}</p>
                <div className="app-card-actions">
                  {entry.is_installed ? (
                    <>
                      <Button variant="ghost" onClick={() => navigate(app.path)}>
                        {t("applications.open")}
                      </Button>
                      {entry.installation_id && (
                        <Button
                          variant="ghost"
                          onClick={() => void uninstall(entry.installation_id!)}
                          title={t("applications.uninstall")}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </>
                  ) : entry.is_installable ? (
                    <Button onClick={() => void install(entry.slug)}>
                      <Download size={16} />
                      {t("applications.install")}
                    </Button>
                  ) : (
                    <span className="puantaj-badge is-pending">{t("applications.comingSoon")}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
