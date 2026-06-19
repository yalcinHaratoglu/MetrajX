import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { settingsService } from "../../services/settingsService";

export function ProfileForm() {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await settingsService.updateProfile(form);
      await refreshProfile();
      setMessage(t("settings.profile.success"));
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form key={user.id} onSubmit={handleSubmit} className="form-stack">
      <label className="form-label">
        <span className="form-label-text">{t("auth.email")}</span>
        <input className="input" value={user.email} disabled readOnly />
      </label>
      <Input
        label={t("auth.firstName")}
        name="first_name"
        defaultValue={user.first_name}
        onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
        required
      />
      <Input
        label={t("auth.lastName")}
        name="last_name"
        defaultValue={user.last_name}
        onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
        required
      />
      {message && <p className="text-success">{message}</p>}
      {error && <p className="text-error">{error}</p>}
      <div>
        <Button type="submit" disabled={loading}>
          {loading ? t("common.loading") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
