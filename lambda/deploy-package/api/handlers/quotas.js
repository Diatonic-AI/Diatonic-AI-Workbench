// AI Nexus Workbench - Quotas Handler
// Handle quota management API endpoints

const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth');

/**
 * Get current user's quota usage
 */
async function getCurrentUserQuotas(userContext, permissionsClient) {
  try {
    if (!userContext) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    const quotaData = await permissionsClient.getUserQuotas(userContext.userId);
    
    if (!quotaData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User quota data not found' })
      };
    }

    const userWithPermissions = await permissionsClient.getUserWithPermissions(userContext.userId);
    
    const response = {
      userId: userContext.userId,
      subscriptionTier: userWithPermissions.user.subscription_tier,
      quotaUsage: quotaData,
      subscriptionLimits: userWithPermissions.subscriptionLimits,
      lastUpdated: quotaData.updated_at,
      status: calculateQuotaStatus(quotaData, userWithPermissions.subscriptionLimits)
    };

    logger.info('User quotas retrieved', { 
      userId: userContext.userId,
      subscriptionTier: response.subscriptionTier
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        quotas: response,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error getting user quotas', { error: error.message });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to retrieve user quotas',
        message: error.message
      })
    };
  }
}

/**
 * Get specific user's quota usage (admin only)
 */
async function getUserQuotas(userId, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const quotaData = await permissionsClient.getUserQuotas(userId);
    
    if (!quotaData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User quota data not found' })
      };
    }

    const userWithPermissions = await permissionsClient.getUserWithPermissions(userId);
    
    const response = {
      userId: userId,
      email: userWithPermissions.user.email,
      subscriptionTier: userWithPermissions.user.subscription_tier,
      quotaUsage: quotaData,
      subscriptionLimits: userWithPermissions.subscriptionLimits,
      lastUpdated: quotaData.updated_at,
      status: calculateQuotaStatus(quotaData, userWithPermissions.subscriptionLimits)
    };

    logger.info('User quotas retrieved', { 
      targetUserId: userId,
      requestedBy: userContext.userId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        quotas: response,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error getting user quotas', { error: error.message, targetUserId: userId });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to retrieve user quotas',
        message: error.message
      })
    };
  }
}

/**
 * Update user quota usage (internal/admin use)
 */
async function updateUserQuotas(userId, requestBody, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const updateData = JSON.parse(requestBody || '{}');
    
    const {
      agents_created_monthly = null,
      workflows_executed_monthly = null,
      api_calls_monthly = null,
      storage_used_mb = null,
      reset_monthly = false
    } = updateData;

    // If reset_monthly is true, reset all monthly counters
    if (reset_monthly) {
      const resetData = {
        agents_created_monthly: 0,
        workflows_executed_monthly: 0,
        api_calls_monthly: 0,
        period_start: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await permissionsClient.dynamodb.update({
        TableName: permissionsClient.tables.user_quotas,
        Key: { user_id: userId },
        UpdateExpression: 'SET agents_created_monthly = :agents, workflows_executed_monthly = :workflows, api_calls_monthly = :api_calls, period_start = :period_start, updated_at = :timestamp',
        ExpressionAttributeValues: {
          ':agents': resetData.agents_created_monthly,
          ':workflows': resetData.workflows_executed_monthly,
          ':api_calls': resetData.api_calls_monthly,
          ':period_start': resetData.period_start,
          ':timestamp': resetData.updated_at
        }
      });

      logger.info('User quotas reset', { 
        targetUserId: userId,
        resetBy: userContext.userId
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'User quotas reset successfully',
          resetData: resetData,
          timestamp: resetData.updated_at
        })
      };
    }

    // Build update expression for individual fields
    const updates = {};
    if (agents_created_monthly !== null) updates.agents_created_monthly = agents_created_monthly;
    if (workflows_executed_monthly !== null) updates.workflows_executed_monthly = workflows_executed_monthly;
    if (api_calls_monthly !== null) updates.api_calls_monthly = api_calls_monthly;
    if (storage_used_mb !== null) updates.storage_used_mb = storage_used_mb;

    if (Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No valid quota fields to update' })
      };
    }

    const timestamp = new Date().toISOString();
    const updateExpression = Object.keys(updates).map(field => `${field} = :${field}`).join(', ');
    const expressionAttributeValues = { ':timestamp': timestamp };
    
    Object.keys(updates).forEach(field => {
      expressionAttributeValues[`:${field}`] = updates[field];
    });

    await permissionsClient.dynamodb.update({
      TableName: permissionsClient.tables.user_quotas,
      Key: { user_id: userId },
      UpdateExpression: `SET ${updateExpression}, updated_at = :timestamp`,
      ExpressionAttributeValues: expressionAttributeValues
    });

    logger.info('User quotas updated', { 
      targetUserId: userId,
      updatedBy: userContext.userId,
      updatedFields: Object.keys(updates)
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'User quotas updated successfully',
        updatedFields: Object.keys(updates),
        timestamp: timestamp
      })
    };

  } catch (error) {
    logger.error('Error updating user quotas', { error: error.message, targetUserId: userId });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to update user quotas',
        message: error.message
      })
    };
  }
}

