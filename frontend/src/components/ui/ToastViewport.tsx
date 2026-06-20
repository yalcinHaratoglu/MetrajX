import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { dismissToast, subscribeToasts, type ToastItem } from "../../lib/toast";

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-viewport">
      {toasts.map((item) => {
        const Icon = ICONS[item.type];
        return (
          <div key={item.id} className={`toast toast-${item.type}`} role="alert">
            <Icon size={18} className="toast-icon" />
            <span className="toast-text">{item.text}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismissToast(item.id)}
              aria-label="close"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
