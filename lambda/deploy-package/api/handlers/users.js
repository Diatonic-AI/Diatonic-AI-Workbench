// AI Nexus Workbench - Users Handler
// Handle user management API endpoints

const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth');

/**
 * List users with filtering and pagination
 */
async function listUsers(queryParams, userContext, permissionsClient) {
  try {
    // Check admin permissions
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const { 
      organization_id,
      role,
      subscription_tier,
      limit = 50,
      offset = 0 
    } = queryParams || {};

    let users;
    
    if (organization_id) {
      // Get users in specific organization
      users = await permissionsClient.getOrganizationUsers(organization_id, role);
    } else {
      // For now, we'll implement a basic scan - in production, you'd want better pagination
      // This is a simplified implementation for demonstration
      const result = await permissionsClient.dynamodb.scan({
        TableName: permissionsClient.tables.users,
        Limit: parseInt(limit),
        ExclusiveStartKey: offset > 0 ? { user_id: offset } : undefined,
        FilterExpression: subscription_tier ? 'subscription_tier = :tier' : undefined,
        ExpressionAttributeValues: subscription_tier ? { ':tier': subscription_tier } : undefined
      });
      
      users = result.Items || [];
    }

    // Remove sensitive information
    const safeUsers = users.map(user => ({
      userId: user.user_id,
      email: user.email,
      role: user.role,
      subscriptionTier: user.subscription_tier,
      organizationId: user.organization_id,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: user.last_login_at
    }));

    logger.info('Users listed', { 
      count: safeUsers.length,
      requestedBy: userContext.userId,
      filters: { organization_id, role, subscription_tier }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        users: safeUsers,
        count: safeUsers.length,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: safeUsers.length === parseInt(limit)
        },
        filters: { organization_id, role, subscription_tier },
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error listing users', { error: error.message });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to list users',
        message: error.message
      })
    };
  }
}

/**
 * Get current user's profile
 */
async function getCurrentUserProfile(userContext, permissionsClient) {
  try {
    if (!userContext) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    const userWithPermissions = await permissionsClient.getUserWithPermissions(userContext.userId);
    
    if (!userWithPermissions) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User profile not found' })
      };
    }

    const profile = {
      userId: userWithPermissions.user.user_id,
      email: userWithPermissions.user.email,
      role: userWithPermissions.effectiveRole,
      subscriptionTier: userWithPermissions.user.subscription_tier,
      organizationId: userWithPermissions.user.organization_id,
      profile: userWithPermissions.user.profile,
      status: userWithPermissions.user.status,
      permissions: userWithPermissions.permissions,
      subscriptionLimits: userWithPermissions.subscriptionLimits,
      quotaUsage: userWithPermissions.quotaUsage,
      organizations: userWithPermissions.organizations,
      createdAt: userWithPermissions.user.created_at,
      updatedAt: userWithPermissions.user.updated_at,
      lastLoginAt: userWithPermissions.user.last_login_at,
      preferences: userWithPermissions.user.preferences || {}
    };

    logger.info('User profile retrieved', { 
      userId: userContext.userId,
      role: profile.role
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        profile: profile,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error getting user profile', { error: error.message });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to retrieve user profile',
        message: error.message
      })
    };
  }
}

/**
 * Update current user's profile
 */
async function updateCurrentUserProfile(requestBody, userContext, permissionsClient) {
  try {
    if (!userContext) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    const updateData = JSON.parse(requestBody || '{}');
    
    // Only allow updating certain fields
    const allowedFields = ['profile', 'preferences'];
    const updates = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No valid fields to update' })
      };
    }

    // Update user data
    const timestamp = new Date().toISOString();
    const updateExpression = Object.keys(updates).map(field => `${field} = :${field}`).join(', ');
    const expressionAttributeValues = {};
    
    Object.keys(updates).forEach(field => {
      expressionAttributeValues[`:${field}`] = updates[field];
    });
    expressionAttributeValues[':timestamp'] = timestamp;

    await permissionsClient.dynamodb.update({
      TableName: permissionsClient.tables.users,
      Key: { user_id: userContext.userId },
      UpdateExpression: `SET ${updateExpression}, updated_at = :timestamp`,
      ExpressionAttributeValues: expressionAttributeValues
    });

    logger.info('User profile updated', { 
      userId: userContext.userId,
      updatedFields: Object.keys(updates)
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Profile updated successfully',
        updatedFields: Object.keys(updates),
        timestamp: timestamp
      })
    };

  } catch (error) {
    logger.error('Error updating user profile', { error: error.message });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to update user profile',
        message: error.message
      })
    };
  }
}

/**
 * Get specific user (admin only)
 */
