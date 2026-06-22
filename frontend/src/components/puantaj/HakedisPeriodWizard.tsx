import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import {
  puantajService,
  type HakedisPeriod,
  type HakedisPeriodStatus,
} from "../../services/puantajService";
import { toast } from "../../lib/toast";

type Props = {
  open: boolean;
  siteId: number;
  defaultStart: string;
  defaultEnd: string;
  canApprove: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingPeriod?: HakedisPeriod | null;
};

const statusClass: Record<HakedisPeriodStatus, string> = {
  draft: "puantaj-badge",
  pending_approval: "puantaj-badge is-pending",
  approved: "puantaj-badge is-approved",
  paid: "puantaj-badge is-paid",
};

export function HakedisPeriodWizard({
  open,
  siteId,
  defaultStart,
  defaultEnd,
  canApprove,
  onClose,
  onSaved,
  editingPeriod,
}: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";
  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd, setPeriodEnd] = useState(defaultEnd);
  const [notes, setNotes] = useState(editingPeriod?.notes ?? "");
  const [period, setPeriod] = useState<HakedisPeriod | null>(editingPeriod ?? null);
  const [approvedPayable, setApprovedPayable] = useState(
    editingPeriod?.approved_payable ?? editingPeriod?.net_payable ?? "",
  );
  const [busy, setBusy] = useState(false);

  const groupedLines = useMemo(() => {
    if (!period) return [];
    const map = new Map<number, { name: string; lines: typeof period.lines; gross: number }>();
    for (const line of period.lines) {
      const entry = map.get(line.subcontractor) ?? {
        name: line.subcontractor_name,
        lines: [],
        gross: 0,
      };
      entry.lines.push(line);
      entry.gross += Number(line.line_gross);
      map.set(line.subcontractor, entry);
    }
    return [...map.values()];
  }, [period]);

  const handleCreate = async () => {
    setBusy(true);
    try {
      const created = await puantajService.createHakedisPeriod({
        site_id: siteId,
        period_start: periodStart,
        period_end: periodEnd,
        notes,
      });
      setPeriod(created);
      toast.success(t("puantaj.hakedisPeriod.created"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const handleRecalculate = async () => {
    if (!period) return;
    setBusy(true);
    try {
      const updated = await puantajService.calculateHakedisPeriod(period.id);
      setPeriod(updated);
      setApprovedPayable(updated.approved_payable ?? updated.net_payable);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!period) return;
    setBusy(true);
    try {
      const updated = await puantajService.submitHakedisPeriod(period.id);
      setPeriod(updated);
      toast.success(t("puantaj.hakedisPeriod.submitted"));
      onSaved();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!period) return;
    setBusy(true);
    try {
      if (isPending && approvedPayable !== "") {
        await puantajService.updateHakedisPeriod(period.id, {
          approved_payable: approvedPayable,
        });
      }
      const updated = await puantajService.approveHakedisPeriod(period.id);
      setPeriod(updated);
      toast.success(t("puantaj.hakedisPeriod.approved"));
      onSaved();
      onClose();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const handleSavePayable = async () => {
    if (!period || !isPending) return;
    setBusy(true);
    try {
      const updated = await puantajService.updateHakedisPeriod(period.id, {
        approved_payable: approvedPayable || null,
      });
      setPeriod(updated);
      setApprovedPayable(updated.approved_payable ?? updated.net_payable);
      toast.success(t("common.saved"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveApproved = async () => {
    if (!period || !isApproved) return;
    setBusy(true);
    try {
      const updated = await puantajService.updateHakedisPeriod(period.id, {
        notes,
        approved_payable: approvedPayable || null,
      });
      setPeriod(updated);
      setApprovedPayable(updated.approved_payable ?? updated.net_payable);
      toast.success(t("puantaj.hakedisPeriod.updated"));
      onSaved();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!period) return;
    if (!window.confirm(t("puantaj.hakedisPeriod.deleteConfirm"))) return;
    setBusy(true);
    try {
      await puantajService.deleteHakedisPeriod(period.id);
      toast.success(t("puantaj.hakedisPeriod.deleted"));
      onSaved();
      onClose();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const isDraft = !period || period.status === "draft";
  const isPending = period?.status === "pending_approval";
  const isApproved = period?.status === "approved";
  const isPaid = period?.status === "paid";
  const canEditNotes = isDraft || isPending || (isApproved && canApprove);
  const canDelete =
    period &&
    !isPaid &&
    ((isApproved && canApprove) || isDraft || (isPending && canApprove));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("puantaj.hakedisPeriod.wizardTitle")}
      className="modal-wide modal-tall"
      bodyClassName="modal-body-scroll"
      footer={
        <div className="flex gap-2 flex-wrap justify-end">
          {canDelete && (
            <Button type="button" variant="ghost" className="text-danger" onClick={() => void handleDelete()} disabled={busy}>
              {t("common.delete")}
            </Button>
          )}
          {!period && (
            <Button type="button" onClick={() => void handleCreate()} disabled={busy}>
              {t("puantaj.hakedisPeriod.create")}
            </Button>
          )}
          {period && isDraft && (
            <>
              <Button type="button" variant="ghost" onClick={() => void handleRecalculate()} disabled={busy}>
                {t("puantaj.hakedisPeriod.recalculate")}
              </Button>
              <Button type="button" onClick={() => void handleSubmit()} disabled={busy}>
                {t("puantaj.hakedisPeriod.submit")}
              </Button>
            </>
          )}
          {period && isPending && canApprove && (
            <Button type="button" onClick={() => void handleApprove()} disabled={busy}>
              {t("puantaj.hakedisPeriod.approve")}
            </Button>
          )}
          {period && isApproved && canApprove && (
            <Button type="button" onClick={() => void handleSaveApproved()} disabled={busy}>
              {t("common.save")}
            </Button>
          )}
        </div>
      }
    >
      <div className="form-stack">
        {period && (
          <span className={statusClass[period.status]}>
            {t(`puantaj.hakedisPeriod.status.${period.status}`)}
          </span>
        )}
        <Input
          label={t("puantaj.hakedisPeriod.start")}
          type="date"
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
          disabled={Boolean(period)}
        />
        <Input
          label={t("puantaj.hakedisPeriod.end")}
          type="date"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
          disabled={Boolean(period)}
        />
        <Input
          label={t("metraj.columns.notes")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!canEditNotes}
        />

        {period && (
          <div className="hakedis-period-summary">
            <div className="hakedis-period-stat">
              <span className="hakedis-period-stat-label">{t("puantaj.hakedisPeriod.gross")}</span>
              <strong className="hakedis-period-stat-value">
                {Number(period.total_gross).toLocaleString(locale)} ₺
              </strong>
            </div>
            <div className="hakedis-period-stat">
              <span className="hakedis-period-stat-label">{t("puantaj.hakedisPeriod.retainage")}</span>
              <span className="hakedis-period-stat-value">
                {Number(period.total_retainage).toLocaleString(locale)} ₺
              </span>
            </div>
            <div className="hakedis-period-stat">
              <span className="hakedis-period-stat-label">{t("puantaj.hakedisPeriod.advance")}</span>
              <span className="hakedis-period-stat-value">
                {Number(period.total_advance_deduction).toLocaleString(locale)} ₺
              </span>
            </div>
            <div className="hakedis-period-stat is-highlight">
              <span className="hakedis-period-stat-label">{t("puantaj.hakedisPeriod.net")}</span>
              <strong className="hakedis-period-stat-value is-net">
                {Number(period.net_payable).toLocaleString(locale)} ₺
              </strong>
            </div>
            {(isPending || isApproved) && canApprove && (
              <div className="hakedis-period-stat">
                <Input
                  label={t("puantaj.hakedisPeriod.payableAmount")}
                  type="number"
                  step="0.01"
                  value={approvedPayable}
                  onChange={(e) => setApprovedPayable(e.target.value)}
                  disabled={isPaid}
                />
                {isPending && (
                  <Button type="button" variant="ghost" onClick={() => void handleSavePayable()} disabled={busy}>
                    {t("common.save")}
                  </Button>
                )}
              </div>
            )}
            {period.approved_payable && !isPending && !canApprove && (
              <div className="hakedis-period-stat">
                <span className="hakedis-period-stat-label">{t("puantaj.hakedisPeriod.payableAmount")}</span>
                <strong className="hakedis-period-stat-value">
                  {Number(period.approved_payable).toLocaleString(locale)} ₺
                </strong>
              </div>
            )}
          </div>
        )}

        {groupedLines.map((group) => (
          <div key={group.name} className="hakedis-period-group">
            <h4>{group.name}</h4>
            <div className="table-scroll">
              <table className="data-table data-table-compact">
                <thead>
                  <tr>
                    <th>{t("metraj.columns.description")}</th>
                    <th>{t("puantaj.hakedisPeriod.delta")}</th>
                    <th>{t("puantaj.settlement.columns.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.lines.map((line) => (
                    <tr key={line.id}>
                      <td>{line.description}</td>
                      <td>
                        {line.prev_cumulative_percent}% → {line.current_cumulative_percent}% (
                        +{line.delta_percent}%)
                      </td>
                      <td>{Number(line.line_gross).toLocaleString(locale)} ₺</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
