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
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Plus,
  Ruler,
  Scissors,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { FileDropzone } from "../components/ui/FileDropzone";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { toast } from "../lib/toast";
import {
  projectService,
  type OptimizationResult,
  type Project,
  type RebarRequirement,
} from "../services/projectService";

type SourceTab = "upload" | "import" | "manual";

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
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [requirements, setRequirements] = useState<RebarRequirement[]>([]);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [tab, setTab] = useState<SourceTab>("upload");
  const [busy, setBusy] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadRequirements = useCallback(async () => {
    const data = await projectService.getRequirements(projectId);
    setRequirements(data);
  }, [projectId]);

  const invalidId = !projectId || Number.isNaN(projectId);

  useEffect(() => {
    if (invalidId) return;
    void projectService.get(projectId).then(setProject).catch(() => setLoadError(true));
    void projectService.getRequirements(projectId).then(setRequirements).catch(() => undefined);
    void projectService.getResult(projectId).then(setResult).catch(() => undefined);
  }, [projectId, invalidId]);

  const handleUpload = async (file: File) => {
    setBusy(true);
    try {
      const response = await projectService.upload(projectId, file);
      setRequirements(response.requirements);
      toast.success(t("projects.detail.uploadSuccess"));
    } catch {
      // Hata mesajı global interceptor tarafından gösterilir.
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await projectService.remove(projectId);
      navigate("/projects");
    } catch {
      setDeleting(false);
    }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const optimized = await projectService.optimize(projectId);
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
            <Link to="/projects" className="link-primary text-sm">
              {t("projects.detail.back")}
            </Link>
          }
        />
      </div>
    );
  }

  if (!project) {
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
          <Link to="/projects" className="link-primary text-sm">
            <ArrowLeft size={14} style={{ display: "inline", marginRight: 4 }} />
            {t("projects.detail.back")}
          </Link>
          <h1 className="detail-title">
            {project.name}
            <span className={`badge badge-${project.status}`}>
              {t(`projects.status.${project.status}`)}
            </span>
          </h1>
        </div>
        <div className="page-toolbar-actions">
          {result && (
            <>
              <Button variant="ghost" onClick={() => projectService.exportExcel(projectId, project.name)}>
                <FileSpreadsheet size={16} />
                {t("projects.detail.exportExcel")}
              </Button>
              <Button variant="ghost" onClick={() => projectService.exportPdf(projectId, project.name)}>
                <FileText size={16} />
                {t("projects.detail.exportPdf")}
              </Button>
            </>
          )}
          <button
            type="button"
            className="btn-icon"
            aria-label={t("projects.delete")}
            title={t("projects.delete")}
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
        onDelete={async (reqId) => {
          await projectService.removeRequirement(reqId);
          await loadRequirements();
          toast.success(t("projects.detail.deleteSuccess"));
        }}
        onOptimize={handleOptimize}
        optimizing={optimizing}
      />

      <ResultsSection result={result} />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("projects.deleteTitle")}
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
        <p className="text-sm">{t("projects.deleteDesc", { name: project.name })}</p>
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
      <h2 className="detail-section-title">{t("projects.detail.source")}</h2>
      <div className="tabs">
        <button type="button" className={tab === "upload" ? "tab tab-active" : "tab"} onClick={() => onTab("upload")}>
          <FileText size={15} />
          {t("projects.detail.uploadTab")}
        </button>
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
        {tab === "upload" && (
          <FileDropzone
            accept=".dxf,.pdf"
            onSelect={onUpload}
            title={busy ? t("common.loading") : t("projects.detail.uploadTitle")}
            hint={t("projects.detail.uploadHint")}
          />
        )}

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
  onDelete: (id: number) => Promise<void>;
  onOptimize: () => void;
  optimizing: boolean;
}

function RequirementsSection({ requirements, onDelete, onOptimize, optimizing }: RequirementsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="surface-card" style={{ padding: "1.5rem" }}>
      <div className="page-toolbar">
        <h2 className="detail-section-title">
          <Layers size={18} />
          {t("projects.detail.requirements")}
        </h2>
        <Button onClick={onOptimize} disabled={optimizing || requirements.length === 0}>
          <Wand2 size={16} />
          {optimizing ? t("projects.detail.optimizing") : t("projects.detail.optimize")}
        </Button>
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
              {requirements.map((req) => (
                <tr key={req.id}>
                  <td className="mono">Ø{req.diameter_mm}</td>
                  <td className="mono">{req.length_m} m</td>
                  <td className="mono">{req.quantity}</td>
                  <td>{req.element_ref || "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn-icon"
                      style={{ width: "2rem", height: "2rem" }}
                      onClick={() => onDelete(req.id)}
                      aria-label="delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
              <Tooltip />
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
              <Tooltip />
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
          {bars.map((bar) => (
            <div key={bar.stock_index} className="cut-row">
              <span className="cut-row-label">
                #{bar.stock_index}
              </span>
              <div className="cut-bar">
                {bar.cuts.map((cut, index) => (
                  <span
                    key={index}
                    className="cut-segment"
                    style={{ width: `${(cut.length / result.bar_length_m) * 100}%` }}
                    title={`${cut.length} m${cut.element_ref ? ` (${cut.element_ref})` : ""}`}
                  >
                    {cut.length}
                  </span>
                ))}
                {bar.waste_m > 0 && (
                  <span
                    className="cut-segment cut-segment-waste"
                    style={{ width: `${(bar.waste_m / result.bar_length_m) * 100}%` }}
                    title={`fire ${bar.waste_m} m`}
                  />
                )}
              </div>
            </div>
          ))}
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
