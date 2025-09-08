/**
 * Multi-Tenant Middleware Lambda Function
 * Handles tenant context extraction, validation, and authorization for AI Nexus Workbench
 */

const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Initialize AWS services
const dynamodb = new AWS.DynamoDB.DocumentClient();
const cognitoIdentity = new AWS.CognitoIdentityServiceProvider();

// Environment variables
const {
  COGNITO_USER_POOL_ID,
  COGNITO_REGION,
  ORGANIZATIONS_TABLE,
  USER_ORGS_TABLE,
  TENANT_USAGE_TABLE,
  NODE_ENV = 'development'
} = process.env;

// JWKS client for token verification
const jwksClientInstance = jwksClient({
  jwksUri: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000 // 10 minutes
});

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  try {
    const tenantContext = await extractTenantContext(event);
    
    // Add tenant context to the event
    event.tenantContext = tenantContext;
    
    // Validate tenant access permissions
    await validateTenantAccess(tenantContext, event);
    
    // Record usage metrics
    await recordUsageMetrics(tenantContext, event);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Tenant context validated successfully',
        tenantContext
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantContext.tenantId,
        'X-User-Role': tenantContext.userRole
      }
    };
    
  } catch (error) {
    console.error('Tenant middleware error:', error);
    
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        error: error.message || 'Internal server error',
        type: error.name || 'TenantMiddlewareError'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};

/**
 * Extract tenant context from the request
 */
async function extractTenantContext(event) {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }
  
  const token = authHeader.slice(7);
  
  // Verify and decode JWT token
  const decodedToken = await verifyJwtToken(token);
  
  const userId = decodedToken.sub;
  const cognito_username = decodedToken['cognito:username'];
  const cognito_groups = decodedToken['cognito:groups'] || [];
  
  // Extract tenant information from token claims or headers
  let tenantId = decodedToken['custom:tenantId'] || 
                 decodedToken['custom:primaryTenant'] ||
                 event.headers['X-Tenant-ID'] ||
                 event.pathParameters?.tenantId;
  
  // If no tenant ID found, get user's primary tenant
  if (!tenantId) {
    tenantId = await getUserPrimaryTenant(userId);
  }
  
  // Validate user belongs to the tenant
  const userTenantInfo = await validateUserTenantMembership(userId, tenantId);
  
  // Get organization details
  const organizationDetails = await getOrganizationDetails(tenantId);
  
  return {
    userId,
    username: cognito_username,
    tenantId,
    organizationName: organizationDetails.name,
    userRole: userTenantInfo.role,
    permissions: userTenantInfo.permissions || [],
    cognitoGroups: cognito_groups,
    organizationStatus: organizationDetails.status,
    organizationPlan: organizationDetails.plan,
    organizationSettings: organizationDetails.settings,
    isPrimaryTenant: userTenantInfo.isPrimary,
    joinedAt: userTenantInfo.joinedAt,
    token: {
      iat: decodedToken.iat,
      exp: decodedToken.exp,
      aud: decodedToken.aud,
      iss: decodedToken.iss
    }
  };
}

/**
 * Verify JWT token using JWKS
 */
