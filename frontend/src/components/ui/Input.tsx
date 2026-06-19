import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, id, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        id={inputId}
        className={`rounded-lg border border-[rgb(var(--border))] bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary))]/40 ${className}`}
        {...props}
      />
    </label>
  );
}
