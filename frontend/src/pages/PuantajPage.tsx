import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  HardHat,
  Inbox,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { HakedisPeriodWizard } from "../components/puantaj/HakedisPeriodWizard";
import { AttendanceMatrix } from "../components/puantaj/AttendanceMatrix";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { FilterableTable, type FilterableColumn } from "../components/ui/FilterableTable";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { TablePagination } from "../components/ui/TablePagination";
import { useAuth } from "../hooks/useAuth";
import { useSite } from "../hooks/useSite";
import { useSiteData } from "../hooks/useSiteData";
import { useTableFilters } from "../hooks/useTableFilters";
import { useTablePagination } from "../hooks/useTablePagination";
import { metrajService, type MetrajCategory } from "../services/metrajService";
import {
  puantajService,
  type HakedisPeriod,
  type HakedisPeriodStatus,
  type HakedisSiteSummary,
  type Subcontractor,
  type Worker,
  type EmploymentType,
  type WorkerRole,
  type PayType,
} from "../services/puantajService";
import { toast } from "../lib/toast";
import { toDateKey } from "../components/metraj/calendarUtils";

type Tab = "timesheets" | "workers" | "subcontractors" | "hakedis";

const PAGE_SIZE = 10;

const statusClass: Record<HakedisPeriodStatus, string> = {
  draft: "puantaj-badge",
  pending_approval: "puantaj-badge is-pending",
  approved: "puantaj-badge is-approved",
  paid: "puantaj-badge is-paid",
};

const emptySubForm = (categoryId = "") => ({
  name: "",
  category: categoryId,
  contact_phone: "",
  notes: "",
});

const emptyWorkerForm = (subcontractor = "") => ({
  employment_type: "subcontractor" as EmploymentType,
  subcontractor,
  role: "construction_worker" as WorkerRole,
  pay_type: "daily" as PayType,
  first_name: "",
  last_name: "",
  national_id: "",
  insurance_status: "pending" as Worker["insurance_status"],
  phone: "",
  notes: "",
});

function monthBounds(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: toDateKey(start),
    end: toDateKey(end),
  };
}

type PuantajData = {
  categories: MetrajCategory[];
  subcontractors: Subcontractor[];
  workers: Worker[];
  hakedisPeriods: HakedisPeriod[];
  estimate: HakedisSiteSummary | null;
};

const emptyPuantaj: PuantajData = {
  categories: [],
  subcontractors: [],
  workers: [],
  hakedisPeriods: [],
  estimate: null,
};

