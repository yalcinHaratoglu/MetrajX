import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, id, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="form-label">
      <span className="form-label-text">{label}</span>
      <input id={inputId} className={`input ${className}`.trim()} {...props} />
    </label>
  );
}
