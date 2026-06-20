export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  type: ToastType;
  text: string;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let counter = 0;
const listeners = new Set<Listener>();

function emit() {
  const snapshot = [...toasts];
  listeners.forEach((listener) => listener(snapshot));
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener([...toasts]);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissToast(id: number) {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

export function pushToast(type: ToastType, text: string, timeout = 5000): number {
  const id = ++counter;
  toasts = [...toasts, { id, type, text }];
  emit();
  if (timeout > 0) {
    window.setTimeout(() => dismissToast(id), timeout);
  }
  return id;
}

export const toast = {
  success: (text: string) => pushToast("success", text),
  error: (text: string) => pushToast("error", text),
  info: (text: string) => pushToast("info", text),
};
