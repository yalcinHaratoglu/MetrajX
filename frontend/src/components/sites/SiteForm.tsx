import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { settingsService, type TeamMember } from "../../services/settingsService";
import {
  siteService,
  type ProjectType,
  type Site,
  type SiteCurrency,
  type SiteStatus,
} from "../../services/siteService";
import {
  buildSitePayload,
  emptySiteForm,
  siteToForm,
  type SiteFormState,
} from "./siteFormShared";

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="site-form-section">
      <h3 className="site-form-section-title">{title}</h3>
      <div className="site-form-section-body">{children}</div>
    </section>
  );
}

interface SiteFormProps {
  site?: Site | null;
  formId: string;
  onSaved: (site: Site) => void;
  onSavingChange?: (saving: boolean) => void;
}

export function SiteForm({ site, formId, onSaved, onSavingChange }: SiteFormProps) {
  const { t } = useTranslation();
  const isEdit = Boolean(site);
  const [form, setForm] = useState<SiteFormState>(() =>
    site ? siteToForm(site) : emptySiteForm(),
  );
  const [managers, setManagers] = useState<TeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [prevSite, setPrevSite] = useState(site);
  if (site !== prevSite) {
    setPrevSite(site);
    setForm(site ? siteToForm(site) : emptySiteForm());
    setError(null);
  }

  useEffect(() => {
    void settingsService
      .getTeam()
      .then((team) =>
        setManagers(team.filter((m) => m.role === "site_manager" && m.is_active)),
      )
      .catch(() => setManagers([]));
  }, []);

  const toggleManager = (id: number) => {
    setForm((prev) => ({
      ...prev,
      manager_ids: prev.manager_ids.includes(id)
        ? prev.manager_ids.filter((x) => x !== id)
        : [...prev.manager_ids, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;
    onSavingChange?.(true);
    setError(null);
    try {
      const payload = buildSitePayload(form);
      const saved = isEdit && site
        ? await siteService.update(site.id, payload)
        : await siteService.create(payload);
      onSaved(saved);
    } catch {
      setError(t("common.error"));
    } finally {
      onSavingChange?.(false);
    }
  };

  const projectTypeOptions = [
    { value: "", label: t("sites.form.projectTypePlaceholder") },
    { value: "residential", label: t("sites.projectType.residential") },
    { value: "commercial", label: t("sites.projectType.commercial") },
    { value: "industrial", label: t("sites.projectType.industrial") },
    { value: "infrastructure", label: t("sites.projectType.infrastructure") },
  ];

  const statusOptions = [
    { value: "planning", label: t("sites.status.planning") },
    { value: "active", label: t("sites.status.active") },
    { value: "paused", label: t("sites.status.paused") },
    { value: "completed", label: t("sites.status.completed") },
  ];

  const currencyOptions = [
    { value: "TRY", label: "TRY (₺)" },
    { value: "USD", label: "USD ($)" },
    { value: "EUR", label: "EUR (€)" },
  ];

  return (
    <form id={formId} onSubmit={handleSubmit} className="form-stack site-create-form">
      {error && <p className="text-sm text-error">{error}</p>}

      <FormSection title={t("sites.form.sections.basic")}>
        <Input
          label={t("sites.name")}
          name="name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder={t("sites.namePlaceholder")}
          autoFocus={!isEdit}
          required
        />
        <Input
          label={t("sites.code")}
          name="code"
          value={form.code}
          onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
          placeholder={t("sites.codePlaceholder")}
          required
        />
        <Select
          label={t("sites.form.projectType")}
          value={form.project_type}
          onChange={(val) => setForm((p) => ({ ...p, project_type: val as ProjectType }))}
          options={projectTypeOptions}
        />
      </FormSection>

      <FormSection title={t("sites.form.sections.management")}>
        <Input
          label={t("sites.form.clientOwner")}
          value={form.client_owner}
          onChange={(e) => setForm((p) => ({ ...p, client_owner: e.target.value }))}
          placeholder={t("sites.form.clientOwnerPlaceholder")}
        />
        <div className="form-label">
          <span className="form-label-text">{t("sites.form.managers")}</span>
          {managers.length === 0 ? (
            <p className="text-sm text-muted">{t("sites.form.noManagers")}</p>
          ) : (
            <ul className="site-manager-checklist">
              {managers.map((manager) => {
                const label =
                  `${manager.first_name} ${manager.last_name}`.trim() || manager.email;
                const checked = form.manager_ids.includes(manager.id);
                return (
                  <li key={manager.id}>
                    <label className="site-manager-check">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleManager(manager.id)}
                      />
                      <span>{label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </FormSection>

      <FormSection title={t("sites.form.sections.location")}>
        <label className="form-label">
          <span className="form-label-text">{t("sites.form.address")}</span>
          <textarea
            className="input site-form-textarea"
            rows={2}
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            placeholder={t("sites.form.addressPlaceholder")}
          />
        </label>
        <div className="site-form-row">
          <Input
            label={t("sites.form.city")}
            value={form.city}
            onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
            placeholder={t("sites.form.cityPlaceholder")}
          />
          <Input
            label={t("sites.form.parcelNumber")}
            value={form.parcel_number}
            onChange={(e) => setForm((p) => ({ ...p, parcel_number: e.target.value }))}
            placeholder={t("sites.form.parcelPlaceholder")}
          />
        </div>
      </FormSection>

      <FormSection title={t("sites.form.sections.financial")}>
        <div className="site-form-row">
          <Input
            label={t("sites.form.budget")}
            type="number"
            min={0}
            step="0.01"
            value={form.budget_total}
            onChange={(e) => setForm((p) => ({ ...p, budget_total: e.target.value }))}
            placeholder="15000000"
          />
          <Select
            label={t("sites.form.currency")}
            value={form.currency}
            onChange={(val) => setForm((p) => ({ ...p, currency: val as SiteCurrency }))}
            options={currencyOptions}
          />
        </div>
      </FormSection>

      <FormSection title={t("sites.form.sections.schedule")}>
        <Select
          label={t("sites.form.status")}
          value={form.status}
          onChange={(val) => setForm((p) => ({ ...p, status: val as SiteStatus }))}
          options={statusOptions}
        />
        <div className="site-form-row">
          <Input
            label={t("sites.form.startDate")}
            type="date"
            value={form.start_date}
            onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
          />
          <Input
            label={t("sites.form.endDate")}
            type="date"
            value={form.planned_end_date}
            onChange={(e) => setForm((p) => ({ ...p, planned_end_date: e.target.value }))}
          />
        </div>
      </FormSection>
    </form>
  );
}
