// AI Nexus Workbench - Main API Handler with Enhanced Permissions System
// This handler processes all API requests with comprehensive permission checking

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const permissionsClient = require('./permissions/client');
const authMiddleware = require('./middleware/auth');
const corsMiddleware = require('./middleware/cors');
const logger = require('./utils/logger');

// Initialize AWS services
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamodb = DynamoDBDocumentClient.from(dynamoDBClient);

// Environment variables
const {
  NODE_ENV,
  CORS_ORIGINS,
  API_VERSION,
  LOG_LEVEL,
  
  // Legacy tables
  USER_PROFILES_TABLE,
  SYSTEM_LOGS_TABLE,
  USER_SESSIONS_TABLE,
  
  // Enhanced permissions tables
  USERS_TABLE,
  USER_PERMISSIONS_TABLE,
  ROLES_TABLE,
  ROLE_PERMISSIONS_TABLE,
  SUBSCRIPTION_LIMITS_TABLE,
  USER_QUOTAS_TABLE,
  COGNITO_GROUP_MAPPINGS_TABLE,
  ORGANIZATION_SETTINGS_TABLE,
  TEAM_MEMBERSHIPS_TABLE,
  SUBSCRIPTION_BILLING_TABLE
} = process.env;

// Configure logger
logger.setLevel(LOG_LEVEL || 'INFO');

/**
 * Main API handler entry point
 * @param {Object} event - API Gateway event
 * @param {Object} context - Lambda context
 * @returns {Object} HTTP response
 */
