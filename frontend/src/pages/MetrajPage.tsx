import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  Inbox,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/layout/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { FilterableTable, type FilterableColumn } from "../components/ui/FilterableTable";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { useTableFilters } from "../hooks/useTableFilters";
import { useSite } from "../hooks/useSite";
import {
  formatMetrajMoney,
  metrajService,
  type MetrajCategory,
  type MetrajItem,
  type MetrajItemDocument,
  type MetrajSummary,
} from "../services/metrajService";
import { toast } from "../lib/toast";

type ItemForm = {
  category: number;
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
  completion_percent: string;
  notes: string;
};

type CategoryForm = {
  name: string;
  default_unit: string;
};

const emptyForm = (): ItemForm => ({
  category: 0,
  description: "",
  unit: "m2",
  quantity: "",
  unit_price: "",
  completion_percent: "0",
  notes: "",
});

const emptyCategoryForm = (): CategoryForm => ({
  name: "",
  default_unit: "m2",
});

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-bar" aria-label={`${value}%`}>
      <div className="progress-bar-fill" style={{ width: `${Math.min(100, value)}%` }} />
      <span className="progress-bar-label">{value}%</span>
    </div>
  );
}

function ItemFilesCell({
  item,
  onPreview,
  onDelete,
  onUpload,
  t,
}: {
  item: MetrajItem;
  onPreview: (doc: MetrajItemDocument) => void;
  onDelete: (docId: number) => void;
  onUpload: (itemId: number) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="metraj-files-cell">
      {item.documents.map((doc) => (
        <div key={doc.id} className="metraj-file-chip">
          <span className="metraj-file-name" title={doc.original_filename}>
            {doc.original_filename}
          </span>
          <div className="table-row-actions">
            {doc.preview_url && (
              <button
                type="button"
                className="btn-icon"
                onClick={() => onPreview(doc)}
                aria-label={t("metraj.documents.preview")}
              >
                <Eye size={14} />
              </button>
            )}
            <button
              type="button"
              className="btn-icon"
              onClick={() =>
                void metrajService
                  .downloadDocumentBlob(doc.id)
                  .then((b) => {
                    const url = URL.createObjectURL(b);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = doc.original_filename;
                    a.click();
                    URL.revokeObjectURL(url);
                  })
              }
              aria-label={t("common.download")}
            >
              <Download size={14} />
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={() => void onDelete(doc.id)}
              aria-label={t("common.delete")}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="metraj-file-upload-btn" onClick={() => onUpload(item.id)}>
        <Upload size={13} />
        {t("metraj.documents.upload")}
      </button>
    </div>
  );
}

export function MetrajPage() {
  const { t } = useTranslation();
  const { selectedSiteId, sites } = useSite();
  const importRef = useRef<HTMLInputElement>(null);
  const itemDocRef = useRef<HTMLInputElement>(null);
  const [excelMenuOpen, setExcelMenuOpen] = useState(false);
  const excelMenuRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<MetrajCategory[]>([]);
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
  const [uploadItemId, setUploadItemId] = useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = useState<MetrajItemDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const selectedSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId),
    [sites, selectedSiteId],
  );

  const loadData = useCallback(async () => {
    if (!selectedSiteId) return;
    setLoading(true);
    try {
      const [cats, sum, list] = await Promise.all([
        metrajService.categories(),
        metrajService.summary(selectedSiteId),
        metrajService.list(selectedSiteId, search),
      ]);
      setCategories(cats);
      setSummary(sum);
      setItems(list);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [selectedSiteId, search, t]);

  const handlePreviewDoc = useCallback(async (doc: MetrajItemDocument) => {
    try {
      const blob = await metrajService.downloadDocumentBlob(doc.id);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewDoc(doc);
    } catch {
      toast.error(t("common.error"));
    }
  }, [t]);

  const handleDeleteDoc = useCallback(
    async (docId: number) => {
      try {
        await metrajService.deleteDocument(docId);
        toast.success(t("metraj.documents.deleted"));
        await loadData();
      } catch {
        toast.error(t("common.error"));
      }
    },
    [loadData, t],
  );

  const triggerItemUpload = useCallback((itemId: number) => {
    setUploadItemId(itemId);
    itemDocRef.current?.click();
  }, []);

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
        render: (r) => r.description,
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
        getFilterValue: (r) =>
          r.unit_price ? `${Number(r.unit_price).toLocaleString("tr-TR")} ₺` : "—",
        render: (r) =>
          r.unit_price ? `${Number(r.unit_price).toLocaleString("tr-TR")} ₺` : "—",
      },
      {
        key: "progress",
        header: t("metraj.columns.progress"),
        getFilterValue: (r) => `${r.completion_percent}%`,
        render: (r) => <ProgressBar value={r.completion_percent} />,
      },
      {
        key: "notes",
        header: t("metraj.columns.notes"),
        getFilterValue: (r) => r.notes || "—",
        render: (r) => <span className="text-muted">{r.notes || "—"}</span>,
      },
      {
        key: "files",
        header: t("metraj.columns.files"),
        getFilterValue: (r) =>
          r.documents.length > 0 ? r.documents.map((d) => d.original_filename).join(", ") : "—",
        render: (r) => (
          <ItemFilesCell
            item={r}
            onPreview={handlePreviewDoc}
            onDelete={handleDeleteDoc}
            onUpload={triggerItemUpload}
            t={t}
          />
        ),
      },
    ],
    [handleDeleteDoc, handlePreviewDoc, t, triggerItemUpload],
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

  const openEdit = (item: MetrajItem) => {
    setEditingItem(item);
    setForm({
      category: item.category,
      description: item.description,
      unit: item.unit,
      quantity: String(item.quantity),
      unit_price: item.unit_price ? String(item.unit_price) : "",
      completion_percent: String(item.completion_percent),
      notes: item.notes,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId) return;
    const payload = {
      category: form.category,
      description: form.description,
      unit: form.unit,
      quantity: form.quantity,
      unit_price: form.unit_price || null,
      completion_percent: Number(form.completion_percent),
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
    if (!cat.is_custom) return;
    try {
      await metrajService.deleteCategory(cat.id);
      toast.success(t("metraj.categoryDeleted"));
      if (editingCategory?.id === cat.id) resetCategoryForm();
      await loadData();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDoc(null);
  };

  if (!selectedSiteId) {
    return (
      <div className="page-stack">
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
    <div className="page-stack">
      <PageHeader
        title={t("metraj.title")}
        subtitle={selectedSite?.name}
        actions={
          <>
            <div className="excel-menu" ref={excelMenuRef}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setExcelMenuOpen((o) => !o)}
              >
                <FileSpreadsheet size={16} />
                Excel
                <ChevronDown size={14} />
              </button>
              {excelMenuOpen && (
                <ul className="dropdown-menu excel-menu-list">
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        importRef.current?.click();
                        setExcelMenuOpen(false);
                      }}
                    >
                      <Upload size={14} /> {t("metraj.excel.importData")}
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        void metrajService
                          .export(selectedSiteId)
                          .then((b) =>
                            downloadBlob(b, `metraj-${selectedSite?.code ?? selectedSiteId}.xlsx`),
                          );
                        setExcelMenuOpen(false);
                      }}
                    >
                      <Download size={14} /> {t("metraj.excel.exportData")}
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        void metrajService
                          .downloadTemplate()
                          .then((b) => downloadBlob(b, "metraj-sablonu.xlsx"));
                        setExcelMenuOpen(false);
                      }}
                    >
                      <FileSpreadsheet size={14} /> {t("metraj.excel.blankTemplate")}
                    </button>
                  </li>
                </ul>
              )}
            </div>
            <Button onClick={openCreate}>
              <Plus size={16} />
              {t("metraj.add")}
            </Button>
          </>
        }
      />
      <input
        ref={importRef}
        type="file"
        accept=".xlsx"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f)
            void metrajService
              .import(selectedSiteId, f)
              .then((r) => {
                toast.success(r.detail);
                void loadData();
              })
              .catch(() => toast.error(t("common.error")));
          e.target.value = "";
        }}
      />
      <input
        ref={itemDocRef}
        type="file"
        className="sr-only"
        accept=".xlsx,.xls,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && uploadItemId)
            void metrajService
              .uploadDocument(selectedSiteId, f, uploadItemId)
              .then(() => {
                toast.success(t("metraj.documents.uploaded"));
                void loadData();
              })
              .catch(() => toast.error(t("common.error")));
          e.target.value = "";
          setUploadItemId(null);
        }}
      />

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
          <div className="metraj-stat-card surface-card">
            <span className="metraj-stat-label">{t("metraj.stats.quantity")}</span>
            <span className="metraj-stat-value">
              {Number(summary.total_quantity).toLocaleString("tr-TR")}
            </span>
          </div>
          {summary.estimated_cost !== null && (
            <div className="metraj-stat-card surface-card">
              <span className="metraj-stat-label">{t("metraj.stats.cost")}</span>
              <span
                className="metraj-stat-value"
                title={`${Number(summary.estimated_cost).toLocaleString("tr-TR")} ₺`}
              >
                {formatMetrajMoney(summary.estimated_cost)}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="surface-card metraj-filters-panel">
        <div className="metraj-filters-row">
          <Input
            label={t("metraj.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("metraj.searchPlaceholder")}
          />
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
            actionsHeader={t("common.actions")}
            actionsColumn={(row) => (
              <div className="table-row-actions">
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => openEdit(row)}
                  aria-label={t("common.edit")}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setDeleteItem(row)}
                  aria-label={t("common.delete")}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
            emptyMessage={
              <EmptyState
                icon={<Inbox size={28} />}
                title={t("metraj.empty")}
                description={t("metraj.emptyDesc")}
              />
            }
          />
        )}
      </div>

      <Modal
        open={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          resetCategoryForm();
        }}
        title={t("metraj.manageCategories")}
        footer={
          <Button type="submit" form="category-form">
            {editingCategory ? t("common.save") : t("metraj.addCategory")}
          </Button>
        }
      >
        <div className="category-modal-list">
          <table className="data-table category-table">
            <thead>
              <tr>
                <th>{t("metraj.columns.category")}</th>
                <th>{t("metraj.columns.unit")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.name}</td>
                  <td>{cat.default_unit}</td>
                  <td className="table-actions-cell">
                    {cat.is_custom ? (
                      <div className="table-row-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleEditCategory(cat)}
                          aria-label={t("common.edit")}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => void handleDeleteCategory(cat)}
                          aria-label={t("common.delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">{t("metraj.systemCategory")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form id="category-form" onSubmit={handleSaveCategory} className="form-stack mt-4">
          <p className="text-sm font-medium">
            {editingCategory ? t("metraj.editCategory") : t("metraj.addCategory")}
          </p>
          <Input
            label={t("metraj.columns.category")}
            value={categoryForm.name}
            onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
            placeholder={t("metraj.newCategoryPlaceholder")}
            required
          />
          <Input
            label={t("metraj.columns.unit")}
            value={categoryForm.default_unit}
            onChange={(e) => setCategoryForm((p) => ({ ...p, default_unit: e.target.value }))}
            required
          />
          {editingCategory && (
            <Button type="button" variant="ghost" onClick={resetCategoryForm}>
              {t("common.cancel")}
            </Button>
          )}
        </form>
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? t("metraj.editTitle") : t("metraj.addTitle")}
        footer={
          <Button type="submit" form="metraj-form">
            {t("common.save")}
          </Button>
        }
      >
        <form id="metraj-form" onSubmit={handleSave} className="form-stack">
          <Select
            label={t("metraj.columns.category")}
            value={String(form.category)}
            onChange={(val) => {
              const cat = categories.find((c) => String(c.id) === val);
              setForm((p) => ({ ...p, category: Number(val), unit: cat?.default_unit ?? p.unit }));
            }}
            options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
          />
          <Input
            label={t("metraj.columns.description")}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t("metraj.columns.quantity")}
              type="number"
              step="0.001"
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              required
            />
            <Input
              label={t("metraj.columns.unit")}
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              required
            />
          </div>
          <Input
            label={t("metraj.columns.unitPrice")}
            type="number"
            step="0.01"
            value={form.unit_price}
            onChange={(e) => setForm((p) => ({ ...p, unit_price: e.target.value }))}
          />
          <Input
            label={t("metraj.columns.progress")}
            type="number"
            min={0}
            max={100}
            value={form.completion_percent}
            onChange={(e) => setForm((p) => ({ ...p, completion_percent: e.target.value }))}
          />
          <Input
            label={t("metraj.columns.notes")}
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </form>
      </Modal>

      <Modal
        open={deleteItem !== null}
        onClose={() => setDeleteItem(null)}
        title={t("metraj.deleteTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteItem(null)}>
              {t("common.cancel")}
            </Button>
            <button type="button" className="btn-danger" onClick={() => void handleDelete()}>
              {t("common.delete")}
            </button>
          </>
        }
      >
        <p className="text-sm">{t("metraj.deleteDesc", { name: deleteItem?.description ?? "" })}</p>
      </Modal>

      <Modal
        open={previewDoc !== null}
        onClose={closePreview}
        title={previewDoc?.title ?? t("metraj.documents.preview")}
      >
        {previewDoc && previewUrl && previewDoc.file_kind === "image" && (
          <img src={previewUrl} alt={previewDoc.title} className="metraj-preview-image" />
        )}
        {previewDoc && previewUrl && previewDoc.file_kind === "pdf" && (
          <iframe src={previewUrl} title={previewDoc.title} className="metraj-preview-frame" />
        )}
      </Modal>
    </div>
  );
}
