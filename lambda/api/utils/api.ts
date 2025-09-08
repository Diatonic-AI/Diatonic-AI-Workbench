// AI Nexus Workbench - API Utility Functions

import { APIResponse, ApiError, SuccessResponse, PaginatedResponse } from '../types';

// ===== HTTP Response Utilities =====

export const createResponse = (
  statusCode: number,
  body: unknown,
  headers?: Record<string, string>
): APIResponse => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    ...headers,
  },
  body: JSON.stringify(body),
});

export const successResponse = <T>(
  data?: T,
  message?: string,
  requestId?: string
): APIResponse => {
  const response: SuccessResponse<T> = {
    data,
    message,
    requestId: requestId || generateRequestId(),
  };
  
  return createResponse(200, response);
};

export const createdResponse = <T>(
  data?: T,
  message?: string,
  requestId?: string
): APIResponse => {
  const response: SuccessResponse<T> = {
    data,
    message: message || 'Resource created successfully',
    requestId: requestId || generateRequestId(),
  };
  
  return createResponse(201, response);
};

export const paginatedResponse = <T>(
  items: T[],
  pagination: {
    nextToken?: string;
    hasMore: boolean;
    totalCount?: number;
    limit: number;
  },
  requestId?: string
): APIResponse => {
  const response: PaginatedResponse<T> = {
    items,
    pagination,
    requestId: requestId || generateRequestId(),
  };
  
  return createResponse(200, response);
};

export const errorResponse = (
  statusCode: number,
  error: string,
  message: string,
  code?: string,
  details?: Record<string, any>,
  requestId?: string
): APIResponse => {
  const response: ApiError = {
    error,
    message,
    code,
    details,
    requestId: requestId || generateRequestId(),
  };
  
  return createResponse(statusCode, response);
};

// ===== Common Error Responses =====

export const badRequestResponse = (
  message: string,
  details?: Record<string, any>,
  requestId?: string
): APIResponse => errorResponse(400, 'Bad Request', message, 'BAD_REQUEST', details, requestId);

export const unauthorizedResponse = (
  message = 'Unauthorized',
  requestId?: string
): APIResponse => errorResponse(401, 'Unauthorized', message, 'UNAUTHORIZED', undefined, requestId);

export const forbiddenResponse = (
  message = 'Forbidden',
  requestId?: string
): APIResponse => errorResponse(403, 'Forbidden', message, 'FORBIDDEN', undefined, requestId);

export const notFoundResponse = (
  message = 'Resource not found',
  requestId?: string
): APIResponse => errorResponse(404, 'Not Found', message, 'NOT_FOUND', undefined, requestId);

export const conflictResponse = (
  message: string,
  requestId?: string
): APIResponse => errorResponse(409, 'Conflict', message, 'CONFLICT', undefined, requestId);

export const unprocessableEntityResponse = (
  message: string,
  details?: Record<string, any>,
  requestId?: string
): APIResponse => errorResponse(422, 'Unprocessable Entity', message, 'VALIDATION_ERROR', details, requestId);

export const tooManyRequestsResponse = (
  message = 'Rate limit exceeded',
  requestId?: string
): APIResponse => errorResponse(429, 'Too Many Requests', message, 'RATE_LIMIT_EXCEEDED', undefined, requestId);

export const internalServerErrorResponse = (
  message = 'Internal server error',
  requestId?: string
): APIResponse => errorResponse(500, 'Internal Server Error', message, 'INTERNAL_ERROR', undefined, requestId);

export const serviceUnavailableResponse = (
  message = 'Service temporarily unavailable',
  requestId?: string
): APIResponse => errorResponse(503, 'Service Unavailable', message, 'SERVICE_UNAVAILABLE', undefined, requestId);