exports.handler = async (event, context) => {
  // Enable function response streaming
  context.callbackWaitsForEmptyEventLoop = false;
  
  const startTime = Date.now();
  const requestId = context.awsRequestId;
  
  logger.info('API request started', { 
    requestId, 
    httpMethod: event.httpMethod,
    path: event.path,
    userAgent: event.headers?.['User-Agent']
  });
  
  try {
    // Apply CORS headers
    const corsHeaders = corsMiddleware.getCorsHeaders(event);
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'CORS preflight successful' })
      };
    }
    
    // Parse request path and method
    const { httpMethod, path } = event;
    const pathSegments = path.split('/').filter(segment => segment.length > 0);
    
    // Initialize permissions client
    const permClient = new permissionsClient.PermissionsClient({
      dynamodb,
      tables: {
        users: USERS_TABLE,
        userPermissions: USER_PERMISSIONS_TABLE,
        roles: ROLES_TABLE,
        rolePermissions: ROLE_PERMISSIONS_TABLE,
        subscriptionLimits: SUBSCRIPTION_LIMITS_TABLE,
        userQuotas: USER_QUOTAS_TABLE,
        cognitoGroupMappings: COGNITO_GROUP_MAPPINGS_TABLE,
        organizationSettings: ORGANIZATION_SETTINGS_TABLE,
        teamMemberships: TEAM_MEMBERSHIPS_TABLE,
        subscriptionBilling: SUBSCRIPTION_BILLING_TABLE
      }
    });
    
    // Authenticate and resolve user context
    let userContext = null;
    const authHeader = event.headers?.['Authorization'] || event.headers?.['authorization'];
    
    if (authHeader) {
      try {
        userContext = await authMiddleware.validateAndGetUserContext(authHeader, permClient);
        logger.info('User authenticated', { 
          requestId, 
          userId: userContext.userId,
          role: userContext.role,
          permissions: userContext.permissions?.length || 0
        });
      } catch (authError) {
        logger.warn('Authentication failed', { requestId, error: authError.message });
        // For some endpoints, anonymous access is allowed - continue without context
      }
    }
    
    // Route to appropriate handler
    const response = await routeRequest({
      httpMethod,
      pathSegments,
      event,
      userContext,
      permClient,
      requestId
    });
    
    const duration = Date.now() - startTime;
    logger.info('API request completed', { 
      requestId, 
      statusCode: response.statusCode,
      duration: `${duration}ms`
    });
    
    return {
      ...response,
      headers: {
        ...corsHeaders,
        ...response.headers,
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`
      }
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('API request failed', { 
      requestId, 
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });
    
    // Log error for monitoring
    await logError(error, event, requestId);
    
    return {
      statusCode: 500,
      headers: corsMiddleware.getCorsHeaders(event),
      body: JSON.stringify({
        error: 'Internal server error',
        message: NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
        requestId
      })
    };
  }
};

/**
 * Route requests to appropriate handlers based on path
 */
async function routeRequest({ httpMethod, pathSegments, event, userContext, permClient, requestId }) {
  const [version, resource, subResource] = pathSegments;
  
  // API version check
  if (version !== 'v1') {
    return createErrorResponse(404, 'API version not supported');
  }
  
  // Route to appropriate resource handler
  switch (resource) {
    case 'auth':
      return await handleAuthRoutes({ 
        httpMethod, 
        subResource, 
        event, 
        userContext, 
        permClient, 
        requestId 
      });
    
    case 'users':
      return await handleUserRoutes({ 
        httpMethod, 
        subResource, 
        pathSegments: pathSegments.slice(2),
        event, 
        userContext, 
        permClient, 
        requestId 
      });
    
    case 'permissions':
      return await handlePermissionRoutes({ 
        httpMethod, 
        subResource, 
        pathSegments: pathSegments.slice(2),
        event, 
        userContext, 
        permClient, 
        requestId 
      });
    
    case 'roles':
      return await handleRoleRoutes({ 
        httpMethod, 
        subResource, 
        pathSegments: pathSegments.slice(2),
        event, 
        userContext, 
        permClient, 
        requestId 
      });
    
    case 'quotas':
      return await handleQuotaRoutes({ 
        httpMethod, 
        subResource, 
        pathSegments: pathSegments.slice(2),
        event, 
        userContext, 
        permClient, 
        requestId 
      });
    
    case 'organizations':
      return await handleOrganizationRoutes({ 
        httpMethod, 
        subResource, 
        pathSegments: pathSegments.slice(2),
        event, 
        userContext, 
        permClient, 
        requestId 
      });
    
    case 'health':
      return await handleHealthCheck();
    
    case 'webhook':
      // Handle webhooks (e.g., Stripe)
      return await handleWebhookRoutes({ 
        httpMethod, 
        subResource, 
        event, 
        requestId 
      });
    
    default:
      return createErrorResponse(404, `Resource '${resource}' not found`);
  }
}

// =============================================================================
// AUTH ROUTES
// =============================================================================
async function handleAuthRoutes({ httpMethod, subResource, event, userContext, permClient, requestId }) {
  const authHandler = require('./handlers/auth');
  
  switch (subResource) {
    case 'me':
      if (httpMethod === 'GET') {
        return await authHandler.getCurrentUser(userContext, permClient);
      }
      break;
    
    case 'permissions':
      if (httpMethod === 'GET') {
        return await authHandler.getUserPermissions(userContext, permClient);
      }
      break;
    
    case 'refresh':
      if (httpMethod === 'POST') {
        return await authHandler.refreshUserContext(event.body, permClient);
      }
      break;
  }
  
  return createErrorResponse(405, 'Method not allowed');
}

// =============================================================================
// USER ROUTES
// =============================================================================
async function handleUserRoutes({ httpMethod, subResource, pathSegments, event, userContext, permClient, requestId }) {
  const usersHandler = require('./handlers/users');
  
  switch (subResource) {
    case undefined:
      // GET /users - List users
      if (httpMethod === 'GET') {
        return await usersHandler.listUsers(event.queryStringParameters, userContext, permClient);
      }
      break;
    
    case 'me':
      // /users/me - Current user profile
      if (httpMethod === 'GET') {
        return await usersHandler.getCurrentUserProfile(userContext, permClient);
      }
      if (httpMethod === 'PUT') {
        return await usersHandler.updateCurrentUserProfile(event.body, userContext, permClient);
      }
      break;
    
    default:
      // /users/{userId} or /users/{userId}/permissions
      const userId = subResource;
      const action = pathSegments[0];
      
      if (action === 'permissions') {
        if (httpMethod === 'GET') {
          return await usersHandler.getUserPermissions(userId, userContext, permClient);
        }
        if (httpMethod === 'POST') {
          return await usersHandler.grantUserPermission(userId, event.body, userContext, permClient);
        }
        if (httpMethod === 'DELETE') {
          return await usersHandler.revokeUserPermission(userId, event.body, userContext, permClient);
        }
      } else {
        // Direct user operations
        if (httpMethod === 'GET') {
          return await usersHandler.getUser(userId, userContext, permClient);
        }
        if (httpMethod === 'PUT') {
          return await usersHandler.updateUser(userId, event.body, userContext, permClient);
        }
      }
      break;
  }
  
  return createErrorResponse(405, 'Method not allowed');
}

// =============================================================================
// PERMISSION ROUTES
// =============================================================================
async function handlePermissionRoutes({ httpMethod, subResource, pathSegments, event, userContext, permClient, requestId }) {
  const permissionHandler = require('./handlers/permissions');
  
  // Check admin permissions for permission management
  const hasPermAdmin = userContext && permClient.checkPermission(userContext, 'internal.user_management');
  
  if (!hasPermAdmin) {
    return createErrorResponse(403, 'Insufficient permissions for permission management');
  }
  
  switch (subResource) {
    case undefined:
      // /permissions
      if (httpMethod === 'GET') {
        return await permissionHandler.listAllPermissions(userContext, permClient);
      }
      break;
    
    case 'check':
      // /permissions/check
      if (httpMethod === 'POST') {
        return await permissionHandler.checkPermissions(event.body, userContext, permClient);
      }
      break;
  }
  
  return createErrorResponse(405, 'Method not allowed');
}

// =============================================================================
// ROLE ROUTES  
// =============================================================================
async function handleRoleRoutes({ httpMethod, subResource, pathSegments, event, userContext, permClient, requestId }) {
  const rolesHandler = require('./handlers/roles');
  
  switch (subResource) {
    case undefined:
      // /roles
      if (httpMethod === 'GET') {
        return await rolesHandler.listRoles(event.queryStringParameters, userContext, permClient);
      }
      if (httpMethod === 'POST') {
        return await rolesHandler.createRole(event.body, userContext, permClient);
      }
      break;
    
    default:
      // /roles/{roleId} or /roles/{roleId}/permissions or /roles/{roleId}/users
      const roleId = subResource;
      const action = pathSegments[0];
      
      if (action === 'permissions') {
        if (httpMethod === 'POST') {
          return await rolesHandler.addRolePermission(roleId, event.body, userContext, permClient);
        }
        if (httpMethod === 'DELETE') {
          return await rolesHandler.removeRolePermission(roleId, event.body, userContext, permClient);
        }
      } else if (action === 'users') {
        if (httpMethod === 'GET') {
          return await rolesHandler.getRoleUsers(roleId, event.queryStringParameters, userContext, permClient);
        }
      } else {
        // Direct role operations
        if (httpMethod === 'GET') {
          return await rolesHandler.getRole(roleId, userContext, permClient);
        }
        if (httpMethod === 'PUT') {
          return await rolesHandler.updateRole(roleId, event.body, userContext, permClient);
        }
        if (httpMethod === 'DELETE') {
          return await rolesHandler.deleteRole(roleId, userContext, permClient);
        }
      }
      break;
  }
  
  return createErrorResponse(405, 'Method not allowed');
}

// =============================================================================
// QUOTA ROUTES
// =============================================================================
async function handleQuotaRoutes({ httpMethod, subResource, pathSegments, event, userContext, permClient, requestId }) {
  const quotasHandler = require('./handlers/quotas');
  
  switch (subResource) {
    case 'me':
      // /quotas/me - Get current user quotas
      if (httpMethod === 'GET') {
        return await quotasHandler.getCurrentUserQuotas(userContext, permClient);
      }
      break;
    
    case 'users':
      // /quotas/users/{userId} - Get or update specific user quotas
      const userId = pathSegments[0];
      if (httpMethod === 'GET') {
        return await quotasHandler.getUserQuotas(userId, userContext, permClient);
      }
      if (httpMethod === 'PUT') {
        return await quotasHandler.updateUserQuotas(userId, event.body, userContext, permClient);
      }
      break;
    
    case 'check':
      // /quotas/check/{quotaType} - Check quota availability
      const quotaType = pathSegments[0];
      if (httpMethod === 'GET') {
        return await quotasHandler.checkQuotaAvailability(quotaType, userContext, permClient);
      }
      break;
    
    case 'consume':
      // /quotas/consume - Consume quota
      if (httpMethod === 'POST') {
        return await quotasHandler.consumeQuota(event.body, userContext, permClient);
      }
      break;
    
    case 'statistics':
      // /quotas/statistics - Get quota statistics (admin)
      if (httpMethod === 'GET') {
        return await quotasHandler.getQuotaStatistics(event.queryStringParameters, userContext, permClient);
      }
      break;
  }
  
  return createErrorResponse(405, 'Method not allowed');
}

// =============================================================================
// ORGANIZATION ROUTES
// =============================================================================
async function handleOrganizationRoutes({ httpMethod, subResource, pathSegments, event, userContext, permClient, requestId }) {
  const organizationsHandler = require('./handlers/organizations');
  
  switch (subResource) {
    case undefined:
      // /organizations
      if (httpMethod === 'GET') {
        return await organizationsHandler.listOrganizations(event.queryStringParameters, userContext, permClient);
      }
      if (httpMethod === 'POST') {
        return await organizationsHandler.createOrganization(event.body, userContext, permClient);
      }
      break;
    
    default:
      // /organizations/{orgId} or /organizations/{orgId}/members
      const orgId = subResource;
      const action = pathSegments[0];
      
      if (action === 'members') {
        if (httpMethod === 'GET') {
          return await organizationsHandler.getOrganizationMembers(orgId, event.queryStringParameters, userContext, permClient);
        }
        if (httpMethod === 'POST') {
          return await organizationsHandler.addOrganizationMember(orgId, event.body, userContext, permClient);
        }
        if (httpMethod === 'DELETE') {
          return await organizationsHandler.removeOrganizationMember(orgId, event.body, userContext, permClient);
        }
      } else {
        // Direct organization operations
        if (httpMethod === 'GET') {
          return await organizationsHandler.getOrganization(orgId, userContext, permClient);
        }
        if (httpMethod === 'PUT') {
          return await organizationsHandler.updateOrganization(orgId, event.body, userContext, permClient);
        }
        if (httpMethod === 'DELETE') {
          return await organizationsHandler.deleteOrganization(orgId, userContext, permClient);
        }
      }
      break;
  }
  
  return createErrorResponse(405, 'Method not allowed');
}

// =============================================================================
// HEALTH CHECK
// =============================================================================
async function handleHealthCheck() {
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: API_VERSION || 'v1',
      environment: NODE_ENV || 'development',
      services: {
        dynamodb: 'connected',
        permissions: 'operational'
      }
    })
  };
}

// =============================================================================
// WEBHOOK ROUTES
// =============================================================================
async function handleWebhookRoutes({ httpMethod, subResource, event, requestId }) {
  if (httpMethod !== 'POST') {
    return createErrorResponse(405, 'Only POST method allowed for webhooks');
  }
  
  switch (subResource) {
    case 'stripe':
      const stripeHandler = require('./webhook/stripe');
      return await stripeHandler.handler(event);
    
    default:
      return createErrorResponse(404, `Webhook '${subResource}' not found`);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
function createErrorResponse(statusCode, message, details = null) {
  const body = {
    error: message,
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    body.details = details;
  }
  
  return {
    statusCode,
    body: JSON.stringify(body)
  };
}

async function logError(error, event, requestId) {
  try {
    await dynamodb.put({
      TableName: SYSTEM_LOGS_TABLE,
      Item: {
        log_id: `error-${requestId}`,
        timestamp: new Date().toISOString(),
        log_type: 'error',
        level: 'ERROR',
        message: error.message,
        stack: error.stack,
        event_path: event.path,
        event_method: event.httpMethod,
        user_agent: event.headers?.['User-Agent'],
        source_ip: event.requestContext?.identity?.sourceIp,
        request_id: requestId,
        ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days TTL
      }
    });
  } catch (logError) {
    console.error('Failed to log error to DynamoDB:', logError);
  }
}
