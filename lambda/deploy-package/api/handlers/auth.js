// AI Nexus Workbench - Auth Handler
// Handle authentication-related API endpoints

const logger = require('../utils/logger');

/**
 * Get current user information
 */
async function getCurrentUser(userContext, permissionsClient) {
  try {
    if (!userContext) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    // Get fresh user data with full permissions context
    const userWithPermissions = await permissionsClient.getUserWithPermissions(userContext.userId);
    
    if (!userWithPermissions) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    // Build safe user response (no sensitive data)
    const userResponse = {
      userId: userContext.userId,
      email: userContext.email,
      role: userWithPermissions.effectiveRole,
      subscriptionTier: userWithPermissions.user.subscription_tier,
      organizationId: userWithPermissions.user.organization_id,
      profile: userWithPermissions.user.profile,
      status: userWithPermissions.user.status,
      permissions: userWithPermissions.permissions,
      subscriptionLimits: userWithPermissions.subscriptionLimits,
      quotaUsage: userWithPermissions.quotaUsage,
      organizations: userWithPermissions.organizations.map(org => ({
        organizationId: org.organization_id,
        role: org.role,
        status: org.status,
        joinedAt: org.joined_at
      })),
      createdAt: userWithPermissions.user.created_at,
      updatedAt: userWithPermissions.user.updated_at,
      lastLoginAt: userWithPermissions.user.last_login_at
    };

    logger.info('Current user retrieved', { 
      userId: userContext.userId,
      role: userResponse.role,
      permissionsCount: userResponse.permissions.length
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        user: userResponse,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error getting current user', { error: error.message });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to retrieve user information',
        message: error.message
      })
    };
  }
}

/**
 * Get user permissions (detailed view)
 */
async function getUserPermissions(userContext, permissionsClient) {
  try {
    if (!userContext) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    // Get individual permissions
    const individualPermissions = await permissionsClient.getUserPermissions(userContext.userId);
    
    // Get role-based permissions
    let rolePermissions = [];
    if (userContext.role) {
      rolePermissions = await permissionsClient.getRolePermissions(userContext.role);
    }
    
    // Get subscription tier permissions
    const subscriptionTier = userContext.subscriptionTier || userContext.role || 'free';
    const tierPermissions = await permissionsClient.getSubscriptionPermissions(subscriptionTier);
    
    // Build permissions breakdown
    const permissionsResponse = {
      userId: userContext.userId,
      effectiveRole: userContext.role,
      subscriptionTier: subscriptionTier,
      permissions: {
        individual: individualPermissions,
        fromRole: rolePermissions,
        fromSubscription: tierPermissions,
        effective: [...new Set([...individualPermissions, ...rolePermissions, ...tierPermissions])]
      },
      permissionCount: {
        individual: individualPermissions.length,
        fromRole: rolePermissions.length,
        fromSubscription: tierPermissions.length,
        total: [...new Set([...individualPermissions, ...rolePermissions, ...tierPermissions])].length
      },
      subscriptionLimits: userContext.subscriptionLimits
    };

    logger.info('User permissions retrieved', { 
      userId: userContext.userId,
      totalPermissions: permissionsResponse.permissionCount.total
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        permissions: permissionsResponse,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error getting user permissions', { error: error.message });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to retrieve user permissions',
        message: error.message
      })
    };
  }
}

/**
 * Refresh user context (useful after subscription changes)
 */
async function refreshUserContext(requestBody, permissionsClient) {
  try {
    const { userId } = JSON.parse(requestBody || '{}');
    
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User ID required' })
      };
    }

    // Get fresh user context
    const userWithPermissions = await permissionsClient.getUserWithPermissions(userId);
    
    if (!userWithPermissions) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    // Update quotas if subscription changed
    const subscriptionTier = userWithPermissions.user.subscription_tier;
    if (subscriptionTier && !subscriptionTier.startsWith('internal_')) {
      await permissionsClient.updateUserQuotas(userId, subscriptionTier);
    }

    logger.info('User context refreshed', { 
      userId: userId,
      role: userWithPermissions.effectiveRole
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'User context refreshed successfully',
        userId: userId,
        effectiveRole: userWithPermissions.effectiveRole,
        subscriptionTier: userWithPermissions.user.subscription_tier,
        permissionsCount: userWithPermissions.permissions.length,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error refreshing user context', { error: error.message });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to refresh user context',
        message: error.message
      })
    };
  }
}

module.exports = {
  getCurrentUser,
  getUserPermissions,
  refreshUserContext
};
