import api from "./api";
import type { UserProfile } from "./authService";

export interface Company {
  id: number;
  name: string;
  tax_number: string;
  address: string;
}

export interface TeamMember {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
}

export const settingsService = {
  async updateProfile(data: Pick<UserProfile, "first_name" | "last_name">) {
    const response = await api.patch<UserProfile>("/auth/profile/", data);
    return response.data;
  },

  async changePassword(current_password: string, new_password: string) {
    const response = await api.post("/auth/change-password/", {
      current_password,
      new_password,
    });
    return response.data;
  },

  async getCompany() {
    const response = await api.get<Company>("/auth/company/");
    return response.data;
  },

  async updateCompany(data: Partial<Company>) {
    const response = await api.patch<Company>("/auth/company/", data);
    return response.data;
  },

  async getTeam() {
    const response = await api.get<TeamMember[]>("/auth/team/");
    return response.data;
  },

  async inviteMember(data: {
    email: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  }) {
    const response = await api.post("/auth/team/invite/", data);
    return response.data;
  },

  async sendFeedback(subject: string, message: string) {
    const response = await api.post("/auth/feedback/", { subject, message });
    return response.data;
  },
};
