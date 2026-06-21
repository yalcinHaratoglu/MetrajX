import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  parseDateKey,
  toDateKey,
} from "../metraj/calendarUtils";

interface DatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

function monthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DatePicker({ label, value, onChange, required }: DatePickerProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => {
    if (value) return parseDateKey(value);
    return new Date();
  });

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const displayValue = value
    ? parseDateKey(value).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    : t("metraj.calendar.pickDate");

  const monthLabel = cursor.toLocaleDateString(locale, { month: "long", year: "numeric" });

  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: "short" });
    });
  }, [locale]);

  const todayKey = toDateKey(new Date());

  const pick = (key: string) => {
    onChange(key);
    setOpen(false);
  };

  const toggleOpen = () => {
    if (!open) setCursor(value ? parseDateKey(value) : new Date());
    setOpen(!open);
  };

  return (
    <label className="form-label">
      <span className="form-label-text">
        {label}
        {required && <span className="form-label-required"> *</span>}
      </span>
      <div ref={rootRef} className="picker-field">
        <button
          type="button"
          className="picker-trigger"
          onClick={toggleOpen}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <CalendarDays size={16} className="picker-trigger-icon" aria-hidden />
          <span className={`picker-trigger-value${!value ? " is-placeholder" : ""}`}>
            {displayValue}
          </span>
        </button>

        {open && (
          <div className="picker-popover picker-popover-date" role="dialog">
            <div className="picker-calendar-header">
              <button
                type="button"
                className="btn-icon"
                onClick={() => setCursor((prev) => addMonths(prev, -1))}
                aria-label={t("common.pagination.previous")}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="picker-calendar-month">{monthLabel}</span>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setCursor((prev) => addMonths(prev, 1))}
                aria-label={t("common.pagination.next")}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="picker-calendar-grid">
              {weekdayLabels.map((wd) => (
                <div key={wd} className="picker-calendar-weekday">
                  {wd}
                </div>
              ))}
              {monthCells(cursor.getFullYear(), cursor.getMonth()).map((day, idx) => {
                if (!day) {
                  return <div key={`e-${idx}`} className="picker-calendar-day picker-calendar-day-empty" />;
                }
                const key = toDateKey(day);
                const isSelected = value === key;
                const isToday = key === todayKey;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`picker-calendar-day${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
                    onClick={() => pick(key)}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="picker-popover-footer">
              {!required && (
                <button type="button" className="picker-footer-btn" onClick={() => onChange("")}>
                  {t("metraj.calendar.clear")}
                </button>
              )}
              <button type="button" className="picker-footer-btn" onClick={() => pick(todayKey)}>
                {t("metraj.calendar.today")}
              </button>
            </div>
          </div>
        )}
      </div>
    </label>
  );
}
