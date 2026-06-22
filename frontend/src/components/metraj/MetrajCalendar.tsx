import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { MetrajOperation } from "../../services/metrajService";
import type { CalendarEvent } from "../../services/calendarService";
import {
  addDays,
  addMonths,
  addYears,
  formatTimeLabel,
  normalizeDateKey,
  parseDateKey,
  startOfWeek,
  toDateKey,
  type CalendarViewMode,
} from "./calendarUtils";

interface MetrajCalendarProps {
  operations: MetrajOperation[];
  events?: CalendarEvent[];
  readonly?: boolean;
  oneOpPerDay?: boolean;
  showItemDescription?: boolean;
  onSelectOperation?: (op: MetrajOperation) => void;
  onAddForDate?: (dateKey: string) => void;
  selectToday?: boolean;
  /** Takvimde görünen ay/yıl değişince (şantiye olayları filtresi için). month=0 yıl görünümü. */
  onVisibleMonthChange?: (year: number, month: number) => void;
}

function monthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

function OperationMeta({
  op,
  locale,
  showItem,
}: {
  op: MetrajOperation;
  locale: string;
  showItem?: boolean;
}) {
  const time = formatTimeLabel(op.scheduled_time, locale);
  return (
    <>
      <span className="font-medium">
        {op.title}
        {time ? <span className="metraj-calendar-event-time"> · {time}</span> : null}
      </span>
      <span className="text-xs text-muted">
        {showItem ? `${op.item_description} · ` : ""}
        {op.progress_percent}%
      </span>
    </>
  );
}

