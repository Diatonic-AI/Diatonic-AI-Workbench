/**
 * API Test Client Utility
 * Provides standardized HTTP client for security testing with proper error handling
 */

import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';

export interface APITestResponse<T = any> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export class APITestClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      validateStatus: () => true, // Don't throw on HTTP errors
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add request interceptor for debugging
    this.client.interceptors.request.use(request => {
      console.debug(`[API TEST] ${request.method?.toUpperCase()} ${request.url}`);
      return request;
    });

    // Add response interceptor for debugging
    this.client.interceptors.response.use(response => {
      console.debug(`[API TEST] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
      return response;
    });
  }

  async request(
    method: string,
    path: string,
    config: AxiosRequestConfig = {}
  ): Promise<APITestResponse> {
    const response: AxiosResponse = await this.client.request({
      method,
      url: path,
      ...config
    });

    return {
      status: response.status,
      data: response.data,
      headers: response.headers as Record<string, string>
    };
  }

  async get(path: string, config: AxiosRequestConfig = {}): Promise<APITestResponse> {
    return this.request('GET', path, config);
  }

  async post(path: string, config: AxiosRequestConfig = {}): Promise<APITestResponse> {
    return this.request('POST', path, config);
  }

  async put(path: string, config: AxiosRequestConfig = {}): Promise<APITestResponse> {
    return this.request('PUT', path, config);
  }

  async delete(path: string, config: AxiosRequestConfig = {}): Promise<APITestResponse> {
    return this.request('DELETE', path, config);
  }

  async patch(path: string, config: AxiosRequestConfig = {}): Promise<APITestResponse> {
    return this.request('PATCH', path, config);
  }
}