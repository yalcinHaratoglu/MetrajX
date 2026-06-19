import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { settingsService } from "../../services/settingsService";

export function CompanyForm() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", tax_number: "", address: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const company = await settingsService.getCompany();
        setForm({
          name: company.name ?? "",
          tax_number: company.tax_number ?? "",
          address: company.address ?? "",
        });
      } catch {
        // Company may not exist yet
      }
    };
    void load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await settingsService.updateCompany(form);
      setMessage(t("settings.company.success"));
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-stack">
      <Input
        label={t("settings.company.name")}
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        required
      />
      <Input
        label={t("settings.company.taxNumber")}
        value={form.tax_number}
        onChange={(e) => setForm((p) => ({ ...p, tax_number: e.target.value }))}
      />
      <label className="form-label">
        <span className="form-label-text">{t("settings.company.address")}</span>
        <textarea
          className="input min-h-24 resize-y"
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
        />
      </label>
      {message && <p className="text-success">{message}</p>}
      {error && <p className="text-error">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? t("common.loading") : t("common.save")}
      </Button>
    </form>
  );
}
