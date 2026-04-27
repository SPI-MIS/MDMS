// src/utils/api.js
import axios from 'axios';
import { useAuth } from '@/composables/useAuth';

// 創建axios實例
const api = axios.create({
  baseURL: '/api'
});

// 請求攔截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const { token } = useAuth();
    if (token.value) {
      config.headers.Authorization = `Bearer ${token.value}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器 - 處理401錯誤
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token過期，登出
      const { logout } = useAuth();
      logout();
    }
    return Promise.reject(error);
  }
);

export default api;