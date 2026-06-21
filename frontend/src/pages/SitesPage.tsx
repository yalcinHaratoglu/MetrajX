import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Plus } from "lucide-react";
import { SiteCard } from "../components/sites/SiteCard";
import { SiteFormModal } from "../components/sites/SiteFormModal";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/layout/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { useAuth } from "../hooks/useAuth";
import { useFilteredSites, useSite } from "../hooks/useSite";
import { siteService, type Site } from "../services/siteService";

export function SitesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshSites } = useSite();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const canManage = user?.role === "owner" || user?.role === "site_manager";
  const filteredSites = useFilteredSites(sites);

  const loadSites = () =>
    siteService
      .list()
      .then(setSites)
      .catch(() => undefined);

  useEffect(() => {
    void loadSites().finally(() => setLoading(false));
  }, []);

  const handleCreated = async (site: Site) => {
    await refreshSites();
    setCreateOpen(false);
    navigate(`/sites/${site.id}`);
  };

  return (
    <div className="dashboard-page">
      <PageHeader
        title={t("sites.title")}
        subtitle={t("sites.subtitle")}
        actions={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              {t("sites.new")}
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="empty-state">
          <div className="spinner" />
        </div>
      ) : filteredSites.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={<Building2 size={28} />}
            title={t("sites.empty")}
            description={t("sites.emptyDesc")}
            action={
              canManage ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus size={16} />
                  {t("sites.new")}
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="project-grid site-card-grid">
          {filteredSites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              onClick={() => navigate(`/sites/${site.id}`)}
            />
          ))}
        </div>
      )}

      <SiteFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(site) => void handleCreated(site)}
      />
    </div>
  );
}
