import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Wallet } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { PageInfoTooltip } from "../components/ui/PageInfoTooltip";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { toDateKey } from "../components/metraj/calendarUtils";
import { useSite } from "../hooks/useSite";
import { useSiteData } from "../hooks/useSiteData";
import {
  finansService,
  type LedgerEntry,
  type LedgerSummary,
  type MaterialStockItem,
  type Vendor,
} from "../services/finansService";
import { toast } from "../lib/toast";

type Tab = "ledger" | "stock" | "payment";

type FinansData = {
  entries: LedgerEntry[];
  summary: LedgerSummary | null;
  stock: MaterialStockItem[];
  vendors: Vendor[];
};

const emptyFinans: FinansData = { entries: [], summary: null, stock: [], vendors: [] };

export function FinansPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";
  const { selectedSiteId, sites } = useSite();
  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const [tab, setTab] = useState<Tab>("ledger");
  const [vendorFilter, setVendorFilter] = useState("");
  const [payModal, setPayModal] = useState(false);
  const [stockModal, setStockModal] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: "",
    description: "",
    entry_date: toDateKey(new Date()),
    vendor_id: "",
  });
  const [stockForm, setStockForm] = useState({ name: "", unit: "adet", quantity_on_hand: "0" });

  const fetcher = useCallback(async (): Promise<FinansData> => {
    if (!selectedSiteId) return emptyFinans;
    try {
      const [list, sum, items, vendors] = await Promise.all([
        finansService.listLedger(selectedSiteId, vendorFilter ? Number(vendorFilter) : undefined),
        finansService.summary(selectedSiteId),
        finansService.listStock(selectedSiteId),
        finansService.listVendors(),
      ]);
      return { entries: list, summary: sum, stock: items, vendors };
    } catch {
      toast.error(t("common.error"));
      return emptyFinans;
    }
  }, [selectedSiteId, vendorFilter, t]);

  const { data, loading, reload } = useSiteData(
    selectedSiteId ? `${selectedSiteId}-${vendorFilter}` : null,
    fetcher,
    emptyFinans,
  );
  const { entries, summary, stock, vendors } = data;

  const siteVendors = useMemo(
    () => vendors.filter((v) => v.is_active),
    [vendors],
  );

  const vendorOptions = useMemo(
    () => [
      { value: "", label: t("finans.allVendors") },
      ...siteVendors.map((v) => ({ value: String(v.id), label: v.name })),
    ],
    [siteVendors, t],
  );

  if (!selectedSiteId) {
    return (
      <div className="page-stack dashboard-page">
        <PageHeader title={t("finans.title")} subtitle={t("finans.subtitle")} />
        <EmptyState
          icon={<Wallet size={28} />}
          title={t("finans.selectSiteTitle")}
          description={t("finans.selectSiteDesc")}
        />
      </div>
    );
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId) return;
    try {
      await finansService.recordPayment({
        site_id: selectedSiteId,
        amount: payForm.amount,
        description: payForm.description,
        entry_date: payForm.entry_date,
        vendor_id: payForm.vendor_id ? Number(payForm.vendor_id) : null,
      });
      setPayModal(false);
      setPayForm({ amount: "", description: "", entry_date: toDateKey(new Date()), vendor_id: "" });
      toast.success(t("finans.paymentRecorded"));
      await reload();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleCreateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId) return;
    try {
      await finansService.createStock({
        site_id: selectedSiteId,
        name: stockForm.name,
        unit: stockForm.unit,
        quantity_on_hand: stockForm.quantity_on_hand,
      });
      setStockModal(false);
      setStockForm({ name: "", unit: "adet", quantity_on_hand: "0" });
      toast.success(t("finans.stockCreated"));
      await reload();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const formatMoney = (value: string | number | null | undefined) =>
    Number(value ?? 0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="page-stack dashboard-page">
      <PageHeader
        title={
          <span className="page-header-with-info">
            {t("finans.title")}
            <PageInfoTooltip text={t("finans.info")} />
          </span>
        }
        subtitle={selectedSite?.name}
        actions={
          <div className="flex gap-2 flex-wrap">
            {tab !== "stock" && (
              <Button onClick={() => setPayModal(true)}>
                <Plus size={16} />
                {t("finans.recordPayment")}
              </Button>
            )}
            {tab === "stock" && (
              <Button onClick={() => setStockModal(true)}>
                <Plus size={16} />
                {t("finans.addStock")}
              </Button>
            )}
          </div>
        }
      />

      <div className="metraj-tabs" role="tablist">
        {(["ledger", "stock", "payment"] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "metraj-tab-active" : "metraj-tab"}
            onClick={() => setTab(key)}
          >
            {t(`finans.tabs.${key}`)}
          </button>
        ))}
      </div>

      {summary && tab === "ledger" && (
        <div className="stats-grid">
          <div className="metraj-stat-card surface-card">
            <span className="stat-label">{t("finans.stats.credit")}</span>
            <span className="stat-value">{formatMoney(summary.total_credit)}</span>
          </div>
          <div className="metraj-stat-card surface-card">
            <span className="stat-label">{t("finans.stats.debit")}</span>
            <span className="stat-value">{formatMoney(summary.total_debit)}</span>
          </div>
          <div className="metraj-stat-card surface-card">
            <span className="stat-label">{t("finans.stats.balance")}</span>
            <span className="stat-value">{formatMoney(summary.balance)}</span>
          </div>
          <div className="metraj-stat-card surface-card">
            <span className="stat-label">{t("finans.stats.entries")}</span>
            <span className="stat-value">{summary.entry_count}</span>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted">{t("common.loading")}</p>
      ) : tab === "ledger" ? (
        entries.length === 0 ? (
          <EmptyState
            icon={<Wallet size={28} />}
            title={t("finans.empty")}
            description={t("finans.emptyDesc")}
          />
        ) : (
          <>
            <div className="finans-filter-row">
              <Select
                label={t("finans.columns.subcontractor")}
                value={vendorFilter}
                onChange={setVendorFilter}
                options={vendorOptions}
              />
            </div>
            <div className="surface-card metraj-table-card">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("finans.columns.date")}</th>
                      <th>{t("finans.columns.subcontractor")}</th>
                      <th>{t("finans.columns.description")}</th>
                      <th>{t("finans.columns.account")}</th>
                      <th>{t("finans.columns.direction")}</th>
                      <th>{t("finans.columns.amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{new Date(entry.entry_date).toLocaleDateString(locale)}</td>
                        <td>{entry.vendor_name ?? "—"}</td>
                        <td>{entry.description || "—"}</td>
                        <td>{entry.account_name}</td>
                        <td>{t(`finans.direction.${entry.direction}`)}</td>
                        <td>{formatMoney(entry.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      ) : tab === "stock" ? (
        stock.length === 0 ? (
          <EmptyState
            icon={<Wallet size={28} />}
            title={t("finans.stockEmpty")}
            description={t("finans.stockEmptyDesc")}
          />
        ) : (
          <div className="surface-card metraj-table-card">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("finans.stockColumns.name")}</th>
                    <th>{t("finans.stockColumns.unit")}</th>
                    <th>{t("finans.stockColumns.quantity")}</th>
                    <th>{t("finans.stockColumns.reorder")}</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.name}
                        {item.is_low && <span className="puantaj-badge is-pending ml-2">{t("finans.lowStock")}</span>}
                      </td>
                      <td>{item.unit}</td>
                      <td>{item.quantity_on_hand}</td>
                      <td>{item.reorder_level ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <p className="text-muted">{t("finans.paymentHint")}</p>
      )}

      <Modal
        open={payModal}
        onClose={() => setPayModal(false)}
        title={t("finans.recordPayment")}
        footer={
          <Button type="submit" form="pay-form">
            {t("common.save")}
          </Button>
        }
      >
        <form id="pay-form" onSubmit={handlePayment} className="form-stack">
          <Select
            label={t("finans.columns.subcontractor")}
            value={payForm.vendor_id}
            onChange={(v) => setPayForm((p) => ({ ...p, vendor_id: v }))}
            options={[
              { value: "", label: t("finans.noVendor") },
              ...siteVendors.map((v) => ({ value: String(v.id), label: v.name })),
            ]}
          />
          <Input
            label={t("finans.columns.amount")}
            type="number"
            step="0.01"
            value={payForm.amount}
            onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
            required
          />
          <Input
            label={t("finans.columns.date")}
            type="date"
            value={payForm.entry_date}
            onChange={(e) => setPayForm((p) => ({ ...p, entry_date: e.target.value }))}
            required
          />
          <Input
            label={t("finans.columns.description")}
            value={payForm.description}
            onChange={(e) => setPayForm((p) => ({ ...p, description: e.target.value }))}
          />
        </form>
      </Modal>

      <Modal
        open={stockModal}
        onClose={() => setStockModal(false)}
        title={t("finans.addStock")}
        footer={
          <Button type="submit" form="stock-form">
            {t("common.save")}
          </Button>
        }
      >
        <form id="stock-form" onSubmit={handleCreateStock} className="form-stack">
          <Input
            label={t("finans.stockColumns.name")}
            value={stockForm.name}
            onChange={(e) => setStockForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Input
            label={t("finans.stockColumns.unit")}
            value={stockForm.unit}
            onChange={(e) => setStockForm((p) => ({ ...p, unit: e.target.value }))}
          />
          <Input
            label={t("finans.stockColumns.quantity")}
            type="number"
            step="0.001"
            value={stockForm.quantity_on_hand}
            onChange={(e) => setStockForm((p) => ({ ...p, quantity_on_hand: e.target.value }))}
          />
        </form>
      </Modal>
    </div>
  );
}
