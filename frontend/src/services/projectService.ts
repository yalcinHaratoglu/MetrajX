import api from "./api";
import { assertUploadSize } from "../lib/uploadLimits";

export type ProjectStatus = "draft" | "processing" | "ready" | "error";

export interface Floor {
  id: number;
  name: string;
  order: number;
}

export interface Project {
  id: number;
  name: string;
  status: ProjectStatus;
  source_file: string | null;
  floors: Floor[];
  requirements_count: number;
  created_at: string;
  updated_at: string;
}

export interface RebarRequirement {
  id: number;
  diameter_mm: number;
  length_m: string;
  quantity: number;
  element_ref: string;
  notes: string;
}

export interface Cut {
  length: number;
  element_ref: string;
  position: number;
}

export interface CuttingBar {
  stock_index: number;
  cuts: Cut[];
  waste_m: number;
}

export interface OptimizationResult {
  run_id: number;
  bar_length_m: number;
  total_bars: number;
  total_waste_m: number;
  waste_percent: number;
  plans: Record<string, CuttingBar[]>;
  created_at?: string;
}

export interface NewRequirement {
  diameter_mm: number;
  length_m: number;
  quantity: number;
  element_ref?: string;
}

export const projectService = {
  async list(): Promise<Project[]> {
    const response = await api.get<Project[]>("/projects/");
    return response.data;
  },

  async get(id: number): Promise<Project> {
    const response = await api.get<Project>(`/projects/${id}/`);
    return response.data;
  },

  async create(name: string): Promise<Project> {
    const response = await api.post<Project>("/projects/", { name });
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/projects/${id}/`);
  },

  async getRequirements(id: number): Promise<RebarRequirement[]> {
    const response = await api.get<RebarRequirement[]>(`/projects/${id}/requirements/`);
    return response.data;
  },

  async addRequirement(id: number, data: NewRequirement): Promise<RebarRequirement> {
    const response = await api.post<RebarRequirement>(`/projects/${id}/requirements/`, data);
    return response.data;
  },

  async updateRequirement(
    requirementId: number,
    data: Partial<NewRequirement>,
  ): Promise<RebarRequirement> {
    const response = await api.patch<RebarRequirement>(
      `/requirements/${requirementId}/`,
      data,
    );
    return response.data;
  },

  async removeRequirement(requirementId: number): Promise<void> {
    await api.delete(`/requirements/${requirementId}/`);
  },

  async clearRequirements(id: number): Promise<void> {
    await api.delete(`/projects/${id}/requirements/`);
  },

  async upload(id: number, file: File): Promise<{ imported: number; requirements: RebarRequirement[] }> {
    assertUploadSize(file);
    const form = new FormData();
    form.append("file", file);
    const response = await api.post(`/projects/${id}/upload/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async optimize(id: number, barLengthM?: number): Promise<OptimizationResult> {
    const body = barLengthM ? { bar_length_m: barLengthM } : {};
    const response = await api.post<OptimizationResult>(`/projects/${id}/optimize/`, body);
    return response.data;
  },

  async getResult(id: number): Promise<OptimizationResult | null> {
    try {
      const response = await api.get<OptimizationResult | null>(`/projects/${id}/result/`, {
        suppressErrorToast: true,
      });
      return response.data ?? null;
    } catch {
      return null;
    }
  },

  async downloadTemplate(): Promise<void> {
    const response = await api.get("/projects/template/", { responseType: "blob" });
    triggerDownload(response.data, "conmanage-donati-sablonu.xlsx");
  },

  async exportExcel(id: number, projectName: string): Promise<void> {
    const response = await api.get(`/projects/${id}/export/excel/`, { responseType: "blob" });
    triggerDownload(response.data, `${projectName}-metraj.xlsx`);
  },
};

function triggerDownload(data: Blob, filename: string) {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
