// AI Nexus Workbench - Structured Logger
// Enhanced logging with structured output for CloudWatch and monitoring

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS.INFO;
  }

  setLevel(levelName) {
    this.level = LOG_LEVELS[levelName.toUpperCase()] || LOG_LEVELS.INFO;
  }

  formatMessage(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      service: 'ai-nexus-api',
      ...metadata
    };

    return JSON.stringify(logEntry);
  }

  debug(message, metadata = {}) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, metadata));
    }
  }

  info(message, metadata = {}) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.log(this.formatMessage('INFO', message, metadata));
    }
  }

  warn(message, metadata = {}) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage('WARN', message, metadata));
    }
  }

  error(message, metadata = {}) {
    if (this.level <= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage('ERROR', message, metadata));
    }
  }

  // Helper method for logging API requests
  logApiRequest(event, userContext = null) {
    this.info('API Request', {
      method: event.httpMethod,
      path: event.path,
      userAgent: event.headers?.['User-Agent'],
      sourceIp: event.requestContext?.identity?.sourceIp,
      userId: userContext?.userId,
      role: userContext?.role
    });
  }

  // Helper method for logging API responses
  logApiResponse(statusCode, duration, metadata = {}) {
    this.info('API Response', {
      statusCode,
      duration: `${duration}ms`,
      ...metadata
    });
  }

  // Helper method for logging errors with stack trace
  logError(error, context = {}) {
    this.error('Error occurred', {
      errorMessage: error.message,
      errorStack: error.stack,
      ...context
    });
  }
}

module.exports = new Logger();
