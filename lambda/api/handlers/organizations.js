// AI Nexus Workbench - Organizations Handler
// Handle organization management API endpoints

const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth');

/**
 * List organizations (for admins) or user's organizations
 */
async function listOrganizations(queryParams, userContext, permissionsClient) {
  try {
    const { limit = 50, offset = 0 } = queryParams || {};
    
    let organizations;
    
    if (await authMiddleware.hasPermission(userContext, 'internal.user_management', permissionsClient)) {
      // Admin: list all organizations
      const result = await permissionsClient.dynamodb.scan({
        TableName: permissionsClient.tables.organization_settings,
        Limit: parseInt(limit)
      });
      
      organizations = result.Items || [];
    } else {
      // Regular user: list only their organizations
      const userWithPermissions = await permissionsClient.getUserWithPermissions(userContext.userId);
      organizations = userWithPermissions.organizations || [];
    }

    const safeOrganizations = organizations.map(org => ({
      organizationId: org.organization_id,
      name: org.name,
      type: org.type,
      status: org.status,
      memberCount: org.member_count || 0,
      subscriptionTier: org.subscription_tier,
      createdAt: org.created_at,
      updatedAt: org.updated_at
    }));

    logger.info('Organizations listed', { 
      count: safeOrganizations.length,
      requestedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        organizations: safeOrganizations,
        count: safeOrganizations.length,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error listing organizations', { error: error.message });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to list organizations',
        message: error.message
      })
    };
  }
}

/**
 * Get specific organization
 */
async function getOrganization(organizationId, userContext, permissionsClient) {
  try {
    // Check if user has access to this organization
    const hasAdminAccess = await authMiddleware.hasPermission(userContext, 'internal.user_management', permissionsClient);
    const userWithPermissions = await permissionsClient.getUserWithPermissions(userContext.userId);
    
    const hasUserAccess = userWithPermissions.organizations.some(org => 
      org.organization_id === organizationId
    );

    if (!hasAdminAccess && !hasUserAccess) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Access denied to organization' })
      };
    }

    const result = await permissionsClient.dynamodb.get({
      TableName: permissionsClient.tables.organization_settings,
      Key: { organization_id: organizationId }
    });

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Organization not found' })
      };
    }

    const organization = {
      organizationId: result.Item.organization_id,
      name: result.Item.name,
      type: result.Item.type,
      status: result.Item.status,
      subscriptionTier: result.Item.subscription_tier,
      settings: result.Item.settings,
      limits: result.Item.limits,
      memberCount: result.Item.member_count || 0,
      createdAt: result.Item.created_at,
      updatedAt: result.Item.updated_at
    };

    logger.info('Organization retrieved', { 
      organizationId: organizationId,
      requestedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        organization: organization,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error getting organization', { error: error.message, organizationId });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to retrieve organization',
        message: error.message
      })
    };
  }
}

/**
 * Create new organization
 */
