// AI Nexus Workbench - Tenant Isolation Middleware

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

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

/**
 * Tenant isolation middleware to validate and enforce tenant boundaries
 */
export const tenantMiddleware = async (
  event: APIGatewayProxyEvent,
  context: RequestContext
): Promise<APIGatewayProxyResult> => {
  
  try {
    // Extract tenant ID from the URL path
    const tenantIdFromPath = extractTenantIdFromPath(event.path);
    
    // If there's a tenant ID in the path, validate it matches the authenticated user's tenant
    if (tenantIdFromPath && context.tenantId && tenantIdFromPath !== context.tenantId) {
      context.logger.warn('Tenant isolation violation attempted', {
        authenticatedTenantId: context.tenantId,
        requestedTenantId: tenantIdFromPath,
        userId: context.userId,
        path: event.path,
      });
      
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'Access denied: Invalid tenant context',
          requestId: context.requestId,
        }),
      };
    }
    
    // Update context with tenant ID from path if not already set
    if (tenantIdFromPath && !context.tenantId) {
      context.tenantId = tenantIdFromPath;
    }
    
    context.logger.info('Tenant isolation validated', {
      tenantId: context.tenantId,
      userId: context.userId,
      path: event.path,
    });
    
    // Return success to continue processing
    return {
      statusCode: 200,
      headers: {},
      body: '',
    };
    
  } catch (error) {
    context.logger.error('Tenant middleware error', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to validate tenant context',
        requestId: context.requestId,
      }),
    };
  }
};

/**
 * Extract tenant ID from the URL path
 * Expected format: /v1/tenants/{tenantId}/...
 */
function extractTenantIdFromPath(path: string): string | null {
  const tenantMatch = path.match(/^/v1/tenants/([^/]+)/);
  return tenantMatch ? tenantMatch[1] : null;
}
