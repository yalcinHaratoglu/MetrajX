import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Boxes, Building2, Layers, Scissors, TrendingDown } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { useAuth } from "../hooks/useAuth";
import { useFilteredSites } from "../hooks/useSite";
import { siteService, type Site } from "../services/siteService";

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);

  useEffect(() => {
    let active = true;
    void siteService
      .list()
      .then((data) => {
        if (active) setSites(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const filteredSites = useFilteredSites(sites);
  const requirements = filteredSites.reduce((sum, site) => sum + site.requirements_count, 0);
  const activeSites = filteredSites.filter((site) => site.status === "active").length;

  const statCards = [
    { icon: Building2, label: t("dashboard.stats.sites"), value: String(filteredSites.length) },
    { icon: Layers, label: t("dashboard.stats.requirements"), value: String(requirements) },
    { icon: Scissors, label: t("dashboard.stats.activeSites"), value: String(activeSites) },
    { icon: TrendingDown, label: t("dashboard.stats.role"), value: t(`settings.team.roles.${user?.role ?? "member"}`) },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero blueprint-panel">
        <div>
          <p className="dashboard-hero-label">{t("dashboard.hero.label")}</p>
          <h1 className="dashboard-hero-title">
            {t("dashboard.hero.greeting", { name: user?.first_name || t("dashboard.hero.defaultName") })}
          </h1>
          <p className="dashboard-hero-desc">{t("dashboard.hero.desc")}</p>
          <Link to="/sites" className="btn-primary mt-4">
            {t("sites.new")}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="dashboard-hero-accent" aria-hidden>
          <Boxes size={48} strokeWidth={1.25} />
        </div>
      </div>

      <div className="stat-grid">
        {statCards.map(({ icon: Icon, label, value }) => (
          <div key={label} className="stat-card">
            <div className="stat-card-icon">
              <Icon size={20} />
            </div>
            <div>
              <p className="stat-card-value mono">{value}</p>
              <p className="stat-card-label">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <PageHeader
          variant="section"
          title={t("dashboard.recentSites")}
          actions={
            <Link to="/sites" className="link-primary text-sm">
              {t("dashboard.viewAll")}
            </Link>
          }
        />

        {filteredSites.length === 0 ? (
          <div className="info-banner">
            <p className="info-banner-title">{t("sites.empty")}</p>
            <p className="info-banner-desc">{t("sites.emptyDesc")}</p>
          </div>
        ) : (
          <div className="project-grid">
            {filteredSites.slice(0, 6).map((site) => (
              <Link key={site.id} to={`/sites/${site.id}`} className="project-card">
                <div className="project-card-header">
                  <span className="project-card-title">{site.name}</span>
                  <span className={`badge badge-${site.status === "active" ? "ready" : "draft"}`}>
                    {t(`sites.status.${site.status}`)}
                  </span>
                </div>
                <div className="project-card-meta">
                  <span className="project-card-metric">
                    <span className="project-card-metric-value">{site.requirements_count}</span>
                    {t("projects.requirements")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
