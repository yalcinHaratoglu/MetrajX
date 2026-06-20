import api from "./api";

export type SiteStatus = "planning" | "active" | "paused" | "completed";

export interface Site {
  id: number;
  name: string;
  code: string;
  address: string;
  status: SiteStatus;
  start_date: string | null;
  planned_end_date: string | null;
  budget_total: string | null;
  project_id: number | null;
  requirements_count: number;
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
  code?: string;
  address?: string;
  status?: SiteStatus;
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

  async remove(id: number): Promise<void> {
    await api.delete(`/sites/${id}/`);
  },
};