async function createOrganization(requestBody, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const { 
      name, 
      type = 'business', 
      subscriptionTier = 'professional',
      settings = {},
      limits = {}
    } = JSON.parse(requestBody || '{}');
    
    if (!name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Organization name is required' })
      };
    }

    // Generate organization ID
    const organizationId = `org_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const timestamp = new Date().toISOString();
    
    // Create organization
    await permissionsClient.dynamodb.put({
      TableName: permissionsClient.tables.organization_settings,
      Item: {
        organization_id: organizationId,
        name: name,
        type: type,
        status: 'active',
        subscription_tier: subscriptionTier,
        settings: settings,
        limits: limits,
        member_count: 1,
        created_at: timestamp,
        updated_at: timestamp,
        created_by: userContext.userId
      }
    });

    logger.info('Organization created', { 
      organizationId: organizationId,
      name: name,
      createdBy: userContext.userId
    });

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Organization created successfully',
        organization: {
          organizationId: organizationId,
          name: name,
          type: type,
          subscriptionTier: subscriptionTier,
          createdAt: timestamp
        },
        timestamp: timestamp
      })
    };

  } catch (error) {
    logger.error('Error creating organization', { error: error.message });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to create organization',
        message: error.message
      })
    };
  }
}

/**
 * Update organization
 */
async function updateOrganization(organizationId, requestBody, userContext, permissionsClient) {
  try {
    // Check if user has access to modify this organization
    const hasAdminAccess = await authMiddleware.hasPermission(userContext, 'internal.user_management', permissionsClient);
    const userWithPermissions = await permissionsClient.getUserWithPermissions(userContext.userId);
    
    const hasOrgAccess = userWithPermissions.organizations.some(org => 
      org.organization_id === organizationId && (org.role === 'admin' || org.role === 'owner')
    );

    if (!hasAdminAccess && !hasOrgAccess) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Insufficient permissions to update organization' })
      };
    }

    const updateData = JSON.parse(requestBody || '{}');
    
    // Allowed fields for organization updates
    const allowedFields = ['name', 'type', 'status', 'subscription_tier', 'settings', 'limits'];
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

    // Update organization
    const timestamp = new Date().toISOString();
    const updateExpression = Object.keys(updates).map(field => `${field} = :${field}`).join(', ');
    const expressionAttributeValues = { ':timestamp': timestamp };
    
    Object.keys(updates).forEach(field => {
      expressionAttributeValues[`:${field}`] = updates[field];
    });

    await permissionsClient.dynamodb.update({
      TableName: permissionsClient.tables.organization_settings,
      Key: { organization_id: organizationId },
      UpdateExpression: `SET ${updateExpression}, updated_at = :timestamp`,
      ExpressionAttributeValues: expressionAttributeValues
    });

    logger.info('Organization updated', { 
      organizationId: organizationId,
      updatedBy: userContext.userId,
      updatedFields: Object.keys(updates)
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Organization updated successfully',
        updatedFields: Object.keys(updates),
        timestamp: timestamp
      })
    };

  } catch (error) {
    logger.error('Error updating organization', { error: error.message, organizationId });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to update organization',
        message: error.message
      })
    };
  }
}

/**
 * Delete organization
 */
async function deleteOrganization(organizationId, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    // Check if organization exists
    const result = await permissionsClient.dynamodb.get({
      TableName: permissionsClient.tables.organization_settings,
      Key: { organization_id: organizationId }
    });

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Organization not found' })
      };
    }

    // Check if organization has members
    const memberships = await permissionsClient.dynamodb.scan({
      TableName: permissionsClient.tables.team_memberships,
      FilterExpression: 'organization_id = :org_id',
      ExpressionAttributeValues: { ':org_id': organizationId }
    });

    if (memberships.Items && memberships.Items.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Cannot delete organization with existing members',
          memberCount: memberships.Items.length
        })
      };
    }

    // Delete organization
    await permissionsClient.dynamodb.delete({
      TableName: permissionsClient.tables.organization_settings,
      Key: { organization_id: organizationId }
    });

    logger.info('Organization deleted', { 
      organizationId: organizationId,
      deletedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Organization deleted successfully',
        organizationId: organizationId,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error deleting organization', { error: error.message, organizationId });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to delete organization',
        message: error.message
      })
    };
  }
}

/**
 * Get organization members
 */
async function getOrganizationMembers(organizationId, queryParams, userContext, permissionsClient) {
  try {
    // Check if user has access to this organization
    const hasAdminAccess = await authMiddleware.hasPermission(userContext, 'internal.user_management', permissionsClient);
    const userWithPermissions = await permissionsClient.getUserWithPermissions(userContext.userId);
    
    const hasUserAccess = userWithPermissions.organizations.some(org => 
      org.organization_id === organizationId
    );

    if (!hasAdminAccess && !hasUserAccess) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Access denied to organization' })
      };
    }

    const { limit = 50, offset = 0, role } = queryParams || {};

    // Get organization members
    const members = await permissionsClient.getOrganizationUsers(organizationId, role);

    const safeMembers = members.map(member => ({
      userId: member.user_id,
      email: member.email,
      role: member.role,
      status: member.status,
      joinedAt: member.created_at,
      lastLoginAt: member.last_login_at
    }));

    logger.info('Organization members retrieved', { 
      organizationId: organizationId,
      memberCount: safeMembers.length,
      requestedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        organizationId: organizationId,
        members: safeMembers,
        count: safeMembers.length,
        filters: { role },
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error getting organization members', { error: error.message, organizationId });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to retrieve organization members',
        message: error.message
      })
    };
  }
}

/**
 * Add member to organization
 */
async function addOrganizationMember(organizationId, requestBody, userContext, permissionsClient) {
  try {
    // Check if user has access to modify this organization
    const hasAdminAccess = await authMiddleware.hasPermission(userContext, 'internal.user_management', permissionsClient);
    const userWithPermissions = await permissionsClient.getUserWithPermissions(userContext.userId);
    
    const hasOrgAccess = userWithPermissions.organizations.some(org => 
      org.organization_id === organizationId && (org.role === 'admin' || org.role === 'owner')
    );

    if (!hasAdminAccess && !hasOrgAccess) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Insufficient permissions to add member' })
      };
    }

    const { userId, role = 'member' } = JSON.parse(requestBody || '{}');
    
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    // Check if user exists
    const user = await permissionsClient.getUser(userId);
    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    // Check if user is already a member
    const existingMembership = await permissionsClient.dynamodb.get({
      TableName: permissionsClient.tables.team_memberships,
      Key: { user_id: userId, organization_id: organizationId }
    });

    if (existingMembership.Item) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'User is already a member of this organization' })
      };
    }

    // Add membership
    const timestamp = new Date().toISOString();
    await permissionsClient.dynamodb.put({
      TableName: permissionsClient.tables.team_memberships,
      Item: {
        user_id: userId,
        organization_id: organizationId,
        role: role,
        status: 'active',
        permissions: [],
        created_at: timestamp,
        updated_at: timestamp,
        added_by: userContext.userId
      }
    });

    // Update organization member count
    await permissionsClient.dynamodb.update({
      TableName: permissionsClient.tables.organization_settings,
      Key: { organization_id: organizationId },
      UpdateExpression: 'ADD member_count :increment SET updated_at = :timestamp',
      ExpressionAttributeValues: {
        ':increment': 1,
        ':timestamp': timestamp
      }
    });

    logger.info('Organization member added', { 
      organizationId: organizationId,
      userId: userId,
      role: role,
      addedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Member added to organization successfully',
        organizationId: organizationId,
        userId: userId,
        role: role,
        timestamp: timestamp
      })
    };

  } catch (error) {
    logger.error('Error adding organization member', { error: error.message, organizationId });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to add organization member',
        message: error.message
      })
    };
  }
}

/**
 * Remove member from organization
 */
async function removeOrganizationMember(organizationId, requestBody, userContext, permissionsClient) {
  try {
    // Check if user has access to modify this organization
    const hasAdminAccess = await authMiddleware.hasPermission(userContext, 'internal.user_management', permissionsClient);
    const userWithPermissions = await permissionsClient.getUserWithPermissions(userContext.userId);
    
    const hasOrgAccess = userWithPermissions.organizations.some(org => 
      org.organization_id === organizationId && (org.role === 'admin' || org.role === 'owner')
    );

    if (!hasAdminAccess && !hasOrgAccess) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Insufficient permissions to remove member' })
      };
    }

    const { userId } = JSON.parse(requestBody || '{}');
    
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    // Check if membership exists
    const existingMembership = await permissionsClient.dynamodb.get({
      TableName: permissionsClient.tables.team_memberships,
      Key: { user_id: userId, organization_id: organizationId }
    });

    if (!existingMembership.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User is not a member of this organization' })
      };
    }

    // Remove membership
    await permissionsClient.dynamodb.delete({
      TableName: permissionsClient.tables.team_memberships,
      Key: { user_id: userId, organization_id: organizationId }
    });

    // Update organization member count
    const timestamp = new Date().toISOString();
    await permissionsClient.dynamodb.update({
      TableName: permissionsClient.tables.organization_settings,
      Key: { organization_id: organizationId },
      UpdateExpression: 'ADD member_count :decrement SET updated_at = :timestamp',
      ExpressionAttributeValues: {
        ':decrement': -1,
        ':timestamp': timestamp
      }
    });

    logger.info('Organization member removed', { 
      organizationId: organizationId,
      userId: userId,
      removedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Member removed from organization successfully',
        organizationId: organizationId,
        userId: userId,
        timestamp: timestamp
      })
    };

  } catch (error) {
    logger.error('Error removing organization member', { error: error.message, organizationId });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to remove organization member',
        message: error.message
      })
    };
  }
}

module.exports = {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationMembers,
  addOrganizationMember,
  removeOrganizationMember
};
