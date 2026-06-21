import type { NewSite, ProjectType, Site, SiteCurrency, SiteStatus } from "../../services/siteService";

export type SiteFormState = {
  name: string;
  code: string;
  project_type: ProjectType;
  manager_ids: number[];
  client_owner: string;
  address: string;
  city: string;
  parcel_number: string;
  budget_total: string;
  currency: SiteCurrency;
  start_date: string;
  planned_end_date: string;
  status: SiteStatus;
};

export const emptySiteForm = (): SiteFormState => ({
  name: "",
  code: "",
  project_type: "",
  manager_ids: [],
  client_owner: "",
  address: "",
  city: "",
  parcel_number: "",
  budget_total: "",
  currency: "TRY",
  start_date: "",
  planned_end_date: "",
  status: "active",
});

export function siteToForm(site: Site): SiteFormState {
  return {
    name: site.name,
    code: site.code,
    project_type: site.project_type || "",
    manager_ids: site.manager_ids ?? [],
    client_owner: site.client_owner ?? "",
    address: site.address ?? "",
    city: site.city ?? "",
    parcel_number: site.parcel_number ?? "",
    budget_total: site.budget_total ?? "",
    currency: site.currency ?? "TRY",
    start_date: site.start_date ?? "",
    planned_end_date: site.planned_end_date ?? "",
    status: site.status,
  };
}

export function buildSitePayload(form: SiteFormState): NewSite {
  return {
    name: form.name.trim(),
    code: form.code.trim(),
    status: form.status,
    currency: form.currency,
    manager_ids: form.manager_ids,
    project_type: form.project_type || undefined,
    client_owner: form.client_owner.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    parcel_number: form.parcel_number.trim(),
    budget_total: form.budget_total.trim() || undefined,
    start_date: form.start_date || undefined,
    planned_end_date: form.planned_end_date || undefined,
  };
}
