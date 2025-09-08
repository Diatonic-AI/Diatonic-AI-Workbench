// AI Nexus Workbench - DynamoDB Permissions Client Library
// Comprehensive client for managing users, roles, permissions, quotas, and subscriptions

const { v4: uuidv4 } = require('uuid');

/**
 * Comprehensive permissions client for DynamoDB-based permission management
 */
class PermissionsClient {
  constructor({ dynamodb, tables }) {
    this.dynamodb = dynamodb;
    this.tables = tables;
    
    // Subscription tier limits (synced with frontend types)
    this.SUBSCRIPTION_LIMITS = {
      free: {
        aiAgentsPerMonth: 3,
        teamMembers: 1,
        cloudStorageGB: 1,
        apiCallsPerDay: 0,
        executionTimeMinutes: 30,
        customTemplates: false,
        prioritySupport: false,
        dedicatedSupport: false,
        onPremisesDeployment: false,
        customBranding: false,
        slaGuarantees: false
      },
      basic: {
        aiAgentsPerMonth: 25,
        teamMembers: 1,
        cloudStorageGB: 10,
        apiCallsPerDay: 100,
        executionTimeMinutes: 120,
        customTemplates: false,
        prioritySupport: false,
        dedicatedSupport: false,
        onPremisesDeployment: false,
        customBranding: false,
        slaGuarantees: false
      },
      pro: {
        aiAgentsPerMonth: 100,
        teamMembers: 5,
        cloudStorageGB: 100,
        apiCallsPerDay: 1000,
        executionTimeMinutes: 600,
        customTemplates: true,
        prioritySupport: true,
        dedicatedSupport: false,
        onPremisesDeployment: false,
        customBranding: false,
        slaGuarantees: false
      },
      extreme: {
        aiAgentsPerMonth: 500,
        teamMembers: 25,
        cloudStorageGB: 1000,
        apiCallsPerDay: 10000,
        executionTimeMinutes: 1800,
        customTemplates: true,
        prioritySupport: true,
        dedicatedSupport: true,
        onPremisesDeployment: false,
        customBranding: true,
        slaGuarantees: false
      },
      enterprise: {
        aiAgentsPerMonth: 'unlimited',
        teamMembers: 'unlimited',
        cloudStorageGB: 'unlimited',
        apiCallsPerDay: 'unlimited',
        executionTimeMinutes: 'unlimited',
        customTemplates: true,
        prioritySupport: true,
        dedicatedSupport: true,
        onPremisesDeployment: true,
        customBranding: true,
        slaGuarantees: true
      }
    };
  }

  // =============================================================================
  // USER MANAGEMENT
  // =============================================================================

  /**
   * Get user with complete context (role, permissions, quotas)
   */
  async getUserWithPermissions(userId) {
    try {
      // Get base user record
      const userResult = await this.dynamodb.get({
        TableName: this.tables.users,
        Key: { user_id: userId }
      });

      if (!userResult.Item) {
        return null;
      }

      const user = userResult.Item;

      // Get user permissions (individually granted)
      const permissions = await this.getUserPermissions(userId);

      // Get role permissions
      let rolePermissions = [];
      if (user.role) {
        rolePermissions = await this.getRolePermissions(user.role);
      }

      // Get subscription limits
      const subscriptionLimits = await this.getSubscriptionLimits(user.subscription_tier || 'free');

      // Get current quota usage
      const quotaUsage = await this.getUserQuotaUsage(userId);

      // Get organization memberships
      const orgMemberships = await this.getUserOrganizations(userId);

      return {
        user,
        permissions: [...new Set([...permissions, ...rolePermissions])], // Deduplicated
        subscriptionLimits,
        quotaUsage,
        organizations: orgMemberships,
        effectiveRole: user.role || user.subscription_tier || 'free'
      };
    } catch (error) {
      console.error('Error getting user with permissions:', error);
      throw new Error(`Failed to get user permissions: ${error.message}`);
    }
  }

