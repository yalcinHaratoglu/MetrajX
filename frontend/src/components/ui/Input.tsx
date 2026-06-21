import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  requiredMark?: boolean;
}

export function Input({ label, id, className = "", requiredMark, required, type, ...props }: InputProps) {
  const inputId = id ?? props.name;
  const showRequired = requiredMark ?? required;
  const typeClass =
    type === "date" ? "input-native-date" : type === "time" ? "input-native-time" : "";
  const inputClass = ["input", typeClass, className].filter(Boolean).join(" ");

  return (
    <label className="form-label">
      <span className="form-label-text">
        {label}
        {showRequired && <span className="form-label-required"> *</span>}
      </span>
      <input id={inputId} type={type} className={inputClass} required={required} {...props} />
    </label>
  );
}
