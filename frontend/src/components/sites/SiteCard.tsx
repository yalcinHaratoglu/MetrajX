import {
  Building2,
  CalendarRange,
  HardHat,
  MapPin,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { CURRENCY_SYMBOLS, type Site } from "../../services/siteService";

interface SiteCardProps {
  site: Site;
  onClick?: () => void;
}

function formatDate(value: string | null, locale: string): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString(locale);
}

function formatBudget(value: string | null, currency: Site["currency"], locale: string): string | null {
  if (!value) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${num.toLocaleString(locale)} ${symbol}`;
}

function managerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function statusBadgeClass(status: Site["status"]): string {
  switch (status) {
    case "active":
    case "completed":
      return "ready";
    case "paused":
      return "draft";
    default:
      return "draft";
  }
}

export function SiteCard({ site, onClick }: SiteCardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";

  const start = formatDate(site.start_date, locale);
  const end = formatDate(site.planned_end_date, locale);
  const timeline = start && end ? `${start} – ${end}` : start ?? end ?? null;
  const budget = formatBudget(site.budget_total, site.currency, locale);
  const progress =
    site.metraj_average_progress != null ? Math.round(site.metraj_average_progress) : null;

  const detailItems = [
    site.client_owner && {
      icon: Building2,
      label: t("sites.form.clientOwner"),
      value: site.client_owner,
    },
    (site.city || site.address) && {
      icon: MapPin,
      label: t("sites.form.address"),
      value: [site.city, site.address].filter(Boolean).join(" · "),
    },
    timeline && {
      icon: CalendarRange,
      label: t("sites.timeline"),
      value: timeline,
    },
    budget && {
      icon: Wallet,
      label: t("sites.budget"),
      value: budget,
    },
  ].filter(Boolean) as { icon: typeof Building2; label: string; value: string }[];

  return (
    <div
      className="project-card site-card site-card-horizontal"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="site-card-identity">
        <div className="site-card-identity-head">
          <span className="project-card-title">{site.name}</span>
          <span className={`badge badge-${statusBadgeClass(site.status)}`}>
            {t(`sites.status.${site.status}`)}
          </span>
        </div>
        <span className="site-card-code">{site.code}</span>
        {(site.project_type || site.parcel_number) && (
          <div className="site-card-tags">
            {site.project_type && (
              <span className="site-card-tag">{t(`sites.projectType.${site.project_type}`)}</span>
            )}
            {site.parcel_number && (
              <span className="site-card-tag">
                {t("sites.form.parcelNumber")}: {site.parcel_number}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="site-card-center">
        {detailItems.length > 0 && (
          <div className="site-card-details-row">
            {detailItems.map(({ icon: Icon, label, value }) => (
              <div key={label} className="site-card-detail-cell">
                <Icon size={13} aria-hidden />
                <div>
                  <span className="site-card-detail-label">{label}</span>
                  <span className="site-card-detail-value">{value}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="site-card-managers-row">
          <HardHat size={14} aria-hidden />
          <span className="site-card-managers-label">{t("sites.form.managers")}:</span>
          {site.manager_names.length > 0 ? (
            <ul className="site-card-manager-list">
              {site.manager_names.map((name) => (
                <li key={name} className="site-card-manager-chip">
                  <span className="site-card-manager-avatar" aria-hidden>
                    {managerInitials(name)}
                  </span>
                  <span className="site-card-manager-name">{name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="site-card-manager-empty">{t("sites.noManagerAssigned")}</span>
          )}
        </div>
      </div>

      <div className="site-card-metrics">
        <div className="site-card-stat">
          <span className="site-card-stat-value">{site.metraj_item_count}</span>
          <span className="site-card-stat-label">{t("sites.metrajItems")}</span>
        </div>
        <div className="site-card-stat site-card-stat-progress">
          <span className="site-card-stat-value">{progress !== null ? `${progress}%` : "—"}</span>
          <span className="site-card-stat-label">{t("sites.metrajProgress")}</span>
          {progress !== null && (
            <div className="site-card-progress-bar" aria-hidden>
              <div
                className="site-card-progress-fill"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
