// /src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  timeout: 45000,
});

// Interceptor: tambahkan token "smpj_token" dari localStorage di setiap request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("smpj_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor respon: jika 401 → otomatis logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("smpj_token");
      localStorage.removeItem("smpj_role");
      localStorage.removeItem("smpj_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
