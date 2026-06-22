import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Package, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { PageInfoTooltip } from "../components/ui/PageInfoTooltip";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { useSite } from "../hooks/useSite";
import { useSiteData } from "../hooks/useSiteData";
import { dailyLogService, type Asset } from "../services/dailyLogService";
import { toast } from "../lib/toast";

const emptyForm = () => ({
  name: "",
  asset_type: "",
  serial_number: "",
  status: "available",
  assigned_to: "",
  notes: "",
});

export function DemirbasPage() {
  const { t } = useTranslation();
  const { selectedSiteId, sites } = useSite();
  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetcher = useCallback(async () => {
    if (!selectedSiteId) return [] as Asset[];
    return dailyLogService.listAssets(selectedSiteId);
  }, [selectedSiteId]);

  const { data: assets, loading, reload } = useSiteData(selectedSiteId, fetcher, [] as Asset[]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId) return;
    try {
      await dailyLogService.createAsset({
        site_id: selectedSiteId,
        name: form.name,
        asset_type: form.asset_type,
        serial_number: form.serial_number,
        status: form.status as Asset["status"],
        assigned_to: form.assigned_to,
        notes: form.notes,
      });
      setModalOpen(false);
      setForm(emptyForm());
      toast.success(t("assets.created"));
      await reload();
    } catch {
      toast.error(t("common.error"));
    }
  };

  if (!selectedSiteId) {
    return (
      <div className="page-stack dashboard-page">
        <PageHeader title={t("assets.title")} subtitle={t("assets.subtitle")} />
        <EmptyState icon={<Package size={28} />} title={t("assets.selectSiteTitle")} description={t("assets.selectSiteDesc")} />
      </div>
    );
  }

  const statusOptions = ["available", "assigned", "maintenance", "retired"];

  return (
    <div className="page-stack dashboard-page">
      <PageHeader
        title={<span className="page-header-with-info">{t("assets.title")}<PageInfoTooltip text={t("assets.info")} /></span>}
        subtitle={selectedSite?.name}
        actions={<Button onClick={() => setModalOpen(true)}><Plus size={16} />{t("assets.add")}</Button>}
      />

      {loading ? (
        <p className="text-muted">{t("common.loading")}</p>
      ) : assets.length === 0 ? (
        <EmptyState icon={<Package size={28} />} title={t("assets.empty")} description={t("assets.emptyDesc")} />
      ) : (
        <div className="surface-card metraj-table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("assets.columns.name")}</th>
                  <th>{t("assets.columns.type")}</th>
                  <th>{t("assets.columns.serial")}</th>
                  <th>{t("assets.columns.status")}</th>
                  <th>{t("assets.columns.assigned")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>{asset.name}</td>
                    <td>{asset.asset_type || "—"}</td>
                    <td>{asset.serial_number || "—"}</td>
                    <td>{t(`assets.status.${asset.status}`)}</td>
                    <td>{asset.assigned_to || "—"}</td>
                    <td className="table-actions-cell">
                      <button type="button" className="btn-icon" onClick={() => void dailyLogService.removeAsset(asset.id).then(reload)}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("assets.add")} footer={<Button type="submit" form="asset-form">{t("common.save")}</Button>}>
        <form id="asset-form" onSubmit={handleCreate} className="form-stack">
          <Input label={t("assets.columns.name")} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          <Input label={t("assets.columns.type")} value={form.asset_type} onChange={(e) => setForm((p) => ({ ...p, asset_type: e.target.value }))} />
          <Input label={t("assets.columns.serial")} value={form.serial_number} onChange={(e) => setForm((p) => ({ ...p, serial_number: e.target.value }))} />
          <Select label={t("assets.columns.status")} value={form.status} onChange={(v) => setForm((p) => ({ ...p, status: v }))} options={statusOptions.map((s) => ({ value: s, label: t(`assets.status.${s}`) }))} />
          <Input label={t("assets.columns.assigned")} value={form.assigned_to} onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))} />
          <Input label={t("metraj.columns.notes")} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        </form>
      </Modal>
    </div>
  );
}
