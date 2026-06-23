import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronLeft, ChevronRight, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { PageInfoTooltip } from "../components/ui/PageInfoTooltip";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { useSite } from "../hooks/useSite";
import { useSiteData } from "../hooks/useSiteData";
import { addDays, parseDateKey, startOfWeek, toDateKey } from "../components/metraj/calendarUtils";
import { dailyLogService, type DailyLog, type DailyLogPhoto } from "../services/dailyLogService";
import { toast } from "../lib/toast";
import { isAxiosError } from "axios";

const emptyForm = () => ({
  log_date: toDateKey(new Date()),
  weather: "",
  summary: "",
  worker_count: "0",
});

const AUTO_MARKER = "[Otomatik]";

function mergeAutoSummary(current: string, suggested: string): string {
  const idx = current.indexOf(AUTO_MARKER);
  if (idx === -1) {
    if (!current.trim()) return suggested;
    return current;
  }
  const afterMarker = current.slice(idx);
  const splitAt = afterMarker.indexOf("\n\n");
  const userSuffix = splitAt >= 0 ? afterMarker.slice(splitAt + 2).trim() : "";
  if (!userSuffix) return suggested;
  return `${suggested}\n\n${userSuffix}`;
}

type RangeMode = "week" | "month";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthEnd(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function logToForm(log: DailyLog) {
  return {
    log_date: log.log_date,
    weather: log.weather,
    summary: log.summary,
    worker_count: String(log.worker_count),
  };
}

export function GunlukRaporPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";
  const { selectedSiteId, sites } = useSite();
  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rangeMode, setRangeMode] = useState<RangeMode>("week");
  const [rangeAnchor, setRangeAnchor] = useState(() => startOfWeek(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachedPhotos, setAttachedPhotos] = useState<DailyLogPhoto[]>([]);
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [todayDraftLoaded, setTodayDraftLoaded] = useState(false);

  const { dateFrom, dateTo } = useMemo(() => {
    if (rangeMode === "week") {
      const end = addDays(rangeAnchor, 6);
      return { dateFrom: toDateKey(rangeAnchor), dateTo: toDateKey(end) };
    }
    const start = startOfMonth(rangeAnchor);
    const end = monthEnd(rangeAnchor);
    return { dateFrom: toDateKey(start), dateTo: toDateKey(end) };
  }, [rangeMode, rangeAnchor]);

  const fetcher = useCallback(async (): Promise<DailyLog[]> => {
    if (!selectedSiteId) return [];
    return dailyLogService.list(selectedSiteId, dateFrom, dateTo);
  }, [selectedSiteId, dateFrom, dateTo]);

  const { data: logs, loading, reload } = useSiteData(
    selectedSiteId ? `${selectedSiteId}-${rangeMode}-${dateFrom}` : null,
    fetcher,
    [] as DailyLog[],
  );

  useEffect(() => {
    if (!selectedSiteId || todayDraftLoaded) return;
    let cancelled = false;
    void (async () => {
      try {
        await dailyLogService.getToday(selectedSiteId);
        if (!cancelled) {
          setTodayDraftLoaded(true);
          await reload();
        }
      } catch {
        if (!cancelled) setTodayDraftLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSiteId, todayDraftLoaded, reload]);

  useEffect(() => {
    if (!modalOpen || !selectedSiteId) return;
    let cancelled = false;
    void (async () => {
      try {
        const suggest = await dailyLogService.suggest(selectedSiteId, form.log_date);
        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          worker_count: String(suggest.worker_count),
          summary: mergeAutoSummary(prev.summary, suggest.summary),
        }));
      } catch {
        /* öneri yüklenemezse mevcut form korunur */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modalOpen, selectedSiteId, form.log_date]);

  const openCreate = () => {
    setEditingLog(null);
    setForm(emptyForm());
    setPendingFiles([]);
    setAttachedPhotos([]);
    setModalOpen(true);
  };

  const openEdit = (log: DailyLog) => {
    setEditingLog(log);
    setForm(logToForm(log));
    setPendingFiles([]);
    setAttachedPhotos([...log.photos]);
    setModalOpen(true);
  };

  const openTodayEdit = async () => {
    if (!selectedSiteId) return;
    try {
      const today = await dailyLogService.getToday(selectedSiteId);
      openEdit(today);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!editingLog) return;
    setDeletingPhotoId(photoId);
    try {
      await dailyLogService.deleteFile(editingLog.id, photoId);
      setAttachedPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
      setEditingLog((prev) =>
        prev ? { ...prev, photos: prev.photos.filter((photo) => photo.id !== photoId) } : null,
      );
      toast.success(t("dailyLog.fileDeleted"));
      await reload();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const photoDisplayName = (photo: DailyLogPhoto) =>
    photo.original_name || photo.caption || t("dailyLog.attachment");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId) return;
    setSaving(true);
    try {
      let log: DailyLog;
      if (editingLog) {
        log = await dailyLogService.update(editingLog.id, {
          log_date: form.log_date,
          weather: form.weather,
          summary: form.summary,
          worker_count: Number(form.worker_count) || 0,
        });
      } else {
        try {
          log = await dailyLogService.create({
            site_id: selectedSiteId,
            log_date: form.log_date,
            weather: form.weather,
            summary: form.summary,
            worker_count: Number(form.worker_count) || 0,
          });
        } catch (err) {
          if (isAxiosError(err) && err.response?.status === 409 && err.response.data?.id) {
            const existingId = err.response.data.id as number;
            log = await dailyLogService.update(existingId, {
              weather: form.weather,
              summary: form.summary,
              worker_count: Number(form.worker_count) || 0,
            });
          } else {
            throw err;
          }
        }
      }
      for (const file of pendingFiles) {
        await dailyLogService.uploadFile(log.id, file);
      }
      setModalOpen(false);
      setEditingLog(null);
      setForm(emptyForm());
      setPendingFiles([]);
      setAttachedPhotos([]);
      toast.success(editingLog ? t("dailyLog.updated") : t("dailyLog.created"));
      await reload();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const rangeLabel = useMemo(() => {
    if (rangeMode === "month") {
      return startOfMonth(rangeAnchor).toLocaleDateString(locale, { month: "long", year: "numeric" });
    }
    const end = addDays(rangeAnchor, 6);
    const sameYear = rangeAnchor.getFullYear() === end.getFullYear();
    const startFmt = rangeAnchor.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
    });
    const endFmt = end.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${startFmt} – ${endFmt}`;
  }, [rangeMode, rangeAnchor, locale]);

  const navigatePrev = () => {
    if (rangeMode === "week") {
      setRangeAnchor((d) => addDays(d, -7));
    } else {
      setRangeAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    }
  };

  const navigateNext = () => {
    if (rangeMode === "week") {
      setRangeAnchor((d) => addDays(d, 7));
    } else {
      setRangeAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    }
  };

  const goThisWeek = () => {
    setRangeMode("week");
    setRangeAnchor(startOfWeek(new Date()));
  };

  const goThisMonth = () => {
    setRangeMode("month");
    setRangeAnchor(startOfMonth(new Date()));
  };

  const isImageFile = (name: string) => /\.(jpe?g|png|gif|webp|bmp)$/i.test(name);

  if (!selectedSiteId) {
    return (
      <div className="page-stack dashboard-page">
        <PageHeader title={t("dailyLog.title")} subtitle={t("dailyLog.subtitle")} />
        <EmptyState icon={<BookOpen size={28} />} title={t("dailyLog.selectSiteTitle")} description={t("dailyLog.selectSiteDesc")} />
      </div>
    );
  }

  return (
    <div className="page-stack dashboard-page">
      <PageHeader
        title={<span className="page-header-with-info">{t("dailyLog.title")}<PageInfoTooltip text={t("dailyLog.info")} /></span>}
        subtitle={selectedSite?.name}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" onClick={() => void openTodayEdit()}>{t("dailyLog.editToday")}</Button>
            <Button onClick={openCreate}><Plus size={16} />{t("dailyLog.add")}</Button>
          </div>
        }
      />

      <div className="daily-log-week-nav">
        <button
          type="button"
          className="btn-icon"
          onClick={navigatePrev}
          aria-label={rangeMode === "week" ? t("dailyLog.prevWeek") : t("dailyLog.prevMonth")}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="daily-log-week-label">{rangeLabel}</span>
        <button
          type="button"
          className="btn-icon"
          onClick={navigateNext}
          aria-label={rangeMode === "week" ? t("dailyLog.nextWeek") : t("dailyLog.nextMonth")}
        >
          <ChevronRight size={18} />
        </button>
        <Button variant="ghost" className="btn-sm" onClick={goThisWeek}>
          {t("dailyLog.thisWeek")}
        </Button>
        <Button variant="ghost" className="btn-sm" onClick={goThisMonth}>
          {t("dailyLog.thisMonth")}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted">{t("common.loading")}</p>
      ) : logs.length === 0 ? (
        <EmptyState icon={<BookOpen size={28} />} title={t("dailyLog.empty")} description={t("dailyLog.emptyDesc")} />
      ) : (
        <div className="daily-log-list">
          {logs.map((log) => (
            <article key={log.id} className="daily-log-card surface-card">
              <div className="daily-log-card-head">
                <div>
                  <h3 className="daily-log-card-date">
                    {parseDateKey(log.log_date).toLocaleDateString(locale, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <p className="daily-log-card-meta">
                    {log.worker_count > 0 && <span>{t("dailyLog.columns.workers")}: {log.worker_count}</span>}
                  </p>
                </div>
                <div className="table-actions-cell">
                  <button type="button" className="btn-icon" onClick={() => openEdit(log)} aria-label={t("common.edit")}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="btn-icon" onClick={() => void dailyLogService.remove(log.id).then(reload)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p className="daily-log-card-summary">{log.summary}</p>
              {log.photos.length > 0 && (() => {
                const images = log.photos.filter((photo) => {
                  const name = photo.original_name || photo.caption || "";
                  const url = photo.file_url ?? photo.image_url;
                  return url && isImageFile(name);
                });
                const files = log.photos.filter((photo) => {
                  const name = photo.original_name || photo.caption || "";
                  const url = photo.file_url ?? photo.image_url;
                  return !(url && isImageFile(name));
                });
                return (
                  <>
                    {images.length > 0 && (
                      <div className="daily-log-photo-grid">
                        {images.map((photo) => {
                          const url = photo.file_url ?? photo.image_url;
                          const name = photo.original_name || photo.caption || t("dailyLog.attachment");
                          return (
                            <a key={photo.id} href={url!} target="_blank" rel="noreferrer" className="daily-log-photo-thumb">
                              <img src={url!} alt={name} />
                            </a>
                          );
                        })}
                      </div>
                    )}
                    {files.length > 0 && (
                      <ul className="daily-log-attachments">
                        {files.map((photo) => {
                          const url = photo.file_url ?? photo.image_url;
                          const name = photo.original_name || photo.caption || t("dailyLog.attachment");
                          return (
                            <li key={photo.id}>
                              <a href={url ?? "#"} target="_blank" rel="noreferrer" className="daily-log-attachment">
                                <FileText size={18} className="daily-log-attachment-icon" aria-hidden />
                                <span className="daily-log-attachment-name" title={name}>{name}</span>
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                );
              })()}
            </article>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingLog(null);
          setAttachedPhotos([]);
          setPendingFiles([]);
        }}
        title={editingLog ? t("dailyLog.edit") : t("dailyLog.add")}
        className="modal-wide"
        footer={<Button type="submit" form="log-form" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>}
      >
        <form id="log-form" onSubmit={handleSave} className="form-stack">
          <Input
            label={t("dailyLog.columns.date")}
            type="date"
            value={form.log_date}
            onChange={(e) => setForm((p) => ({ ...p, log_date: e.target.value }))}
            required
            disabled={!!editingLog}
          />
          <Input label={t("dailyLog.columns.workers")} type="number" min={0} value={form.worker_count} onChange={(e) => setForm((p) => ({ ...p, worker_count: e.target.value }))} />
          <label className="form-label">
            <span className="form-label-text">{t("dailyLog.columns.summary")}</span>
            <textarea
              className="input textarea-native"
              rows={5}
              value={form.summary}
              onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
              placeholder={t("dailyLog.summaryPlaceholder")}
              required
            />
          </label>
          <div className="daily-log-file-row">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="sr-only"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                if (picked.length > 0) {
                  setPendingFiles((prev) => [...prev, ...picked]);
                }
                e.target.value = "";
              }}
            />
            <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()}>
              <FileText size={16} />
              {t("dailyLog.addFile")}
            </Button>
            <span className="form-hint daily-log-file-hint">{t("dailyLog.filesHint")}</span>
          </div>
          {(attachedPhotos.length > 0 || pendingFiles.length > 0) && (
            <div className="daily-log-modal-files">
              <span className="form-label-text">{t("dailyLog.attachedFiles")}</span>
              <ul className="daily-log-modal-file-list">
                {attachedPhotos.map((photo) => {
                  const name = photoDisplayName(photo);
                  const url = photo.file_url ?? photo.image_url;
                  return (
                    <li key={`saved-${photo.id}`} className="daily-log-modal-file-item">
                      {url && isImageFile(name) ? (
                        <img src={url} alt="" className="daily-log-modal-file-thumb" />
                      ) : (
                        <FileText size={18} className="daily-log-attachment-icon" aria-hidden />
                      )}
                      <span className="daily-log-attachment-name" title={name}>
                        {name}
                      </span>
                      <button
                        type="button"
                        className="btn-icon btn-icon-sm daily-log-modal-file-remove"
                        onClick={() => void handleDeletePhoto(photo.id)}
                        disabled={deletingPhotoId === photo.id}
                        aria-label={t("dailyLog.removeFile")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  );
                })}
                {pendingFiles.map((file, index) => (
                  <li key={`pending-${file.name}-${index}`} className="daily-log-modal-file-item is-pending">
                    <FileText size={18} className="daily-log-attachment-icon" aria-hidden />
                    <span className="daily-log-attachment-name" title={file.name}>
                      {file.name}
                    </span>
                    <span className="daily-log-modal-file-badge">{t("dailyLog.pendingUpload")}</span>
                    <button
                      type="button"
                      className="btn-icon btn-icon-sm daily-log-modal-file-remove"
                      onClick={() => removePendingFile(index)}
                      aria-label={t("dailyLog.removeFile")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
