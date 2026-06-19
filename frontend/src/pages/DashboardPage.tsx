import { useTranslation } from "react-i18next";
import { Building2, Layers, Scissors, TrendingDown } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const stats = [
    { icon: Building2, label: t("dashboard.stats.projects"), value: "—" },
    { icon: Layers, label: t("dashboard.stats.floors"), value: "—" },
    { icon: Scissors, label: t("dashboard.stats.cuts"), value: "—" },
    { icon: TrendingDown, label: t("dashboard.stats.waste"), value: "—" },
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
        {stats.map(({ icon: Icon, label, value }) => (
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
