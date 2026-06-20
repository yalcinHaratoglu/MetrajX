import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function PasswordInput({ label, id, className = "", ...props }: PasswordInputProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const inputId = id ?? props.name;

  return (
    <label className="form-label">
      <span className="form-label-text">{label}</span>
      <div className="password-input-wrap">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className={`input password-input ${className}`.trim()}
          {...props}
        />
        <button
          type="button"
          className="password-input-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}