/**
 * Consume quota (for API operations)
 */
async function consumeQuota(requestBody, userContext, permissionsClient) {
  try {
    if (!userContext) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    const { quotaType, amount = 1 } = JSON.parse(requestBody || '{}');
    
    if (!quotaType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Quota type is required' })
      };
    }

    const validQuotaTypes = [
      'agents_created_monthly',
      'workflows_executed_monthly', 
      'api_calls_monthly',
      'storage_used_mb'
    ];

    if (!validQuotaTypes.includes(quotaType)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid quota type',
          validTypes: validQuotaTypes
        })
      };
    }

    // Check current quota usage and limits
    const userWithPermissions = await permissionsClient.getUserWithPermissions(userContext.userId);
    const currentQuotas = await permissionsClient.getUserQuotas(userContext.userId);
    const limits = userWithPermissions.subscriptionLimits;

    const currentUsage = currentQuotas[quotaType] || 0;
    const limit = limits[quotaType];

    // Check if consumption would exceed limit
    if (limit !== -1 && (currentUsage + amount) > limit) {
      logger.warn('Quota limit exceeded attempt', {
        userId: userContext.userId,
        quotaType: quotaType,
        currentUsage: currentUsage,
        requestedAmount: amount,
        limit: limit
      });

      return {
        statusCode: 429, // Too Many Requests
        body: JSON.stringify({
          error: 'Quota limit exceeded',
          quotaType: quotaType,
          currentUsage: currentUsage,
          requestedAmount: amount,
          limit: limit,
          available: Math.max(0, limit - currentUsage)
        })
      };
    }

    // Consume quota
    const success = await permissionsClient.consumeQuota(userContext.userId, quotaType, amount);
    
    if (!success) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to consume quota' })
      };
    }

    // Get updated quota data
    const updatedQuotas = await permissionsClient.getUserQuotas(userContext.userId);

    logger.info('Quota consumed', {
      userId: userContext.userId,
      quotaType: quotaType,
      amount: amount,
      newUsage: updatedQuotas[quotaType]
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Quota consumed successfully',
        quotaType: quotaType,
        consumed: amount,
        newUsage: updatedQuotas[quotaType],
        limit: limit,
        remaining: limit === -1 ? -1 : Math.max(0, limit - updatedQuotas[quotaType]),
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error consuming quota', { error: error.message });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to consume quota',
        message: error.message
      })
    };
  }
}

/**
 * Check quota availability
 */
async function checkQuotaAvailability(quotaType, userContext, permissionsClient) {
  try {
    if (!userContext) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    const validQuotaTypes = [
      'agents_created_monthly',
      'workflows_executed_monthly', 
      'api_calls_monthly',
      'storage_used_mb'
    ];

    if (!validQuotaTypes.includes(quotaType)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid quota type',
          validTypes: validQuotaTypes
        })
      };
    }

    const userWithPermissions = await permissionsClient.getUserWithPermissions(userContext.userId);
    const currentQuotas = await permissionsClient.getUserQuotas(userContext.userId);
    const limits = userWithPermissions.subscriptionLimits;

    const currentUsage = currentQuotas[quotaType] || 0;
    const limit = limits[quotaType];
    const available = limit === -1 ? -1 : Math.max(0, limit - currentUsage);
    const utilizationPercent = limit === -1 ? 0 : Math.round((currentUsage / limit) * 100);

    const status = calculateQuotaTypeStatus(currentUsage, limit);

    logger.info('Quota availability checked', {
      userId: userContext.userId,
      quotaType: quotaType,
      currentUsage: currentUsage,
      limit: limit,
      available: available
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        quotaType: quotaType,
        currentUsage: currentUsage,
        limit: limit,
        available: available,
        utilizationPercent: utilizationPercent,
        status: status,
        subscriptionTier: userWithPermissions.user.subscription_tier,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error checking quota availability', { error: error.message });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to check quota availability',
        message: error.message
      })
    };
  }
}

