import api from "./api";

export interface Floor {
  id: number;
  name: string;
  order: number;
}

export interface Project {
  id: number;
  name: string;
  status: string;
  source_file: string | null;
  floors: Floor[];
  requirements_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectStats {
  projects: number;
  floors: number;
  requirements: number;
}

export const projectService = {
  async list(): Promise<Project[]> {
    const response = await api.get<Project[]>("/projects/");
    return response.data;
  },

  async getStats(): Promise<ProjectStats> {
    const projects = await this.list();
    return {
      projects: projects.length,
      floors: projects.reduce((sum, project) => sum + project.floors.length, 0),
      requirements: projects.reduce((sum, project) => sum + project.requirements_count, 0),
    };
  },

  async create(name: string, sourceFile?: string) {
    const response = await api.post<Project>("/projects/", {
      name,
      source_file: sourceFile ?? "",
    });
    return response.data;
  },
};
