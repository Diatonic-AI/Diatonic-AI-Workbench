// AI Nexus Workbench - CORS Middleware

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Request context interface
interface RequestContext {
  requestId: string;
  tenantId?: string;
  userId?: string;
  userRole?: string;
  userPlan?: string;
  logger: any;
  clients: any;
}

/**
 * CORS middleware to handle cross-origin requests
 */
export const corsMiddleware = async (
  event: APIGatewayProxyEvent,
  context: RequestContext
): Promise<APIGatewayProxyResult> => {
  
  // Handle preflight OPTIONS requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(event.headers.Origin),
      body: '',
    };
  }

  // For non-OPTIONS requests, just return success to allow processing to continue
  return {
    statusCode: 200,
    headers: getCorsHeaders(event.headers.Origin),
    body: '',
  };
};

/**
 * Get CORS headers for the response
 */
function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = JSON.parse(process.env.CORS_ORIGINS || '["*"]');
  const allowOrigin = allowedOrigins.includes('*') || allowedOrigins.includes(origin) 
    ? (origin || '*') 
    : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Request-ID',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}