/**
 * Get quota usage statistics (admin only)
 */
async function getQuotaStatistics(queryParams, userContext, permissionsClient) {
  try {
    await authMiddleware.requirePermission(userContext, 'internal.user_management', permissionsClient);

    const { subscriptionTier, limit = 100 } = queryParams || {};

    // Get all user quotas
    let scanParams = {
      TableName: permissionsClient.tables.user_quotas,
      Limit: parseInt(limit)
    };

    if (subscriptionTier) {
      // This would require a GSI on subscription tier, for now we'll scan all
      // In production, you'd want a better approach for filtering by subscription tier
    }

    const result = await permissionsClient.dynamodb.scan(scanParams);
    const quotaData = result.Items || [];

    // Calculate statistics
    const stats = {
      totalUsers: quotaData.length,
      bySubscriptionTier: {},
      averageUsage: {
        agents_created_monthly: 0,
        workflows_executed_monthly: 0,
        api_calls_monthly: 0,
        storage_used_mb: 0
      },
      highUsageUsers: [],
      quotaExceededUsers: []
    };

    // Group by subscription tier and calculate averages
    const userMap = new Map();
    
    for (const quota of quotaData) {
      const user = await permissionsClient.getUser(quota.user_id);
      if (!user) continue;

      const tier = user.subscription_tier;
      userMap.set(quota.user_id, { quota, user });

      if (!stats.bySubscriptionTier[tier]) {
        stats.bySubscriptionTier[tier] = {
          count: 0,
          totalUsage: {
            agents_created_monthly: 0,
            workflows_executed_monthly: 0,
            api_calls_monthly: 0,
            storage_used_mb: 0
          }
        };
      }

      stats.bySubscriptionTier[tier].count++;
      stats.bySubscriptionTier[tier].totalUsage.agents_created_monthly += quota.agents_created_monthly || 0;
      stats.bySubscriptionTier[tier].totalUsage.workflows_executed_monthly += quota.workflows_executed_monthly || 0;
      stats.bySubscriptionTier[tier].totalUsage.api_calls_monthly += quota.api_calls_monthly || 0;
      stats.bySubscriptionTier[tier].totalUsage.storage_used_mb += quota.storage_used_mb || 0;
    }

    // Calculate averages
    for (const [tier, tierData] of Object.entries(stats.bySubscriptionTier)) {
      if (tierData.count > 0) {
        tierData.averageUsage = {
          agents_created_monthly: Math.round(tierData.totalUsage.agents_created_monthly / tierData.count),
          workflows_executed_monthly: Math.round(tierData.totalUsage.workflows_executed_monthly / tierData.count),
          api_calls_monthly: Math.round(tierData.totalUsage.api_calls_monthly / tierData.count),
          storage_used_mb: Math.round(tierData.totalUsage.storage_used_mb / tierData.count)
        };
      }
    }

    logger.info('Quota statistics retrieved', {
      requestedBy: userContext.userId,
      totalUsers: stats.totalUsers
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        statistics: stats,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Error getting quota statistics', { error: error.message });
    
    return {
      statusCode: error.message.includes('Insufficient permissions') ? 403 : 500,
      body: JSON.stringify({ 
        error: 'Failed to retrieve quota statistics',
        message: error.message
      })
    };
  }
}

// Helper functions
function calculateQuotaStatus(quotaUsage, limits) {
  const statuses = {};
  
  for (const [quotaType, limit] of Object.entries(limits)) {
    const usage = quotaUsage[quotaType] || 0;
    statuses[quotaType] = calculateQuotaTypeStatus(usage, limit);
  }
  
  // Overall status is the worst individual status
  const statusPriority = { 'healthy': 1, 'warning': 2, 'critical': 3, 'exceeded': 4 };
  const overallStatus = Object.values(statuses).reduce((worst, current) => {
    return statusPriority[current] > statusPriority[worst] ? current : worst;
  }, 'healthy');
  
  return {
    overall: overallStatus,
    byQuotaType: statuses
  };
}

function calculateQuotaTypeStatus(usage, limit) {
  if (limit === -1) return 'healthy'; // Unlimited
  
  const utilization = usage / limit;
  
  if (usage > limit) return 'exceeded';
  if (utilization >= 0.9) return 'critical';
  if (utilization >= 0.75) return 'warning';
  return 'healthy';
}

module.exports = {
  getCurrentUserQuotas,
  getUserQuotas,
  updateUserQuotas,
  consumeQuota,
  checkQuotaAvailability,
  getQuotaStatistics
};
