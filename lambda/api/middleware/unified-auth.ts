/**
 * Unified Authentication Middleware for AI Nexus Workbench
 * Provides consistent authentication and authorization across all Lambda functions
 * 
 * Features:
 * - JWT validation against Cognito JWKS
 * - Permission-based authorization
 * - Role-based access control
 * - Subscription plan enforcement
 * - Comprehensive error handling
 * - Security logging
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { permissionsService } from '../services/permissions';

// Types and interfaces
export interface AuthConfig {
  requireAuth?: boolean;
  requiredPermissions?: string[];
  requiredRole?: string;
  requiredPlan?: string;
  allowInternal?: boolean;
  allowAnonymous?: boolean;
}

export interface UserContext {
  userId: string;
  email: string;
  role: string;
  subscriptionTier: string;
  permissions: string[];
  subscriptionLimits: any;
  quotaUsage: any;
  organizations: any[];
  cognitoGroups: string[];
  tenantId?: string;
  organizationId?: string;
  tokenDecoded: JWTClaims;
  lastLogin: string;
}

export interface JWTClaims {
  sub: string;
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

export interface AuthResult {
  userContext?: UserContext;
  error?: APIGatewayProxyResult;
}

// JWKS client for Cognito token verification
const jwks = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

// JWT verification
function getKey(header: any, callback: any) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

function verifyToken(token: string): Promise<JWTClaims> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.USER_POOL_ID}`,
      audience: process.env.USER_POOL_CLIENT_ID,
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

// Main unified authentication middleware
export async function unifiedAuthMiddleware(
  event: APIGatewayProxyEvent,
  config: AuthConfig
): Promise<AuthResult> {
  const requestId = event.requestContext?.requestId || 'unknown';
  
  try {
    // Handle anonymous access
    if (config.allowAnonymous && !config.requireAuth) {
      return { userContext: undefined };
    }

    // Extract token from Authorization header
    const authHeader = event.headers?.['Authorization'] || event.headers?.['authorization'];
    const token = extractBearerToken(authHeader);

    if (!token) {
      if (config.requireAuth === false) {
        return { userContext: undefined };
      }
      
      return {
        error: {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="api"',
          },
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Authentication token required',
            requestId,
          }),
        }
      };
    }

    // Verify and decode JWT token
    let claims: JWTClaims;
    try {
      claims = await verifyToken(token);
    } catch (error: any) {
      console.warn(`Token validation failed for request ${requestId}:`, error.message);
      
      return {
        error: {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer error="invalid_token"',
          },
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Invalid authentication token',
            requestId,
          }),
        }
      };
    }

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp < now) {
      return {
        error: {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer error="invalid_token", error_description="Token expired"',
          },
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Authentication token expired',
            requestId,
          }),
        }
      };
    }

    // Extract user information from claims
    const userId = claims.sub;
    const tenantId = claims['custom:tenant_id'];
    const role = claims['custom:role'] || 'observer';
    const plan = claims['custom:plan'] || 'free';
    const features = claims['custom:features'] ? JSON.parse(claims['custom:features']) : [];
    const cognitoGroups = claims['cognito:groups'] || [];

    // Validate required tenant context for non-platform admins
    if (!tenantId && role !== 'platform_admin' && !config.allowInternal) {
      return {
        error: {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: 'Forbidden',
            message: 'Invalid user configuration - missing tenant information',
            requestId,
          }),
        }
      };
    }

    // Get comprehensive user permissions from the new service
    let userWithPermissions;
    try {
      userWithPermissions = await permissionsService.getUserWithPermissions(userId);
    } catch (error: any) {
      console.error(`Permission resolution failed for user ${userId}:`, error.message);
      
      return {
        error: {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: 'Internal Server Error',
            message: 'Authentication service error',
            requestId,
          }),
        }
      };
    }

    // Build comprehensive user context
    const userContext: UserContext = {
      userId,
      email: claims.email,
      role: userWithPermissions?.effectiveRole || role,
      subscriptionTier: userWithPermissions?.user?.subscription_tier || plan,
      permissions: userWithPermissions?.permissions || generateFallbackPermissions(role, plan, features),
      subscriptionLimits: userWithPermissions?.subscriptionLimits || {},
      quotaUsage: userWithPermissions?.quotaUsage || {},
      organizations: userWithPermissions?.organizations || [],
      cognitoGroups,
      tenantId: tenantId || userWithPermissions?.user?.organization_id,
      organizationId: userWithPermissions?.user?.organization_id,
      tokenDecoded: claims,
      lastLogin: new Date().toISOString(),
    };

    // Perform authorization checks
    const authzResult = await performAuthorizationChecks(userContext, config);
    if (authzResult.error) {
      return authzResult;
    }

    // Log successful authentication
    console.info(`User authenticated successfully: ${userId}`, {
      role: userContext.role,
      plan: userContext.subscriptionTier,
      permissionsCount: userContext.permissions.length,
      requestId,
    });

    return { userContext };

  } catch (error: any) {
    console.error(`Authentication middleware error for request ${requestId}:`, {
      error: error.message,
      stack: error.stack,
    });

    return {
      error: {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Authentication service error',
          requestId,
        }),
      }
    };
  }
}

// Authorization checks
async function performAuthorizationChecks(
  userContext: UserContext,
  config: AuthConfig
): Promise<{ error?: APIGatewayProxyResult }> {
  
  // Check required role
  if (config.requiredRole && !hasRole(userContext.role, config.requiredRole)) {
    return {
      error: {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Forbidden',
          message: `Insufficient role. Required: ${config.requiredRole}, Current: ${userContext.role}`,
        }),
      }
    };
  }

  // Check required permissions
  if (config.requiredPermissions && config.requiredPermissions.length > 0) {
    const missingPermissions = config.requiredPermissions.filter(
      permission => !hasPermission(userContext.permissions, permission)
    );

    if (missingPermissions.length > 0) {
      return {
        error: {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Forbidden',
            message: `Insufficient permissions. Missing: ${missingPermissions.join(', ')}`,
          }),
        }
      };
    }
  }

  // Check required subscription plan
  if (config.requiredPlan && !hasMinimumSubscriptionLevel(userContext.subscriptionTier, config.requiredPlan)) {
    return {
      error: {
        statusCode: 402,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Payment Required',
          message: `Plan upgrade required. Current: ${userContext.subscriptionTier}, Required: ${config.requiredPlan}`,
          upgradeUrl: '/pricing', // Frontend will handle upgrade flow
        }),
      }
    };
  }

  return {}; // No authorization errors
}

// Utility functions for permission and role checking
function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
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

// Role hierarchy checking
const roleHierarchy: { [key: string]: string[] } = {
  'internal_admin': ['internal_admin', 'internal_manager', 'internal_dev', 'enterprise', 'extreme', 'pro', 'basic', 'free'],
  'internal_manager': ['internal_manager', 'internal_dev', 'enterprise', 'extreme', 'pro', 'basic', 'free'],
  'internal_dev': ['internal_dev', 'enterprise', 'extreme', 'pro', 'basic', 'free'],
  'enterprise': ['enterprise', 'extreme', 'pro', 'basic', 'free'],
  'extreme': ['extreme', 'pro', 'basic', 'free'],
  'pro': ['pro', 'basic', 'free'],
  'basic': ['basic', 'free'],
  'free': ['free'],
};

function hasRole(userRole: string, requiredRole: string): boolean {
  const userRoles = roleHierarchy[userRole] || [];
  return userRoles.includes(requiredRole);
}

// Subscription level checking
const subscriptionLevels: { [key: string]: number } = {
  'free': 0,
  'basic': 1,
  'pro': 2,
  'extreme': 3,
  'enterprise': 4,
  'internal_dev': 10,
  'internal_manager': 11,
  'internal_admin': 12,
};

function hasMinimumSubscriptionLevel(userTier: string, requiredTier: string): boolean {
  const userLevel = subscriptionLevels[userTier] || 0;
  const requiredLevel = subscriptionLevels[requiredTier] || 0;
  return userLevel >= requiredLevel;
}

// Fallback permission generation for backward compatibility
function generateFallbackPermissions(role: string, plan: string, features: string[]): string[] {
  const permissions: string[] = [];

  // Base permissions for all authenticated users
  permissions.push('read:profile', 'update:profile');

  // Role-based permissions
  switch (role) {
    case 'internal_admin':
    case 'internal_manager':
      permissions.push('admin:*', 'read:*', 'write:*');
      break;
    case 'internal_dev':
      permissions.push(
        'read:*', 'write:*',
        'studio.create_agents', 'studio.edit_agents', 'studio.view_agents',
        'lab.run_basic_experiments', 'lab.run_advanced_experiments',
        'observatory.basic_analytics', 'observatory.advanced_analytics'
      );
      break;
    case 'enterprise':
      permissions.push(
        'studio.create_agents', 'studio.edit_agents', 'studio.view_agents',
        'lab.run_basic_experiments', 'lab.run_advanced_experiments',
        'observatory.basic_analytics', 'observatory.advanced_analytics',
        'enterprise:*'
      );
      break;
    case 'extreme':
      permissions.push(
        'studio.create_agents', 'studio.edit_agents', 'studio.view_agents',
        'lab.run_basic_experiments', 'lab.run_advanced_experiments',
        'observatory.basic_analytics', 'observatory.advanced_analytics'
      );
      break;
    case 'pro':
      permissions.push(
        'studio.create_agents', 'studio.edit_agents', 'studio.view_agents',
        'lab.run_basic_experiments',
        'observatory.basic_analytics'
      );
      break;
    case 'basic':
      permissions.push(
        'studio.create_agents', 'studio.view_agents',
        'lab.run_basic_experiments',
        'observatory.basic_analytics'
      );
      break;
    case 'free':
    default:
      permissions.push('studio.view_agents');
      break;
  }

  // Plan-based permissions
  if (plan === 'enterprise') {
    permissions.push('enterprise:*');
  } else if (plan === 'pro') {
    permissions.push('pro:*');
  }

  return [...new Set(permissions)]; // Remove duplicates
}

// Export utility functions for use in other modules
export {
  hasPermission,
  hasRole,
  hasMinimumSubscriptionLevel,
  verifyToken,
  extractBearerToken,
};