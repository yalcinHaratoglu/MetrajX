import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Clock3, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { MetrajCalendarPanel } from "../components/metraj/MetrajCalendarPanel";
import { PageHeader } from "../components/layout/PageHeader";
import { PageInfoTooltip } from "../components/ui/PageInfoTooltip";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { useSite } from "../hooks/useSite";
import { useSiteData } from "../hooks/useSiteData";
import { calendarService, type CalendarEvent, type UnifiedCalendar } from "../services/calendarService";
import { toast } from "../lib/toast";

const EVENT_TYPE_ICONS: Record<string, typeof CalendarDays> = {
  concrete: CalendarDays,
  delivery: MapPin,
  deadline: Clock3,
  meeting: CalendarDays,
  other: CalendarDays,
};

const EVENT_TYPE_CLASS: Record<string, string> = {
  concrete: "is-concrete",
  delivery: "is-delivery",
  deadline: "is-deadline",
  meeting: "is-meeting",
  other: "is-other",
};

const emptyForm = () => ({
  title: "",
  description: "",
  event_date: new Date().toISOString().slice(0, 10),
  event_time: "",
  event_type: "other",
});

const emptyCalendar: UnifiedCalendar = { operations: [], events: [] };

export function TakvimPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";
  const { selectedSiteId, sites } = useSite();
  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetcher = useCallback(async (): Promise<UnifiedCalendar> => {
    if (!selectedSiteId) return emptyCalendar;
    return calendarService.unified(selectedSiteId);
  }, [selectedSiteId]);

  const { data, loading, reload } = useSiteData(selectedSiteId, fetcher, emptyCalendar);
  const { operations, events } = data;

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => b.event_date.localeCompare(a.event_date) || (a.event_time ?? "").localeCompare(b.event_time ?? "")),
    [events],
  );

  const openCreate = () => {
    setEditingEvent(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setForm({
      title: ev.title,
      description: ev.description,
      event_date: ev.event_date,
      event_time: ev.event_time?.slice(0, 5) ?? "",
      event_type: ev.event_type,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId) return;
    try {
      if (editingEvent) {
        await calendarService.updateEvent(editingEvent.id, {
          title: form.title,
          description: form.description,
          event_date: form.event_date,
          event_time: form.event_time || null,
          event_type: form.event_type,
        });
        toast.success(t("calendar.updated"));
      } else {
        await calendarService.createEvent({
          site_id: selectedSiteId,
          title: form.title,
          description: form.description,
          event_date: form.event_date,
          event_time: form.event_time || null,
          event_type: form.event_type,
        });
        toast.success(t("calendar.created"));
      }
      setModalOpen(false);
      setEditingEvent(null);
      setForm(emptyForm());
      await reload();
    } catch {
      toast.error(t("common.error"));
    }
  };

  if (!selectedSiteId) {
    return (
      <div className="page-stack dashboard-page">
        <PageHeader title={t("calendar.title")} subtitle={t("calendar.subtitle")} />
        <EmptyState icon={<CalendarDays size={28} />} title={t("calendar.selectSiteTitle")} description={t("calendar.selectSiteDesc")} />
      </div>
    );
  }

  const eventTypes = ["concrete", "delivery", "deadline", "meeting", "other"];

  return (
    <div className="page-stack dashboard-page">
      <PageHeader
        title={
          <span className="page-header-with-info">
            {t("calendar.title")}
            <PageInfoTooltip text={t("calendar.info")} />
          </span>
        }
        subtitle={selectedSite?.name}
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} />
            {t("calendar.addEvent")}
          </Button>
        }
      />

      <MetrajCalendarPanel
        operations={operations}
        events={events}
        loading={loading}
        readonly
        selectToday
        title={t("calendar.metrajOps")}
        description={t("calendar.metrajOpsDesc")}
      />

      <section className="site-events-panel surface-card">
        <div className="site-events-panel-head">
          <div>
            <h2 className="detail-section-title">{t("calendar.siteEvents")}</h2>
            <p className="site-events-panel-desc">{t("calendar.siteEventsDesc")}</p>
          </div>
          <span className="site-events-count">{sortedEvents.length}</span>
        </div>

        {loading ? (
          <p className="text-muted">{t("common.loading")}</p>
        ) : sortedEvents.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={28} />}
            title={t("calendar.noEventsTitle")}
            description={t("calendar.noEvents")}
            action={
              <Button onClick={openCreate}>
                <Plus size={16} />
                {t("calendar.addEvent")}
              </Button>
            }
          />
        ) : (
          <div className="site-events-grid">
            {sortedEvents.map((ev) => {
              const Icon = EVENT_TYPE_ICONS[ev.event_type] ?? CalendarDays;
              return (
                <article key={ev.id} className={`site-event-card ${EVENT_TYPE_CLASS[ev.event_type] ?? ""}`}>
                  <div className="site-event-card-accent" aria-hidden />
                  <div className="site-event-card-icon">
                    <Icon size={18} />
                  </div>
                  <div className="site-event-card-body">
                    <div className="site-event-card-top">
                      <span className="site-event-type">{t(`calendar.types.${ev.event_type}`)}</span>
                      <div className="table-actions-cell">
                        <button type="button" className="btn-icon" onClick={() => openEdit(ev)}>
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="btn-icon" onClick={() => void calendarService.deleteEvent(ev.id).then(reload)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <h3 className="site-event-title">{ev.title}</h3>
                    <p className="site-event-date">
                      {new Date(ev.event_date).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                      {ev.event_time ? ` · ${ev.event_time.slice(0, 5)}` : ""}
                    </p>
                    {ev.description && <p className="site-event-desc">{ev.description}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEvent(null);
        }}
        title={editingEvent ? t("calendar.editEvent") : t("calendar.addEvent")}
        className="modal-wide"
        footer={<Button type="submit" form="event-form">{t("common.save")}</Button>}
      >
        <form id="event-form" onSubmit={handleSave} className="form-stack">
          <Input label={t("calendar.columns.title")} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
          <Input label={t("calendar.columns.date")} type="date" value={form.event_date} onChange={(e) => setForm((p) => ({ ...p, event_date: e.target.value }))} required />
          <Input label={t("calendar.columns.time")} type="time" value={form.event_time} onChange={(e) => setForm((p) => ({ ...p, event_time: e.target.value }))} />
          <Select
            label={t("calendar.columns.type")}
            value={form.event_type}
            onChange={(v) => setForm((p) => ({ ...p, event_type: v }))}
            options={eventTypes.map((type) => ({ value: type, label: t(`calendar.types.${type}`) }))}
          />
          <Input label={t("metraj.columns.notes")} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </form>
      </Modal>
    </div>
  );
}
