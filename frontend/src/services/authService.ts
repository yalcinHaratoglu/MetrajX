import api from "./api";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  company_name?: string;
}

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
}

export const authService = {
  async login(payload: LoginPayload) {
    const { data } = await api.post("/auth/login/", payload);
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    return data;
  },

  async register(payload: RegisterPayload) {
    const { data } = await api.post("/auth/register/", payload);
    return data;
  },

  async activate(token: string) {
    const { data } = await api.get(`/auth/activate/${token}/`);
    return data;
  },

  async logout() {
    const refresh = localStorage.getItem("refresh_token");
    if (refresh) {
      try {
        await api.post("/auth/logout/", { refresh });
      } catch {
        // Token may already be invalid
      }
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  async getProfile() {
    const { data } = await api.get<UserProfile>("/auth/profile/");
    return data;
  },

  isAuthenticated() {
    return Boolean(localStorage.getItem("access_token"));
  },
};