  /**
   * Create or update user
   */
  async upsertUser(userData) {
    try {
      const timestamp = new Date().toISOString();
      const user = {
        user_id: userData.user_id || uuidv4(),
        email: userData.email,
        role: userData.role || 'free',
        subscription_tier: userData.subscription_tier || 'free',
        organization_id: userData.organization_id || 'default',
        profile: userData.profile || {},
        status: userData.status || 'active',
        created_at: userData.created_at || timestamp,
        updated_at: timestamp,
        last_login_at: userData.last_login_at,
        preferences: userData.preferences || {},
        metadata: userData.metadata || {}
      };

      await this.dynamodb.put({
        TableName: this.tables.users,
        Item: user
      });

      return user;
    } catch (error) {
      console.error('Error upserting user:', error);
      throw new Error(`Failed to upsert user: ${error.message}`);
    }
  }

  /**
   * Update user role and subscription tier
   */
  async updateUserRole(userId, role, subscriptionTier = null) {
    try {
      const updateExpression = 'SET #role = :role, updated_at = :timestamp';
      const expressionAttributeNames = { '#role': 'role' };
      const expressionAttributeValues = { 
        ':role': role, 
        ':timestamp': new Date().toISOString()
      };

      if (subscriptionTier) {
        updateExpression += ', subscription_tier = :subscription_tier';
        expressionAttributeValues[':subscription_tier'] = subscriptionTier;
      }

      await this.dynamodb.update({
        TableName: this.tables.users,
        Key: { user_id: userId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      });

      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw new Error(`Failed to update user role: ${error.message}`);
    }
  }

  /**
   * Get all users in an organization
   */
  async getOrganizationUsers(organizationId, role = null) {
    try {
      const params = {
        TableName: this.tables.users,
        IndexName: 'organization-role-index',
        KeyConditionExpression: 'organization_id = :org_id'
      };

      const expressionAttributeValues = { ':org_id': organizationId };

      if (role) {
        params.KeyConditionExpression += ' AND #role = :role';
        params.ExpressionAttributeNames = { '#role': 'role' };
        expressionAttributeValues[':role'] = role;
      }

      params.ExpressionAttributeValues = expressionAttributeValues;

      const result = await this.dynamodb.query(params);
      return result.Items || [];
    } catch (error) {
      console.error('Error getting organization users:', error);
      throw new Error(`Failed to get organization users: ${error.message}`);
    }
  }

  // =============================================================================
  // PERMISSION MANAGEMENT
  // =============================================================================

  /**
   * Get all permissions for a user (individual + role-based)
   */
  async getUserPermissions(userId) {
    try {
      const result = await this.dynamodb.query({
        TableName: this.tables.userPermissions,
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': userId }
      });

      return result.Items?.map(item => item.permission) || [];
    } catch (error) {
      console.error('Error getting user permissions:', error);
      throw new Error(`Failed to get user permissions: ${error.message}`);
    }
  }

  /**
   * Grant permission to user
   */
  async grantUserPermission(userId, permission, grantedBy) {
    try {
      await this.dynamodb.put({
        TableName: this.tables.userPermissions,
        Item: {
          user_id: userId,
          permission: permission,
          granted_at: new Date().toISOString(),
          granted_by: grantedBy,
          status: 'active'
        }
      });

      return true;
    } catch (error) {
      console.error('Error granting user permission:', error);
      throw new Error(`Failed to grant user permission: ${error.message}`);
    }
  }

  /**
   * Revoke permission from user
   */
  async revokeUserPermission(userId, permission) {
    try {
      await this.dynamodb.delete({
        TableName: this.tables.userPermissions,
        Key: { user_id: userId, permission: permission }
      });

      return true;
    } catch (error) {
      console.error('Error revoking user permission:', error);
      throw new Error(`Failed to revoke user permission: ${error.message}`);
    }
  }

  /**
   * Check if user has specific permission (individual + role + subscription)
   */
  async checkPermission(userContext, permission) {
    try {
      if (!userContext || !userContext.userId) {
        return false;
      }

      // Get user's full permission context if not already loaded
      if (!userContext.permissions) {
        const userWithPerms = await this.getUserWithPermissions(userContext.userId);
        if (!userWithPerms) return false;
        userContext = userWithPerms;
      }

      // Check individual permissions
      if (userContext.permissions && userContext.permissions.includes(permission)) {
        return true;
      }

      // Check subscription tier permissions
      const subscriptionTier = userContext.user?.subscription_tier || userContext.effectiveRole || 'free';
      const tierPermissions = await this.getSubscriptionPermissions(subscriptionTier);
      
      return tierPermissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  // =============================================================================
  // ROLE MANAGEMENT
  // =============================================================================

  /**
   * Create a custom role
   */
  async createRole(roleData, createdBy) {
    try {
      const role = {
        role_id: roleData.role_id || uuidv4(),
        role_name: roleData.role_name,
        role_type: roleData.role_type || 'custom',
        organization_id: roleData.organization_id || 'global',
        description: roleData.description || '',
        created_at: new Date().toISOString(),
        created_by: createdBy,
        status: 'active'
      };

      await this.dynamodb.put({
        TableName: this.tables.roles,
        Item: role
      });

      return role;
    } catch (error) {
      console.error('Error creating role:', error);
      throw new Error(`Failed to create role: ${error.message}`);
    }
  }

  /**
   * Add permission to role
   */
  async addRolePermission(roleId, permission, featureArea = 'general') {
    try {
      await this.dynamodb.put({
        TableName: this.tables.rolePermissions,
        Item: {
          role_id: roleId,
          permission: permission,
          feature_area: featureArea,
          granted_at: new Date().toISOString(),
          status: 'active'
        }
      });

      return true;
    } catch (error) {
      console.error('Error adding role permission:', error);
      throw new Error(`Failed to add role permission: ${error.message}`);
    }
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(roleId) {
    try {
      const result = await this.dynamodb.query({
        TableName: this.tables.rolePermissions,
        KeyConditionExpression: 'role_id = :role_id',
        ExpressionAttributeValues: { ':role_id': roleId }
      });

      return result.Items?.map(item => item.permission) || [];
    } catch (error) {
      console.error('Error getting role permissions:', error);
      throw new Error(`Failed to get role permissions: ${error.message}`);
    }
  }

  // =============================================================================
  // SUBSCRIPTION & QUOTA MANAGEMENT
  // =============================================================================

  /**
   * Get subscription limits for a tier
   */
  async getSubscriptionLimits(subscriptionTier) {
    return this.SUBSCRIPTION_LIMITS[subscriptionTier] || this.SUBSCRIPTION_LIMITS.free;
  }

  /**
   * Get user's current quota usage
   */
  async getUserQuotaUsage(userId) {
    try {
      const result = await this.dynamodb.query({
        TableName: this.tables.userQuotas,
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': userId }
      });

      const usage = {};
      result.Items?.forEach(item => {
        usage[item.quota_type] = {
          current_usage: item.current_usage || 0,
          limit: item.limit || 0,
          period_start: item.period_start,
          period_end: item.period_end,
          last_reset: item.last_reset
        };
      });

      return usage;
    } catch (error) {
      console.error('Error getting user quota usage:', error);
      throw new Error(`Failed to get user quota usage: ${error.message}`);
    }
  }

  /**
   * Check if user can consume quota (without consuming)
   */
  async checkAndConsumeQuota(userId, quotaType, amount = 1, dryRun = false) {
    try {
      // Get current usage
      const quotaResult = await this.dynamodb.get({
        TableName: this.tables.userQuotas,
        Key: { user_id: userId, quota_type: quotaType }
      });

      const currentUsage = quotaResult.Item?.current_usage || 0;
      const limit = quotaResult.Item?.limit || 0;

      // Check if consumption would exceed limit
      if (limit !== 'unlimited' && (currentUsage + amount) > limit) {
        return {
          success: false,
          reason: 'quota_exceeded',
          current: currentUsage,
          limit: limit,
          requested: amount
        };
      }

      // If dry run, don't actually consume
      if (dryRun) {
        return {
          success: true,
          current: currentUsage,
          limit: limit,
          after_consumption: currentUsage + amount
        };
      }

      // Consume quota
      const timestamp = new Date().toISOString();
      await this.dynamodb.update({
        TableName: this.tables.userQuotas,
        Key: { user_id: userId, quota_type: quotaType },
        UpdateExpression: 'ADD current_usage :amount SET updated_at = :timestamp',
        ExpressionAttributeValues: {
          ':amount': amount,
          ':timestamp': timestamp
        }
      });

      return {
        success: true,
        current: currentUsage + amount,
        limit: limit,
        consumed: amount
      };
    } catch (error) {
      console.error('Error checking/consuming quota:', error);
      throw new Error(`Failed to check/consume quota: ${error.message}`);
    }
  }

  /**
   * Update user quotas based on subscription tier
   */
  async updateUserQuotas(userId, subscriptionTier) {
    try {
      const limits = await this.getSubscriptionLimits(subscriptionTier);
      const timestamp = new Date().toISOString();
      const periodStart = new Date().toISOString().substring(0, 10); // YYYY-MM-DD

      const quotaTypes = [
        { type: 'ai_agents_monthly', limit: limits.aiAgentsPerMonth },
        { type: 'api_calls_daily', limit: limits.apiCallsPerDay },
        { type: 'execution_minutes', limit: limits.executionTimeMinutes },
        { type: 'storage_gb', limit: limits.cloudStorageGB }
      ];

      for (const quota of quotaTypes) {
        await this.dynamodb.put({
          TableName: this.tables.userQuotas,
          Item: {
            user_id: userId,
            quota_type: quota.type,
            current_usage: 0,
            limit: quota.limit,
            period_start: periodStart,
            period_end: quota.type.includes('monthly') ? 
              new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().substring(0, 10) :
              new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().substring(0, 10),
            updated_at: timestamp,
            organization_id: 'default',
            subscription_tier: subscriptionTier
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Error updating user quotas:', error);
      throw new Error(`Failed to update user quotas: ${error.message}`);
    }
  }

  // =============================================================================
  // TEAM & ORGANIZATION MANAGEMENT
  // =============================================================================

  /**
   * Get user's organization memberships
   */
  async getUserOrganizations(userId) {
    try {
      const result = await this.dynamodb.query({
        TableName: this.tables.teamMemberships,
        IndexName: 'user-joined-index',
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': userId },
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':user_id': userId, ':status': 'active' }
      });

      return result.Items || [];
    } catch (error) {
      console.error('Error getting user organizations:', error);
      throw new Error(`Failed to get user organizations: ${error.message}`);
    }
  }

  /**
   * Add user to organization
   */
  async addTeamMember(organizationId, userId, role = 'member', addedBy = 'system') {
    try {
      await this.dynamodb.put({
        TableName: this.tables.teamMemberships,
        Item: {
          organization_id: organizationId,
          user_id: userId,
          role: role,
          status: 'active',
          joined_at: new Date().toISOString(),
          added_by: addedBy,
          permissions: []
        }
      });

      return true;
    } catch (error) {
      console.error('Error adding team member:', error);
      throw new Error(`Failed to add team member: ${error.message}`);
    }
  }

  // =============================================================================
  // COGNITO INTEGRATION
  // =============================================================================

  /**
   * Map Cognito groups to roles
   */
  async getCognitoGroupMapping(cognitoGroup) {
    try {
      const result = await this.dynamodb.get({
        TableName: this.tables.cognitoGroupMappings,
        Key: { cognito_group: cognitoGroup }
      });

      return result.Item || null;
    } catch (error) {
      console.error('Error getting Cognito group mapping:', error);
      return null;
    }
  }

  // =============================================================================
  // ANALYTICS & REPORTING
  // =============================================================================

  /**
   * Get subscription tier analytics
   */
  async getSubscriptionTierAnalytics(subscriptionTier) {
    try {
      const result = await this.dynamodb.query({
        TableName: this.tables.users,
        IndexName: 'subscription-created-index',
        KeyConditionExpression: 'subscription_tier = :tier',
        ExpressionAttributeValues: { ':tier': subscriptionTier }
      });

      return {
        tier: subscriptionTier,
        user_count: result.Items?.length || 0,
        users: result.Items || []
      };
    } catch (error) {
      console.error('Error getting subscription tier analytics:', error);
      throw new Error(`Failed to get subscription tier analytics: ${error.message}`);
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get permissions for subscription tier
   */
  async getSubscriptionPermissions(subscriptionTier) {
    // This maps subscription tiers to their allowed permissions
    // This should match the permissions defined in the frontend permissions.ts
    const tierPermissions = {
      free: [
        'dashboard.access', 'profile.manage',
        'education.view_courses', 'education.track_progress',
        'studio.view_templates', 'studio.use_basic_templates', 'studio.create_agents',
        'community.view_public_content', 'community.create_posts',
        'storage.basic_quota', 'support.community', 'security.basic_features'
      ],
      basic: [
        'dashboard.access', 'profile.manage', 'profile.billing',
        'education.view_courses', 'education.track_progress', 'education.download_materials',
        'studio.view_templates', 'studio.use_basic_templates', 'studio.create_agents', 'studio.save_agents',
        'lab.run_basic_experiments', 'lab.save_experiments', 'lab.basic_execution_time',
        'community.view_public_content', 'community.create_posts', 'community.join_public_groups',
        'observatory.basic_analytics', 'api.basic_access',
        'storage.standard_quota', 'support.email', 'security.basic_features'
      ],
      pro: [
        'dashboard.access', 'profile.manage', 'profile.billing',
        'education.view_courses', 'education.view_premium_courses', 'education.track_progress', 'education.download_materials',
        'studio.view_templates', 'studio.use_basic_templates', 'studio.use_premium_templates',
        'studio.create_agents', 'studio.save_agents', 'studio.export_agents', 'studio.share_agents_public',
        'studio.advanced_visual_builder', 'studio.debug_mode', 'studio.version_control',
        'team.collaborate_basic', 'team.invite_members',
        'lab.run_basic_experiments', 'lab.run_advanced_experiments', 'lab.save_experiments', 'lab.export_results',
        'lab.extended_execution_time', 'lab.advanced_analytics', 'lab.ab_testing',
        'community.view_public_content', 'community.create_posts', 'community.join_public_groups', 'community.join_private_groups',
        'observatory.basic_analytics', 'observatory.advanced_insights', 'observatory.data_export',
        'api.standard_access', 'storage.extended_quota', 'support.priority', 'security.advanced_features'
      ],
      extreme: [
        'dashboard.access', 'profile.manage', 'profile.billing',
        'education.view_courses', 'education.view_premium_courses', 'education.track_progress',
        'education.download_materials', 'education.offline_access', 'education.custom_learning_paths',
        'studio.view_templates', 'studio.use_basic_templates', 'studio.use_premium_templates',
        'studio.create_agents', 'studio.save_agents', 'studio.export_agents', 'studio.share_agents_public', 'studio.share_agents_private',
        'studio.advanced_visual_builder', 'studio.professional_builder_suite', 'studio.debug_mode',
        'studio.version_control', 'studio.git_integration', 'studio.custom_integrations', 'studio.custom_branding',
        'team.collaborate_basic', 'team.collaborate_advanced', 'team.invite_members', 'team.manage_permissions',
        'lab.run_basic_experiments', 'lab.run_advanced_experiments', 'lab.save_experiments', 'lab.export_results',
        'lab.multi_format_export', 'lab.custom_model_training', 'lab.maximum_execution_time',
        'lab.advanced_analytics', 'lab.real_time_analytics', 'lab.ab_testing',
        'community.view_public_content', 'community.create_posts', 'community.join_public_groups',
        'community.join_private_groups', 'community.create_groups', 'community.moderate_content',
        'observatory.basic_analytics', 'observatory.advanced_insights', 'observatory.real_time_dashboard',
        'observatory.custom_dashboards', 'observatory.data_export', 'observatory.advanced_reporting',
        'api.unlimited_access', 'storage.unlimited_quota', 'support.dedicated_team', 'security.enterprise_compliance'
      ],
      enterprise: [
        // Enterprise gets all permissions
        'dashboard.access', 'profile.manage', 'profile.billing',
        'education.view_courses', 'education.view_premium_courses', 'education.track_progress',
        'education.download_materials', 'education.offline_access', 'education.custom_learning_paths',
        'education.team_training_programs', 'education.enterprise_training',
        'studio.view_templates', 'studio.use_basic_templates', 'studio.use_premium_templates',
        'studio.create_agents', 'studio.save_agents', 'studio.export_agents',
        'studio.share_agents_public', 'studio.share_agents_private',
        'studio.advanced_visual_builder', 'studio.professional_builder_suite', 'studio.enterprise_builder_platform',
        'studio.debug_mode', 'studio.version_control', 'studio.git_integration', 'studio.enterprise_git_integration',
        'studio.custom_integrations', 'studio.advanced_integrations', 'studio.white_label_export', 'studio.custom_branding',
        'team.collaborate_basic', 'team.collaborate_advanced', 'team.invite_members', 'team.manage_permissions', 'team.unlimited_members',
        'lab.run_basic_experiments', 'lab.run_advanced_experiments', 'lab.save_experiments', 'lab.export_results',
        'lab.multi_format_export', 'lab.custom_model_training', 'lab.dedicated_model_training',
        'lab.unlimited_execution_time', 'lab.advanced_analytics', 'lab.real_time_analytics',
        'lab.enterprise_analytics', 'lab.ab_testing', 'lab.enterprise_testing_suite',
        'community.view_public_content', 'community.create_posts', 'community.join_public_groups',
        'community.join_private_groups', 'community.create_groups', 'community.moderate_content', 'community.advanced_moderation',
        'observatory.basic_analytics', 'observatory.advanced_insights', 'observatory.real_time_dashboard',
        'observatory.enterprise_analytics', 'observatory.custom_dashboards', 'observatory.data_export', 'observatory.advanced_reporting',
        'api.enterprise_access', 'storage.unlimited_quota',
        'support.dedicated_team', 'support.sla_guarantees',
        'security.enterprise_compliance', 'security.custom_policies'
      ],
      // Internal roles get specific admin permissions
      internal_dev: ['internal.content_management', 'internal.user_management', 'internal.system_administration', 'internal.debug_all_users'],
      internal_admin: ['internal.content_management', 'internal.user_management', 'internal.system_administration', 'internal.billing_management', 'internal.analytics_full_access', 'internal.debug_all_users', 'internal.impersonate_users', 'internal.feature_flags', 'internal.system_monitoring', 'internal.database_access'],
      internal_manager: ['internal.content_management', 'internal.user_management', 'internal.billing_management', 'internal.analytics_full_access']
    };

    return tierPermissions[subscriptionTier] || tierPermissions.free;
  }

  /**
   * Bulk update operations
   */
  async bulkUpdateUserRoles(updates) {
    try {
      const batch = updates.map(update => ({
        PutRequest: {
          Item: {
            user_id: update.userId,
            role: update.role,
            subscription_tier: update.subscriptionTier || update.role,
            updated_at: new Date().toISOString(),
            bulk_update: true
          }
        }
      }));

      // Process in batches of 25 (DynamoDB limit)
      for (let i = 0; i < batch.length; i += 25) {
        const batchChunk = batch.slice(i, i + 25);
        await this.dynamodb.batchWrite({
          RequestItems: {
            [this.tables.users]: batchChunk
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw new Error(`Failed to bulk update user roles: ${error.message}`);
    }
  }
}

module.exports = { PermissionsClient };
