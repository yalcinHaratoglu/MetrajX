import { isAxiosError } from "axios";
import i18n from "../i18n";

/** DRF hata yanıtlarından okunabilir bir mesaj çıkarır. */
export function getApiErrorMessage(error: unknown, fallback?: string): string {
  const fallbackText = fallback ?? i18n.t("common.error");

  if (!isAxiosError(error)) {
    return fallbackText;
  }

  if (!error.response) {
    return i18n.t("common.networkError");
  }

  const data = error.response.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (typeof record.detail === "string") {
      return record.detail;
    }

    const firstValue = Object.values(record)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }
    if (typeof firstValue === "string") {
      return firstValue;
    }
  }

  return fallbackText;
}
