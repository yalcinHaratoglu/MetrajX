import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface DropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  label?: string;
  className?: string;
  ariaLabel?: string;
}

export function Dropdown<T extends string>({
  value,
  onChange,
  options,
  label,
  className = "",
  ariaLabel,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const trigger = (
    <div ref={rootRef} className={`dropdown ${className}`.trim()}>
      <button
        type="button"
        className="dropdown-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? label}
      >
        {current?.icon && <span className="dropdown-trigger-icon">{current.icon}</span>}
        <span className="dropdown-label">{current?.label}</span>
        <ChevronDown size={16} className={`dropdown-chevron ${open ? "is-open" : ""}`} />
      </button>

      {open && (
        <ul className="dropdown-menu" role="listbox">
          {options.map((option) => {
            const isActive = value === option.value;
            return (
              <li key={option.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={`dropdown-option ${isActive ? "is-active" : ""}`}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.icon && <span className="dropdown-option-icon">{option.icon}</span>}
                  <span>{option.label}</span>
                  {isActive && <Check size={16} className="dropdown-check" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (label) {
    return (
      <label className="form-label">
        <span className="form-label-text">{label}</span>
        {trigger}
      </label>
    );
  }

  return trigger;
}
