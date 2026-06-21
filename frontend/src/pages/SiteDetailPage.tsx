import { useEffect, useState } from "react";
import { ArrowLeft, Ruler, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SiteForm } from "../components/sites/SiteForm";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { useAuth } from "../hooks/useAuth";
import { useSite } from "../hooks/useSite";
import { toast } from "../lib/toast";
import { siteService, type Site } from "../services/siteService";

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

export function SiteDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshSites, setSelectedSiteId } = useSite();
  const siteId = Number(id);
  const isValidSiteId = siteId > 0 && !Number.isNaN(siteId);

  const [site, setSite] = useState<Site | null>(null);
  const [loadedSiteId, setLoadedSiteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loading = isValidSiteId && loadedSiteId !== siteId;

  const canManage = user?.role === "owner" || user?.role === "site_manager";
  const canDelete = user?.role === "owner";

  useEffect(() => {
    if (!isValidSiteId) return;
    let active = true;
    void siteService
      .get(siteId)
      .then((data) => {
        if (active) {
          setSite(data);
          setLoadedSiteId(siteId);
        }
      })
      .catch(() => {
        if (active) {
          setSite(null);
          setLoadedSiteId(siteId);
        }
      });
    return () => {
      active = false;
    };
  }, [isValidSiteId, siteId]);

  const handleSaved = async (updated: Site) => {
    setSite(updated);
    await refreshSites();
    toast.success(t("sites.updateSuccess"));
  };

  const handleDelete = async () => {
    if (!site) return;
    setDeleting(true);
    try {
      await siteService.remove(site.id);
      await refreshSites();
      toast.success(t("sites.deleteSuccess"));
      navigate("/sites");
    } catch {
      toast.error(t("common.error"));
    } finally {
      setDeleting(false);
    }
  };

  const openMetraj = () => {
    if (!site) return;
    setSelectedSiteId(site.id);
    navigate("/metraj");
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <p className="text-muted">{t("common.loading")}</p>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="dashboard-page">
        <PageHeader
          variant="detail"
          before={
            <Link to="/sites" className="page-back-link">
              <ArrowLeft size={16} />
              {t("sites.detail.back")}
            </Link>
          }
          title={t("notFound.title")}
        />
      </div>
    );
  }

  const progress =
    site.metraj_average_progress != null ? Math.round(site.metraj_average_progress) : null;

  return (
    <div className="dashboard-page site-detail-page">
      <PageHeader
        variant="detail"
        before={
          <Link to="/sites" className="page-back-link">
            <ArrowLeft size={16} />
            {t("sites.detail.back")}
          </Link>
        }
        title={site.name}
        subtitle={
          <span className="site-detail-subtitle">
            <span className="mono">{site.code}</span>
            <span className={`badge badge-${statusBadgeClass(site.status)}`}>
              {t(`sites.status.${site.status}`)}
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="ghost" onClick={openMetraj}>
              <Ruler size={16} />
              {t("sites.detail.openMetraj")}
            </Button>
            {canManage && (
              <Button type="submit" form="site-detail-form" disabled={saving}>
                {saving ? t("common.loading") : t("common.save")}
              </Button>
            )}
          </>
        }
      />

      <div className="site-detail-stats">
        <div className="site-detail-stat">
          <span className="site-detail-stat-value">{site.metraj_item_count}</span>
          <span className="site-detail-stat-label">{t("sites.metrajItems")}</span>
        </div>
        <div className="site-detail-stat">
          <span className="site-detail-stat-value">
            {progress !== null ? `${progress}%` : "—"}
          </span>
          <span className="site-detail-stat-label">{t("sites.metrajProgress")}</span>
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

      {canManage ? (
        <div className="surface-card site-detail-form-card">
          <SiteForm
            key={site.updated_at}
            site={site}
            formId="site-detail-form"
            onSaved={(updated) => void handleSaved(updated)}
            onSavingChange={setSaving}
          />
        </div>
      ) : (
        <div className="surface-card site-detail-readonly">
          <p className="text-sm text-muted">{t("sites.detail.readOnly")}</p>
        </div>
      )}

      {canDelete && (
        <div className="site-detail-danger">
          <div>
            <p className="site-detail-danger-title">{t("sites.deleteTitle")}</p>
            <p className="site-detail-danger-desc">{t("sites.detail.deleteHint")}</p>
          </div>
          <button type="button" className="btn-danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={16} />
            {t("sites.delete")}
          </button>
        </div>
      )}

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("sites.deleteTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <button type="button" className="btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("common.loading") : t("common.delete")}
            </button>
          </>
        }
      >
        <p className="text-sm">{t("sites.deleteDesc", { name: site.name })}</p>
      </Modal>
    </div>
  );
}
