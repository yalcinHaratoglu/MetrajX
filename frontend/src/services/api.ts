import axios from "axios";
import { getApiErrorMessage } from "../lib/apiError";
import { toast } from "../lib/toast";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

declare module "axios" {
  export interface AxiosRequestConfig {
    /** true ise bu istek hatasında otomatik toast gösterilmez. */
    suppressErrorToast?: boolean;
  }
}

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${baseURL}/auth/token/refresh/`, {
            refresh,
          });
          localStorage.setItem("access_token", data.access);
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      }
    }

    // Backend hatalarını kullanıcıya bildirim olarak göster.
    // 401 (kimlik) ilgili akışlarda yönetildiği için atlanır.
    if (status !== 401 && !originalRequest?.suppressErrorToast) {
      toast.error(getApiErrorMessage(error));
    }

    return Promise.reject(error);
  },
);

export default api;
