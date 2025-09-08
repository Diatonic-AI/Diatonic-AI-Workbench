// AI Nexus Workbench - Roles Handler
// Handle role management API endpoints

const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth');

/**
 * List all roles
 */
async function listRoles(queryParams, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const result = await permissionsClient.dynamodb.scan({
      TableName: permissionsClient.tables.roles
    });

    const roles = result.Items.map(role => ({
      roleId: role.role_id,
      roleName: role.role_name,
      description: role.description,
      isDefault: role.is_default || false,
      permissionCount: role.permissions ? role.permissions.length : 0,
      createdAt: role.created_at,
      updatedAt: role.updated_at
    }));

    logger.info('Roles listed', { 
      count: roles.length,
      requestedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        roles: roles,
        count: roles.length,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error listing roles', { error: error.message });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to list roles',
        message: error.message
      })
    };
  }
}

/**
 * Get specific role
 */
async function getRole(roleId, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const role = await permissionsClient.getRole(roleId);
    
    if (!role) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Role not found' })
      };
    }

    const roleData = {
      roleId: role.role_id,
      roleName: role.role_name,
      description: role.description,
      isDefault: role.is_default || false,
      permissions: role.permissions || [],
      permissionCount: role.permissions ? role.permissions.length : 0,
      createdAt: role.created_at,
      updatedAt: role.updated_at
    };

    logger.info('Role retrieved', { 
      roleId: roleId,
      requestedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        role: roleData,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error getting role', { error: error.message, roleId });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to retrieve role',
        message: error.message
      })
    };
  }
}

/**
 * Create new role
 */
async function createRole(requestBody, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const { roleName, description, permissions = [], isDefault = false } = JSON.parse(requestBody || '{}');
    
    if (!roleName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Role name is required' })
      };
    }

    // Check if role already exists
    const existingRole = await permissionsClient.getRole(roleName);
    if (existingRole) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'Role already exists' })
      };
    }

    // Create role
    const roleId = roleName; // Using role name as ID for simplicity
    const timestamp = new Date().toISOString();
    
    await permissionsClient.dynamodb.put({
      TableName: permissionsClient.tables.roles,
      Item: {
        role_id: roleId,
        role_name: roleName,
        description: description || '',
        permissions: permissions,
        is_default: isDefault,
        created_at: timestamp,
        updated_at: timestamp,
        created_by: userContext.userId
      }
    });

    logger.info('Role created', { 
      roleId: roleId,
      roleName: roleName,
      createdBy: userContext.userId
    });

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Role created successfully',
        role: {
          roleId: roleId,
          roleName: roleName,
          description: description,
          permissions: permissions,
          isDefault: isDefault,
          createdAt: timestamp
        },
        timestamp: timestamp
      })
    };

  } catch (error) {
    logger.error('Error creating role', { error: error.message });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to create role',
        message: error.message
      })
    };
  }
}

/**
 * Update role
 */
async function updateRole(roleId, requestBody, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const updateData = JSON.parse(requestBody || '{}');
    
    // Allowed fields for role updates
    const allowedFields = ['description', 'permissions', 'is_default'];
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

    // Check if role exists
    const existingRole = await permissionsClient.getRole(roleId);
    if (!existingRole) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Role not found' })
      };
    }

    // Update role
    const timestamp = new Date().toISOString();
    const updateExpression = Object.keys(updates).map(field => `${field} = :${field}`).join(', ');
    const expressionAttributeValues = { ':timestamp': timestamp };
    
    Object.keys(updates).forEach(field => {
      expressionAttributeValues[`:${field}`] = updates[field];
    });

    await permissionsClient.dynamodb.update({
      TableName: permissionsClient.tables.roles,
      Key: { role_id: roleId },
      UpdateExpression: `SET ${updateExpression}, updated_at = :timestamp`,
      ExpressionAttributeValues: expressionAttributeValues
    });

    logger.info('Role updated', { 
      roleId: roleId,
      updatedBy: userContext.userId,
      updatedFields: Object.keys(updates)
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Role updated successfully',
        updatedFields: Object.keys(updates),
        timestamp: timestamp
      })
    };

  } catch (error) {
    logger.error('Error updating role', { error: error.message, roleId });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to update role',
        message: error.message
      })
    };
  }
}

/**
 * Delete role
 */
