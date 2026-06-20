import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  Check,
  Download,
  FileSpreadsheet,
  Layers,
  Pencil,
  Plus,
  Ruler,
  Scissors,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { FileDropzone } from "../components/ui/FileDropzone";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { toast } from "../lib/toast";
import {
  projectService,
  type CuttingBar,
  type NewRequirement,
  type OptimizationResult,
  type Project,
  type RebarRequirement,
} from "../services/projectService";
import { siteService, type Site } from "../services/siteService";

type SourceTab = "import" | "manual";

function groupBars(bars: CuttingBar[]): { bar: CuttingBar; count: number }[] {
  const groups: { bar: CuttingBar; count: number }[] = [];
  const index = new Map<string, number>();
  for (const bar of bars) {
    const signature = JSON.stringify([
      bar.cuts.map((cut) => [cut.length, cut.element_ref ?? ""]),
      bar.waste_m,
    ]);
    const existing = index.get(signature);
    if (existing !== undefined) {
      groups[existing].count += 1;
    } else {
      index.set(signature, groups.length);
      groups.push({ bar, count: 1 });
    }
  }
  return groups;
}

function useCssColor(variable: string, fallback: string) {
  return useMemo(() => {
    if (typeof window === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return value ? `rgb(${value})` : fallback;
  }, [variable, fallback]);
}

export function ProjectDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const siteId = Number(id);

  const [site, setSite] = useState<Site | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [requirements, setRequirements] = useState<RebarRequirement[]>([]);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [tab, setTab] = useState<SourceTab>("import");
  const [busy, setBusy] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const projectId = site?.project_id ?? 0;

  const loadRequirements = useCallback(async () => {
    if (!projectId) return;
    const data = await projectService.getRequirements(projectId);
    setRequirements(data);
  }, [projectId]);

  const invalidId = !siteId || Number.isNaN(siteId);

  useEffect(() => {
    if (invalidId) return;
    void siteService
      .get(siteId)
      .then((loadedSite) => {
        setSite(loadedSite);
        if (!loadedSite.project_id) {
          setLoadError(true);
          return;
        }
        const pid = loadedSite.project_id;
        void projectService.get(pid).then(setProject).catch(() => setLoadError(true));
        void projectService.getRequirements(pid).then(setRequirements).catch(() => undefined);
        void projectService.getResult(pid).then(setResult).catch(() => undefined);
      })
      .catch(() => setLoadError(true));
  }, [siteId, invalidId]);

  const handleUpload = async (file: File) => {
    setBusy(true);
    try {
      const response = await projectService.upload(projectId, file);
      setRequirements(response.requirements);
      toast.success(t("projects.detail.uploadSuccessReplaced", { count: response.imported }));
    } catch {
      // Hata mesajı global interceptor tarafından gösterilir.
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await siteService.remove(siteId);
      navigate("/sites");
    } catch {
      setDeleting(false);
    }
  };

  const handleOptimize = async (barLengthM: number) => {
    setOptimizing(true);
    try {
      const optimized = await projectService.optimize(projectId, barLengthM);
      setResult(optimized);
      toast.success(t("projects.detail.optimizeSuccess"));
    } catch {
      // Hata mesajı global interceptor tarafından gösterilir.
    } finally {
      setOptimizing(false);
    }
  };

  if (loadError || invalidId) {
    return (
      <div className="surface-card" style={{ padding: "1.5rem" }}>
        <EmptyState
          icon={<Scissors size={26} />}
          title={t("common.error")}
          action={
            <Link to="/sites" className="link-primary text-sm">
              {t("sites.detail.back")}
            </Link>
          }
        />
      </div>
    );
  }

  if (!project || !site) {
    return (
      <div className="empty-state">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="detail-header">
        <div>
          <Link to="/sites" className="link-primary text-sm">
            <ArrowLeft size={14} style={{ display: "inline", marginRight: 4 }} />
            {t("sites.detail.back")}
          </Link>
          <h1 className="detail-title">
            {site.name}
            <span className={`badge badge-${project.status}`}>
              {t(`projects.status.${project.status}`)}
            </span>
          </h1>
        </div>
        <div className="page-toolbar-actions">
          {result && (
            <Button variant="ghost" onClick={() => projectService.exportExcel(projectId, project.name)}>
              <FileSpreadsheet size={16} />
              {t("projects.detail.exportExcel")}
            </Button>
          )}
          <button
            type="button"
            className="btn-icon"
            aria-label={t("sites.delete")}
            title={t("sites.delete")}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <SourceSection
        tab={tab}
        onTab={setTab}
        busy={busy}
        onUpload={handleUpload}
        projectId={projectId}
        onAdded={loadRequirements}
      />

      <RequirementsSection
        requirements={requirements}
        onUpdate={async (reqId, data) => {
          await projectService.updateRequirement(reqId, data);
          await loadRequirements();
          toast.success(t("projects.detail.updateSuccess"));
        }}
        onDelete={async (reqId) => {
          await projectService.removeRequirement(reqId);
          await loadRequirements();
          toast.success(t("projects.detail.deleteSuccess"));
        }}
        onClear={async () => {
          await projectService.clearRequirements(projectId);
          await loadRequirements();
          toast.success(t("projects.detail.clearSuccess"));
        }}
        onOptimize={handleOptimize}
        optimizing={optimizing}
      />

      <ResultsSection result={result} />

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
              <Trash2 size={16} />
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

interface SourceSectionProps {
  tab: SourceTab;
  onTab: (tab: SourceTab) => void;
  busy: boolean;
  onUpload: (file: File) => void;
  projectId: number;
  onAdded: () => Promise<void>;
}

function SourceSection({ tab, onTab, busy, onUpload, projectId, onAdded }: SourceSectionProps) {
  const { t } = useTranslation();
  const [manual, setManual] = useState({ diameter_mm: "", length_m: "", quantity: "1", element_ref: "" });
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const diameter = Number(manual.diameter_mm);
    const length = Number(manual.length_m);
    if (!diameter || !length) return;
    setAdding(true);
    try {
      await projectService.addRequirement(projectId, {
        diameter_mm: diameter,
        length_m: length,
        quantity: Number(manual.quantity) || 1,
        element_ref: manual.element_ref,
      });
      setManual({ diameter_mm: "", length_m: "", quantity: "1", element_ref: "" });
      await onAdded();
      toast.success(t("projects.detail.addSuccess"));
    } catch {
      // Hata mesajı global interceptor tarafından gösterilir.
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="surface-card" style={{ padding: "1.5rem" }}>
      <div className="page-toolbar">
        <h2 className="detail-section-title">{t("projects.detail.source")}</h2>
      </div>
      <div className="tabs">
        <button type="button" className={tab === "import" ? "tab tab-active" : "tab"} onClick={() => onTab("import")}>
          <FileSpreadsheet size={15} />
          {t("projects.detail.importTab")}
        </button>
        <button type="button" className={tab === "manual" ? "tab tab-active" : "tab"} onClick={() => onTab("manual")}>
          <Plus size={15} />
          {t("projects.detail.manualTab")}
        </button>
      </div>

      <div className="tab-panel">
        {tab === "import" && (
          <div className="form-stack">
            <FileDropzone
              accept=".xlsx"
              onSelect={onUpload}
              title={busy ? t("common.loading") : t("projects.detail.importTitle")}
              hint={t("projects.detail.importHint")}
            />
            <button type="button" className="btn-ghost btn-sm" onClick={() => projectService.downloadTemplate()}>
              <Download size={15} />
              {t("projects.detail.downloadTemplate")}
            </button>
          </div>
        )}

        {tab === "manual" && (
          <form onSubmit={handleAdd} className="form-row">
            <Input
              label={t("projects.detail.manual.diameter")}
              type="number"
              min={4}
              value={manual.diameter_mm}
              onChange={(e) => setManual((p) => ({ ...p, diameter_mm: e.target.value }))}
              required
            />
            <Input
              label={t("projects.detail.manual.length")}
              type="number"
              step="0.01"
              min={0.1}
              value={manual.length_m}
              onChange={(e) => setManual((p) => ({ ...p, length_m: e.target.value }))}
              required
            />
            <Input
              label={t("projects.detail.manual.quantity")}
              type="number"
              min={1}
              value={manual.quantity}
              onChange={(e) => setManual((p) => ({ ...p, quantity: e.target.value }))}
            />
            <Input
              label={t("projects.detail.manual.ref")}
              value={manual.element_ref}
              onChange={(e) => setManual((p) => ({ ...p, element_ref: e.target.value }))}
            />
            <Button type="submit" disabled={adding}>
              <Plus size={16} />
              {t("projects.detail.manual.add")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

interface RequirementsSectionProps {
  requirements: RebarRequirement[];
  onUpdate: (id: number, data: Partial<NewRequirement>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onClear: () => Promise<void>;
  onOptimize: (barLengthM: number) => void;
  optimizing: boolean;
}

type EditDraft = { diameter_mm: string; length_m: string; quantity: string; element_ref: string };

function RequirementsSection({
  requirements,
  onUpdate,
  onDelete,
  onClear,
  onOptimize,
  optimizing,
}: RequirementsSectionProps) {
  const { t } = useTranslation();
  const [barLength, setBarLength] = useState("12");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditDraft>({
    diameter_mm: "",
    length_m: "",
    quantity: "",
    element_ref: "",
  });
  const [saving, setSaving] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    setClearing(true);
    try {
      await onClear();
      setClearOpen(false);
    } catch {
      // Hata mesajı global interceptor tarafından gösterilir.
    } finally {
      setClearing(false);
    }
  };

  const startEdit = (req: RebarRequirement) => {
    setEditingId(req.id);
    setDraft({
      diameter_mm: String(req.diameter_mm),
      length_m: String(req.length_m),
      quantity: String(req.quantity),
      element_ref: req.element_ref ?? "",
    });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: number) => {
    const diameter = Number(draft.diameter_mm);
    const length = Number(draft.length_m);
    if (!diameter || !length) return;
    setSaving(true);
    try {
      await onUpdate(id, {
        diameter_mm: diameter,
        length_m: length,
        quantity: Number(draft.quantity) || 1,
        element_ref: draft.element_ref,
      });
      setEditingId(null);
    } catch {
      // Hata mesajı global interceptor tarafından gösterilir.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="surface-card" style={{ padding: "1.5rem" }}>
      <div className="page-toolbar">
        <h2 className="detail-section-title">
          <Layers size={18} />
          {t("projects.detail.requirements")}
        </h2>
        <div className="optimize-controls">
          {requirements.length > 0 && (
            <button
              type="button"
              className="btn-danger btn-sm"
              onClick={() => setClearOpen(true)}
            >
              <Trash2 size={15} />
              {t("projects.detail.clearAll")}
            </button>
          )}
          <label className="bar-length-field">
            <span className="bar-length-label">{t("projects.detail.barLengthInput")}</span>
            <input
              type="number"
              className="input bar-length-input"
              min={0.5}
              max={30}
              step="0.5"
              value={barLength}
              onChange={(e) => setBarLength(e.target.value)}
            />
          </label>
          <Button
            onClick={() => onOptimize(Number(barLength) || 12)}
            disabled={optimizing || requirements.length === 0}
          >
            <Wand2 size={16} />
            {optimizing ? t("projects.detail.optimizing") : t("projects.detail.optimize")}
          </Button>
        </div>
      </div>

      {requirements.length === 0 ? (
        <EmptyState icon={<Ruler size={26} />} title={t("projects.detail.requirementsEmpty")} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("projects.detail.diameter")}</th>
                <th>{t("projects.detail.length")}</th>
                <th>{t("projects.detail.quantity")}</th>
                <th>{t("projects.detail.ref")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requirements.map((req) =>
                editingId === req.id ? (
                  <tr key={req.id}>
                    <td>
                      <input
                        type="number"
                        className="input cell-input"
                        min={4}
                        value={draft.diameter_mm}
                        onChange={(e) => setDraft((p) => ({ ...p, diameter_mm: e.target.value }))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input cell-input"
                        step="0.01"
                        min={0.1}
                        value={draft.length_m}
                        onChange={(e) => setDraft((p) => ({ ...p, length_m: e.target.value }))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input cell-input"
                        min={1}
                        value={draft.quantity}
                        onChange={(e) => setDraft((p) => ({ ...p, quantity: e.target.value }))}
                      />
                    </td>
                    <td>
                      <input
                        className="input cell-input"
                        value={draft.element_ref}
                        onChange={(e) => setDraft((p) => ({ ...p, element_ref: e.target.value }))}
                      />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-icon btn-icon-sm"
                          onClick={() => saveEdit(req.id)}
                          disabled={saving}
                          aria-label={t("common.save")}
                          title={t("common.save")}
                        >
                          <Check size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-icon-sm"
                          onClick={cancelEdit}
                          aria-label={t("common.cancel")}
                          title={t("common.cancel")}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={req.id}>
                    <td className="mono">Ø{req.diameter_mm}</td>
                    <td className="mono">{req.length_m} m</td>
                    <td className="mono">{req.quantity}</td>
                    <td>{req.element_ref || "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-icon btn-icon-sm"
                          onClick={() => startEdit(req)}
                          aria-label={t("common.edit")}
                          title={t("common.edit")}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-icon-sm"
                          onClick={() => onDelete(req.id)}
                          aria-label={t("common.delete")}
                          title={t("common.delete")}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title={t("projects.detail.clearTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setClearOpen(false)}>
              {t("common.cancel")}
            </Button>
            <button type="button" className="btn-danger" onClick={handleClear} disabled={clearing}>
              <Trash2 size={16} />
              {clearing ? t("common.loading") : t("projects.detail.clearAll")}
            </button>
          </>
        }
      >
        <p className="text-sm">{t("projects.detail.clearDesc", { count: requirements.length })}</p>
      </Modal>
    </div>
  );
}

function ResultsSection({ result }: { result: OptimizationResult | null }) {
  const { t } = useTranslation();
  const primary = useCssColor("--color-primary", "rgb(2 132 199)");
  const accent = useCssColor("--color-accent", "rgb(217 119 6)");

  const chartData = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.plans).map(([diameter, bars]) => ({
      diameter: `Ø${diameter}`,
      bars: bars.length,
      waste: Number(bars.reduce((sum, bar) => sum + bar.waste_m, 0).toFixed(2)),
    }));
  }, [result]);

  if (!result) {
    return (
      <div className="surface-card" style={{ padding: "1.5rem" }}>
        <h2 className="detail-section-title">
          <Scissors size={18} />
          {t("projects.detail.results")}
        </h2>
        <EmptyState icon={<Scissors size={26} />} title={t("projects.detail.resultsEmpty")} />
      </div>
    );
  }

  const totalItems = Object.values(result.plans).reduce(
    (sum, bars) => sum + bars.reduce((acc, bar) => acc + bar.cuts.length, 0),
    0,
  );

  return (
    <div className="surface-card" style={{ padding: "1.5rem" }}>
      <h2 className="detail-section-title">
        <Scissors size={18} />
        {t("projects.detail.results")}
      </h2>

      <div className="result-summary">
        <Metric label={t("projects.detail.wastePercent")} value={`%${result.waste_percent}`} />
        <Metric label={t("projects.detail.totalBars")} value={String(result.total_bars)} />
        <Metric label={t("projects.detail.barLength")} value={`${result.bar_length_m} m`} />
        <Metric label={t("projects.detail.totalItems")} value={String(totalItems)} />
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <p className="chart-card-title">{t("projects.detail.chartWaste")}</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.25)" />
              <XAxis dataKey="diameter" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [value, t("projects.detail.chartWasteLabel")]} />
              <Bar dataKey="waste" radius={[4, 4, 0, 0]} fill={accent} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <p className="chart-card-title">{t("projects.detail.chartBars")}</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.25)" />
              <XAxis dataKey="diameter" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip formatter={(value) => [value, t("projects.detail.chartBarsLabel")]} />
              <Bar dataKey="bars" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.diameter} fill={primary} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="chart-card-title">{t("projects.detail.cuttingPlan")}</p>
      {Object.entries(result.plans).map(([diameter, bars]) => (
        <div key={diameter} className="detail-section">
          <p className="cut-row-label" style={{ marginBottom: "0.5rem" }}>
            Ø{diameter} — {bars.length} {t("projects.detail.bar").toLowerCase()}
          </p>
          <div className="cut-plan-scroll">
            {groupBars(bars).map((group, gi) => (
              <div key={gi} className="cut-row">
                <span className="cut-count" title={t("projects.detail.identicalBars")}>
                  ×{group.count}
                </span>
                <div className="cut-bar">
                  {group.bar.cuts.map((cut, index) => (
                    <span
                      key={index}
                      className="cut-segment"
                      style={{ width: `${(cut.length / result.bar_length_m) * 100}%` }}
                      title={`${cut.length} m${cut.element_ref ? ` — ${cut.element_ref}` : ""}`}
                    >
                      <span className="cut-segment-len">{cut.length}</span>
                      {cut.element_ref && (
                        <span className="cut-segment-ref">{cut.element_ref}</span>
                      )}
                    </span>
                  ))}
                  {group.bar.waste_m > 0 && (
                    <span
                      className="cut-segment cut-segment-waste"
                      style={{ width: `${(group.bar.waste_m / result.bar_length_m) * 100}%` }}
                      title={`fire ${group.bar.waste_m} m`}
                    >
                      <span className="cut-segment-len">{group.bar.waste_m}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-metric">
      <p className="result-metric-label">{label}</p>
      <p className="result-metric-value">{value}</p>
    </div>
  );
}
