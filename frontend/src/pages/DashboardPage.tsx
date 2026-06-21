import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Boxes, Building2, Ruler, User, Zap } from "lucide-react";
import { MetrajCalendarPanel } from "../components/metraj/MetrajCalendarPanel";
import { PageHeader } from "../components/layout/PageHeader";
import { SiteCard } from "../components/sites/SiteCard";
import { useAuth } from "../hooks/useAuth";
import { useFilteredSites } from "../hooks/useSite";
import { siteService, type Site } from "../services/siteService";

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const siteIds = useMemo(() => filteredSites.map((site) => site.id), [filteredSites]);
  const metrajItems = filteredSites.reduce((sum, site) => sum + site.metraj_item_count, 0);
  const activeSites = filteredSites.filter((site) => site.status === "active").length;

  const statCards = [
    { icon: Building2, label: t("dashboard.stats.sites"), value: String(filteredSites.length) },
    { icon: Ruler, label: t("dashboard.stats.metrajItems"), value: String(metrajItems) },
    { icon: Zap, label: t("dashboard.stats.activeSites"), value: String(activeSites) },
    { icon: User, label: t("dashboard.stats.role"), value: t(`settings.team.roles.${user?.role ?? "member"}`) },
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

      <MetrajCalendarPanel
        key={siteIds.join(",")}
        collapsible
        defaultOpen={false}
        siteIds={siteIds}
        title={t("dashboard.calendar.title")}
        description={t("dashboard.calendar.desc")}
        emptyMessage={t("sites.selector.empty")}
        readonly
        selectToday
        onSelectOperation={(op) => navigate(`/metraj/items/${op.item}`)}
      />

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
          <div className="project-grid site-card-grid">
            {filteredSites.slice(0, 6).map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                onClick={() => navigate(`/sites/${site.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
