// AI Nexus Workbench - CORS Middleware
// Handle CORS headers for cross-origin requests

const { CORS_ORIGINS, NODE_ENV } = process.env;

/**
 * Get CORS headers for response
 */
function getCorsHeaders(event) {
  const origin = event.headers?.origin || event.headers?.Origin;
  
  // Parse allowed origins from environment
  let allowedOrigins;
  try {
    allowedOrigins = JSON.parse(CORS_ORIGINS || '["*"]');
  } catch {
    allowedOrigins = ['*'];
  }
  
  // Determine if origin is allowed
  let allowOrigin = '*';
  if (origin && allowedOrigins.includes(origin)) {
    allowOrigin = origin;
  } else if (allowedOrigins.includes('*')) {
    allowOrigin = '*';
  } else {
    allowOrigin = allowedOrigins[0] || '*';
  }
  
  const headers = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 
      'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true'
  };
  
  // Add additional headers for development
  if (NODE_ENV === 'development') {
    headers['Access-Control-Expose-Headers'] = 'X-Request-ID,X-Response-Time';
  }
  
  return headers;
}

/**
 * Create CORS preflight response
 */
function createPreflightResponse(event) {
  return {
    statusCode: 200,
    headers: getCorsHeaders(event),
    body: JSON.stringify({ message: 'CORS preflight successful' })
  };
}

module.exports = {
  getCorsHeaders,
  createPreflightResponse
};
