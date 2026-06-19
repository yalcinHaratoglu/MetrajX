import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { settingsService } from "../../services/settingsService";

export function PasswordForm() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (form.new_password !== form.confirm_password) {
      setError(t("settings.password.mismatch"));
      return;
    }

    setLoading(true);
    try {
      await settingsService.changePassword(form.current_password, form.new_password);
      setForm({ current_password: "", new_password: "", confirm_password: "" });
      setMessage(t("settings.password.success"));
    } catch {
      setError(t("settings.password.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-stack">
      <Input
        label={t("settings.password.current")}
        type="password"
        value={form.current_password}
        onChange={(e) => setForm((p) => ({ ...p, current_password: e.target.value }))}
        required
      />
      <Input
        label={t("settings.password.new")}
        type="password"
        value={form.new_password}
        onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))}
        required
        minLength={8}
      />
      <Input
        label={t("settings.password.confirm")}
        type="password"
        value={form.confirm_password}
        onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))}
        required
        minLength={8}
      />
      {message && <p className="text-success">{message}</p>}
      {error && <p className="text-error">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? t("common.loading") : t("common.save")}
      </Button>
    </form>
  );
}
