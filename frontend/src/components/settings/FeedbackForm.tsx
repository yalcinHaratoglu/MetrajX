import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { settingsService } from "../../services/settingsService";

export function FeedbackForm() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ subject: "", message: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await settingsService.sendFeedback(form.subject, form.message);
      setForm({ subject: "", message: "" });
      setMessage(t("settings.feedback.success"));
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-stack">
      <Input
        label={t("settings.feedback.subject")}
        value={form.subject}
        onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
        required
      />
      <label className="form-label">
        <span className="form-label-text">{t("settings.feedback.message")}</span>
        <textarea
          className="input min-h-32 resize-y"
          value={form.message}
          onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
          required
        />
      </label>
      {message && <p className="text-success">{message}</p>}
      {error && <p className="text-error">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? t("common.loading") : t("common.submit")}
      </Button>
    </form>
  );
}
