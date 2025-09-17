import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { permissionsService } from '../services/permissions';

// Logger interface
interface Logger {
  error: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

// Clients interface
interface Clients {
  [key: string]: unknown;
}

// User quota interface
interface UserQuota {
  type: string;
  limit: number;
  used: number;
  reset_date?: string;
}

interface RequestContext {
  requestId: string;
  tenantId?: string;
  userId?: string;
  userRole?: string;
  userPlan?: string;
  userPermissions?: string[];
  organizationId?: string;
  subscriptionTier?: string;
  userQuotas?: UserQuota[];
  logger: Logger;
  clients: Clients;
}

interface JWTClaims {
  sub: string; // User ID
  email: string;
  'custom:tenant_id'?: string;
  'custom:role'?: string;
  'custom:plan'?: string;
  'custom:features'?: string;
  'cognito:groups'?: string[];
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

// JWKS client for Cognito token verification
const jwks = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

// JWT Header interface
interface JWTHeader {
  alg: string;
  kid: string;
  typ: string;
}

// JWT callback function type
type JWTCallback = (err: Error | null, key?: string) => void;

// Get signing key for JWT verification
function getKey(header: JWTHeader, callback: JWTCallback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// Verify and decode JWT token
function verifyToken(token: string): Promise<JWTClaims> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.USER_POOL_ID}`,
      algorithms: ['RS256'],
    }, (err, decoded) => {
      if (err) {
        return reject(err);
      }
      resolve(decoded as JWTClaims);
    });
  });
}

// Extract Bearer token from Authorization header
function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  return match ? match[1] : null;
}

// Role hierarchy for permission checking
const roleHierarchy = {
  platform_admin: ['platform_admin', 'tenant_admin', 'developer', 'analyst', 'observer'],
  tenant_admin: ['tenant_admin', 'developer', 'analyst', 'observer'],
  developer: ['developer', 'analyst', 'observer'],
  analyst: ['analyst', 'observer'],
  observer: ['observer'],
};

// Check if user has required role
function hasRole(userRole: string, requiredRole: string): boolean {
  const userRoles = roleHierarchy[userRole as keyof typeof roleHierarchy] || [];
  return userRoles.includes(requiredRole);
}

// Permission resolution result interface
interface PermissionResolutionResult {
  permissions: string[];
  quotas: UserQuota[];
  organizationId?: string;
  subscriptionTier?: string;
}

// Enhanced permission resolution using the new permissions service
async function resolveUserPermissions(
  userId: string,
  fallbackRole?: string,
  fallbackPlan?: string,
  fallbackFeatures?: string[]
): Promise<PermissionResolutionResult> {
  try {
    // Get comprehensive user permissions from the new service
    const userWithPermissions = await permissionsService.getUserWithPermissions(userId);
    
    if (userWithPermissions.user) {
      // User exists in the new permissions system
      return {
        permissions: userWithPermissions.permissions,
        quotas: userWithPermissions.quotas,
        organizationId: userWithPermissions.user.organization_id,
        subscriptionTier: userWithPermissions.user.subscription_tier
      };
    } else {
      // Fallback to legacy permission generation for backward compatibility
      const permissions = generateLegacyPermissions(
        fallbackRole || 'observer',
        fallbackPlan || 'free',
        fallbackFeatures || []
      );
      
      return {
        permissions,
        quotas: [],
        organizationId: undefined,
        subscriptionTier: fallbackPlan || 'free'
      };
    }
  } catch (error) {
    console.error('Error resolving user permissions:', error);
    // Return minimal permissions on error
    return {
      permissions: ['read:profile', 'update:profile'],
      quotas: [],
      organizationId: undefined,
      subscriptionTier: 'free'
    };
  }
}

// Legacy permission generation for backward compatibility
function generateLegacyPermissions(role: string, plan: string, features: string[]): string[] {
  const permissions: string[] = [];

  // Base permissions for all authenticated users
  permissions.push('read:profile', 'update:profile');

  // Role-based permissions (simplified for backward compatibility)
  switch (role) {
    case 'platform_admin':
      permissions.push('admin:*', 'read:*', 'write:*');
      break;
    case 'tenant_admin':
    case 'developer':
      permissions.push(
        'read:projects', 'write:projects',
        'read:agents', 'write:agents',
        'read:experiments', 'write:experiments'
      );
      break;
    case 'analyst':
    case 'observer':
    default:
      permissions.push('read:projects', 'read:agents');
      break;
  }

  // Plan-based permissions
  if (plan === 'enterprise') {
    permissions.push('enterprise:*');
  } else if (plan === 'pro') {
    permissions.push('pro:*');
  }

  return [...new Set(permissions)];
}

// Authentication middleware
export async function authMiddleware(
  event: APIGatewayProxyEvent,
  context: RequestContext
): Promise<APIGatewayProxyResult> {
  try {
    // Extract token from Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      context.logger.warn('Missing authentication token');
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer realm="api"',
        },
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication token required',
          requestId: context.requestId,
        }),
      };
    }

    // Verify and decode JWT token
    let claims: JWTClaims;
    try {
      claims = await verifyToken(token);
    } catch (error) {
      context.logger.warn('Invalid authentication token', { error: error.message });
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer error="invalid_token"',
        },
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid authentication token',
          requestId: context.requestId,
        }),
      };
    }

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp < now) {
      context.logger.warn('Expired authentication token');
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer error="invalid_token", error_description="Token expired"',
        },
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication token expired',
          requestId: context.requestId,
        }),
      };
    }

    // Extract user information from claims
    const userId = claims.sub;
    const tenantId = claims['custom:tenant_id'];
    const role = claims['custom:role'] || 'observer';
    const plan = claims['custom:plan'] || 'free';
    const features = claims['custom:features'] ? JSON.parse(claims['custom:features']) : [];

    // Validate required custom attributes
    if (!tenantId && role !== 'platform_admin') {
      context.logger.error('Missing tenant_id in JWT claims', { userId, role });
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'Invalid user configuration - missing tenant information',
          requestId: context.requestId,
        }),
      };
    }

    // Resolve user permissions using the new enhanced service
    const permissionData = await resolveUserPermissions(userId, role, plan, features);

    // Update request context with user information
    context.userId = userId;
    context.tenantId = tenantId || permissionData.organizationId;
    context.userRole = role;
    context.userPlan = plan;
    context.userPermissions = permissionData.permissions;
    context.organizationId = permissionData.organizationId;
    context.subscriptionTier = permissionData.subscriptionTier;
    context.userQuotas = permissionData.quotas;

    // Log successful authentication
    context.logger.info('User authenticated successfully', {
      userId,
      tenantId,
      organizationId: permissionData.organizationId,
      role,
      plan,
      subscriptionTier: permissionData.subscriptionTier,
      permissionsCount: permissionData.permissions.length,
      quotasCount: permissionData.quotas.length,
    });

    // Continue to next middleware (no error response)
    return {
      statusCode: 200,
      headers: {},
      body: '',
    };

  } catch (error) {
    context.logger.error('Authentication middleware error', { 
      error: error.message,
      stack: error.stack,
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Authentication service error',
        requestId: context.requestId,
      }),
    };
  }
}

// Utility function to check permissions
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  // Check for exact match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check for wildcard permissions
  const [action, resource] = requiredPermission.split(':');
  const wildcardPermissions = [
    `${action}:*`,  // Same action, any resource
    `*:${resource}`, // Any action, same resource
    '*:*',          // Any action, any resource
  ];

  return wildcardPermissions.some(wildcard => userPermissions.includes(wildcard));
}

// Utility function to check role hierarchy
export function hasRequiredRole(userRole: string, requiredRole: string): boolean {
  return hasRole(userRole, requiredRole);
}
