import axios from 'axios';
import { authService } from './auth.service';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !(originalRequest as any)._retry && !originalRequest.url.includes('/api/auth/login')) {
      (originalRequest as any)._retry = true;
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const res = await authService.refreshAccessToken();
          const newToken = res.accessToken || res.token || localStorage.getItem('access_token');
          processQueue(null, newToken);
          return api(originalRequest);
        } catch (err) {
          processQueue(err, null);
          authService.logout();
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }

      // If refreshing is ongoing, queue the request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      }).catch((err) => {
        return Promise.reject(err);
      });
    }

    return Promise.reject(error);
  }
);

export default api;