export function MetrajCalendar({
  operations,
  events = [],
  readonly = false,
  oneOpPerDay = false,
  showItemDescription = true,
  onSelectOperation,
  onAddForDate,
  selectToday = false,
  onVisibleMonthChange,
}: MetrajCalendarProps) {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<CalendarViewMode>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    selectToday ? toDateKey(new Date()) : null,
  );

  const [prevSelectToday, setPrevSelectToday] = useState(selectToday);
  if (selectToday !== prevSelectToday) {
    setPrevSelectToday(selectToday);
    if (selectToday) setSelectedDate(toDateKey(new Date()));
  }

  const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";

  useEffect(() => {
    if (!onVisibleMonthChange) return;
    if (view === "year") {
      onVisibleMonthChange(anchor.getFullYear(), 0);
      return;
    }
    onVisibleMonthChange(anchor.getFullYear(), anchor.getMonth() + 1);
  }, [anchor, view, onVisibleMonthChange]);

  const opsByDate = useMemo(() => {
    const map = new Map<string, MetrajOperation[]>();
    for (const op of operations) {
      const key = normalizeDateKey(op.scheduled_date);
      const list = map.get(key) ?? [];
      list.push(op);
      map.set(key, list);
    }
    return map;
  }, [operations]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = normalizeDateKey(ev.event_date);
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const monthKeysWithOps = useMemo(() => {
    const set = new Set<string>();
    for (const op of operations) set.add(normalizeDateKey(op.scheduled_date).slice(0, 7));
    return set;
  }, [operations]);

  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: "short" });
    });
  }, [locale]);

  const headerLabel = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(anchor);
      const end = addDays(start, 6);
      const sameMonth = start.getMonth() === end.getMonth();
      const startFmt = start.toLocaleDateString(locale, {
        day: "numeric",
        month: sameMonth ? undefined : "short",
      });
      const endFmt = end.toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return `${startFmt} – ${endFmt}`;
    }
    if (view === "year") return String(anchor.getFullYear());
    return anchor.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }, [view, anchor, locale]);

  const navigate = (direction: -1 | 1) => {
    const step = direction === 1 ? 1 : -1;
    if (view === "week") {
      setAnchor((prev) => addDays(prev, step * 7));
      return;
    }
    if (view === "year") {
      setAnchor((prev) => addYears(prev, step));
      return;
    }
    setAnchor((prev) => addMonths(prev, step));
  };

  const canAddOnDate = (dateKey: string) => {
    if (!onAddForDate || readonly) return false;
    if (oneOpPerDay && (opsByDate.get(dateKey)?.length ?? 0) > 0) return false;
    return true;
  };

  const renderDayCell = (day: Date, compact = false) => {
    const key = toDateKey(day);
    const dayOps = opsByDate.get(key) ?? [];
    const dayEvents = eventsByDate.get(key) ?? [];
    const hasPlanned = dayOps.some((o) => o.status === "planned");
    const hasDone = dayOps.some((o) => o.status === "done");
    const isSelected = selectedDate === key;
    const isToday = key === toDateKey(new Date());

    return (
      <button
        key={key}
        type="button"
        className={`metraj-calendar-day${isSelected ? " metraj-calendar-day-selected" : ""}${isToday ? " metraj-calendar-day-today" : ""}${compact ? " metraj-calendar-day-compact" : ""}`}
        onClick={() => {
          setSelectedDate(key);
          setAnchor(day);
        }}
      >
        <span>{day.getDate()}</span>
        {(dayOps.length > 0 || dayEvents.length > 0) && (
          <span className="metraj-calendar-dots">
            {hasPlanned && <span className="metraj-calendar-dot metraj-calendar-dot-planned" />}
            {hasDone && <span className="metraj-calendar-dot metraj-calendar-dot-done" />}
            {dayEvents.map((ev) => (
              <span key={ev.id} className="metraj-calendar-dot metraj-calendar-dot-event" />
            ))}
          </span>
        )}
      </button>
    );
  };

  const renderDayList = (dateKey: string) => {
    const selectedOps = opsByDate.get(dateKey) ?? [];
    const selectedEvents = eventsByDate.get(dateKey) ?? [];
    const isToday = dateKey === toDateKey(new Date());

    return (
      <div className="metraj-calendar-day-list">
        <p className="text-sm font-medium">
          {parseDateKey(dateKey).toLocaleDateString(locale, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        {selectedOps.length === 0 && selectedEvents.length === 0 ? (
          <div className="metraj-calendar-empty-row">
            <p className="text-sm text-muted">
              {t(isToday ? "metraj.calendar.noEventsToday" : "metraj.calendar.noEventsDay")}
            </p>
            {canAddOnDate(dateKey) && (
              <button
                type="button"
                className="btn-ghost btn-sm metraj-calendar-add-btn"
                onClick={() => onAddForDate?.(dateKey)}
              >
                <Plus size={14} />
                {t("metraj.calendar.add")}
              </button>
            )}
            {oneOpPerDay && !readonly && (opsByDate.get(dateKey)?.length ?? 0) > 0 && (
              <p className="text-xs text-muted">{t("metraj.operations.dateTaken")}</p>
            )}
          </div>
        ) : (
          <>
            <ul className="metraj-calendar-events">
              {selectedOps.map((op) => (
                <li key={op.id}>
                  {readonly && !onSelectOperation ? (
                    <div className={`metraj-calendar-event metraj-calendar-event-${op.status}`}>
                      <OperationMeta op={op} locale={locale} showItem={showItemDescription} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`metraj-calendar-event metraj-calendar-event-${op.status}${readonly ? " metraj-calendar-event-link" : ""}`}
                      onClick={() => onSelectOperation?.(op)}
                    >
                      <OperationMeta op={op} locale={locale} showItem={showItemDescription} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {selectedEvents.length > 0 && (
              <ul className="metraj-calendar-events metraj-calendar-site-events">
                {selectedEvents.map((ev) => (
                  <li key={ev.id}>
                    <div className="metraj-calendar-event metraj-calendar-event-site">
                      <span className="font-medium">{ev.title}</span>
                      {ev.event_time ? (
                        <span className="text-xs text-muted">{formatTimeLabel(ev.event_time, locale)}</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {canAddOnDate(dateKey) && (
              <div className="metraj-calendar-add-row">
                <button
                  type="button"
                  className="btn-ghost btn-sm metraj-calendar-add-btn"
                  onClick={() => onAddForDate?.(dateKey)}
                >
                  <Plus size={14} />
                  {t("metraj.calendar.add")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const activeDateKey = selectedDate ?? toDateKey(anchor);

  const viewModes: CalendarViewMode[] = ["week", "month", "year"];

  return (
    <div className={`metraj-calendar${readonly ? " metraj-calendar-readonly" : ""}`}>
      <div className="metraj-calendar-toolbar">
        <div className="metraj-calendar-nav">
          <button type="button" className="btn-icon" onClick={() => navigate(-1)} aria-label={t("common.pagination.previous")}>
            <ChevronLeft size={18} />
          </button>
          <span className="metraj-calendar-month">{headerLabel}</span>
          <button type="button" className="btn-icon" onClick={() => navigate(1)} aria-label={t("common.pagination.next")}>
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="metraj-calendar-view-modes" role="tablist" aria-label={t("metraj.calendar.viewModes")}>
          {viewModes.map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={view === mode}
              className={`metraj-calendar-view-btn${view === mode ? " is-active" : ""}`}
              onClick={() => setView(mode)}
            >
              {t(`metraj.calendar.views.${mode}`)}
            </button>
          ))}
        </div>
      </div>

      {view === "month" && (
        <div className="metraj-calendar-grid">
          {weekdayLabels.map((label) => (
            <div key={label} className="metraj-calendar-weekday">
              {label}
            </div>
          ))}
          {monthGrid(anchor.getFullYear(), anchor.getMonth())
            .flat()
            .map((day, idx) =>
              day ? renderDayCell(day) : <div key={`empty-${idx}`} className="metraj-calendar-day metraj-calendar-day-empty" />,
            )}
        </div>
      )}

      {view === "week" && (
        <div className="metraj-calendar-week-grid">
          {weekdayLabels.map((label) => (
            <div key={label} className="metraj-calendar-weekday">
              {label}
            </div>
          ))}
          {Array.from({ length: 7 }, (_, idx) => {
            const day = addDays(startOfWeek(anchor), idx);
            return renderDayCell(day, true);
          })}
        </div>
      )}

      {view === "year" && (
        <div className="metraj-calendar-year-grid">
          {Array.from({ length: 12 }, (_, month) => {
            const monthKey = `${anchor.getFullYear()}-${String(month + 1).padStart(2, "0")}`;
            const hasEvents = monthKeysWithOps.has(monthKey);
            const label = new Date(anchor.getFullYear(), month, 1).toLocaleDateString(locale, { month: "long" });
            return (
              <button
                key={monthKey}
                type="button"
                className={`metraj-calendar-year-month${hasEvents ? " has-events" : ""}`}
                onClick={() => {
                  setAnchor(new Date(anchor.getFullYear(), month, 1));
                  setView("month");
                }}
              >
                <span>{label}</span>
                {hasEvents && <span className="metraj-calendar-dot metraj-calendar-dot-planned" />}
              </button>
            );
          })}
        </div>
      )}

      {activeDateKey && renderDayList(activeDateKey)}

      <div className="metraj-calendar-legend">
        <span>
          <span className="metraj-calendar-dot metraj-calendar-dot-planned" /> {t("metraj.operations.planned")}
        </span>
        <span>
          <span className="metraj-calendar-dot metraj-calendar-dot-done" /> {t("metraj.operations.done")}
        </span>
      </div>
    </div>
  );
}
