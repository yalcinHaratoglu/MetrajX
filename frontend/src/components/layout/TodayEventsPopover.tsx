import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, CalendarDays } from "lucide-react";
import { toDateKey } from "../metraj/calendarUtils";
import { useSite } from "../../hooks/useSite";
import { useSiteData } from "../../hooks/useSiteData";
import { calendarService, type CalendarEvent } from "../../services/calendarService";
import type { MetrajOperation } from "../../services/metrajService";

type TodayItem =
  | { kind: "event"; id: number; title: string; time: string | null }
  | { kind: "operation"; id: number; title: string; time: string | null; status: string };

function buildTodayItems(
  events: CalendarEvent[],
  operations: MetrajOperation[],
  todayKey: string,
): TodayItem[] {
  const todayEvents: TodayItem[] = events
    .filter((ev) => ev.event_date.slice(0, 10) === todayKey)
    .map((ev) => ({
      kind: "event" as const,
      id: ev.id,
      title: ev.title,
      time: ev.event_time?.slice(0, 5) ?? null,
    }));
  const todayOps: TodayItem[] = operations
    .filter((op) => op.scheduled_date.slice(0, 10) === todayKey)
    .map((op) => ({
      kind: "operation" as const,
      id: op.id,
      title: op.title,
      time: op.scheduled_time?.slice(0, 5) ?? null,
      status: op.status,
    }));
  return [...todayEvents, ...todayOps];
}

export function TodayEventsPopover() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";
  const { selectedSiteId } = useSite();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const todayKey = toDateKey(new Date());

  const fetcher = useCallback(async (): Promise<TodayItem[]> => {
    if (!selectedSiteId) return [];
    const data = await calendarService.unified(selectedSiteId);
    return buildTodayItems(data.events, data.operations, todayKey);
  }, [selectedSiteId, todayKey]);

  const fetchKey = selectedSiteId ? `today-events-${selectedSiteId}-${todayKey}` : null;
  const { data: items, loading, reload } = useSiteData(fetchKey, fetcher, [] as TodayItem[]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const count = items.length;

  return (
    <div className="header-notifications" ref={panelRef}>
      <button
        type="button"
        className={`btn-icon header-notifications-btn${count > 0 ? " has-badge" : ""}`}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void reload();
        }}
        aria-label={t("header.notifications")}
        aria-expanded={open}
      >
        <Bell size={18} />
        {count > 0 && <span className="header-notifications-badge">{count > 9 ? "9+" : count}</span>}
      </button>

      {open && (
        <div className="header-notifications-panel surface-card">
          <div className="header-notifications-head">
            <h3 className="header-notifications-title">{t("header.todayEvents")}</h3>
            <span className="text-xs text-muted">
              {new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-muted header-notifications-empty">{t("common.loading")}</p>
          ) : !selectedSiteId ? (
            <p className="text-sm text-muted header-notifications-empty">{t("header.selectSiteForEvents")}</p>
          ) : count === 0 ? (
            <p className="text-sm text-muted header-notifications-empty">{t("header.noEventsToday")}</p>
          ) : (
            <ul className="header-notifications-list">
              {items.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="header-notifications-item">
                  <span className="header-notifications-item-icon" aria-hidden>
                    <CalendarDays size={14} />
                  </span>
                  <div className="header-notifications-item-body">
                    <span className="header-notifications-item-title">{item.title}</span>
                    <span className="text-xs text-muted">
                      {item.kind === "operation"
                        ? t(`metraj.operations.${item.status}`)
                        : t("calendar.siteEvents")}
                      {item.time ? ` · ${item.time}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Link to="/takvim" className="header-notifications-link" onClick={() => setOpen(false)}>
            {t("header.viewCalendar")}
          </Link>
        </div>
      )}
    </div>
  );
}
