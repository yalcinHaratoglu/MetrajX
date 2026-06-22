import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Camera, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { PageInfoTooltip } from "../components/ui/PageInfoTooltip";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { useSite } from "../hooks/useSite";
import { useSiteData } from "../hooks/useSiteData";
import { dailyLogService, type DailyLog } from "../services/dailyLogService";
import { toast } from "../lib/toast";

const emptyForm = () => ({
  log_date: new Date().toISOString().slice(0, 10),
  weather: "",
  summary: "",
  worker_count: "0",
});

export function GunlukRaporPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";
  const { selectedSiteId, sites } = useSite();
  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [todayDraftLoaded, setTodayDraftLoaded] = useState(false);

  const fetcher = useCallback(async (): Promise<DailyLog[]> => {
    if (!selectedSiteId) return [];
    return dailyLogService.list(selectedSiteId);
  }, [selectedSiteId]);

  const { data: logs, loading, reload } = useSiteData(selectedSiteId, fetcher, [] as DailyLog[]);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId) return;
    setSaving(true);
    try {
      const log = await dailyLogService.create({
        site_id: selectedSiteId,
        log_date: form.log_date,
        weather: form.weather,
        summary: form.summary,
        worker_count: Number(form.worker_count) || 0,
      });
      for (const file of photoFiles) {
        await dailyLogService.uploadPhoto(log.id, file);
      }
      setModalOpen(false);
      setForm(emptyForm());
      setPhotoFiles([]);
      toast.success(t("dailyLog.created"));
      await reload();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const photoPreviewUrls = useMemo(
    () => photoFiles.map((file) => URL.createObjectURL(file)),
    [photoFiles],
  );

  useEffect(
    () => () => {
      photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    },
    [photoPreviewUrls],
  );

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
        actions={<Button onClick={() => setModalOpen(true)}><Plus size={16} />{t("dailyLog.add")}</Button>}
      />

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
                  <h3 className="daily-log-card-date">{new Date(log.log_date).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h3>
                  <p className="daily-log-card-meta">
                    {log.weather && <span>{log.weather}</span>}
                    {log.worker_count > 0 && <span>{t("dailyLog.columns.workers")}: {log.worker_count}</span>}
                  </p>
                </div>
                <button type="button" className="btn-icon" onClick={() => void dailyLogService.remove(log.id).then(reload)}>
                  <Trash2 size={15} />
                </button>
              </div>
              <p className="daily-log-card-summary">{log.summary}</p>
              {log.photos.length > 0 && (
                <div className="daily-log-photo-grid">
                  {log.photos.map((photo) => (
                    <a key={photo.id} href={photo.image_url ?? "#"} target="_blank" rel="noreferrer" className="daily-log-photo-thumb">
                      {photo.image_url ? (
                        <img src={photo.image_url} alt={photo.caption || t("dailyLog.photoAlt")} />
                      ) : (
                        <Camera size={20} />
                      )}
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("dailyLog.add")}
        className="modal-wide"
        footer={<Button type="submit" form="log-form" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>}
      >
        <form id="log-form" onSubmit={handleCreate} className="form-stack">
          <Input label={t("dailyLog.columns.date")} type="date" value={form.log_date} onChange={(e) => setForm((p) => ({ ...p, log_date: e.target.value }))} required />
          <Input label={t("dailyLog.columns.weather")} value={form.weather} onChange={(e) => setForm((p) => ({ ...p, weather: e.target.value }))} placeholder={t("dailyLog.weatherPlaceholder")} />
          <Input label={t("dailyLog.columns.workers")} type="number" min={0} value={form.worker_count} onChange={(e) => setForm((p) => ({ ...p, worker_count: e.target.value }))} />
          <label className="form-label">
            <span className="form-label-text">{t("dailyLog.columns.summary")}</span>
            <textarea
              className="input-native textarea-native"
              rows={5}
              value={form.summary}
              onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
              placeholder={t("dailyLog.summaryPlaceholder")}
              required
            />
          </label>
          <div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
            />
            <Button type="button" variant="ghost" onClick={() => photoInputRef.current?.click()}>
              <Camera size={16} />
              {t("dailyLog.addPhoto")}
            </Button>
            <span className="form-hint">{t("dailyLog.photosHint")}</span>
          </div>
          {photoPreviewUrls.length > 0 && (
            <div className="daily-log-photo-grid">
              {photoPreviewUrls.map((url, index) => (
                <div key={url} className="daily-log-photo-thumb">
                  <img src={url} alt="" />
                  <span className="daily-log-photo-name">{photoFiles[index]?.name}</span>
                </div>
              ))}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
