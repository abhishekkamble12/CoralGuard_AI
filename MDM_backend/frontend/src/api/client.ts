import axios from "axios";

// Use a relative base so requests go through the Vite dev proxy (no CORS).
// In production, set VITE_API_URL to the full backend URL.
const API_BASE = import.meta.env.VITE_API_URL ?? "/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
});

const TOKEN_KEY = "cg_access_token";

/** Persist token to localStorage and attach it to every request. */
export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  delete api.defaults.headers.common.Authorization;
};

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

// Restore token on page load / refresh so the user stays logged in.
const saved = getToken();
if (saved) {
  api.defaults.headers.common.Authorization = `Bearer ${saved}`;
}

// Request interceptor: always attach the latest token before every request.
// This prevents race conditions where the default header isn't set yet.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: redirect to login on 401.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);
