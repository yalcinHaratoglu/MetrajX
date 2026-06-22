import api from "./api";

export interface DailyLogPhoto {
  id: number;
  caption: string;
  original_name: string;
  file_url: string | null;
  image_url: string | null;
  uploaded_at: string;
}

export interface DailyLog {
  id: number;
  site: number;
  log_date: string;
  weather: string;
  summary: string;
  worker_count: number;
  photos: DailyLogPhoto[];
  created_by_name: string;
  created_at: string;
}

export interface Asset {
  id: number;
  site: number;
  name: string;
  asset_type: string;
  serial_number: string;
  status: "available" | "assigned" | "maintenance" | "retired";
  assigned_to: string;
  purchase_date: string | null;
  notes: string;
  created_at: string;
}

export const dailyLogService = {
  async list(siteId: number, dateFrom?: string, dateTo?: string) {
    const { data } = await api.get<DailyLog[]>("/daily-logs/", {
      params: {
        site_id: siteId,
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
      },
    });
    return data;
  },

  async getToday(siteId: number) {
    const { data } = await api.get<DailyLog>("/daily-logs/today/", { params: { site_id: siteId } });
    return data;
  },

  async create(payload: {
    site_id: number;
    log_date: string;
    weather?: string;
    summary: string;
    worker_count?: number;
  }) {
    const { data } = await api.post<DailyLog>("/daily-logs/", payload);
    return data;
  },

  async update(
    id: number,
    payload: Partial<{
      log_date: string;
      weather: string;
      summary: string;
      worker_count: number;
    }>,
  ) {
    const { data } = await api.patch<DailyLog>(`/daily-logs/${id}/`, payload);
    return data;
  },

  async remove(id: number) {
    await api.delete(`/daily-logs/${id}/`);
  },

  async uploadFile(logId: number, file: File, caption = "") {
    const form = new FormData();
    form.append("file", file);
    form.append("caption", caption);
    const { data } = await api.post(`/daily-logs/${logId}/photos/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  async deleteFile(logId: number, photoId: number) {
    await api.delete(`/daily-logs/${logId}/photos/${photoId}/`);
  },

  async listAssets(siteId: number) {
    const { data } = await api.get<Asset[]>("/assets/", { params: { site_id: siteId } });
    return data;
  },

  async createAsset(payload: {
    site_id: number;
    name: string;
    asset_type?: string;
    serial_number?: string;
    status?: Asset["status"];
    assigned_to?: string;
    purchase_date?: string | null;
    notes?: string;
  }) {
    const { data } = await api.post<Asset>("/assets/", payload);
    return data;
  },

  async updateAsset(id: number, payload: Partial<Asset>) {
    const { data } = await api.patch<Asset>(`/assets/${id}/`, payload);
    return data;
  },

  async removeAsset(id: number) {
    await api.delete(`/assets/${id}/`);
  },
};
