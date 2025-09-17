/**
 * API Configuration
 * 
 * Centralized configuration for API endpoints and base URLs
 * Supports different environments: development, staging, production
 */

// Environment detection
const isDevelopment = import.meta.env.MODE === 'development';
const isStaging = import.meta.env.MODE === 'staging';
const isProduction = import.meta.env.MODE === 'production';

// Base API URLs for different environments
export const API_BASE_URLS = {
  development: 'http://localhost:3001/api',
  staging: 'https://api-staging.diatonic.ai/api',
  production: 'https://api.diatonic.ai/api'
} as const;

// Current environment API base URL
export const API_BASE_URL = isDevelopment 
  ? API_BASE_URLS.development
  : isStaging 
    ? API_BASE_URLS.staging 
    : API_BASE_URLS.production;

// Development-specific API base URL (for testing)
export const DEV_API_BASE_URL = API_BASE_URLS.development;

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    profile: '/auth/profile'
  },
  
  // User management
  users: {
    list: '/users',
    create: '/users',
    get: (id: string) => `/users/${id}`,
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`
  },
  
  // Tenant management
  tenants: {
    list: '/tenants',
    get: (id: string) => `/tenants/${id}`,
    create: '/tenants',
    update: (id: string) => `/tenants/${id}`,
    switch: '/tenants/switch'
  },
  
  // Content endpoints
  content: {
    dashboard: '/content/dashboard',
    toolset: '/content/toolset',
    lab: '/content/lab',
    community: '/content/community',
    education: '/content/education',
    observatory: '/content/observatory'
  },
  
  // Subscription and billing
  subscription: {
    current: '/subscription',
    plans: '/subscription/plans',
    usage: '/subscription/usage',
    billing: '/subscription/billing'
  },
  
  // Health check
  health: '/health'
} as const;

// Request timeout settings
export const API_TIMEOUTS = {
  default: 10000,     // 10 seconds
  upload: 60000,      // 1 minute for file uploads
  longRunning: 300000 // 5 minutes for long operations
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  attempts: 3,
  delay: 1000,        // 1 second initial delay
  backoff: 2          // Exponential backoff multiplier
} as const;

// Rate limiting
export const RATE_LIMITS = {
  development: {
    requestsPerMinute: 1000,
    burstLimit: 100
  },
  staging: {
    requestsPerMinute: 500,
    burstLimit: 50
  },
  production: {
    requestsPerMinute: 200,
    burstLimit: 20
  }
} as const;

// Current rate limits
export const CURRENT_RATE_LIMITS = isDevelopment
  ? RATE_LIMITS.development
  : isStaging
    ? RATE_LIMITS.staging
    : RATE_LIMITS.production;

// Mock API configuration (for development)
export const MOCK_API_CONFIG = {
  enabled: isDevelopment && import.meta.env.VITE_USE_MOCK_API === 'true',
  delay: 500,           // Artificial delay to simulate network
  errorRate: 0.05,      // 5% error rate for testing
  responseVariation: 200 // ±200ms response time variation
} as const;

// Feature flags for API behavior
export const API_FEATURES = {
  enableCaching: true,
  enableRetry: true,
  enableMetrics: isDevelopment,
  enableDebugLogging: isDevelopment,
  enableMockMode: MOCK_API_CONFIG.enabled
} as const;

// Environment info
export const ENVIRONMENT = {
  mode: import.meta.env.MODE,
  isDevelopment,
  isStaging,
  isProduction,
  apiBaseUrl: API_BASE_URL,
  features: API_FEATURES
} as const;

// Validation function
export function validateApiConfig(): boolean {
  try {
    // Check that base URL is valid
    new URL(API_BASE_URL);
    return true;
  } catch (error) {
    console.error('Invalid API configuration:', error);
    return false;
  }
}

// Export default configuration object
export default {
  baseUrl: API_BASE_URL,
  endpoints: API_ENDPOINTS,
  timeouts: API_TIMEOUTS,
  retryConfig: RETRY_CONFIG,
  rateLimits: CURRENT_RATE_LIMITS,
  mockConfig: MOCK_API_CONFIG,
  features: API_FEATURES,
  environment: ENVIRONMENT
} as const;