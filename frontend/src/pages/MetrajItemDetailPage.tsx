import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Download,
  Eye,
  Inbox,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { MetrajCalendarPanel } from "../components/metraj/MetrajCalendarPanel";
import { MetrajPanelHeader } from "../components/metraj/MetrajPanelHeader";
import { formatTimeLabel, normalizeDateKey, todayDateKey } from "../components/metraj/calendarUtils";
import { DateTimeFields } from "../components/ui/DateTimeFields";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { FilterableTable, type FilterableColumn } from "../components/ui/FilterableTable";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Select } from "../components/ui/Select";
import { TablePagination } from "../components/ui/TablePagination";
import { useTableFilters } from "../hooks/useTableFilters";
import { useTablePagination } from "../hooks/useTablePagination";
import {
  metrajService,
  type MetrajItem,
  type MetrajItemDocument,
  type MetrajOperation,
  type MetrajOperationInput,
} from "../services/metrajService";
import { toast } from "../lib/toast";
import { uploadErrorMessage } from "../lib/uploadLimits";
import { truncateText } from "../lib/formatText";

const OPERATIONS_PAGE_SIZE = 10;

type OperationForm = {
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "planned" | "done";
  progress_percent: string;
  notes: string;
};

const emptyOpForm = (): OperationForm => ({
  title: "",
  scheduled_date: todayDateKey(),
  scheduled_time: "",
  status: "planned",
  progress_percent: "10",
  notes: "",
});

