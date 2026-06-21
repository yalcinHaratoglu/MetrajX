import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FolderKanban, Plus, Trash2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/layout/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { projectService, type Project } from "../services/projectService";

export function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void projectService
      .list()
      .then(setProjects)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const project = await projectService.create(name.trim());
      if (project?.id != null) {
        navigate(`/projects/${project.id}`);
        return;
      }
      const refreshed = await projectService.list();
      setProjects(refreshed);
      setModalOpen(false);
      setName("");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await projectService.remove(deleteTarget.id);
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="dashboard-page">
      <PageHeader
        title={t("projects.title")}
        subtitle={t("projects.subtitle")}
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            {t("projects.new")}
          </Button>
        }
      />

      {loading ? (
        <div className="empty-state">
          <div className="spinner" />
        </div>
      ) : projects.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={<FolderKanban size={28} />}
            title={t("projects.empty")}
            description={t("projects.emptyDesc")}
            action={
              <Button onClick={() => setModalOpen(true)}>
                <Plus size={16} />
                {t("projects.new")}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
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
              <div className="project-card-footer">
                <span>{new Date(project.created_at).toLocaleDateString()}</span>
                <button
                  type="button"
                  className="project-card-delete"
                  aria-label={t("projects.delete")}
                  title={t("projects.delete")}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setDeleteTarget(project);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("projects.createTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="create-project-form" disabled={creating || !name.trim()}>
              {creating ? t("common.loading") : t("projects.create")}
            </Button>
          </>
        }
      >
        <form id="create-project-form" onSubmit={handleCreate} className="form-stack">
          <Input
            label={t("projects.name")}
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("projects.namePlaceholder")}
            autoFocus
            required
          />
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("projects.deleteTitle")}
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
        <p className="text-sm">
          {t("projects.deleteDesc", { name: deleteTarget?.name ?? "" })}
        </p>
      </Modal>
    </div>
  );
}
