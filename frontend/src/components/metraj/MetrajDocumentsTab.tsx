import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import {
  metrajService,
  type MetrajDocument,
  type MetrajItem,
} from "../../services/metrajService";
import { toast } from "../../lib/toast";
import { uploadErrorMessage } from "../../lib/uploadLimits";
import { truncateText } from "../../lib/formatText";

interface MetrajDocumentsTabProps {
  siteId: number;
  items: MetrajItem[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

type DocRow = {
  doc: MetrajDocument;
  item: MetrajItem;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKindLabel(kind: string, t: (key: string) => string): string {
  if (kind === "excel") return t("metraj.documents.types.excel");
  if (kind === "image") return t("metraj.documents.types.image");
  if (kind === "pdf") return t("metraj.documents.types.pdf");
  return t("metraj.documents.types.other");
}

function FileKindIcon({ kind }: { kind: string }) {
  if (kind === "excel") return <FileSpreadsheet size={16} />;
  if (kind === "image") return <ImageIcon size={16} />;
  return <FileText size={16} />;
}

export function MetrajDocumentsTab({ siteId, items, loading, onRefresh }: MetrajDocumentsTabProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";
  const [documents, setDocuments] = useState<MetrajDocument[]>([]);
  const [loadedSiteId, setLoadedSiteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [itemFilterId, setItemFilterId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<MetrajDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const docsLoading = loadedSiteId !== siteId;

  const refreshDocuments = useCallback(async () => {
    try {
      const docs = await metrajService.listDocuments(siteId, { itemOnly: true });
      setDocuments(docs);
      setLoadedSiteId(siteId);
    } catch {
      setDocuments([]);
      setLoadedSiteId(siteId);
    }
  }, [siteId]);

  const needsFetch = loadedSiteId !== siteId;

  useEffect(() => {
    if (!needsFetch) return;

    let cancelled = false;

    void (async () => {
      try {
        const docs = await metrajService.listDocuments(siteId, { itemOnly: true });
        if (!cancelled) {
          setDocuments(docs);
          setLoadedSiteId(siteId);
        }
      } catch {
        if (!cancelled) {
          setDocuments([]);
          setLoadedSiteId(siteId);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [needsFetch, siteId]);

  const rows = useMemo<DocRow[]>(() => {
    const list: DocRow[] = [];
    for (const doc of documents) {
      if (!doc.item) continue;
      const item = itemById.get(doc.item);
      if (!item) continue;
      list.push({ doc, item });
    }
    return list.sort((a, b) => b.doc.created_at.localeCompare(a.doc.created_at));
  }, [documents, itemById]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (itemFilterId) {
      const itemId = Number(itemFilterId);
      list = list.filter(({ item }) => item.id === itemId);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(({ doc, item }) =>
      [item.description, item.category_name, doc.original_filename, doc.uploaded_by_name]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search, itemFilterId]);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const canPreview = (doc: MetrajDocument) => doc.file_kind === "image" || doc.file_kind === "pdf";

  const handleUpload = async (file: File) => {
    const itemId = Number(itemFilterId);
    if (!itemId) return;
    setUploading(true);
    try {
      await metrajService.uploadDocument(siteId, file, { itemId });
      toast.success(t("metraj.documents.uploaded"));
      await Promise.all([refreshDocuments(), onRefresh()]);
    } catch (err) {
      toast.error(uploadErrorMessage(err, t));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    try {
      await metrajService.deleteDocument(docId);
      toast.success(t("metraj.documents.deleted"));
      await refreshDocuments();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleDownload = async (doc: MetrajDocument) => {
    try {
      const blob = await metrajService.downloadDocumentBlob(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.original_filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const openPreview = async (doc: MetrajDocument) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const blob = await metrajService.downloadDocumentBlob(doc.id);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      toast.error(t("common.error"));
      setPreviewDoc(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDoc(null);
  };

  const uploadOptions = useMemo(
    () =>
      items.map((item) => ({
        value: String(item.id),
        label: [item.category_name, item.description].filter(Boolean).join(" · "),
      })),
    [items],
  );

  const itemFilterOptions = useMemo(
    () => [{ value: "", label: t("metraj.tabs.all") }, ...uploadOptions],
    [uploadOptions, t],
  );

  const hasActiveFilter = itemFilterId !== "" || search.trim() !== "";

  if (loading || docsLoading) {
    return <p className="text-muted">{t("common.loading")}</p>;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FileSpreadsheet size={28} />}
        title={t("metraj.empty")}
        description={t("metraj.documents.emptyItems")}
      />
    );
  }

  return (
    <div className="metraj-docs-tab">
      <div className="surface-card metraj-filters-panel">
        <div className="metraj-docs-toolbar">
          <Input
            label={t("metraj.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("metraj.documents.searchPlaceholder")}
          />
          <Select
            label={t("metraj.documents.filterItem")}
            value={itemFilterId}
            onChange={setItemFilterId}
            options={itemFilterOptions}
          />
          <div className="metraj-docs-upload-action">
            <span className="form-label-text">{t("metraj.documents.upload")}</span>
            <Button
              type="button"
              disabled={uploading || !itemFilterId}
              title={!itemFilterId ? t("metraj.documents.selectItemToUpload") : undefined}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={16} />
              {uploading ? t("common.loading") : t("metraj.documents.upload")}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted metraj-docs-tab-desc">{t("metraj.documents.desc")}</p>
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="surface-card metraj-table-card">
        {filteredRows.length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheet size={28} />}
            title={hasActiveFilter && rows.length > 0 ? t("metraj.operations.noResults") : t("metraj.documents.empty")}
            description={
              hasActiveFilter && rows.length > 0
                ? t("metraj.operations.noResultsDesc")
                : t("metraj.documents.emptyUploadHint")
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("metraj.columns.category")}</th>
                  <th>{t("metraj.documents.columns.item")}</th>
                  <th>{t("metraj.documents.columns.file")}</th>
                  <th>{t("metraj.documents.columns.type")}</th>
                  <th>{t("metraj.documents.columns.size")}</th>
                  <th>{t("metraj.documents.columns.uploaded")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(({ doc, item }) => (
                  <tr key={doc.id}>
                    <td>{item.category_name}</td>
                    <td className="font-medium">{item.description}</td>
                    <td>
                      <span className="metraj-doc-filename" title={doc.original_filename}>
                        <FileKindIcon kind={doc.file_kind} />
                        <span className="metraj-doc-filename-text">
                          {truncateText(doc.original_filename)}
                        </span>
                      </span>
                    </td>
                    <td>{fileKindLabel(doc.file_kind, t)}</td>
                    <td>{formatFileSize(doc.file_size)}</td>
                    <td>
                      <span className="text-sm text-muted">
                        {formatDate(doc.created_at)}
                        {doc.uploaded_by_name ? " · " + doc.uploaded_by_name : ""}
                      </span>
                    </td>
                    <td className="table-actions-cell">
                      <div className="table-row-actions">
                        {canPreview(doc) && (
                          <button
                            type="button"
                            className="btn-icon"
                            aria-label={t("metraj.documents.preview")}
                            onClick={() => void openPreview(doc)}
                          >
                            <Eye size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-icon"
                          aria-label={t("common.download")}
                          onClick={() => void handleDownload(doc)}
                        >
                          <Download size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          aria-label={t("common.delete")}
                          onClick={() => void handleDelete(doc.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={previewDoc !== null}
        onClose={closePreview}
        title={previewDoc?.original_filename ?? t("metraj.documents.preview")}
        className="modal-preview"
        bodyClassName="modal-body-preview"
      >
        {previewLoading && <p className="text-sm text-muted">{t("common.loading")}</p>}
        {!previewLoading && previewDoc && previewUrl && previewDoc.file_kind === "image" && (
          <img src={previewUrl} alt={previewDoc.title} className="metraj-preview-image" />
        )}
        {!previewLoading && previewDoc && previewUrl && previewDoc.file_kind === "pdf" && (
          <iframe src={previewUrl} title={previewDoc.title} className="metraj-preview-frame" />
        )}
      </Modal>
    </div>
  );
}