export function PuantajPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";
  const { user } = useAuth();
  const { selectedSiteId, sites } = useSite();
  const today = new Date();
  const [period, setPeriod] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const [activeTab, setActiveTab] = useState<Tab>("timesheets");
  const [wizardKey, setWizardKey] = useState(0);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [periodWizardOpen, setPeriodWizardOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcontractor | null>(null);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [viewingPeriod, setViewingPeriod] = useState<HakedisPeriod | null>(null);
  const [subForm, setSubForm] = useState(emptySubForm);
  const [workerForm, setWorkerForm] = useState(emptyWorkerForm());
  const [workerSearch, setWorkerSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");

  const canApproveHakedis =
    user?.role === "owner" || user?.role === "admin" || user?.role === "accountant";
  const canManagePuantaj =
    canApproveHakedis || user?.role === "site_manager";

  const selectedSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId),
    [sites, selectedSiteId],
  );

  const fetchKey = selectedSiteId ? `${selectedSiteId}-${period.year}-${period.month}` : null;
  const monthRange = monthBounds(period.year, period.month);

  const fetcher = useCallback(async (): Promise<PuantajData> => {
    if (!selectedSiteId) return emptyPuantaj;
    try {
      const [cats, subs, wrk, periods, est] = await Promise.all([
        metrajService.categories(),
        puantajService.listSubcontractors(selectedSiteId),
        puantajService.listWorkers(selectedSiteId),
        puantajService.listHakedisPeriods(selectedSiteId, period.year, period.month),
        puantajService.getHakedisEstimate(selectedSiteId),
      ]);
      return {
        categories: cats,
        subcontractors: subs,
        workers: wrk,
        hakedisPeriods: periods,
        estimate: est,
      };
    } catch {
      toast.error(t("common.error"));
      return emptyPuantaj;
    }
  }, [selectedSiteId, period.year, period.month, t]);

  const { data, loading, reload, invalidate } = useSiteData(fetchKey, fetcher, emptyPuantaj);
  const { categories, subcontractors, workers, hakedisPeriods, estimate } = data;
  const refresh = reload;

  const monthLabel = useMemo(
    () =>
      new Date(period.year, period.month - 1, 1).toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
      }),
    [period, locale],
  );

  const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.name }));
  const defaultCategoryId = categories[0] ? String(categories[0].id) : "";
  const subOptions = subcontractors
    .filter((s) => s.is_active)
    .map((s) => ({ value: String(s.id), label: s.name }));

  const insuranceOptions = [
    { value: "insured", label: t("puantaj.worker.insurance.insured") },
    { value: "uninsured", label: t("puantaj.worker.insurance.uninsured") },
    { value: "pending", label: t("puantaj.worker.insurance.pending") },
  ];

  const insuranceLabel = useCallback(
    (status: Worker["insurance_status"]) => t(`puantaj.worker.insurance.${status}`),
    [t],
  );

  const employmentLabel = useCallback(
    (type: EmploymentType) => t(`puantaj.worker.employment.${type}`),
    [t],
  );

  const roleLabel = useCallback(
    (role: WorkerRole) => t(`puantaj.worker.roles.${role}`),
    [t],
  );

  const workerSearchFiltered = useMemo(() => {
    const q = workerSearch.trim().toLocaleLowerCase("tr");
    if (!q) return workers;
    return workers.filter((worker) => {
      const haystack = [
        worker.full_name,
        worker.first_name,
        worker.last_name,
        worker.national_id,
        worker.subcontractor_name,
        worker.phone,
        worker.notes,
      ]
        .join(" ")
        .toLocaleLowerCase("tr");
      return haystack.includes(q);
    });
  }, [workers, workerSearch]);

  const subSearchFiltered = useMemo(() => {
    const q = subSearch.trim().toLocaleLowerCase("tr");
    if (!q) return subcontractors;
    return subcontractors.filter((sub) => {
      const haystack = [sub.name, sub.category_name, sub.contact_phone, sub.notes]
        .join(" ")
        .toLocaleLowerCase("tr");
      return haystack.includes(q);
    });
  }, [subcontractors, subSearch]);

  const workerTableColumns = useMemo<FilterableColumn<Worker>[]>(
    () => [
      {
        key: "name",
        header: t("puantaj.worker.columns.name"),
        getFilterValue: (worker) => worker.full_name,
        render: (worker) => worker.full_name,
      },
      {
        key: "employment",
        header: t("puantaj.worker.columns.type"),
        getFilterValue: (worker) => employmentLabel(worker.employment_type),
        render: (worker) => employmentLabel(worker.employment_type),
      },
      {
        key: "employer",
        header: t("puantaj.worker.columns.employer"),
        getFilterValue: (worker) => worker.employer_name,
        render: (worker) => worker.employer_name,
      },
      {
        key: "role",
        header: t("puantaj.worker.columns.role"),
        getFilterValue: (worker) => roleLabel(worker.role),
        render: (worker) => roleLabel(worker.role),
      },
      {
        key: "nationalId",
        header: t("puantaj.worker.columns.nationalId"),
        getFilterValue: (worker) => worker.national_id || "—",
        render: (worker) => worker.national_id || "—",
      },
      {
        key: "insurance",
        header: t("puantaj.worker.columns.insurance"),
        getFilterValue: (worker) => insuranceLabel(worker.insurance_status),
        render: (worker) => insuranceLabel(worker.insurance_status),
      },
    ],
    [t, insuranceLabel, employmentLabel, roleLabel],
  );

  const subTableColumns = useMemo<FilterableColumn<Subcontractor>[]>(
    () => [
      {
        key: "name",
        header: t("puantaj.subcontractor.name"),
        getFilterValue: (sub) => sub.name,
        render: (sub) => sub.name,
      },
      {
        key: "category",
        header: t("puantaj.subcontractor.category"),
        getFilterValue: (sub) => sub.category_name,
        render: (sub) => sub.category_name,
      },
      {
        key: "status",
        header: t("puantaj.subcontractor.status"),
        getFilterValue: (sub) =>
          sub.is_active ? t("puantaj.subcontractor.active") : t("puantaj.subcontractor.inactive"),
        render: (sub) =>
          sub.is_active ? t("puantaj.subcontractor.active") : t("puantaj.subcontractor.inactive"),
      },
      {
        key: "earnedTotal",
        header: t("puantaj.subcontractor.earnedTotal"),
        getFilterValue: (sub) => `${Number(sub.earned_total).toLocaleString(locale)} ₺`,
        render: (sub) => `${Number(sub.earned_total).toLocaleString(locale)} ₺`,
      },
      {
        key: "metrajItems",
        header: t("puantaj.subcontractor.metrajItems"),
        getFilterValue: (sub) => String(sub.metraj_item_count),
        render: (sub) => sub.metraj_item_count,
      },
    ],
    [t, locale],
  );

  const workerFilterCols = useMemo(
    () => workerTableColumns.map((col) => ({ key: col.key, getValue: col.getFilterValue })),
    [workerTableColumns],
  );
  const subFilterCols = useMemo(
    () => subTableColumns.map((col) => ({ key: col.key, getValue: col.getFilterValue })),
    [subTableColumns],
  );

  const {
    filters: workerFilters,
    setFilter: setWorkerFilter,
    filteredRows: workerFilteredRows,
  } = useTableFilters(workerSearchFiltered, workerFilterCols);
  const {
    filters: subFilters,
    setFilter: setSubFilter,
    filteredRows: subFilteredRows,
  } = useTableFilters(subSearchFiltered, subFilterCols);

  const workerFilterKey = useMemo(() => JSON.stringify(workerFilters), [workerFilters]);
  const subFilterKey = useMemo(() => JSON.stringify(subFilters), [subFilters]);

  const {
    page: subPage,
    setPage: setSubPage,
    resetPage: resetSubPage,
    paginatedRows: paginatedSubs,
    showPagination: showSubPagination,
  } = useTablePagination(subFilteredRows, PAGE_SIZE);

  const {
    page: hpPage,
    setPage: setHpPage,
    resetPage: resetHpPage,
    paginatedRows: paginatedPeriods,
    showPagination: showHpPagination,
  } = useTablePagination(hakedisPeriods, PAGE_SIZE);

  const {
    page: workerPage,
    setPage: setWorkerPage,
    resetPage: resetWorkerPage,
    paginatedRows: paginatedWorkers,
    showPagination: showWorkerPagination,
  } = useTablePagination(workerFilteredRows, PAGE_SIZE);

  useEffect(() => {
    resetWorkerPage();
  }, [workerSearch, workerFilterKey, resetWorkerPage]);

  useEffect(() => {
    resetSubPage();
  }, [subSearch, subFilterKey, resetSubPage]);

  const shiftMonth = (delta: number) => {
    const d = new Date(period.year, period.month - 1 + delta, 1);
    const nextYear = d.getFullYear();
    const nextMonth = d.getMonth() + 1;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (nextYear > currentYear || (nextYear === currentYear && nextMonth > currentMonth)) {
      return;
    }
    setPeriod({ year: nextYear, month: nextMonth });
    invalidate();
    resetSubPage();
    resetWorkerPage();
    resetHpPage();
  };

  const canGoNextMonth = useMemo(() => {
    const next = new Date(period.year, period.month, 1);
    const nextYear = next.getFullYear();
    const nextMonth = next.getMonth() + 1;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    return nextYear < currentYear || (nextYear === currentYear && nextMonth <= currentMonth);
  }, [period.year, period.month]);

  const openCreateSub = () => {
    if (categoryOptions.length === 0) {
      toast.error(t("puantaj.subcontractor.noCategories"));
      return;
    }
    setEditingSub(null);
    setSubForm(emptySubForm(defaultCategoryId));
    setSubModalOpen(true);
  };

  const openEditSub = (sub: Subcontractor) => {
    setEditingSub(sub);
    setSubForm({
      name: sub.name,
      category: String(sub.category),
      contact_phone: sub.contact_phone,
      notes: sub.notes,
    });
    setSubModalOpen(true);
  };

  const openCreateWorker = () => {
    setEditingWorker(null);
    setWorkerForm(emptyWorkerForm(subOptions[0]?.value ?? ""));
    setWorkerModalOpen(true);
  };

  const openEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setWorkerForm({
      employment_type: worker.employment_type,
      subcontractor: worker.subcontractor ? String(worker.subcontractor) : "",
      role: worker.role,
      pay_type: worker.pay_type,
      first_name: worker.first_name,
      last_name: worker.last_name,
      national_id: worker.national_id,
      insurance_status: worker.insurance_status,
      phone: worker.phone,
      notes: worker.notes,
    });
    setWorkerModalOpen(true);
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId) return;
    if (workerForm.employment_type === "subcontractor" && !workerForm.subcontractor) {
      toast.error(t("puantaj.worker.needSubcontractor"));
      return;
    }
    const basePayload = {
      employment_type: workerForm.employment_type,
      role: workerForm.role,
      pay_type: workerForm.pay_type,
      first_name: workerForm.first_name.trim(),
      last_name: workerForm.last_name.trim(),
      national_id: workerForm.national_id,
      insurance_status: workerForm.insurance_status,
      phone: workerForm.phone,
      notes: workerForm.notes,
    };
    try {
      if (editingWorker) {
        await puantajService.updateWorker(editingWorker.id, {
          ...basePayload,
          ...(workerForm.employment_type === "subcontractor"
            ? { subcontractor: Number(workerForm.subcontractor) }
            : { subcontractor: undefined }),
        });
        toast.success(t("puantaj.worker.updated"));
      } else {
        await puantajService.createWorker({
          site_id: selectedSiteId,
          ...basePayload,
          ...(workerForm.employment_type === "subcontractor"
            ? { subcontractor: Number(workerForm.subcontractor) }
            : {}),
        });
        toast.success(t("puantaj.worker.created"));
      }
      setWorkerModalOpen(false);
      await refresh();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId || !subForm.category) {
      toast.error(t("puantaj.subcontractor.noCategories"));
      return;
    }
    try {
      if (editingSub) {
        await puantajService.updateSubcontractor(editingSub.id, {
          name: subForm.name.trim(),
          category: Number(subForm.category),
          contact_phone: subForm.contact_phone,
          notes: subForm.notes,
        });
        toast.success(t("puantaj.subcontractor.updated"));
      } else {
        await puantajService.createSubcontractor({
          site_id: selectedSiteId,
          name: subForm.name.trim(),
          category: Number(subForm.category),
          contact_phone: subForm.contact_phone,
          notes: subForm.notes,
        });
        toast.success(t("puantaj.subcontractor.created"));
      }
      setSubModalOpen(false);
      await refresh();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const openPeriod = async (p: HakedisPeriod) => {
    try {
      const full = await puantajService.getHakedisPeriod(p.id);
      setViewingPeriod(full);
      setWizardKey((k) => k + 1);
      setPeriodWizardOpen(true);
    } catch {
      toast.error(t("common.error"));
    }
  };

  if (!selectedSiteId) {
    return (
      <div className="page-stack dashboard-page">
        <PageHeader title={t("puantaj.title")} />
        <EmptyState
          icon={<Inbox size={28} />}
          title={t("metraj.selectSiteTitle")}
          description={t("metraj.selectSiteDesc")}
        />
      </div>
    );
  }

  return (
    <div className="page-stack dashboard-page puantaj-page">
      <PageHeader
        title={t("puantaj.title")}
        subtitle={selectedSite?.name}
        actions={
          activeTab === "subcontractors" ? (
            <Button onClick={openCreateSub}>
              <Plus size={16} />
              {t("puantaj.subcontractor.add")}
            </Button>
          ) : activeTab === "workers" ? (
            <Button onClick={openCreateWorker} disabled={!canManagePuantaj}>
              <Plus size={16} />
              {t("puantaj.worker.add")}
            </Button>
          ) : activeTab === "timesheets" ? null : (
            <Button
              onClick={() => {
                setViewingPeriod(null);
                setWizardKey((k) => k + 1);
                setPeriodWizardOpen(true);
              }}
              disabled={!canManagePuantaj}
            >
              <Plus size={16} />
              {t("puantaj.hakedisPeriod.new")}
            </Button>
          )
        }
      />

      <div className="puantaj-period-bar surface-card">
        <button type="button" className="btn-icon" onClick={() => shiftMonth(-1)} aria-label={t("puantaj.prevMonth")}>
          <ChevronLeft size={18} />
        </button>
        <span className="puantaj-period-label">{monthLabel}</span>
        <button
          type="button"
          className="btn-icon"
          onClick={() => shiftMonth(1)}
          disabled={!canGoNextMonth}
          aria-label={t("puantaj.nextMonth")}
        >
          <ChevronRight size={18} />
        </button>
        <Button
          variant="ghost"
          className="btn-sm"
          onClick={() => {
            const now = new Date();
            setPeriod({ year: now.getFullYear(), month: now.getMonth() + 1 });
            invalidate();
          }}
        >
          {t("puantaj.thisMonth")}
        </Button>
      </div>

      {estimate && (
        <div className="puantaj-estimate-banner surface-card">
          <span className="puantaj-estimate-label">{t("puantaj.hakedisPeriod.estimate")}</span>
          <span className="puantaj-estimate-value">
            {Number(estimate.earned_total).toLocaleString(locale)} ₺
          </span>
          <span className="text-sm text-muted">{t("puantaj.hakedisPeriod.estimateHint")}</span>
        </div>
      )}

      <p className="puantaj-flow-hint text-sm text-muted">{t("puantaj.flowHint")}</p>

      <div className="metraj-tabs" role="tablist">
        {(["timesheets", "workers", "subcontractors", "hakedis"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={activeTab === tab ? "metraj-tab-active" : "metraj-tab"}
            onClick={() => setActiveTab(tab)}
          >
            {t(`puantaj.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">{t("common.loading")}</p>
      ) : activeTab === "timesheets" ? (
        selectedSiteId ? (
          <AttendanceMatrix
            siteId={selectedSiteId}
            dateFrom={monthRange.start}
            dateTo={monthRange.end}
            subcontractors={subcontractors}
            canManage={canManagePuantaj}
            onChanged={() => void refresh()}
          />
        ) : null
      ) : activeTab === "workers" ? (
        workers.length === 0 ? (
          <EmptyState icon={<HardHat size={28} />} title={t("puantaj.worker.empty")} description={t("puantaj.worker.emptyDesc")} />
        ) : (
          <>
            <div className="surface-card metraj-filters-panel">
              <div className="metraj-filters-row">
                <Input
                  label={t("puantaj.worker.search")}
                  value={workerSearch}
                  onChange={(e) => setWorkerSearch(e.target.value)}
                  placeholder={t("puantaj.worker.searchPlaceholder")}
                />
              </div>
            </div>
            <div className="surface-card metraj-table-card">
              <FilterableTable
                rows={paginatedWorkers}
                filterSourceRows={workerSearchFiltered}
                columns={workerTableColumns}
                filters={workerFilters}
                onFilterChange={setWorkerFilter}
                allFilterLabel={t("metraj.tabs.all")}
                actionsHeader={t("common.actions")}
                actionsColumn={(worker) => (
                  <div className="table-row-actions">
                    <button type="button" className="btn-icon" onClick={() => openEditWorker(worker)}>
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => void puantajService.deleteWorker(worker.id).then(refresh)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
                emptyMessage={
                  <EmptyState
                    icon={<Inbox size={28} />}
                    title={t("puantaj.worker.noResults")}
                    description={t("puantaj.worker.noResultsDesc")}
                  />
                }
              />
              {showWorkerPagination && (
                <TablePagination
                  page={workerPage}
                  pageSize={PAGE_SIZE}
                  totalItems={workerFilteredRows.length}
                  onPageChange={setWorkerPage}
                />
              )}
            </div>
          </>
        )
      ) : activeTab === "subcontractors" ? (
        subcontractors.length === 0 ? (
          <EmptyState icon={<HardHat size={28} />} title={t("puantaj.subcontractor.empty")} description={t("puantaj.subcontractor.emptyDesc")} />
        ) : (
          <>
            <div className="surface-card metraj-filters-panel">
              <div className="metraj-filters-row">
                <Input
                  label={t("puantaj.subcontractor.search")}
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  placeholder={t("puantaj.subcontractor.searchPlaceholder")}
                />
              </div>
            </div>
            <div className="surface-card metraj-table-card">
              <FilterableTable
                rows={paginatedSubs}
                filterSourceRows={subSearchFiltered}
                columns={subTableColumns}
                filters={subFilters}
                onFilterChange={setSubFilter}
                allFilterLabel={t("metraj.tabs.all")}
                actionsHeader={t("common.actions")}
                actionsColumn={(sub) => (
                  <div className="table-row-actions">
                    <button type="button" className="btn-icon" onClick={() => openEditSub(sub)}>
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => void puantajService.deleteSubcontractor(sub.id).then(refresh)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
                emptyMessage={
                  <EmptyState
                    icon={<Inbox size={28} />}
                    title={t("puantaj.subcontractor.noResults")}
                    description={t("puantaj.subcontractor.noResultsDesc")}
                  />
                }
              />
              {showSubPagination && (
                <TablePagination
                  page={subPage}
                  pageSize={PAGE_SIZE}
                  totalItems={subFilteredRows.length}
                  onPageChange={setSubPage}
                />
              )}
            </div>
          </>
        )
      ) : hakedisPeriods.length === 0 ? (
        <EmptyState icon={<Inbox size={28} />} title={t("puantaj.hakedisPeriod.empty")} description={t("puantaj.hakedisPeriod.emptyDesc")} />
      ) : (
        <div className="surface-card metraj-table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("puantaj.hakedisPeriod.period")}</th>
                  <th>{t("puantaj.hakedisPeriod.statusLabel")}</th>
                  <th>{t("puantaj.hakedisPeriod.gross")}</th>
                  <th>{t("puantaj.hakedisPeriod.net")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPeriods.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {new Date(p.period_start).toLocaleDateString(locale)} —{" "}
                      {new Date(p.period_end).toLocaleDateString(locale)}
                    </td>
                    <td>
                      <span className={statusClass[p.status]}>
                        {t(`puantaj.hakedisPeriod.status.${p.status}`)}
                      </span>
                    </td>
                    <td>{Number(p.total_gross).toLocaleString(locale)} ₺</td>
                    <td className="font-medium">{Number(p.net_payable).toLocaleString(locale)} ₺</td>
                    <td>
                      <button type="button" className="btn-icon" onClick={() => void openPeriod(p)}>
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showHpPagination && (
            <TablePagination page={hpPage} pageSize={PAGE_SIZE} totalItems={hakedisPeriods.length} onPageChange={setHpPage} />
          )}
        </div>
      )}

      <HakedisPeriodWizard
        key={wizardKey}
        open={periodWizardOpen}
        siteId={selectedSiteId}
        defaultStart={monthRange.start}
        defaultEnd={monthRange.end}
        canApprove={canApproveHakedis}
        editingPeriod={viewingPeriod}
        onClose={() => {
          setPeriodWizardOpen(false);
          setViewingPeriod(null);
        }}
        onSaved={() => void refresh()}
      />

      <Modal open={subModalOpen} onClose={() => setSubModalOpen(false)} title={editingSub ? t("puantaj.subcontractor.edit") : t("puantaj.subcontractor.add")} footer={<Button type="submit" form="sub-form">{t("common.save")}</Button>}>
        <form id="sub-form" onSubmit={handleSaveSub} className="form-stack">
          <Input label={t("puantaj.subcontractor.name")} value={subForm.name} onChange={(e) => setSubForm((p) => ({ ...p, name: e.target.value }))} required />
          <Select label={t("puantaj.subcontractor.category")} value={subForm.category} onChange={(v) => setSubForm((p) => ({ ...p, category: v }))} options={categoryOptions} />
          <Input label={t("puantaj.subcontractor.phone")} value={subForm.contact_phone} onChange={(e) => setSubForm((p) => ({ ...p, contact_phone: e.target.value }))} />
          <Input label={t("metraj.columns.notes")} value={subForm.notes} onChange={(e) => setSubForm((p) => ({ ...p, notes: e.target.value }))} />
        </form>
      </Modal>

      <Modal open={workerModalOpen} onClose={() => setWorkerModalOpen(false)} title={editingWorker ? t("puantaj.worker.edit") : t("puantaj.worker.add")} footer={<Button type="submit" form="worker-form">{t("common.save")}</Button>}>
        <form id="worker-form" onSubmit={handleSaveWorker} className="form-stack">
          <Select
            label={t("puantaj.worker.columns.type")}
            value={workerForm.employment_type}
            onChange={(v) =>
              setWorkerForm((p) => ({
                ...p,
                employment_type: v as EmploymentType,
                subcontractor: v === "direct" ? "" : p.subcontractor,
                pay_type: v === "direct" ? "monthly" : p.pay_type,
              }))
            }
            options={[
              { value: "subcontractor", label: t("puantaj.worker.employment.subcontractor") },
              { value: "direct", label: t("puantaj.worker.employment.direct") },
            ]}
          />
          {workerForm.employment_type === "subcontractor" && (
            <Select
              label={t("puantaj.worker.columns.subcontractor")}
              value={workerForm.subcontractor}
              onChange={(v) => setWorkerForm((p) => ({ ...p, subcontractor: v }))}
              options={subOptions}
            />
          )}
          <Select
            label={t("puantaj.worker.columns.role")}
            value={workerForm.role}
            onChange={(v) => setWorkerForm((p) => ({ ...p, role: v as WorkerRole }))}
            options={[
              { value: "construction_worker", label: t("puantaj.worker.roles.construction_worker") },
              { value: "security_guard", label: t("puantaj.worker.roles.security_guard") },
              { value: "foreman", label: t("puantaj.worker.roles.foreman") },
              { value: "other", label: t("puantaj.worker.roles.other") },
            ]}
          />
          <Select
            label={t("puantaj.worker.columns.payType")}
            value={workerForm.pay_type}
            onChange={(v) => setWorkerForm((p) => ({ ...p, pay_type: v as PayType }))}
            options={[
              { value: "daily", label: t("puantaj.worker.payType.daily") },
              { value: "monthly", label: t("puantaj.worker.payType.monthly") },
            ]}
          />
          <Input label={t("puantaj.worker.columns.firstName")} value={workerForm.first_name} onChange={(e) => setWorkerForm((p) => ({ ...p, first_name: e.target.value }))} required />
          <Input label={t("puantaj.worker.columns.lastName")} value={workerForm.last_name} onChange={(e) => setWorkerForm((p) => ({ ...p, last_name: e.target.value }))} required />
          <Input label={t("puantaj.worker.columns.nationalId")} value={workerForm.national_id} onChange={(e) => setWorkerForm((p) => ({ ...p, national_id: e.target.value }))} />
          <Select label={t("puantaj.worker.columns.insurance")} value={workerForm.insurance_status} onChange={(v) => setWorkerForm((p) => ({ ...p, insurance_status: v as typeof p.insurance_status }))} options={insuranceOptions} />
          <Input label={t("puantaj.subcontractor.phone")} value={workerForm.phone} onChange={(e) => setWorkerForm((p) => ({ ...p, phone: e.target.value }))} />
          <Input label={t("metraj.columns.notes")} value={workerForm.notes} onChange={(e) => setWorkerForm((p) => ({ ...p, notes: e.target.value }))} />
        </form>
      </Modal>
    </div>
  );
}
