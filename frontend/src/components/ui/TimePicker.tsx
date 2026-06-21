import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";

interface TimePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function TimePicker({ label, value, onChange }: TimePickerProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const [hour, minute] = value ? value.split(":").map(Number) : [null, null];

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

  const displayValue = useMemo(() => {
    if (!value) return t("metraj.calendar.pickTime");
    const d = new Date(2000, 0, 1, hour ?? 0, minute ?? 0);
    return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }, [value, hour, minute, locale, t]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 5), []);

  const setTime = (h: number, m: number) => {
    onChange(`${pad(h)}:${pad(m)}`);
  };

  return (
    <label className="form-label">
      <span className="form-label-text">{label}</span>
      <div ref={rootRef} className="picker-field">
        <button
          type="button"
          className="picker-trigger"
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <Clock size={16} className="picker-trigger-icon" aria-hidden />
          <span className={`picker-trigger-value${!value ? " is-placeholder" : ""}`}>
            {displayValue}
          </span>
        </button>

        {open && (
          <div className="picker-popover picker-popover-time" role="dialog">
            <div className="picker-time-columns">
              <div className="picker-time-col">
                <p className="picker-time-col-label">{t("metraj.calendar.hour")}</p>
                <ul className="picker-time-list">
                  {hours.map((h) => (
                    <li key={h}>
                      <button
                        type="button"
                        className={`picker-time-option${hour === h ? " is-selected" : ""}`}
                        onClick={() => setTime(h, minute ?? 0)}
                      >
                        {pad(h)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="picker-time-col">
                <p className="picker-time-col-label">{t("metraj.calendar.minute")}</p>
                <ul className="picker-time-list">
                  {minutes.map((m) => (
                    <li key={m}>
                      <button
                        type="button"
                        className={`picker-time-option${minute === m ? " is-selected" : ""}`}
                        onClick={() => setTime(hour ?? 9, m)}
                      >
                        {pad(m)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="picker-popover-footer">
              <button type="button" className="picker-footer-btn" onClick={() => onChange("")}>
                {t("metraj.calendar.clear")}
              </button>
            </div>
          </div>
        )}
      </div>
    </label>
  );
}
