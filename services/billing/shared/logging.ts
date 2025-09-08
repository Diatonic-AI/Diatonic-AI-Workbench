/**
 * Structured Logging for Lambda Functions
 * AI Nexus Workbench - Diatonicvisuals Tenant
 */

import { Logger } from '@aws-lambda-powertools/logger';

// Initialize PowerTools logger with tenant information
export const logger = new Logger({
  serviceName: 'ai-nexus-billing',
  environment: process.env.NODE_ENV || 'production',
  logLevel: (process.env.LOG_LEVEL as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR') || 'INFO',
  persistentLogAttributes: {
    tenant_id: 'diatonicvisuals',
    app: 'ai-nexus-workbench',
    version: '1.0.0',
  },
  sampleRateValue: 0.01, // Sample 1% of debug logs in production
});

/**
 * Mask sensitive data in logs (email, credit card, etc.)
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }
  return `${localPart.slice(0, 2)}${'*'.repeat(Math.max(0, localPart.length - 2))}@${domain}`;
}

/**
 * Mask credit card numbers (show only last 4 digits)
 */
export function maskCardNumber(cardNumber: string): string {
  return `****-****-****-${cardNumber.slice(-4)}`;
}

/**
 * Mask Stripe IDs (show prefix and last 4 characters)
 */
export function maskStripeId(stripeId: string): string {
  if (stripeId.length <= 8) {
    return stripeId; // Don't mask very short IDs
  }
  const prefix = stripeId.substring(0, stripeId.indexOf('_') + 1);
  const suffix = stripeId.slice(-4);
  return `${prefix}****${suffix}`;
}

/**
 * Create a correlation ID for tracking requests across services
 */
export function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Enhanced logger with correlation ID and request context
 */
export class RequestLogger {
  private correlationId: string;
  private userId?: string;
  private requestId?: string;

  constructor(correlationId?: string, userId?: string, requestId?: string) {
    this.correlationId = correlationId || generateCorrelationId();
    this.userId = userId;
    this.requestId = requestId;
  }

  private getLogContext() {
    return {
      correlationId: this.correlationId,
      userId: this.userId,
      requestId: this.requestId,
    };
  }

  info(message: string, extra?: any) {
    logger.info(message, { ...this.getLogContext(), ...extra });
  }

  error(message: string, extra?: any) {
    logger.error(message, { ...this.getLogContext(), ...extra });
  }

  warn(message: string, extra?: any) {
    logger.warn(message, { ...this.getLogContext(), ...extra });
  }

  debug(message: string, extra?: any) {
    logger.debug(message, { ...this.getLogContext(), ...extra });
  }

  /**
   * Log Stripe webhook event (with sensitive data masking)
   */
  logWebhookEvent(event: any) {
    const safeEvent = {
      id: event.id,
      type: event.type,
      created: event.created,
      api_version: event.api_version,
      livemode: event.livemode,
      pending_webhooks: event.pending_webhooks,
      // Mask potentially sensitive data in the data object
      data: {
        object: {
          id: event.data?.object?.id,
          object: event.data?.object?.object,
          created: event.data?.object?.created,
          customer: event.data?.object?.customer,
          metadata: event.data?.object?.metadata,
          // Don't log full object for security
        }
      }
    };

    this.info('Processing webhook event', {
      webhook: safeEvent,
    });
  }

  /**
   * Log API request/response (with sensitive data masking)
   */
  logApiCall(method: string, endpoint: string, statusCode: number, duration: number, extra?: any) {
    this.info('API call completed', {
      http: {
        method,
        endpoint,
        status_code: statusCode,
        duration_ms: duration,
      },
      ...extra,
    });
  }

  /**
   * Log Stripe API operation
   */
  logStripeOperation(operation: string, resourceId: string, success: boolean, extra?: any) {
    const logMethod = success ? this.info.bind(this) : this.error.bind(this);
    
    logMethod(`Stripe ${operation} ${success ? 'succeeded' : 'failed'}`, {
      stripe: {
        operation,
        resource_id: maskStripeId(resourceId),
        success,
      },
      ...extra,
    });
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(operation: string, table: string, key: any, success: boolean, extra?: any) {
    const logMethod = success ? this.debug.bind(this) : this.error.bind(this);
    
    logMethod(`DynamoDB ${operation} ${success ? 'succeeded' : 'failed'}`, {
      dynamodb: {
        operation,
        table,
        key: typeof key === 'object' ? JSON.stringify(key) : key,
        success,
      },
      ...extra,
    });
  }

  /**
   * Log authentication/authorization events
   */
  logAuthEvent(event: 'login' | 'logout' | 'token_validation' | 'authorization_check', success: boolean, extra?: any) {
    const logMethod = success ? this.info.bind(this) : this.warn.bind(this);
    
    logMethod(`Auth event: ${event} ${success ? 'succeeded' : 'failed'}`, {
      auth: {
        event,
        success,
        user_id: this.userId,
      },
      ...extra,
    });
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetric(operation: string, duration: number, extra?: any) {
    this.info(`Performance metric: ${operation}`, {
      performance: {
        operation,
        duration_ms: duration,
      },
      ...extra,
    });
  }

  /**
   * Log security events
   */
  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', extra?: any) {
    const logMethod = severity === 'critical' || severity === 'high' ? this.error.bind(this) : this.warn.bind(this);
    
    logMethod(`Security event: ${event}`, {
      security: {
        event,
        severity,
        user_id: this.userId,
        timestamp: new Date().toISOString(),
      },
      ...extra,
    });
  }
}

/**
 * Create a request logger instance
 */
export function createRequestLogger(
  correlationId?: string,
  userId?: string,
  requestId?: string
): RequestLogger {
  return new RequestLogger(correlationId, userId, requestId);
}

/**
 * Lambda function wrapper with automatic logging
 */
export function withLogging<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  functionName: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const correlationId = generateCorrelationId();
    const requestLogger = createRequestLogger(correlationId);

    try {
      requestLogger.info(`Lambda function ${functionName} started`, {
        function: functionName,
        args_count: args.length,
      });

      const result = await handler(...args);
      const duration = Date.now() - startTime;

      requestLogger.logPerformanceMetric(`lambda_${functionName}`, duration);
      requestLogger.info(`Lambda function ${functionName} completed successfully`, {
        function: functionName,
        duration_ms: duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      requestLogger.error(`Lambda function ${functionName} failed`, {
        function: functionName,
        duration_ms: duration,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : String(error),
      });
      throw error;
    }
  };
}

// Export default logger for backward compatibility
export default logger;
