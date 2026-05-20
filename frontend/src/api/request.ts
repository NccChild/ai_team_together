/**
 * API 请求客户端
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        const { data } = response;
        const requestId = response.headers['x-request-id'] || '';
        (window as any).__lastRequestId = requestId;
        if (data.code !== 200) {
          console.group(`[API Error] request_id=${requestId}`);
          console.error('message:', data.message);
          console.error('request_id:', requestId);
          console.groupEnd();
          const err = new Error(data.message);
          (err as any).request_id = requestId;
          return Promise.reject(err);
        }
        return response;
      },
      (error) => {
        const requestId =
          error?.response?.headers?.['x-request-id'] ||
          error?.response?.data?.request_id ||
          '';
        (window as any).__lastRequestId = requestId;
        const message =
          error?.response?.data?.message || error?.message || '请求失败';

        console.group(`[Request Error] request_id=${requestId}`);
        console.error('message:', message);
        console.error('status:', error?.response?.status);
        console.error('request_id:', requestId);
        if (error?.response?.data?.error) {
          console.error('details:', error.response.data.error);
        }
        console.groupEnd();

        const err = new Error(message);
        (err as any).request_id = requestId;
        return Promise.reject(err);
      }
    );
  }

  async get<T>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, { params, ...config });
    return response.data.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data.data;
  }

  async download(url: string, filename: string, params?: any): Promise<void> {
    const response = await this.client.get(url, {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
}

export const apiClient = new ApiClient();
export default apiClient;
