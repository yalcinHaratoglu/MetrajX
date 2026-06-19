import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Layers, Scissors, TrendingDown } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { projectService } from "../services/projectService";

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    projects: "—",
    floors: "—",
    cuts: "—",
    waste: "—",
  });

  useEffect(() => {
    let active = true;

    void projectService
      .getStats()
      .then((data) => {
        if (!active) return;
        setStats({
          projects: String(data.projects),
          floors: String(data.floors),
          cuts: String(data.requirements),
          waste: "—",
        });
      })
      .catch(() => {
        if (!active) return;
      });

    return () => {
      active = false;
    };
  }, []);

  const statCards = [
    { icon: Building2, label: t("dashboard.stats.projects"), value: stats.projects },
    { icon: Layers, label: t("dashboard.stats.floors"), value: stats.floors },
    { icon: Scissors, label: t("dashboard.stats.cuts"), value: stats.cuts },
    { icon: TrendingDown, label: t("dashboard.stats.waste"), value: stats.waste },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <p className="dashboard-hero-label">{t("dashboard.hero.label")}</p>
          <h1 className="dashboard-hero-title">
            {t("dashboard.hero.greeting", { name: user?.first_name || t("dashboard.hero.defaultName") })}
          </h1>
          <p className="dashboard-hero-desc">{t("dashboard.hero.desc")}</p>
        </div>
        <div className="dashboard-hero-accent" aria-hidden>
          <Building2 size={48} strokeWidth={1.25} />
        </div>
      </div>

      <div className="stat-grid">
        {statCards.map(({ icon: Icon, label, value }) => (
          <div key={label} className="stat-card">
            <div className="stat-card-icon">
              <Icon size={20} />
            </div>
            <div>
              <p className="stat-card-value">{value}</p>
              <p className="stat-card-label">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="info-banner">
        <p className="info-banner-title">{t("dashboard.banner.title")}</p>
        <p className="info-banner-desc">{t("dashboard.banner.desc")}</p>
      </div>
    </div>
  );
}
