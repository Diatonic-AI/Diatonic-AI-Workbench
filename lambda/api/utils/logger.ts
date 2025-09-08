// AI Nexus Workbench - Logger Utility

// Logger configuration interface
interface LoggerConfig {
  requestId: string;
  path?: string;
  method?: string;
  sourceIp?: string;
  tenantId?: string;
  userId?: string;
}

// Log level enum
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Create a structured logger with request context
 */
export const createLogger = (config: LoggerConfig) => {
  const baseContext = {
    requestId: config.requestId,
    path: config.path,
    method: config.method,
    sourceIp: config.sourceIp,
    tenantId: config.tenantId,
    userId: config.userId,
    timestamp: new Date().toISOString(),
    service: 'ai-nexus-workbench-api',
    environment: process.env.NODE_ENV || 'development',
  };

  const log = (level: LogLevel, message: string, meta?: any) => {
    const logEntry = {
      level,
      message,
      ...baseContext,
      ...meta,
    };

    // In production, use structured JSON logging
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      // In development, use more readable format
      const metaStr = meta ? ` ${JSON.stringify(meta, null, 2)}` : '';
      console.log(`[${level.toUpperCase()}] ${new Date().toISOString()} ${message}${metaStr}`);
    }
  };

  return {
    debug: (message: string, meta?: any) => log(LogLevel.DEBUG, message, meta),
    info: (message: string, meta?: any) => log(LogLevel.INFO, message, meta),
    warn: (message: string, meta?: any) => log(LogLevel.WARN, message, meta),
    error: (message: string, error?: Error | any) => {
      const errorMeta = error instanceof Error 
        ? { error: error.message, stack: error.stack }
        : { error };
      log(LogLevel.ERROR, message, errorMeta);
    },
  };
};
