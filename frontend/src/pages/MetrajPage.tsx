import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Inbox,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { MetrajCalendarPanel } from "../components/metraj/MetrajCalendarPanel";
import { MetrajDocumentsTab } from "../components/metraj/MetrajDocumentsTab";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/layout/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { FilterableTable, type FilterableColumn } from "../components/ui/FilterableTable";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Select } from "../components/ui/Select";
import { useTableFilters } from "../hooks/useTableFilters";
import { useSite } from "../hooks/useSite";
import {
  formatMetrajMoney,
  metrajService,
  type MetrajCategory,
  type MetrajItem,
  type MetrajSummary,
} from "../services/metrajService";
import { puantajService, type Subcontractor } from "../services/puantajService";
import { toast } from "../lib/toast";
import { uploadErrorMessage } from "../lib/uploadLimits";

type ItemForm = {
  category: number;
  subcontractor: string;
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
  notes: string;
};

type CategoryForm = {
  name: string;
  default_unit: string;
};

const emptyForm = (): ItemForm => ({
  category: 0,
  subcontractor: "",
  description: "",
  unit: "m2",
  quantity: "",
  unit_price: "",
  notes: "",
});

const emptyCategoryForm = (): CategoryForm => ({
  name: "",
  default_unit: "m2",
});

