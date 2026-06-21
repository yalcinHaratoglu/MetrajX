import api from "./api";

export type SiteStatus = "planning" | "active" | "paused" | "completed";
export type ProjectType = "residential" | "commercial" | "industrial" | "infrastructure" | "";
export type SiteCurrency = "TRY" | "USD" | "EUR";

export interface Site {
  id: number;
  name: string;
  code: string;
  project_type: ProjectType;
  client_owner: string;
  address: string;
  city: string;
  parcel_number: string;
  status: SiteStatus;
  start_date: string | null;
  planned_end_date: string | null;
  budget_total: string | null;
  currency: SiteCurrency;
  manager_ids: number[];
  manager_names: string[];
  project_id: number | null;
  requirements_count: number;
  metraj_item_count: number;
  metraj_average_progress: number | null;
  created_at: string;
  updated_at: string;
}

export interface SiteSummary {
  id: number;
  name: string;
  code: string;
  status: SiteStatus;
}

export interface NewSite {
  name: string;
  code: string;
  project_type?: ProjectType;
  client_owner?: string;
  address?: string;
  city?: string;
  parcel_number?: string;
  status?: SiteStatus;
  start_date?: string;
  planned_end_date?: string;
  budget_total?: string;
  currency?: SiteCurrency;
  manager_ids?: number[];
}

export const siteService = {
  async list(): Promise<Site[]> {
    const response = await api.get<Site[]>("/sites/");
    return response.data;
  },

  async mine(): Promise<SiteSummary[]> {
    const response = await api.get<SiteSummary[]>("/sites/mine/");
    return response.data;
  },

  async get(id: number): Promise<Site> {
    const response = await api.get<Site>(`/sites/${id}/`);
    return response.data;
  },

  async create(data: NewSite): Promise<Site> {
    const response = await api.post<Site>("/sites/", data);
    return response.data;
  },

  async update(id: number, data: Partial<NewSite>): Promise<Site> {
    const response = await api.patch<Site>(`/sites/${id}/`, data);
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/sites/${id}/`);
  },
};

export const CURRENCY_SYMBOLS: Record<SiteCurrency, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
};