async function getUser(userId, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const userWithPermissions = await permissionsClient.getUserWithPermissions(userId);
    
    if (!userWithPermissions) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const userData = {
      userId: userWithPermissions.user.user_id,
      email: userWithPermissions.user.email,
      role: userWithPermissions.effectiveRole,
      subscriptionTier: userWithPermissions.user.subscription_tier,
      organizationId: userWithPermissions.user.organization_id,
      profile: userWithPermissions.user.profile,
      status: userWithPermissions.user.status,
      permissions: userWithPermissions.permissions,
      subscriptionLimits: userWithPermissions.subscriptionLimits,
      quotaUsage: userWithPermissions.quotaUsage,
      organizations: userWithPermissions.organizations,
      createdAt: userWithPermissions.user.created_at,
      updatedAt: userWithPermissions.user.updated_at,
      lastLoginAt: userWithPermissions.user.last_login_at
    };

    logger.info('User retrieved', { 
      targetUserId: userId,
      requestedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        user: userData,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error getting user', { error: error.message, targetUserId: userId });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to retrieve user',
        message: error.message
      })
    };
  }
}

/**
 * Update user (admin only)
 */
async function updateUser(userId, requestBody, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const updateData = JSON.parse(requestBody || '{}');
    
    // Allowed fields for admin updates
    const allowedFields = ['role', 'subscription_tier', 'status', 'organization_id', 'profile'];
    const updates = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No valid fields to update' })
      };
    }

    // Update user data
    const timestamp = new Date().toISOString();
    let updateExpression = Object.keys(updates).map(field => {
      if (field === 'role') {
        return '#role = :role';
      }
      return `${field} = :${field}`;
    }).join(', ');
    updateExpression += ', updated_at = :timestamp';
    
    const expressionAttributeNames = updates.role ? { '#role': 'role' } : {};
    const expressionAttributeValues = { ':timestamp': timestamp };
    
    Object.keys(updates).forEach(field => {
      expressionAttributeValues[`:${field}`] = updates[field];
    });

    await permissionsClient.dynamodb.update({
      TableName: permissionsClient.tables.users,
      Key: { user_id: userId },
      UpdateExpression: `SET ${updateExpression}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues
    });

    // Update quotas if subscription tier changed
    if (updates.subscription_tier && !updates.subscription_tier.startsWith('internal_')) {
      await permissionsClient.updateUserQuotas(userId, updates.subscription_tier);
    }

    logger.info('User updated', { 
      targetUserId: userId,
      updatedBy: userContext.userId,
      updatedFields: Object.keys(updates)
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'User updated successfully',
        updatedFields: Object.keys(updates),
        timestamp: timestamp
      })
    };

  } catch (error) {
    logger.error('Error updating user', { error: error.message, targetUserId: userId });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to update user',
        message: error.message
      })
    };
  }
}

/**
 * Grant permission to user
 */
async function grantUserPermission(userId, requestBody, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const { permission } = JSON.parse(requestBody || '{}');
    
    if (!permission) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Permission name required' })
      };
    }

    await permissionsClient.grantUserPermission(userId, permission, userContext.userId);

    logger.info('User permission granted', { 
      targetUserId: userId,
      permission: permission,
      grantedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Permission granted successfully',
        userId: userId,
        permission: permission,
        grantedBy: userContext.userId,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error granting user permission', { error: error.message, targetUserId: userId });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to grant user permission',
        message: error.message
      })
    };
  }
}

/**
 * Revoke permission from user
 */
async function revokeUserPermission(userId, requestBody, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const { permission } = JSON.parse(requestBody || '{}');
    
    if (!permission) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Permission name required' })
      };
    }

    await permissionsClient.revokeUserPermission(userId, permission);

    logger.info('User permission revoked', { 
      targetUserId: userId,
      permission: permission,
      revokedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Permission revoked successfully',
        userId: userId,
        permission: permission,
        revokedBy: userContext.userId,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error revoking user permission', { error: error.message, targetUserId: userId });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to revoke user permission',
        message: error.message
      })
    };
  }
}

/**
 * Get user permissions
 */
async function getUserPermissions(userId, userContext, permissionsClient) {
  try {
    // Users can view their own permissions, admins can view any user's permissions
    if (userContext.userId !== userId) {
      await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);
    }

    const userWithPermissions = await permissionsClient.getUserWithPermissions(userId);
    
    if (!userWithPermissions) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const permissions = {
      userId: userId,
      effectiveRole: userWithPermissions.effectiveRole,
      subscriptionTier: userWithPermissions.user.subscription_tier,
      permissions: userWithPermissions.permissions,
      permissionCount: userWithPermissions.permissions.length,
      subscriptionLimits: userWithPermissions.subscriptionLimits,
      quotaUsage: userWithPermissions.quotaUsage
    };

    logger.info('User permissions retrieved', { 
      targetUserId: userId,
      requestedBy: userContext.userId,
      permissionCount: permissions.permissionCount
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        permissions: permissions,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error getting user permissions', { error: error.message, targetUserId: userId });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to retrieve user permissions',
        message: error.message
      })
    };
  }
}

module.exports = {
  listUsers,
  getCurrentUserProfile,
  updateCurrentUserProfile,
  getUser,
  updateUser,
  grantUserPermission,
  revokeUserPermission,
  getUserPermissions
};
