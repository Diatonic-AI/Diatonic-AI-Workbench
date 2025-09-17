/**
 * Diatonic AI - API Client
 * Type-safe API client with AWS Amplify authentication integration
 */

import { fetchAuthSession } from 'aws-amplify/auth';
import { toast } from 'sonner';

// Get API configuration from environment
// Try billing-specific API URL first, then fall back to general API Gateway URL
const API_BASE_URL = import.meta.env.VITE_BILLING_API_URL || import.meta.env.VITE_AWS_API_GATEWAY_ENDPOINT;
const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;

/**
 * API Error class for structured error handling
 */
export class APIError extends Error {
  public statusCode: number;
  public code?: string;
  public requestId?: string;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    requestId?: string
  ) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.requestId = requestId;
  }
}

/**
 * Network timeout error
 */
export class NetworkTimeoutError extends Error {
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`);
    this.name = 'NetworkTimeoutError';
  }
}

/**
 * Request configuration interface
 */
interface RequestConfig extends Omit<RequestInit, 'body'> {
  body?: any; // Will be JSON stringified
  timeout?: number;
  retries?: number;
  skipAuth?: boolean; // For public endpoints
}

/**
 * API Response wrapper type
 */
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    param?: string;
    type?: string;
  };
  requestId?: string;
  message?: string;
}

/**
 * Get current user's JWT token from AWS Cognito
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession().catch(() => null);
    const token = session?.tokens?.idToken?.toString();
    return token || null;
  } catch (error) {
    // User is not authenticated
    console.debug('No valid auth session found');
    return null;
  }
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create timeout promise
 */
function createTimeoutPromise(timeout: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new NetworkTimeoutError(timeout)), timeout);
  });
}

/**
 * Main API fetch function with authentication, retries, and error handling
 */
export async function apiFetch<T = any>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  // Validate API base URL
  if (!API_BASE_URL) {
    throw new APIError(
      'API base URL not configured. Please check VITE_AWS_API_GATEWAY_ENDPOINT environment variable.',
      0
    );
  }

  // Clean endpoint path
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `${API_BASE_URL.replace(/\/$/, '')}/${cleanEndpoint}`;

  const {
    body,
    timeout = API_TIMEOUT,
    retries = MAX_RETRIES,
    skipAuth = false,
    headers = {},
    ...fetchConfig
  } = config;

  // Prepare headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add authentication if not skipped and user is authenticated
  if (!skipAuth) {
    const token = await getAuthToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  // Prepare request configuration
  const requestConfig: RequestInit = {
    ...fetchConfig,
    headers: requestHeaders,
  };

  // Add body if provided
  if (body !== undefined) {
    if (typeof body === 'string') {
      requestConfig.body = body;
    } else {
      requestConfig.body = JSON.stringify(body);
    }
  }

  // Retry logic with exponential backoff
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.debug(`🔄 API Request (attempt ${attempt + 1}/${retries + 1}):`, {
        method: requestConfig.method || 'GET',
        url,
        hasAuth: Boolean(requestHeaders.Authorization),
        hasBody: Boolean(requestConfig.body),
      });

      // Create fetch promise with timeout
      const fetchPromise = fetch(url, requestConfig);
      const timeoutPromise = createTimeoutPromise(timeout);
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      // Handle HTTP error status codes
      if (!response.ok) {
        let errorData: any = {};
        
        try {
          // Try to parse error response body
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            errorData = await response.json();
          } else {
            errorData = { message: await response.text() };
          }
        } catch (parseError) {
          // Ignore parse errors, use default error
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        const apiError = new APIError(
          errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.error?.code || errorData.code,
          response.headers.get('x-request-id') || undefined
        );

        // Log API errors for debugging
        console.error('❌ API Error:', {
          status: response.status,
          message: apiError.message,
          code: apiError.code,
          requestId: apiError.requestId,
          url,
        });

        throw apiError;
      }

      // Parse successful response
      const responseData = await response.json() as APIResponse<T>;
      
      console.debug('✅ API Response:', {
        success: responseData.success,
        hasData: Boolean(responseData.data),
        message: responseData.message,
        requestId: responseData.requestId,
      });

      // Handle API response format
      if (responseData.success === false) {
        throw new APIError(
          responseData.error?.message || 'API request failed',
          response.status,
          responseData.error?.code,
          responseData.requestId
        );
      }

      // Return the data portion or the entire response
      return responseData.data || responseData as T;

    } catch (error) {
      lastError = error as Error;

      // Don't retry for authentication errors or client errors
      if (error instanceof APIError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw error; // Authentication/authorization errors
        }
        if (error.statusCode >= 400 && error.statusCode < 500) {
          throw error; // Client errors (except 408 timeout)
        }
      }

      // Don't retry for network timeout errors on the last attempt
      if (error instanceof NetworkTimeoutError && attempt === retries) {
        throw error;
      }

      // Don't retry if it's the last attempt
      if (attempt === retries) {
        throw lastError;
      }

      // Calculate delay for exponential backoff (100ms, 200ms, 400ms, ...)
      const delay = Math.min(100 * Math.pow(2, attempt), 5000);
      console.debug(`⏳ Retrying in ${delay}ms (attempt ${attempt + 1}/${retries + 1})`);
      
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError || new Error('Unknown error occurred');
}

/**
 * GET request helper
 */
export async function apiGet<T = any>(
  endpoint: string,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<T> {
  return apiFetch<T>(endpoint, { ...config, method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T = any>(
  endpoint: string,
  body?: any,
  config?: Omit<RequestConfig, 'method'>
): Promise<T> {
  return apiFetch<T>(endpoint, { ...config, method: 'POST', body });
}

/**
 * PUT request helper
 */
export async function apiPut<T = any>(
  endpoint: string,
  body?: any,
  config?: Omit<RequestConfig, 'method'>
): Promise<T> {
  return apiFetch<T>(endpoint, { ...config, method: 'PUT', body });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = any>(
  endpoint: string,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<T> {
  return apiFetch<T>(endpoint, { ...config, method: 'DELETE' });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T = any>(
  endpoint: string,
  body?: any,
  config?: Omit<RequestConfig, 'method'>
): Promise<T> {
  return apiFetch<T>(endpoint, { ...config, method: 'PATCH', body });
}

/**
 * Handle API errors with user-friendly messages
 */
export function handleAPIError(error: unknown, customMessage?: string): void {
  console.error('API Error:', error);
  
  if (error instanceof APIError) {
    // Show user-friendly error message
    const message = customMessage || formatAPIError(error);
    toast.error(message);
  } else if (error instanceof NetworkTimeoutError) {
    toast.error(customMessage || 'Request timed out. Please check your connection and try again.');
  } else {
    // Generic error
    const message = customMessage || 'An unexpected error occurred. Please try again.';
    toast.error(message);
  }
}

/**
 * Format API errors for user display
 */
export function formatAPIError(error: APIError): string {
  // Handle specific error codes
  switch (error.statusCode) {
    case 400:
      return error.message || 'Invalid request. Please check your input and try again.';
    case 401:
      return 'You are not authenticated. Please sign in and try again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return error.message || 'A conflict occurred. Please try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error occurred. Please try again later.';
    case 502:
    case 503:
    case 504:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const token = await getAuthToken();
    return !!token;
  } catch {
    return false;
  }
}

/**
 * Get current user information
 */
export async function getCurrentUserInfo(): Promise<any> {
  try {
    const { getCurrentUser } = await import('aws-amplify/auth');
    const user = await getCurrentUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Validate API configuration
 */
export function validateAPIConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!API_BASE_URL) {
    errors.push('Missing VITE_AWS_API_GATEWAY_ENDPOINT environment variable');
  } else {
    try {
      new URL(API_BASE_URL);
    } catch {
      errors.push('Invalid VITE_AWS_API_GATEWAY_ENDPOINT URL format');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Development logging
if (import.meta.env.DEV) {
  const config = validateAPIConfig();
  console.log('🔧 API Configuration:', {
    baseURL: API_BASE_URL,
    isValid: config.isValid,
    errors: config.errors,
    timeout: API_TIMEOUT,
    maxRetries: MAX_RETRIES,
  });
}

// Export configuration for external use
export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  maxRetries: MAX_RETRIES,
};