async function verifyJwtToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getSigningKey, {
      algorithms: ['RS256'],
      audience: process.env.COGNITO_CLIENT_ID,
      issuer: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`
    }, (err, decoded) => {
      if (err) {
        reject(new UnauthorizedError('Invalid token: ' + err.message));
      } else {
        resolve(decoded);
      }
    });
  });
}

/**
 * Get signing key for JWT verification
 */
function getSigningKey(header, callback) {
  jwksClientInstance.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    }
  });
}

/**
 * Get user's primary tenant if not specified
 */
async function getUserPrimaryTenant(userId) {
  try {
    const params = {
      TableName: USER_ORGS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'isPrimary = :isPrimary AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':userId': userId,
        ':isPrimary': true,
        ':status': 'active'
      }
    };
    
    const result = await dynamodb.query(params).promise();
    
    if (!result.Items || result.Items.length === 0) {
      // Create default personal tenant for user if none exists
      return await createDefaultPersonalTenant(userId);
    }
    
    return result.Items[0].tenantId;
    
  } catch (error) {
    console.error('Error getting user primary tenant:', error);
    throw new TenantError('Failed to resolve user tenant');
  }
}

/**
 * Create default personal tenant for user
 */
async function createDefaultPersonalTenant(userId) {
  const tenantId = `personal_${userId}`;
  const now = new Date().toISOString();
  
  try {
    // Create organization record
    await dynamodb.put({
      TableName: ORGANIZATIONS_TABLE,
      Item: {
        tenantId,
        name: 'Personal Workspace',
        plan: 'free',
        settings: {
          maxUsers: 1,
          maxStorage: 5, // 5GB for personal
          features: ['basic-features']
        },
        createdAt: now,
        updatedAt: now,
        status: 'active'
      }
    }).promise();
    
    // Create user-organization mapping
    await dynamodb.put({
      TableName: USER_ORGS_TABLE,
      Item: {
        userId,
        tenantId,
        role: 'owner',
        permissions: ['*'], // Full permissions for personal tenant
        joinedAt: now,
        status: 'active',
        isPrimary: true
      }
    }).promise();
    
    return tenantId;
    
  } catch (error) {
    console.error('Error creating default tenant:', error);
    throw new TenantError('Failed to create default tenant');
  }
}

/**
 * Validate user tenant membership
 */
async function validateUserTenantMembership(userId, tenantId) {
  try {
    const params = {
      TableName: USER_ORGS_TABLE,
      Key: {
        userId,
        tenantId
      }
    };
    
    const result = await dynamodb.get(params).promise();
    
    if (!result.Item) {
      throw new ForbiddenError('User does not belong to this organization');
    }
    
    const userTenant = result.Item;
    
    if (userTenant.status !== 'active') {
      throw new ForbiddenError(`User access to organization is ${userTenant.status}`);
    }
    
    return userTenant;
    
  } catch (error) {
    if (error instanceof ForbiddenError) {
      throw error;
    }
    console.error('Error validating user tenant membership:', error);
    throw new TenantError('Failed to validate tenant membership');
  }
}

/**
 * Get organization details
 */
async function getOrganizationDetails(tenantId) {
  try {
    const params = {
      TableName: ORGANIZATIONS_TABLE,
      Key: { tenantId }
    };
    
    const result = await dynamodb.get(params).promise();
    
    if (!result.Item) {
      throw new NotFoundError('Organization not found');
    }
    
    const organization = result.Item;
    
    if (organization.status === 'suspended') {
      throw new ForbiddenError('Organization is suspended');
    }
    
    if (organization.status === 'trial' && organization.trialEndsAt) {
      const trialEnd = new Date(organization.trialEndsAt);
      if (trialEnd < new Date()) {
        throw new ForbiddenError('Organization trial has expired');
      }
    }
    
    return organization;
    
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error getting organization details:', error);
    throw new TenantError('Failed to get organization details');
  }
}

/**
 * Validate tenant access permissions for the requested operation
 */
async function validateTenantAccess(tenantContext, event) {
  const { userRole, permissions, organizationPlan, organizationSettings } = tenantContext;
  const requestPath = event.path || event.rawPath;
  const httpMethod = event.httpMethod || event.requestContext?.http?.method;
  
  // Check if operation requires specific permissions
  const requiredPermission = getRequiredPermission(requestPath, httpMethod);
  
  if (requiredPermission && !hasPermission(permissions, requiredPermission)) {
    throw new ForbiddenError(`Insufficient permissions for ${requiredPermission}`);
  }
  
  // Check plan-based feature access
  if (requiresPremiumFeature(requestPath) && organizationPlan === 'free') {
    throw new ForbiddenError('This feature requires a premium plan');
  }
  
  // Check organization limits
  await validateOrganizationLimits(tenantContext, event);
}

/**
 * Get required permission for a specific operation
 */
function getRequiredPermission(path, method) {
  const permissionMap = {
    'GET /api/projects': 'read:projects',
    'POST /api/projects': 'write:projects',
    'PUT /api/projects': 'write:projects',
    'DELETE /api/projects': 'delete:projects',
    'GET /api/users': 'read:users',
    'POST /api/users/invite': 'invite:users',
    'PUT /api/organization': 'admin:organization',
    'DELETE /api/organization': 'owner:organization',
    'GET /api/billing': 'read:billing',
    'POST /api/lab-experiments': 'write:lab-experiments'
  };
  
  const key = `${method} ${path}`;
  return permissionMap[key];
}

/**
 * Check if user has required permission
 */
function hasPermission(userPermissions, requiredPermission) {
  if (userPermissions.includes('*')) {
    return true; // Super user permissions
  }
  
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }
  
  // Check wildcard permissions (e.g., "read:*" covers "read:projects")
  const [action, resource] = requiredPermission.split(':');
  const wildcardPermission = `${action}:*`;
  
  return userPermissions.includes(wildcardPermission);
}

/**
 * Check if path requires premium features
 */
function requiresPremiumFeature(path) {
  const premiumPaths = [
    '/api/advanced-analytics',
    '/api/ai-lab/advanced',
    '/api/collaboration/advanced',
    '/api/integrations/enterprise'
  ];
  
  return premiumPaths.some(premiumPath => path.startsWith(premiumPath));
}

/**
 * Validate organization limits (users, storage, API calls, etc.)
 */
async function validateOrganizationLimits(tenantContext, event) {
  const { tenantId, organizationSettings } = tenantContext;
  const { maxUsers, maxStorage } = organizationSettings;
  
  // Check user limit for invitation operations
  if (event.path === '/api/users/invite') {
    const currentUserCount = await getCurrentUserCount(tenantId);
    if (currentUserCount >= maxUsers) {
      throw new ForbiddenError('Organization has reached the maximum number of users');
    }
  }
  
  // Check storage limit for file upload operations
  if (event.httpMethod === 'POST' && event.path?.includes('/files/upload')) {
    const currentStorage = await getCurrentStorageUsage(tenantId);
    if (currentStorage >= maxStorage * 1024 * 1024 * 1024) { // Convert GB to bytes
      throw new ForbiddenError('Organization has reached the storage limit');
    }
  }
}

/**
 * Get current user count for tenant
 */
async function getCurrentUserCount(tenantId) {
  try {
    const params = {
      TableName: USER_ORGS_TABLE,
      IndexName: 'TenantUsersIndex',
      KeyConditionExpression: 'tenantId = :tenantId AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':status': 'active'
      },
      Select: 'COUNT'
    };
    
    const result = await dynamodb.query(params).promise();
    return result.Count || 0;
    
  } catch (error) {
    console.error('Error getting current user count:', error);
    return 0;
  }
}

/**
 * Get current storage usage for tenant (placeholder - would integrate with S3 metrics)
 */
async function getCurrentStorageUsage(tenantId) {
  // This would integrate with CloudWatch metrics or S3 inventory
  // For now, return 0 as placeholder
  return 0;
}

/**
 * Record usage metrics for billing and analytics
 */
async function recordUsageMetrics(tenantContext, event) {
  const { tenantId, userId } = tenantContext;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  
  const metrics = [
    {
      tenantId,
      metricKey: `${today}#api_requests`,
      metricType: 'api_requests',
      value: 1,
      userId,
      timestamp: now,
      path: event.path,
      method: event.httpMethod,
      expiresAt: Math.floor(Date.now() / 1000) + (13 * 30 * 24 * 60 * 60) // 13 months TTL
    }
  ];
  
  // Record file upload metrics
  if (event.httpMethod === 'POST' && event.path?.includes('/files/upload')) {
    const contentLength = parseInt(event.headers['content-length'] || '0');
    metrics.push({
      tenantId,
      metricKey: `${today}#storage_usage`,
      metricType: 'storage_usage',
      value: contentLength,
      userId,
      timestamp: now,
      expiresAt: Math.floor(Date.now() / 1000) + (13 * 30 * 24 * 60 * 60)
    });
  }
  
  // Batch write metrics (fire-and-forget)
  const promises = metrics.map(metric => 
    dynamodb.put({
      TableName: TENANT_USAGE_TABLE,
      Item: metric
    }).promise().catch(error => {
      console.error('Error recording usage metric:', error);
      // Don't fail the request for metrics errors
    })
  );
  
  await Promise.allSettled(promises);
}

// Custom error classes
class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class TenantError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TenantError';
    this.statusCode = 500;
  }
}

// Export for testing
module.exports = {
  handler: exports.handler,
  extractTenantContext,
  validateTenantAccess,
  hasPermission,
  getRequiredPermission
};
