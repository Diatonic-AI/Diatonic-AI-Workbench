// AI Nexus Workbench - Error Handling Middleware

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MiddlewareRequest, MiddlewareResponse, ErrorResponse } from '../types/common';

// Request context interface
interface RequestContext {
  requestId: string;
  tenantId?: string;
  userId?: string;
  userRole?: string;
  userPlan?: string;
  logger: unknown;
  clients: unknown;
}

// Error types
interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

/**
 * Error handling middleware for consistent error responses
 */
export const errorMiddleware = async (
  error: Error,
  event: APIGatewayProxyEvent,
  context: RequestContext
): Promise<APIGatewayProxyResult> => {
  
  // Log the error
  context.logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    path: event.path,
    method: event.httpMethod,
    userId: context.userId,
    tenantId: context.tenantId,
  });

  const appError = error as AppError;
  
  // Determine error status code and message
  const statusCode = appError.statusCode || 500;
  const errorType = 'InternalServerError';
  const message = 'An unexpected error occurred';
  const details = undefined;

  // Handle specific error types
  if (appError.code) {
    switch (appError.code) {
      case 'ValidationError':
        statusCode = 400;
        errorType = 'ValidationError';
        message = appError.message || 'Invalid request data';
        details = appError.details;
        break;
      
      case 'NotFoundError':
        statusCode = 404;
        errorType = 'NotFound';
        message = appError.message || 'Resource not found';
        break;
      
      case 'UnauthorizedError':
        statusCode = 401;
        errorType = 'Unauthorized';
        message = 'Authentication required';
        break;
      
      case 'ForbiddenError':
        statusCode = 403;
        errorType = 'Forbidden';
        message = appError.message || 'Access denied';
        break;
      
      case 'ConflictError':
        statusCode = 409;
        errorType = 'Conflict';
        message = appError.message || 'Resource conflict';
        break;
      
      case 'RateLimitError':
        statusCode = 429;
        errorType = 'RateLimitExceeded';
        message = 'Rate limit exceeded';
        break;
      
      case 'ServiceUnavailableError':
        statusCode = 503;
        errorType = 'ServiceUnavailable';
        message = 'Service temporarily unavailable';
        break;
    }
  }

  // Handle AWS SDK errors
  if (error.name === 'ResourceNotFoundException') {
    statusCode = 404;
    errorType = 'NotFound';
    message = 'Resource not found';
  } else if (error.name === 'ConditionalCheckFailedException') {
    statusCode = 409;
    errorType = 'Conflict';
    message = 'Resource has been modified by another request';
  } else if (error.name === 'ThrottlingException') {
    statusCode = 429;
    errorType = 'RateLimitExceeded';
    message = 'Request rate limit exceeded';
  } else if (error.name === 'AccessDeniedException') {
    statusCode = 403;
    errorType = 'Forbidden';
    message = 'Access denied';
  }

  // Prepare error response
  const errorResponse: unknown = {
    error: errorType,
    message,
    requestId: context.requestId,
    timestamp: new Date().toISOString(),
  };

  // Include details for validation errors
  if (details && statusCode === 400) {
    errorResponse.details = details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack?.split('\n').slice(0, 10); // Limit stack trace
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Request-ID',
  };

  // Add retry-after header for rate limiting
  if (statusCode === 429) {
    headers['Retry-After'] = '60';
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(errorResponse),
  };
};

/**
 * Create a custom application error
 */
export class ApplicationError extends Error implements AppError {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode = 500, code = 'InternalServerError', details?: any) {
    super(message);
    this.name = 'ApplicationError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Create specific error types
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 400, 'ValidationError', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NotFoundError');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UnauthorizedError');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = 'Access denied') {
    super(message, 403, 'ForbiddenError');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends ApplicationError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'ConflictError');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApplicationError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RateLimitError');
    this.name = 'RateLimitError';
  }
}