// ===== Validation Utilities =====

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: unknown[];
  custom?: (value: unknown) => boolean;
  customMessage?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export class Validator {
  private errors: ValidationError[] = [];

  validate(data: unknown, rules: ValidationRule[]): ValidationError[] {
    this.errors = [];
    
    for (const rule of rules) {
      this.validateField(data, rule);
    }
    
    return this.errors;
  }

  private validateField(data: unknown, rule: ValidationRule): void {
    const { field, required = false } = rule;
    const value = this.getNestedValue(data, field);

    // Check if field is required
    if (required && (value === undefined || value === null || value === '')) {
      this.addError(field, `${field} is required`);
      return;
    }

    // Skip validation if field is not present and not required
    if (value === undefined || value === null) {
      return;
    }

    // Type validation
    if (rule.type) {
      if (!this.validateType(value, rule.type)) {
        this.addError(field, `${field} must be of type ${rule.type}`);
        return;
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        this.addError(field, `${field} must be at least ${rule.minLength} characters long`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        this.addError(field, `${field} must be no more than ${rule.maxLength} characters long`);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        this.addError(field, `${field} has invalid format`);
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        this.addError(field, `${field} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        this.addError(field, `${field} must be no more than ${rule.max}`);
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      this.addError(field, `${field} must be one of: ${rule.enum.join(', ')}`);
    }

    // Custom validation
    if (rule.custom && !rule.custom(value)) {
      this.addError(field, rule.customMessage || `${field} failed custom validation`);
    }
  }

  private validateType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  private getNestedValue(obj: unknown, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private addError(field: string, message: string): void {
    this.errors.push({ field, message });
  }
}

// ===== Common Validation Schemas =====

export const commonValidationRules = {
  id: (required = true): ValidationRule => ({
    field: 'id',
    required,
    type: 'string',
    pattern: /^[a-zA-Z0-9_-]+$/,
    minLength: 1,
    maxLength: 100,
  }),

  name: (required = true): ValidationRule => ({
    field: 'name',
    required,
    type: 'string',
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s_-]+$/,
  }),

  description: (required = false): ValidationRule => ({
    field: 'description',
    required,
    type: 'string',
    maxLength: 1000,
  }),

  email: (required = true): ValidationRule => ({
    field: 'email',
    required,
    type: 'string',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  }),

  url: (required = false): ValidationRule => ({
    field: 'url',
    required,
    type: 'string',
    pattern: /^https?:\/\/[^\s$.?#].[^\s]*$/,
  }),

  positiveInteger: (field: string, required = true): ValidationRule => ({
    field,
    required,
    type: 'number',
    min: 0,
    custom: (value) => Number.isInteger(value),
    customMessage: `${field} must be a positive integer`,
  }),

  percentage: (field: string, required = true): ValidationRule => ({
    field,
    required,
    type: 'number',
    min: 0,
    max: 100,
  }),

  arrayOfStrings: (field: string, required = true): ValidationRule => ({
    field,
    required,
    type: 'array',
    custom: (value) => Array.isArray(value) && value.every(item => typeof item === 'string'),
    customMessage: `${field} must be an array of strings`,
  }),
};

// ===== Request Parsing Utilities =====

export const parseQueryParams = (event: unknown) => {
  const queryParams = event.queryStringParameters || {};
  
  return {
    limit: parseInt(queryParams.limit) || 50,
    nextToken: queryParams.nextToken,
    sortOrder: queryParams.sortOrder === 'desc' ? 'desc' : 'asc',
    filter: queryParams.filter ? JSON.parse(queryParams.filter) : undefined,
    search: queryParams.search,
    status: queryParams.status,
    type: queryParams.type,
    tags: queryParams.tags ? queryParams.tags.split(',') : undefined,
  };
};

export const parsePathParams = (event: unknown) => {
  const pathParams = event.pathParameters || {};
  
  return {
    tenantId: pathParams.tenantId,
    projectId: pathParams.projectId,
    agentId: pathParams.agentId,
    experimentId: pathParams.experimentId,
    datasetId: pathParams.datasetId,
    runId: pathParams.runId,
    userId: pathParams.userId,
  };
};

export const parseRequestBody = <T>(event: unknown): T => {
  if (!event.body) {
    throw new Error('Request body is required');
  }

  try {
    return JSON.parse(event.body) as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
};

// ===== Rate Limiting Utilities =====

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): RateLimitResult {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetTime = windowStart + windowMs;

    const existing = this.requests.get(key);
    
    if (!existing || existing.resetTime <= now) {
      // New window or expired window
      this.requests.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
      };
    }

    if (existing.count >= maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: existing.resetTime,
      };
    }

    // Increment count
    existing.count++;
    this.requests.set(key, existing);

    return {
      allowed: true,
      remaining: maxRequests - existing.count,
      resetTime: existing.resetTime,
    };
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (data.resetTime <= now) {
        this.requests.delete(key);
      }
    }
  }
}

// Singleton rate limiter
export const rateLimiter = new RateLimiter();

// ===== Utility Functions =====

export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const sanitizeForLog = (obj: unknown): unknown => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'credential',
    'authorization', 'cookie', 'session'
  ];

  const sanitized = { ...obj };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
};

export const extractUserFromEvent = (event: unknown) => {
  if (!event.user) {
    throw new Error('User context not found in event');
  }
  return event.user;
};

export const extractTenantFromEvent = (event: unknown) => {
  if (!event.tenant) {
    throw new Error('Tenant context not found in event');
  }
  return event.tenant;
};

export const requireRole = (userRole: string, requiredRoles: string[]): boolean => {
  return requiredRoles.includes(userRole);
};

export const requireFeature = (userFeatures: string[], requiredFeatures: string[]): boolean => {
  return requiredFeatures.every(feature => userFeatures.includes(feature));
};

export const checkTenantLimits = (tenant: unknown, resource: string, increment = 1): boolean => {
  const limits = tenant.limits;
  const usage = tenant.currentUsage;

  const resourceLimit = limits[`max_${resource}`];
  const currentUsage = usage[resource] || 0;

  // -1 means unlimited
  if (resourceLimit === -1) return true;
  
  return currentUsage + increment <= resourceLimit;
};

// ===== Content Security and Validation =====

export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return input;
  
  // Remove potentially dangerous characters
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

export const validateContentLength = (content: string, maxLength: number): boolean => {
  return content.length <= maxLength;
};

export const detectPII = (content: string): { detected: boolean; types: string[] } => {
  const patterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b\d{3}-\d{3}-\d{4}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  };

  const detected: string[] = [];
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(content)) {
      detected.push(type);
    }
  }

  return {
    detected: detected.length > 0,
    types: detected,
  };
};

// ===== Performance and Monitoring =====

export const measureExecutionTime = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; durationMs: number }> => {
  const startTime = Date.now();
  const result = await operation();
  const durationMs = Date.now() - startTime;
  
  return { result, durationMs };
};

export const logPerformanceMetric = (
  metricName: string,
  value: number,
  unit: string,
  dimensions?: Record<string, string>
) => {
  // In a real implementation, this would send metrics to CloudWatch
  console.log(`METRIC: ${metricName}=${value} ${unit}`, dimensions ? JSON.stringify(dimensions) : '');
};

export const logApiCall = (
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  tenantId?: string,
  userId?: string
) => {
  console.log(`API_CALL: ${method} ${path} ${statusCode} ${durationMs}ms`, {
    tenantId,
    userId,
    timestamp: new Date().toISOString(),
  });
};

// ===== Cache Utilities =====

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton cache instance
export const cache = new MemoryCache();
