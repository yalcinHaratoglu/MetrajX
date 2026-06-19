import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, id, className = "", children, ...props }: SelectProps) {
  const selectId = id ?? props.name;

  if (label) {
    return (
      <label className="form-label">
        <span className="form-label-text">{label}</span>
        <select id={selectId} className={`select ${className}`.trim()} {...props}>
          {children}
        </select>
      </label>
    );
  }

  return (
    <select id={selectId} className={`select ${className}`.trim()} {...props}>
      {children}
    </select>
  );
}
