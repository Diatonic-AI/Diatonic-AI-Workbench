import { DEV_API_BASE_URL } from './api-config';

// Service client with tenant context and authentication
export class TenantServiceClient {
  private baseUrl: string;
  private tenantId: string;
  private authToken?: string;

  constructor(baseUrl: string = DEV_API_BASE_URL, tenantId: string = 'dev-tenant') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.tenantId = tenantId;
  }

  // Set authentication token
  setAuthToken(token: string) {
    this.authToken = token;
  }

  // Set tenant context
  setTenantId(tenantId: string) {
    this.tenantId = tenantId;
  }

  // Build request headers with tenant context
  private buildHeaders(additionalHeaders: Record<string, string> = {}): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-id': this.tenantId,
      ...additionalHeaders
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  // Generic request method with error handling
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: this.buildHeaders(options.headers as Record<string, string>)
    };

    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`, {
        tenant: this.tenantId,
        hasAuth: !!this.authToken
      });

      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API Request failed: ${options.method || 'GET'} ${url}`, error);
      throw error;
    }
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const searchParams = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<T>(`${endpoint}${searchParams}`, {
      method: 'GET'
    });
  }

  // POST request
  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PUT request
  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE'
    });
  }

  // PATCH request
  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; tenant: string }> {
    return this.get('/health');
  }
}

// Default service client instance
export const serviceClient = new TenantServiceClient();

// Service client factory for different tenants
export function createServiceClient(tenantId: string, authToken?: string): TenantServiceClient {
  const client = new TenantServiceClient(DEV_API_BASE_URL, tenantId);
  if (authToken) {
    client.setAuthToken(authToken);
  }
  return client;
}

// API response wrapper interface
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  tenant_id: string;
  timestamp: string;
  error?: string;
}

// Paginated response interface
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Service client with automatic tenant context from auth
export class AuthenticatedServiceClient extends TenantServiceClient {
  constructor(
    private getUserContext: () => { tenantId: string; authToken?: string } | null
  ) {
    super();
    this.updateFromAuth();
  }

  // Update client context from auth
  private updateFromAuth() {
    const context = this.getUserContext();
    if (context) {
      this.setTenantId(context.tenantId);
      if (context.authToken) {
        this.setAuthToken(context.authToken);
      }
    }
  }

  // Override request method to ensure auth context is current
  protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    this.updateFromAuth();
    return super.request<T>(endpoint, options);
  }
}

// Utility functions for API responses
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true } {
  return response.success === true;
}

export function extractData<T>(response: ApiResponse<T>): T {
  if (!isSuccessResponse(response)) {
    throw new Error(response.error || 'API request failed');
  }
  return response.data;
}

// Error classes for better error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string,
    public tenantId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class TenantError extends ApiError {
  constructor(message: string, endpoint: string, tenantId: string) {
    super(`Tenant Error: ${message}`, 403, endpoint, tenantId);
    this.name = 'TenantError';
  }
}

// Request retry utility with exponential backoff
export async function withRetry<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Retry attempt ${attempt + 1} after ${delay}ms delay`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Request interceptor type
export type RequestInterceptor = (
  url: string, 
  config: RequestInit
) => RequestInit | Promise<RequestInit>;

// Response interceptor type  
export type ResponseInterceptor = <T>(
  response: Response,
  data: T
) => T | Promise<T>;

// Advanced service client with interceptors
export class InterceptableServiceClient extends TenantServiceClient {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  // Add request interceptor
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // Override request method to apply interceptors
  protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    let config = { ...options };
    
    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(`${this.baseUrl}${endpoint}`, config);
    }

    // Make the request
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...config,
      headers: this.buildHeaders(config.headers as Record<string, string>)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(
        `API Error ${response.status}: ${errorText}`,
        response.status,
        endpoint,
        this.tenantId
      );
    }

    let data = await response.json();

    // Apply response interceptors
    for (const interceptor of this.responseInterceptors) {
      data = await interceptor(response, data);
    }

    return data;
  }
}

// Development utilities
export const DevServiceClient = {
  // Create a mock response
  mockResponse: <T>(data: T, tenant_id: string = 'dev-tenant'): ApiResponse<T> => ({
    success: true,
    data,
    tenant_id,
    timestamp: new Date().toISOString()
  }),

  // Create a mock paginated response
  mockPaginatedResponse: <T>(
    items: T[], 
    page: number = 1, 
    limit: number = 10,
    tenant_id: string = 'dev-tenant'
  ): PaginatedResponse<T> => ({
    success: true,
    data: items.slice((page - 1) * limit, page * limit),
    tenant_id,
    timestamp: new Date().toISOString(),
    pagination: {
      page,
      limit,
      total: items.length,
      hasNext: page * limit < items.length,
      hasPrevious: page > 1
    }
  }),

  // Simulate network delay
  delay: (ms: number = 500): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms))
};