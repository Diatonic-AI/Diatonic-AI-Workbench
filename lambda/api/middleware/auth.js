// AI Nexus Workbench - Authentication Middleware
// JWT token validation and user context resolution with Cognito integration

const jwt = require('jsonwebtoken');
const { CognitoIdentityProviderClient } = require('@aws-sdk/client-cognito-identity-provider');

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const { USER_POOL_ID, USER_POOL_CLIENT_ID } = process.env;

/**
 * Validate JWT token and get user context with permissions
 */
async function validateAndGetUserContext(authHeader, permissionsClient) {
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header format');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Decode token without verification first to get user info
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded || !decoded.payload) {
      throw new Error('Invalid token format');
    }

    const { sub: userId, email, 'cognito:groups': cognitoGroups = [] } = decoded.payload;

    if (!userId) {
      throw new Error('Token missing user ID');
    }

    // Get user from our permissions system
    let userWithPermissions = await permissionsClient.getUserWithPermissions(userId);
    
    // If user doesn't exist in our system, create from Cognito data
    if (!userWithPermissions) {
      console.log(`Creating new user from Cognito: ${userId}`);
      
      // Map Cognito groups to our role system
      let role = 'free'; // Default role
      
      for (const group of cognitoGroups) {
        const groupMapping = await permissionsClient.getCognitoGroupMapping(group);
        if (groupMapping) {
          role = groupMapping.role;
          break;
        }
      }
      
      // Create user in our system
      await permissionsClient.upsertUser({
        user_id: userId,
        email: email,
        role: role,
        subscription_tier: role.startsWith('internal_') ? 'internal' : role,
        status: 'active',
        cognito_groups: cognitoGroups,
        last_login_at: new Date().toISOString()
      });
      
      // Initialize quotas for new user
      if (!role.startsWith('internal_')) {
        await permissionsClient.updateUserQuotas(userId, role);
      }
      
      // Get the newly created user
      userWithPermissions = await permissionsClient.getUserWithPermissions(userId);
    } else {
      // Update last login time
      await permissionsClient.dynamodb.update({
        TableName: permissionsClient.tables.users,
        Key: { user_id: userId },
        UpdateExpression: 'SET last_login_at = :timestamp',
        ExpressionAttributeValues: {
          ':timestamp': new Date().toISOString()
        }
      });
    }

    if (!userWithPermissions) {
      throw new Error('Failed to create or retrieve user context');
    }

    // Build comprehensive user context
    const userContext = {
      userId: userId,
      email: email,
      role: userWithPermissions.effectiveRole,
      subscriptionTier: userWithPermissions.user.subscription_tier,
      permissions: userWithPermissions.permissions,
      subscriptionLimits: userWithPermissions.subscriptionLimits,
      quotaUsage: userWithPermissions.quotaUsage,
      organizations: userWithPermissions.organizations,
      cognitoGroups: cognitoGroups,
      user: userWithPermissions.user,
      token: token,
      tokenDecoded: decoded.payload,
      lastLogin: new Date().toISOString()
    };

    return userContext;

  } catch (error) {
    console.error('Authentication failed:', error.message);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Verify user has required permission
 */
async function requirePermission(userContext, requiredPermission, permissionsClient) {
  if (!userContext) {
    throw new Error('Authentication required');
  }

  const hasPermission = await permissionsClient.checkPermission(userContext, requiredPermission);
  
  if (!hasPermission) {
    throw new Error(`Insufficient permissions. Required: ${requiredPermission}`);
  }

  return true;
}

/**
 * Verify user has any of the required permissions
 */
async function requireAnyPermission(userContext, requiredPermissions, permissionsClient) {
  if (!userContext) {
    throw new Error('Authentication required');
  }

  for (const permission of requiredPermissions) {
    const hasPermission = await permissionsClient.checkPermission(userContext, permission);
    if (hasPermission) {
      return true;
    }
  }

  throw new Error(`Insufficient permissions. Required one of: ${requiredPermissions.join(', ')}`);
}

/**
 * Check if user has internal/admin role
 */
function isInternalUser(userContext) {
  return userContext && 
         userContext.role && 
         userContext.role.startsWith('internal_');
}

/**
 * Check if user is admin
 */
function isAdmin(userContext) {
  return userContext && 
         (userContext.role === 'internal_admin' || 
          userContext.role === 'internal_manager');
}

/**
 * Get user's subscription tier level (for comparison)
 */
function getSubscriptionLevel(subscriptionTier) {
  const levels = {
    'free': 0,
    'basic': 1,
    'pro': 2,
    'extreme': 3,
    'enterprise': 4,
    'internal_dev': 10,
    'internal_manager': 11,
    'internal_admin': 12
  };
  
  return levels[subscriptionTier] || 0;
}

/**
 * Check if user has specific permission (non-async version)
 */
async function hasPermission(userContext, requiredPermission, permissionsClient) {
  if (!userContext || !userContext.permissions) {
    return false;
  }
  
  return await permissionsClient.checkPermission(userContext, requiredPermission);
}

/**
 * Check if user has minimum subscription level
 */
function hasMinimumSubscriptionLevel(userContext, minimumTier) {
  if (!userContext) return false;
  
  const userLevel = getSubscriptionLevel(userContext.subscriptionTier || userContext.role);
  const requiredLevel = getSubscriptionLevel(minimumTier);
  
  return userLevel >= requiredLevel;
}

module.exports = {
  validateAndGetUserContext,
  requirePermission,
  requireAnyPermission,
  hasPermission,
  isInternalUser,
  isAdmin,
  getSubscriptionLevel,
  hasMinimumSubscriptionLevel
};