async function deleteRole(roleId, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    // Check if role exists
    const existingRole = await permissionsClient.getRole(roleId);
    if (!existingRole) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Role not found' })
      };
    }

    // Check if role is default - prevent deletion of default roles
    if (existingRole.is_default) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Cannot delete default role' })
      };
    }

    // Check if any users have this role
    const usersWithRole = await permissionsClient.dynamodb.scan({
      TableName: permissionsClient.tables.users,
      FilterExpression: '#role = :role',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':role': roleId }
    });

    if (usersWithRole.Items && usersWithRole.Items.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Cannot delete role that is assigned to users',
          userCount: usersWithRole.Items.length
        })
      };
    }

    // Delete role
    await permissionsClient.dynamodb.delete({
      TableName: permissionsClient.tables.roles,
      Key: { role_id: roleId }
    });

    // Also remove any role permissions
    await permissionsClient.dynamodb.delete({
      TableName: permissionsClient.tables.role_permissions,
      Key: { role_id: roleId }
    });

    logger.info('Role deleted', { 
      roleId: roleId,
      deletedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Role deleted successfully',
        roleId: roleId,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error deleting role', { error: error.message, roleId });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to delete role',
        message: error.message
      })
    };
  }
}

/**
 * Add permission to role
 */
async function addRolePermission(roleId, requestBody, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const { permission } = JSON.parse(requestBody || '{}');
    
    if (!permission) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Permission name required' })
      };
    }

    // Check if role exists
    const existingRole = await permissionsClient.getRole(roleId);
    if (!existingRole) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Role not found' })
      };
    }

    // Add permission to role
    const currentPermissions = existingRole.permissions || [];
    if (!currentPermissions.includes(permission)) {
      currentPermissions.push(permission);

      await permissionsClient.dynamodb.update({
        TableName: permissionsClient.tables.roles,
        Key: { role_id: roleId },
        UpdateExpression: 'SET permissions = :permissions, updated_at = :timestamp',
        ExpressionAttributeValues: {
          ':permissions': currentPermissions,
          ':timestamp': new Date().toISOString()
        }
      });
    }

    logger.info('Role permission added', { 
      roleId: roleId,
      permission: permission,
      addedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Permission added to role successfully',
        roleId: roleId,
        permission: permission,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error adding role permission', { error: error.message, roleId });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to add role permission',
        message: error.message
      })
    };
  }
}

/**
 * Remove permission from role
 */
async function removeRolePermission(roleId, requestBody, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const { permission } = JSON.parse(requestBody || '{}');
    
    if (!permission) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Permission name required' })
      };
    }

    // Check if role exists
    const existingRole = await permissionsClient.getRole(roleId);
    if (!existingRole) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Role not found' })
      };
    }

    // Remove permission from role
    const currentPermissions = existingRole.permissions || [];
    const updatedPermissions = currentPermissions.filter(p => p !== permission);

    await permissionsClient.dynamodb.update({
      TableName: permissionsClient.tables.roles,
      Key: { role_id: roleId },
      UpdateExpression: 'SET permissions = :permissions, updated_at = :timestamp',
      ExpressionAttributeValues: {
        ':permissions': updatedPermissions,
        ':timestamp': new Date().toISOString()
      }
    });

    logger.info('Role permission removed', { 
      roleId: roleId,
      permission: permission,
      removedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Permission removed from role successfully',
        roleId: roleId,
        permission: permission,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error removing role permission', { error: error.message, roleId });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to remove role permission',
        message: error.message
      })
    };
  }
}

/**
 * Get users with specific role
 */
async function getRoleUsers(roleId, queryParams, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const { limit = 50, offset = 0 } = queryParams || {};

    // Check if role exists
    const existingRole = await permissionsClient.getRole(roleId);
    if (!existingRole) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Role not found' })
      };
    }

    // Get users with this role
    const result = await permissionsClient.dynamodb.scan({
      TableName: permissionsClient.tables.users,
      FilterExpression: '#role = :role',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':role': roleId },
      Limit: parseInt(limit)
    });

    const users = (result.Items || []).map(user => ({
      userId: user.user_id,
      email: user.email,
      subscriptionTier: user.subscription_tier,
      organizationId: user.organization_id,
      status: user.status,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at
    }));

    logger.info('Role users retrieved', { 
      roleId: roleId,
      userCount: users.length,
      requestedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        role: {
          roleId: existingRole.role_id,
          roleName: existingRole.role_name
        },
        users: users,
        count: users.length,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error getting role users', { error: error.message, roleId });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to retrieve role users',
        message: error.message
      })
    };
  }
}

module.exports = {
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  addRolePermission,
  removeRolePermission,
  getRoleUsers
};
