import { Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { useSite } from "../../hooks/useSite";
import { Select } from "../ui/Select";

export function SiteSelector() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { sites, selectedSiteId, setSelectedSiteId, isLoading } = useSite();

  const canViewAll =
    user?.role === "owner" || user?.role === "accountant" || user?.role === "admin";

  if (isLoading && sites.length === 0) {
    return null;
  }

  if (sites.length === 0) {
    return (
      <div className="sidebar-site-selector">
        <p className="sidebar-site-empty">{t("sites.selector.empty")}</p>
      </div>
    );
  }

  const options = [
    ...(canViewAll
      ? [{ value: "all", label: t("sites.selector.all"), icon: <Building2 size={16} /> }]
      : []),
    ...sites.map((site) => ({
      value: String(site.id),
      label: site.code ? `${site.name} (${site.code})` : site.name,
      icon: <Building2 size={16} />,
    })),
  ];

  return (
    <div className="sidebar-site-selector">
      <Select
        label={t("sites.selector.label")}
        value={selectedSiteId === null ? "all" : String(selectedSiteId)}
        onChange={(value) => setSelectedSiteId(value === "all" ? null : Number(value))}
        options={options}
      />
    </div>
  );
}