export function MetrajPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedSiteId, sites } = useSite();
  const importRef = useRef<HTMLInputElement>(null);
  const [excelMenuOpen, setExcelMenuOpen] = useState(false);
  const excelMenuRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<MetrajCategory[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [items, setItems] = useState<MetrajItem[]>([]);
  const [summary, setSummary] = useState<MetrajSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MetrajItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MetrajItem | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm());
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm());
  const [editingCategory, setEditingCategory] = useState<MetrajCategory | null>(null);
  const [activeTab, setActiveTab] = useState<"metraj" | "progress">("progress");

  const selectedSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId),
    [sites, selectedSiteId],
  );

  const loadData = useCallback(async () => {
    if (!selectedSiteId) return;
    setLoading(true);
    try {
      const [cats, sum, list, subs] = await Promise.all([
        metrajService.categories(),
        metrajService.summary(selectedSiteId),
        metrajService.list(selectedSiteId, search),
        puantajService.listSubcontractors(selectedSiteId),
      ]);
      setCategories(cats);
      setSummary(sum);
      setItems(list);
      setSubcontractors(subs);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [selectedSiteId, search, t]);

  const patchItem = useCallback(
    async (id: number, payload: { subcontractor?: number | null; unit_price?: string | null }) => {
      if (!selectedSiteId) return;
      try {
        const updated = await metrajService.update(id, payload);
        setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
        const sum = await metrajService.summary(selectedSiteId);
        setSummary(sum);
      } catch {
        toast.error(t("common.error"));
      }
    },
    [selectedSiteId, t],
  );

  useEffect(() => {
    const load = async () => {
      await loadData();
    };
    void load();
  }, [loadData]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (excelMenuRef.current && !excelMenuRef.current.contains(e.target as Node)) {
        setExcelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const tableColumns = useMemo<FilterableColumn<MetrajItem>[]>(
    () => [
      {
        key: "category",
        header: t("metraj.columns.category"),
        getFilterValue: (r) => r.category_name,
        render: (r) => r.category_name,
      },
      {
        key: "description",
        header: t("metraj.columns.description"),
        getFilterValue: (r) => r.description,
        render: (r) => (
          <span className="metraj-row-link">
            {r.description}
            <ChevronRight size={14} />
          </span>
        ),
      },
      {
        key: "subcontractor",
        header: t("metraj.columns.subcontractor"),
        headerClassName: "metraj-col-inline",
        cellClassName: "metraj-col-inline",
        getFilterValue: (r) => r.subcontractor_name ?? "—",
        render: (r) => (
          <select
            className="table-inline-select"
            value={r.subcontractor ?? ""}
            aria-label={t("metraj.columns.subcontractor")}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const val = e.target.value;
              void patchItem(r.id, { subcontractor: val ? Number(val) : null });
            }}
          >
            <option value="">—</option>
            {subcontractors.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        ),
      },
      {
        key: "quantity",
        header: t("metraj.columns.quantity"),
        getFilterValue: (r) => `${Number(r.quantity).toLocaleString("tr-TR")} ${r.unit}`,
        render: (r) => (
          <>
            {Number(r.quantity).toLocaleString("tr-TR")} {r.unit}
          </>
        ),
      },
      {
        key: "cost",
        header: t("metraj.columns.unitPrice"),
        headerClassName: "metraj-col-inline",
        cellClassName: "metraj-col-inline",
        getFilterValue: (r) =>
          r.unit_price ? `${Number(r.unit_price).toLocaleString("tr-TR")} ₺` : "—",
        render: (r) => (
          <input
            type="number"
            step="0.01"
            className="table-inline-input"
            defaultValue={r.unit_price ?? ""}
            key={`${r.id}-${r.unit_price ?? ""}`}
            aria-label={t("metraj.columns.unitPrice")}
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => {
              const next = e.target.value.trim();
              const prev = r.unit_price ?? "";
              if (next !== prev) {
                void patchItem(r.id, { unit_price: next || null });
              }
            }}
          />
        ),
      },
      {
        key: "earned",
        header: t("metraj.columns.earned"),
        getFilterValue: (r) =>
          r.total_amount ? `${Number(r.total_amount).toLocaleString("tr-TR")} ₺` : "—",
        render: (r) =>
          r.total_amount ? `${Number(r.total_amount).toLocaleString("tr-TR")} ₺` : "—",
      },
      {
        key: "operations",
        header: t("metraj.operations.title"),
        getFilterValue: (r) => String(r.operations_count),
        render: (r) => r.operations_count,
      },
      {
        key: "progress",
        header: t("metraj.columns.progress"),
        getFilterValue: (r) => `${r.completion_percent}%`,
        render: (r) => <ProgressBar value={r.completion_percent} />,
      },
    ],
    [t, subcontractors, patchItem],
  );

  const filterCols = useMemo(
    () => tableColumns.map((c) => ({ key: c.key, getValue: c.getFilterValue })),
    [tableColumns],
  );
  const { filters, setFilter, filteredRows } = useTableFilters(items, filterCols);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openCreate = () => {
    const cat = categories[0];
    setEditingItem(null);
    setForm({
      ...emptyForm(),
      category: cat?.id ?? 0,
      unit: cat?.default_unit ?? "m2",
    });
    setModalOpen(true);
  };

  const openEdit = (item: MetrajItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingItem(item);
    setForm({
      category: item.category,
      subcontractor: item.subcontractor ? String(item.subcontractor) : "",
      description: item.description,
      unit: item.unit,
      quantity: String(item.quantity),
      unit_price: item.unit_price ? String(item.unit_price) : "",
      notes: item.notes,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId) return;
    const payload = {
      category: form.category,
      subcontractor: form.subcontractor ? Number(form.subcontractor) : null,
      description: form.description,
      unit: form.unit,
      quantity: form.quantity,
      unit_price: form.unit_price || null,
      notes: form.notes,
    };
    try {
      if (editingItem) {
        await metrajService.update(editingItem.id, payload);
        toast.success(t("metraj.updateSuccess"));
      } else {
        await metrajService.create({ ...payload, site_id: selectedSiteId });
        toast.success(t("metraj.createSuccess"));
      }
      setModalOpen(false);
      await loadData();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await metrajService.remove(deleteItem.id);
      setDeleteItem(null);
      toast.success(t("metraj.deleteSuccess"));
      await loadData();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm());
  };

  const openCategoryModal = () => {
    resetCategoryForm();
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    try {
      if (editingCategory) {
        await metrajService.updateCategory(editingCategory.id, {
          name: categoryForm.name.trim(),
          default_unit: categoryForm.default_unit,
        });
        toast.success(t("metraj.categoryUpdated"));
      } else {
        await metrajService.createCategory({
          name: categoryForm.name.trim(),
          default_unit: categoryForm.default_unit,
        });
        toast.success(t("metraj.categoryAdded"));
      }
      resetCategoryForm();
      await loadData();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleEditCategory = (cat: MetrajCategory) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, default_unit: cat.default_unit });
  };

    const handleDeleteCategory = async (cat: MetrajCategory) => {
    try {
      await metrajService.deleteCategory(cat.id);
      toast.success(t("metraj.categoryDeleted"));
      if (editingCategory?.id === cat.id) resetCategoryForm();
      await loadData();
    } catch {
      toast.error(t("common.error"));
    }
  };

  if (!selectedSiteId) {
    return (
      <div className="page-stack dashboard-page">
        <PageHeader title={t("metraj.title")} />
        <EmptyState
          icon={<Inbox size={28} />}
          title={t("metraj.selectSiteTitle")}
          description={t("metraj.selectSiteDesc")}
        />
      </div>
    );
  }

  return (
    <div className="page-stack dashboard-page">
      <PageHeader
        title={t("metraj.title")}
        subtitle={selectedSite?.name}
        actions={
          <>
            {activeTab === "progress" && (
              <div className="excel-menu" ref={excelMenuRef}>
                <button type="button" className="btn-ghost" onClick={() => setExcelMenuOpen((o) => !o)}>
                  <FileSpreadsheet size={16} />
                  Excel
                  <ChevronDown size={14} />
                </button>
                {excelMenuOpen && (
                  <ul className="dropdown-menu excel-menu-list">
                    <li>
                      <button type="button" onClick={() => { importRef.current?.click(); setExcelMenuOpen(false); }}>
                        <Upload size={14} /> {t("metraj.excel.importData")}
                      </button>
                    </li>
                    <li>
                      <button type="button" onClick={() => {
                        void metrajService.export(selectedSiteId).then((b) =>
                          downloadBlob(b, `metraj-${selectedSite?.code ?? selectedSiteId}.xlsx`));
                        setExcelMenuOpen(false);
                      }}>
                        <Download size={14} /> {t("metraj.excel.exportData")}
                      </button>
                    </li>
                    <li>
                      <button type="button" onClick={() => {
                        void metrajService.downloadTemplate().then((b) => downloadBlob(b, "metraj-sablonu.xlsx"));
                        setExcelMenuOpen(false);
                      }}>
                        <FileSpreadsheet size={14} /> {t("metraj.excel.blankTemplate")}
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            )}
            <Button onClick={openCreate}>
              <Plus size={16} />
              {t("metraj.add")}
            </Button>
          </>
        }
      />

      <div className="metraj-tabs" role="tablist" aria-label={t("metraj.tabs.label")}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "metraj"}
          className={activeTab === "metraj" ? "metraj-tab-active" : "metraj-tab"}
          onClick={() => setActiveTab("metraj")}
        >
          {t("metraj.tabs.metraj")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "progress"}
          className={activeTab === "progress" ? "metraj-tab-active" : "metraj-tab"}
          onClick={() => setActiveTab("progress")}
        >
          {t("metraj.tabs.progress")}
        </button>
      </div>

      {activeTab === "metraj" ? (
        <MetrajDocumentsTab
          key={selectedSiteId}
          siteId={selectedSiteId}
          items={items}
          loading={loading}
          onRefresh={loadData}
        />
      ) : (
        <>
      <input ref={importRef} type="file" accept=".xlsx" className="sr-only" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void metrajService.import(selectedSiteId, f).then((r) => {
          toast.success(r.detail); void loadData();
        }).catch((err) => toast.error(uploadErrorMessage(err, t)));
        e.target.value = "";
      }} />

      {summary && (
        <div className="metraj-stats-grid">
          <div className="metraj-stat-card surface-card">
            <span className="metraj-stat-label">{t("metraj.stats.items")}</span>
            <span className="metraj-stat-value">{summary.item_count}</span>
          </div>
          <div className="metraj-stat-card surface-card">
            <span className="metraj-stat-label">{t("metraj.stats.progress")}</span>
            <span className="metraj-stat-value">{summary.average_progress}%</span>
          </div>
          {summary.estimated_cost !== null && (
            <div className="metraj-stat-card surface-card">
              <span className="metraj-stat-label">{t("metraj.stats.cost")}</span>
              <span className="metraj-stat-value" title={`${Number(summary.estimated_cost).toLocaleString("tr-TR")} ₺`}>
                {formatMetrajMoney(summary.estimated_cost)}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="surface-card metraj-filters-panel">
        <div className="metraj-filters-row">
          <Input label={t("metraj.search")} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("metraj.searchPlaceholder")} />
          <Button type="button" variant="ghost" className="metraj-category-btn" onClick={openCategoryModal}>
            <Layers size={16} />
            {t("metraj.manageCategories")}
          </Button>
        </div>
      </div>

      <div className="surface-card metraj-table-card">
        {loading ? (
          <p className="p-4 text-muted">{t("common.loading")}</p>
        ) : (
          <FilterableTable
            rows={filteredRows}
            filterSourceRows={items}
            columns={tableColumns}
            filters={filters}
            onFilterChange={setFilter}
            allFilterLabel={t("metraj.tabs.all")}
            onRowClick={(row) => navigate(`/metraj/items/${row.id}`)}
            actionsHeader={t("common.actions")}
            actionsColumn={(row) => (
              <div className="table-row-actions" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <button type="button" className="btn-icon" onClick={(e) => openEdit(row, e)} aria-label={t("common.edit")}>
                  <Pencil size={15} />
                </button>
                <button type="button" className="btn-icon" onClick={() => setDeleteItem(row)} aria-label={t("common.delete")}>
                  <Trash2 size={15} />
                </button>
              </div>
            )}
            emptyMessage={<EmptyState icon={<Inbox size={28} />} title={t("metraj.empty")} description={t("metraj.emptyDesc")} />}
          />
        )}
      </div>

      <MetrajCalendarPanel
        key={selectedSiteId ?? "none"}
        collapsible
        defaultOpen
        title={t("dashboard.calendar.title")}
        description={t("dashboard.calendar.desc")}
        siteIds={selectedSiteId ? [selectedSiteId] : []}
        emptyMessage={t("sites.selector.empty")}
        readonly
        selectToday
        onSelectOperation={(op) => navigate(`/metraj/items/${op.item}`)}
      />
        </>
      )}

      {/* Category modal */}
      <Modal open={categoryModalOpen} onClose={() => { setCategoryModalOpen(false); resetCategoryForm(); }} title={t("metraj.manageCategories")} footer={<Button type="submit" form="category-form">{editingCategory ? t("common.save") : t("metraj.addCategory")}</Button>}>
        <div className="category-modal-list">
          <table className="data-table category-table">
            <thead><tr><th>{t("metraj.columns.category")}</th><th>{t("metraj.columns.unit")}</th><th>{t("common.actions")}</th></tr></thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.name}</td><td>{cat.default_unit}</td>
                  <td className="table-actions-cell">
                    <div className="table-row-actions">
                      <button type="button" className="btn-icon" onClick={() => handleEditCategory(cat)}><Pencil size={14} /></button>
                      <button type="button" className="btn-icon" onClick={() => void handleDeleteCategory(cat)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form id="category-form" onSubmit={handleSaveCategory} className="form-stack mt-4">
          <p className="text-sm font-medium">{editingCategory ? t("metraj.editCategory") : t("metraj.addCategory")}</p>
          <Input label={t("metraj.columns.category")} value={categoryForm.name} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} placeholder={t("metraj.newCategoryPlaceholder")} required />
          <Input label={t("metraj.columns.unit")} value={categoryForm.default_unit} onChange={(e) => setCategoryForm((p) => ({ ...p, default_unit: e.target.value }))} required />
          {editingCategory && <Button type="button" variant="ghost" onClick={resetCategoryForm}>{t("common.cancel")}</Button>}
        </form>
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? t("metraj.editTitle") : t("metraj.addTitle")} footer={<Button type="submit" form="metraj-form">{t("common.save")}</Button>}>
        <form id="metraj-form" onSubmit={handleSave} className="form-stack">
          <Select label={t("metraj.columns.category")} value={String(form.category)} onChange={(val) => {
            const cat = categories.find((c) => String(c.id) === val);
            setForm((p) => ({ ...p, category: Number(val), unit: cat?.default_unit ?? p.unit }));
          }} options={categories.map((c) => ({ value: String(c.id), label: c.name }))} />
          <Select
            label={t("metraj.columns.subcontractor")}
            value={form.subcontractor}
            onChange={(val) => setForm((p) => ({ ...p, subcontractor: val }))}
            options={[
              { value: "", label: "—" },
              ...subcontractors.map((s) => ({ value: String(s.id), label: s.name })),
            ]}
          />
          <Input label={t("metraj.columns.description")} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t("metraj.columns.quantity")} type="number" step="0.001" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} required />
            <Input label={t("metraj.columns.unit")} value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} required />
          </div>
          <Input label={t("metraj.columns.unitPrice")} type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm((p) => ({ ...p, unit_price: e.target.value }))} />
          <Input label={t("metraj.columns.notes")} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          {!editingItem && <p className="text-sm text-muted">{t("metraj.itemHint")}</p>}
        </form>
      </Modal>

      <Modal open={deleteItem !== null} onClose={() => setDeleteItem(null)} title={t("metraj.deleteTitle")} footer={<><Button variant="ghost" onClick={() => setDeleteItem(null)}>{t("common.cancel")}</Button><button type="button" className="btn-danger" onClick={() => void handleDelete()}>{t("common.delete")}</button></>}>
        <p className="text-sm">{t("metraj.deleteDesc", { name: deleteItem?.description ?? "" })}</p>
      </Modal>
    </div>
  );
}