export function MetrajItemDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const itemId = Number(id);
  const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingOpId, setPendingOpId] = useState<number | null>(null);

  const [item, setItem] = useState<MetrajItem | null>(null);
  const [operations, setOperations] = useState<MetrajOperation[]>([]);
  const [loadedItemId, setLoadedItemId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<MetrajOperation | null>(null);
  const [deleteOp, setDeleteOp] = useState<MetrajOperation | null>(null);
  const [form, setForm] = useState<OperationForm>(emptyOpForm());
  const [previewDoc, setPreviewDoc] = useState<MetrajItemDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loading = itemId > 0 && !Number.isNaN(itemId) && loadedItemId !== itemId;

  const refresh = useCallback(async () => {
    if (!itemId || Number.isNaN(itemId)) return;
    try {
      const [loadedItem, ops] = await Promise.all([
        metrajService.get(itemId),
        metrajService.listOperations(itemId),
      ]);
      setItem(loadedItem);
      setOperations(ops);
      setLoadedItemId(itemId);
    } catch {
      toast.error(t("common.error"));
    }
  }, [itemId, t]);

  const needsFetch = itemId > 0 && !Number.isNaN(itemId) && loadedItemId !== itemId;

  useEffect(() => {
    if (!needsFetch) return;

    let cancelled = false;

    void (async () => {
      try {
        const [loadedItem, ops] = await Promise.all([
          metrajService.get(itemId),
          metrajService.listOperations(itemId),
        ]);
        if (!cancelled) {
          setItem(loadedItem);
          setOperations(ops);
          setLoadedItemId(itemId);
        }
      } catch {
        if (!cancelled) toast.error(t("common.error"));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [needsFetch, itemId, t]);

  const formatDate = useCallback(
    (value: string, time?: string | null) => {
      const date = new Date(value).toLocaleDateString(locale);
      const timeLabel = formatTimeLabel(time, locale);
      return timeLabel ? `${date} ${timeLabel}` : date;
    },
    [locale],
  );

  const isDateTaken = useCallback(
    (dateKey: string, excludeId?: number) =>
      operations.some(
        (op) => normalizeDateKey(op.scheduled_date) === dateKey && op.id !== excludeId,
      ),
    [operations],
  );

  const openCreate = (scheduledDate?: string) => {
    if (scheduledDate && isDateTaken(scheduledDate)) {
      toast.error(t("metraj.operations.dateTaken"));
      return;
    }
    setEditingOp(null);
    setForm({
      ...emptyOpForm(),
      ...(scheduledDate ? { scheduled_date: scheduledDate } : {}),
    });
    setModalOpen(true);
  };

  const openEdit = (op: MetrajOperation) => {
    setEditingOp(op);
    setForm({
      title: op.title,
      scheduled_date: normalizeDateKey(op.scheduled_date),
      scheduled_time: op.scheduled_time?.slice(0, 5) ?? "",
      status: op.status,
      progress_percent: String(op.progress_percent),
      notes: op.notes,
    });
    setModalOpen(true);
  };

  const statusLabel = useCallback(
    (status: MetrajOperation["status"]) =>
      status === "done" ? t("metraj.operations.done") : t("metraj.operations.planned"),
    [t],
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (isDateTaken(form.scheduled_date, editingOp?.id)) {
      toast.error(t("metraj.operations.dateTaken"));
      return;
    }
    const payload: MetrajOperationInput = {
      title: form.title.trim(),
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time.trim() || null,
      status: form.status,
      progress_percent: Number(form.progress_percent),
      notes: form.notes,
    };
    try {
      if (editingOp) {
        await metrajService.updateOperation(editingOp.id, payload);
        toast.success(t("metraj.operations.updated"));
      } else {
        await metrajService.createOperation(itemId, payload);
        toast.success(t("metraj.operations.created"));
      }
      setModalOpen(false);
      await refresh();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!deleteOp) return;
    try {
      await metrajService.deleteOperation(deleteOp.id);
      setDeleteOp(null);
      toast.success(t("metraj.operations.deleted"));
      await refresh();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const toggleStatus = useCallback(
    async (op: MetrajOperation) => {
      try {
        await metrajService.updateOperation(op.id, {
          status: op.status === "done" ? "planned" : "done",
        });
        await refresh();
      } catch {
        toast.error(t("common.error"));
      }
    },
    [refresh, t],
  );

  const handlePreview = useCallback(
    async (doc: MetrajItemDocument) => {
      try {
        const blob = await metrajService.downloadDocumentBlob(doc.id);
        setPreviewUrl(URL.createObjectURL(blob));
        setPreviewDoc(doc);
      } catch {
        toast.error(t("common.error"));
      }
    },
    [t],
  );

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDoc(null);
  };

  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return operations;
    return operations.filter((op) => {
      const date = formatDate(op.scheduled_date, op.scheduled_time);
      return (
        op.title.toLowerCase().includes(q) ||
        op.notes.toLowerCase().includes(q) ||
        date.toLowerCase().includes(q) ||
        statusLabel(op.status).toLowerCase().includes(q) ||
        String(op.progress_percent).includes(q)
      );
    });
  }, [operations, search, formatDate, statusLabel]);

  const tableColumns = useMemo<FilterableColumn<MetrajOperation>[]>(
    () => [
      {
        key: "date",
        header: t("metraj.operations.columns.date"),
        getFilterValue: (op) => formatDate(op.scheduled_date, op.scheduled_time),
        render: (op) => formatDate(op.scheduled_date, op.scheduled_time),
      },
      {
        key: "title",
        header: t("metraj.operations.columns.name"),
        getFilterValue: (op) => op.title,
        render: (op) => op.title,
      },
      {
        key: "status",
        header: t("metraj.operations.columns.status"),
        getFilterValue: (op) => statusLabel(op.status),
        render: (op) => (
          <button
            type="button"
            className={`metraj-status-badge metraj-status-${op.status}`}
            onClick={() => void toggleStatus(op)}
          >
            {statusLabel(op.status)}
          </button>
        ),
      },
      {
        key: "progress",
        header: t("metraj.operations.columns.progress"),
        getFilterValue: (op) => `${op.progress_percent}%`,
        render: (op) => `${op.progress_percent}%`,
      },
      {
        key: "files",
        header: t("metraj.columns.files"),
        getFilterValue: (op) =>
          op.documents.length > 0
            ? op.documents.map((doc) => doc.original_filename).join(", ")
            : "—",
        render: (op) => (
          <div className="metraj-files-cell">
            {op.documents.map((doc) => (
              <div key={doc.id} className="metraj-file-chip">
                <span className="metraj-file-name" title={doc.original_filename}>
                  {truncateText(doc.original_filename)}
                </span>
                <div className="table-row-actions">
                  {doc.preview_url && (
                    <button type="button" className="btn-icon" onClick={() => void handlePreview(doc)}>
                      <Eye size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() =>
                      void metrajService.downloadDocumentBlob(doc.id).then((b) => {
                        const url = URL.createObjectURL(b);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = doc.original_filename;
                        a.click();
                        URL.revokeObjectURL(url);
                      })
                    }
                  >
                    <Download size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => void metrajService.deleteDocument(doc.id).then(() => refresh())}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="metraj-file-upload-btn"
              onClick={() => {
                setPendingOpId(op.id);
                fileRef.current?.click();
              }}
            >
              <Upload size={13} />
              {t("metraj.documents.upload")}
            </button>
          </div>
        ),
      },
    ],
    [t, formatDate, statusLabel, handlePreview, refresh, toggleStatus],
  );

  const filterCols = useMemo(
    () => tableColumns.map((col) => ({ key: col.key, getValue: col.getFilterValue })),
    [tableColumns],
  );
  const { filters, setFilter, filteredRows } = useTableFilters(searchFiltered, filterCols);
  const { page, setPage, resetPage, paginatedRows, showPagination } = useTablePagination(
    filteredRows,
    OPERATIONS_PAGE_SIZE,
  );

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    resetPage();
  }, [search, filterKey, resetPage]);

  if (loading || !item) {
    return (
      <div className="page-stack">
        <p className="text-muted">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="page-stack dashboard-page metraj-item-detail">
      <PageHeader
        variant="detail"
        before={
          <Link to="/metraj" className="page-back-link">
            <ArrowLeft size={16} />
            {t("metraj.title")}
          </Link>
        }
        title={item.description}
        subtitle={`${item.category_name} · ${Number(item.quantity).toLocaleString(locale)} ${item.unit}`}
        actions={
          <Button onClick={() => openCreate()}>
            <Plus size={16} />
            {t("metraj.operations.add")}
          </Button>
        }
      />

      <div className="metraj-item-summary surface-card">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">{t("metraj.columns.progress")}</span>
          <ProgressBar value={item.completion_percent} />
        </div>
        <div className="metraj-item-summary-meta">
          <span>
            {t("metraj.operations.count")}: <strong>{operations.length}</strong>
          </span>
          {item.unit_price && (
            <span>
              {t("metraj.columns.unitPrice")}:{" "}
              <strong>{Number(item.unit_price).toLocaleString(locale)} ₺</strong>
            </span>
          )}
        </div>
      </div>

      <div className="metraj-detail-stack">
        <section className="surface-card metraj-operations-card">
          <MetrajPanelHeader
            icon={ListTodo}
            title={t("metraj.operations.title")}
            description={t("metraj.operations.desc")}
            actions={
              operations.length > 0 ? (
                <Input
                  label={t("metraj.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("metraj.operations.searchPlaceholder")}
                />
              ) : undefined
            }
          />

          {operations.length === 0 ? (
            <p className="text-sm text-muted metraj-operations-empty">{t("metraj.operations.empty")}</p>
          ) : (
            <>
              <FilterableTable
                rows={paginatedRows}
                filterSourceRows={searchFiltered}
                columns={tableColumns}
                filters={filters}
                onFilterChange={setFilter}
                allFilterLabel={t("metraj.tabs.all")}
                actionsHeader={t("common.actions")}
                actionsColumn={(op) => (
                  <div className="table-row-actions">
                    <button type="button" className="btn-icon" onClick={() => openEdit(op)}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="btn-icon" onClick={() => setDeleteOp(op)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
                emptyMessage={
                  <EmptyState
                    icon={<Inbox size={28} />}
                    title={t("metraj.operations.noResults")}
                    description={t("metraj.operations.noResultsDesc")}
                  />
                }
              />
              {showPagination && (
                <TablePagination
                  page={page}
                  pageSize={OPERATIONS_PAGE_SIZE}
                  totalItems={filteredRows.length}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </section>

        <MetrajCalendarPanel
          collapsible
          defaultOpen
          title={t("dashboard.calendar.title")}
          description={t("dashboard.calendar.desc")}
          operations={operations}
          readonly={false}
          oneOpPerDay
          showItemDescription={false}
          onSelectOperation={openEdit}
          onAddForDate={openCreate}
          selectToday
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        accept=".xlsx,.xls,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && pendingOpId && item)
            void metrajService
              .uploadDocument(item.site, f, { operationId: pendingOpId })
              .then(() => {
                toast.success(t("metraj.documents.uploaded"));
                void refresh();
              })
              .catch((err) => toast.error(uploadErrorMessage(err, t)));
          e.target.value = "";
          setPendingOpId(null);
        }}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingOp ? t("metraj.operations.edit") : t("metraj.operations.add")}
        footer={
          <Button type="submit" form="operation-form">
            {t("common.save")}
          </Button>
        }
      >
        <form id="operation-form" onSubmit={handleSave} className="form-stack">
          <Input
            label={t("metraj.operations.columns.name")}
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            required
          />
          <DateTimeFields
            dateLabel={t("metraj.operations.columns.date")}
            timeLabel={t("metraj.calendar.timeOptional")}
            dateValue={form.scheduled_date}
            timeValue={form.scheduled_time}
            onDateChange={(value) => setForm((p) => ({ ...p, scheduled_date: value }))}
            onTimeChange={(value) => setForm((p) => ({ ...p, scheduled_time: value }))}
            dateRequired
          />
          <Select
            label={t("metraj.operations.columns.status")}
            value={form.status}
            onChange={(val) => setForm((p) => ({ ...p, status: val as "planned" | "done" }))}
            options={[
              { value: "planned", label: t("metraj.operations.planned") },
              { value: "done", label: t("metraj.operations.done") },
            ]}
          />
          <Input
            label={t("metraj.operations.columns.progress")}
            type="number"
            min={0}
            max={100}
            value={form.progress_percent}
            onChange={(e) => setForm((p) => ({ ...p, progress_percent: e.target.value }))}
            required
          />
          <Input
            label={t("metraj.columns.notes")}
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </form>
      </Modal>

      <Modal
        open={deleteOp !== null}
        onClose={() => setDeleteOp(null)}
        title={t("metraj.operations.deleteTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOp(null)}>
              {t("common.cancel")}
            </Button>
            <button type="button" className="btn-danger" onClick={() => void handleDelete()}>
              {t("common.delete")}
            </button>
          </>
        }
      >
        <p className="text-sm">{t("metraj.operations.deleteDesc", { name: deleteOp?.title ?? "" })}</p>
      </Modal>

      <Modal
        open={previewDoc !== null}
        onClose={closePreview}
        title={previewDoc?.title ?? t("metraj.documents.preview")}
        className="modal-preview"
        bodyClassName="modal-body-preview"
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
