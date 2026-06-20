import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Boxes, Building2, Layers, Scissors, TrendingDown } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { projectService, type Project } from "../services/projectService";

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let active = true;
    void projectService
      .list()
      .then((data) => {
        if (active) setProjects(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const floors = projects.reduce((sum, project) => sum + (project.floors?.length ?? 0), 0);
  const requirements = projects.reduce((sum, project) => sum + project.requirements_count, 0);
  const ready = projects.filter((project) => project.status === "ready").length;

  const statCards = [
    { icon: Building2, label: t("dashboard.stats.projects"), value: String(projects.length) },
    { icon: Layers, label: t("dashboard.stats.floors"), value: String(floors) },
    { icon: Scissors, label: t("dashboard.stats.cuts"), value: String(requirements) },
    { icon: TrendingDown, label: t("dashboard.stats.waste"), value: String(ready) },
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
          <Link to="/projects" className="btn-primary mt-4">
            {t("projects.new")}
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
        <div className="page-toolbar">
          <h2 className="detail-section-title">{t("dashboard.recentProjects")}</h2>
          <Link to="/projects" className="link-primary text-sm">
            {t("dashboard.viewAll")}
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="info-banner">
            <p className="info-banner-title">{t("projects.empty")}</p>
            <p className="info-banner-desc">{t("projects.emptyDesc")}</p>
          </div>
        ) : (
          <div className="project-grid">
            {projects.slice(0, 6).map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`} className="project-card">
                <div className="project-card-header">
                  <span className="project-card-title">{project.name}</span>
                  <span className={`badge badge-${project.status}`}>
                    {t(`projects.status.${project.status}`)}
                  </span>
                </div>
                <div className="project-card-meta">
                  <span className="project-card-metric">
                    <span className="project-card-metric-value">{project.requirements_count}</span>
                    {t("projects.requirements")}
                  </span>
                  <span className="project-card-metric">
                    <span className="project-card-metric-value">{project.floors?.length ?? 0}</span>
                    {t("projects.floors")}
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
