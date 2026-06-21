import api from "./api";
import { assertUploadSize } from "../lib/uploadLimits";

export interface MetrajCategory {
  id: number;
  slug: string;
  name: string;
  default_unit: string;
  sort_order: number;
  is_custom: boolean;
  company: number | null;
}

export interface MetrajItemDocument {
  id: number;
  title: string;
  original_filename: string;
  file_kind: string;
  file_size: number;
  preview_url: string | null;
  created_at: string;
}

export interface MetrajDocument {
  id: number;
  site: number;
  item: number | null;
  operation: number | null;
  title: string;
  original_filename: string;
  mime_type: string;
  file_kind: string;
  file_size: number;
  download_url: string | null;
  preview_url: string | null;
  uploaded_by_name: string;
  created_at: string;
}

export type MetrajOperationStatus = "planned" | "done";

export interface MetrajOperation {
  id: number;
  item: number;
  item_description: string;
  category_name: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: MetrajOperationStatus;
  progress_percent: number;
  notes: string;
  documents: MetrajItemDocument[];
  created_at: string;
  updated_at: string;
}

export interface MetrajItem {
  id: number;
  site: number;
  category: number;
  category_slug: string;
  category_name: string;
  description: string;
  unit: string;
  quantity: string;
  unit_price: string | null;
  total_amount: string | null;
  completion_percent: number;
  operations_count: number;
  notes: string;
  operations?: MetrajOperation[];
  created_at: string;
  updated_at: string;
}

export interface MetrajSummary {
  item_count: number;
  average_progress: number;
  estimated_cost: string | null;
  by_category: {
    slug: string;
    name: string;
    item_count: number;
    average_progress: number;
  }[];
}

export interface MetrajItemInput {
  site_id?: number;
  category: number;
  description: string;
  unit: string;
  quantity: number | string;
  unit_price?: number | string | null;
  notes?: string;
}

export interface MetrajOperationInput {
  title: string;
  scheduled_date: string;
  scheduled_time?: string | null;
  status: MetrajOperationStatus;
  progress_percent: number;
  notes?: string;
}

export const metrajService = {
  async categories() {
    const { data } = await api.get<MetrajCategory[]>("/metraj/categories/");
    return data;
  },

  async createCategory(payload: { name: string; default_unit?: string }) {
    const { data } = await api.post<MetrajCategory>("/metraj/categories/", payload);
    return data;
  },

  async updateCategory(id: number, payload: { name?: string; default_unit?: string }) {
    const { data } = await api.patch<MetrajCategory>(`/metraj/categories/${id}/`, payload);
    return data;
  },

  async deleteCategory(id: number) {
    await api.delete(`/metraj/categories/${id}/`);
  },

  async list(siteId: number, search?: string) {
    const params: Record<string, string | number> = { site_id: siteId };
    if (search?.trim()) params.search = search.trim();
    const { data } = await api.get<MetrajItem[]>("/metraj/items/", { params });
    return data;
  },

  async get(id: number) {
    const { data } = await api.get<MetrajItem>(`/metraj/items/${id}/`);
    return data;
  },

  async create(payload: MetrajItemInput & { site_id: number }) {
    const { data } = await api.post<MetrajItem>("/metraj/items/", payload);
    return data;
  },

  async update(id: number, payload: Partial<MetrajItemInput>) {
    const { data } = await api.patch<MetrajItem>(`/metraj/items/${id}/`, payload);
    return data;
  },

  async remove(id: number) {
    await api.delete(`/metraj/items/${id}/`);
  },

  async summary(siteId: number) {
    const { data } = await api.get<MetrajSummary>("/metraj/summary/", {
      params: { site_id: siteId },
    });
    return data;
  },

  async calendar(siteId: number, itemId?: number) {
    const params: Record<string, string | number> = { site_id: siteId };
    if (itemId) params.item_id = itemId;
    const { data } = await api.get<MetrajOperation[]>("/metraj/calendar/", { params });
    return data;
  },

  async calendarForSites(siteIds: number[]) {
    if (siteIds.length === 0) return [];
    const batches = await Promise.all(siteIds.map((id) => this.calendar(id)));
    return batches.flat();
  },

  async listOperations(itemId: number) {
    const { data } = await api.get<MetrajOperation[]>(`/metraj/items/${itemId}/operations/`);
    return data;
  },

  async createOperation(itemId: number, payload: MetrajOperationInput) {
    const { data } = await api.post<MetrajOperation>(`/metraj/items/${itemId}/operations/`, payload);
    return data;
  },

  async updateOperation(id: number, payload: Partial<MetrajOperationInput>) {
    const { data } = await api.patch<MetrajOperation>(`/metraj/operations/${id}/`, payload);
    return data;
  },

  async deleteOperation(id: number) {
    await api.delete(`/metraj/operations/${id}/`);
  },

  async downloadTemplate() {
    const response = await api.get("/metraj/template/", { responseType: "blob" });
    return response.data as Blob;
  },

  async export(siteId: number) {
    const response = await api.get("/metraj/export/", {
      params: { site_id: siteId },
      responseType: "blob",
    });
    return response.data as Blob;
  },

  async import(siteId: number, file: File) {
    assertUploadSize(file);
    const form = new FormData();
    form.append("site_id", String(siteId));
    form.append("file", file);
    const { data } = await api.post("/metraj/import/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data as { detail: string; count: number };
  },

  async uploadDocument(
    siteId: number,
    file: File,
    opts: { operationId?: number; itemId?: number; title?: string },
  ) {
    assertUploadSize(file);
    const form = new FormData();
    form.append("site_id", String(siteId));
    form.append("file", file);
    if (opts.operationId) form.append("operation_id", String(opts.operationId));
    if (opts.itemId) form.append("item_id", String(opts.itemId));
    if (opts.title) form.append("title", opts.title);
    const { data } = await api.post<MetrajDocument>("/metraj/documents/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  async listDocuments(
    siteId: number,
    opts?: { itemId?: number; itemOnly?: boolean },
  ) {
    const params: Record<string, string | number> = { site_id: siteId };
    if (opts?.itemId) params.item_id = opts.itemId;
    if (opts?.itemOnly) params.item_only = "true";
    const { data } = await api.get<MetrajDocument[]>("/metraj/documents/", { params });
    return data;
  },

  async deleteDocument(id: number) {
    await api.delete(`/metraj/documents/${id}/`);
  },

  async downloadDocumentBlob(id: number) {
    const response = await api.get(`/metraj/documents/${id}/download/`, {
      responseType: "blob",
    });
    return response.data as Blob;
  },
};

export function formatMetrajMoney(value: string | number | null | undefined): string {
  const n = Number(value);
  if (value == null || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}M ₺`;
  }
  return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`;
}
