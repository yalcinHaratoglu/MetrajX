import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Plus, Trash2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = user?.role === "owner" || user?.role === "site_manager";
  const canDelete = user?.role === "owner";
  const filteredSites = useFilteredSites(sites);

  useEffect(() => {
    void siteService
      .list()
      .then(setSites)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const site = await siteService.create({
        name: name.trim(),
        code: code.trim(),
      });
      await refreshSites();
      if (site?.id != null) {
        navigate(`/sites/${site.id}`);
        return;
      }
      const refreshed = await siteService.list();
      setSites(refreshed);
      setModalOpen(false);
      setName("");
      setCode("");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await siteService.remove(deleteTarget.id);
      setSites((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      await refreshSites();
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-toolbar">
        <div>
          <h1 className="section-title">{t("sites.title")}</h1>
          <p className="section-subtitle">{t("sites.subtitle")}</p>
        </div>
        {canCreate && (
          <div className="page-toolbar-actions">
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} />
              {t("sites.new")}
            </Button>
          </div>
        )}
      </div>

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
              canCreate ? (
                <Button onClick={() => setModalOpen(true)}>
                  <Plus size={16} />
                  {t("sites.new")}
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="project-grid">
          {filteredSites.map((site) => (
            <Link key={site.id} to={`/sites/${site.id}`} className="project-card">
              <div className="project-card-header">
                <span className="project-card-title">{site.name}</span>
                <span className={`badge badge-${site.status === "active" ? "ready" : "draft"}`}>
                  {t(`sites.status.${site.status}`)}
                </span>
              </div>
              {site.code && <p className="text-sm text-muted">{site.code}</p>}
              <div className="project-card-meta">
                <span className="project-card-metric">
                  <span className="project-card-metric-value">{site.requirements_count}</span>
                  {t("projects.requirements")}
                </span>
              </div>
              <div className="project-card-footer">
                <span>{new Date(site.created_at).toLocaleDateString()}</span>
                {canDelete && (
                  <button
                    type="button"
                    className="project-card-delete"
                    aria-label={t("sites.delete")}
                    title={t("sites.delete")}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDeleteTarget(site);
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("sites.createTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="create-site-form" disabled={creating || !name.trim()}>
              {creating ? t("common.loading") : t("sites.create")}
            </Button>
          </>
        }
      >
        <form id="create-site-form" onSubmit={handleCreate} className="form-stack">
          <Input
            label={t("sites.name")}
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("sites.namePlaceholder")}
            autoFocus
            required
          />
          <Input
            label={t("sites.code")}
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("sites.codePlaceholder")}
          />
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("sites.deleteTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {t("common.cancel")}
            </Button>
            <button type="button" className="btn-danger" onClick={handleDelete} disabled={deleting}>
              <Trash2 size={16} />
              {deleting ? t("common.loading") : t("common.delete")}
            </button>
          </>
        }
      >
        <p className="text-sm">{t("sites.deleteDesc", { name: deleteTarget?.name ?? "" })}</p>
      </Modal>
    </div>
  );
}
