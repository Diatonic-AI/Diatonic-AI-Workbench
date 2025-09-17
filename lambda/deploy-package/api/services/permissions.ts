// AI Nexus Workbench - Enhanced Permissions Service
// Integrates with the new DynamoDB permissions tables

import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// Initialize DynamoDB client
const dynamodb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-2',
  })
);

// Table names from environment variables
const TABLES = {
  USERS: process.env.USERS_TABLE || 'aws-devops-dev-users',
  ROLES: process.env.ROLES_TABLE || 'aws-devops-dev-roles',
  ROLE_PERMISSIONS: process.env.ROLE_PERMISSIONS_TABLE || 'aws-devops-dev-role-permissions',
  USER_PERMISSIONS: process.env.USER_PERMISSIONS_TABLE || 'aws-devops-dev-user-permissions',
  TEAM_MEMBERSHIPS: process.env.TEAM_MEMBERSHIPS_TABLE || 'aws-devops-dev-team-memberships',
  COGNITO_GROUP_MAPPINGS: process.env.COGNITO_GROUP_MAPPINGS_TABLE || 'aws-devops-dev-cognito-group-mappings',
  ORGANIZATION_SETTINGS: process.env.ORGANIZATION_SETTINGS_TABLE || 'aws-devops-dev-organization-settings',
  USER_QUOTAS: process.env.USER_QUOTAS_TABLE || 'aws-devops-dev-user-quotas',
  SUBSCRIPTION_LIMITS: process.env.SUBSCRIPTION_LIMITS_TABLE || 'aws-devops-dev-subscription-limits',
  SUBSCRIPTION_BILLING: process.env.SUBSCRIPTION_BILLING_TABLE || 'aws-devops-dev-subscription-billing',
} as const;

// ===== Type Definitions =====

export interface User {
  user_id: string;
  email: string;
  organization_id: string;
  role: string;
  subscription_tier: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  profile: {
    first_name?: string;
    last_name?: string;
    display_name?: string;
    avatar_url?: string;
    timezone?: string;
    preferences: Record<string, unknown>;
  };
  metadata: Record<string, unknown>;
}

export interface Role {
  role_id: string;
  role_name: string;
  description: string;
  role_type: 'system' | 'custom';
  organization_id?: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  is_active: boolean;
}

export interface Permission {
  permission: string;
  resource: string;
  action: string;
  feature_area: string;
  description: string;
  conditions?: Record<string, unknown>;
}

export interface UserPermissions {
  user_id: string;
  permission: string;
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  conditions?: Record<string, unknown>;
}

export interface TeamMembership {
  organization_id: string;
  user_id: string;
  role: string;
  status: 'active' | 'pending' | 'suspended';
  joined_at: string;
  updated_at: string;
  invited_by: string;
  permissions_override?: string[];
}

export interface UserQuota {
  user_id: string;
  quota_type: string;
  limit_value: number;
  current_usage: number;
  period_start: string;
  period_end: string;
  updated_at: string;
  organization_id: string;
  subscription_tier: string;
  metadata: Record<string, unknown>;
}

// ===== Enhanced Permissions Service =====

export class PermissionsService {
  /**
   * Get comprehensive user information including permissions
   */
  async getUserWithPermissions(userId: string): Promise<{
    user: User | null;
    permissions: string[];
    rolePermissions: string[];
    directPermissions: string[];
    teamMemberships: TeamMembership[];
    quotas: UserQuota[];
  }> {
    try {
      // Fetch user data
      const userResult = await dynamodb.send(new GetCommand({
        TableName: TABLES.USERS,
        Key: { user_id: userId }
      }));

      const user = userResult.Item as User | null;
      if (!user) {
        return {
          user: null,
          permissions: [],
          rolePermissions: [],
          directPermissions: [],
          teamMemberships: [],
          quotas: []
        };
      }

      // Get team memberships
      const teamMemberships = await this.getUserTeamMemberships(userId);

      // Get role-based permissions
      const rolePermissions = await this.getRolePermissions(user.role);

      // Get direct user permissions
      const directPermissions = await this.getUserDirectPermissions(userId);

      // Get user quotas
      const quotas = await this.getUserQuotas(userId);

      // Combine all permissions
      const allPermissions = [...new Set([
        ...rolePermissions,
        ...directPermissions,
        // Add team-specific permissions if any
        ...teamMemberships.flatMap(tm => tm.permissions_override || [])
      ])];

      return {
        user,
        permissions: allPermissions,
        rolePermissions,
        directPermissions,
        teamMemberships,
        quotas
      };

    } catch (error) {
      console.error('Error getting user permissions:', error);
      throw new Error('Failed to retrieve user permissions');
    }
  }

  /**
   * Get permissions for a specific role
   */
  async getRolePermissions(roleId: string): Promise<string[]> {
    try {
      const result = await dynamodb.send(new QueryCommand({
        TableName: TABLES.ROLE_PERMISSIONS,
        KeyConditionExpression: 'role_id = :role_id',
        ExpressionAttributeValues: {
          ':role_id': roleId
        }
      }));

      return (result.Items || []).map(item => item.permission as string);
    } catch (error) {
      console.error('Error getting role permissions:', error);
      return [];
    }
  }

  /**
   * Get direct user permissions (overrides)
   */
  async getUserDirectPermissions(userId: string): Promise<string[]> {
    try {
      const result = await dynamodb.send(new QueryCommand({
        TableName: TABLES.USER_PERMISSIONS,
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: {
          ':user_id': userId
        }
      }));

      return (result.Items || [])
        .filter(item => {
          // Check if permission is still valid (not expired)
          if (item.expires_at) {
            return new Date(item.expires_at) > new Date();
          }
          return true;
        })
        .map(item => item.permission as string);
    } catch (error) {
      console.error('Error getting user direct permissions:', error);
      return [];
    }
  }

  /**
   * Get user's team memberships
   */
  async getUserTeamMemberships(userId: string): Promise<TeamMembership[]> {
    try {
      const result = await dynamodb.send(new QueryCommand({
        TableName: TABLES.TEAM_MEMBERSHIPS,
        IndexName: 'user-joined-index',
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: {
          ':user_id': userId
        }
      }));

      return (result.Items || [])
        .filter(item => item.status === 'active')
        .map(item => item as TeamMembership);
    } catch (error) {
      console.error('Error getting team memberships:', error);
      return [];
    }
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const userPerms = await this.getUserWithPermissions(userId);
      
      // Check exact permission match
      if (userPerms.permissions.includes(permission)) {
        return true;
      }

      // Check wildcard permissions
      const [action, resource] = permission.split(':');
      const wildcardPermissions = [
        `${action}:*`,  // Same action, any resource
        `*:${resource}`, // Any action, same resource
        '*:*',          // Any action, any resource
      ];

      return wildcardPermissions.some(wildcard => 
        userPerms.permissions.includes(wildcard)
      );
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Grant permission to user
   */
  async grantUserPermission(
    userId: string,
    permission: string,
    grantedBy: string,
    expiresAt?: string,
    conditions?: Record<string, unknown>
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      await dynamodb.send(new PutCommand({
        TableName: TABLES.USER_PERMISSIONS,
        Item: {
          user_id: userId,
          permission: permission,
          granted_by: grantedBy,
          granted_at: now,
          expires_at: expiresAt,
          conditions: conditions || {}
        }
      }));
    } catch (error) {
      console.error('Error granting user permission:', error);
      throw new Error('Failed to grant user permission');
    }
  }

  /**
   * Revoke permission from user
   */
  async revokeUserPermission(userId: string, permission: string): Promise<void> {
    try {
      await dynamodb.send(new DeleteCommand({
        TableName: TABLES.USER_PERMISSIONS,
        Key: {
          user_id: userId,
          permission: permission
        }
      }));
    } catch (error) {
      console.error('Error revoking user permission:', error);
      throw new Error('Failed to revoke user permission');
    }
  }

  /**
   * Get user quotas and usage
   */
  async getUserQuotas(userId: string): Promise<UserQuota[]> {
    try {
      const result = await dynamodb.send(new QueryCommand({
        TableName: TABLES.USER_QUOTAS,
        KeyConditionExpression: 'user_id = :user_id',
        ExpressionAttributeValues: {
          ':user_id': userId
        }
      }));

      return (result.Items || []).map(item => item as UserQuota);
    } catch (error) {
      console.error('Error getting user quotas:', error);
      return [];
    }
  }

  /**
   * Update user quota usage
   */
  async updateUserQuotaUsage(
    userId: string,
    quotaType: string,
    usage: number,
    increment = true
  ): Promise<void> {
    try {
      const updateExpression = increment 
        ? 'SET current_usage = current_usage + :usage, updated_at = :updated_at'
        : 'SET current_usage = :usage, updated_at = :updated_at';

      await dynamodb.send(new UpdateCommand({
        TableName: TABLES.USER_QUOTAS,
        Key: {
          user_id: userId,
          quota_type: quotaType
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: {
          ':usage': usage,
          ':updated_at': new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error('Error updating user quota usage:', error);
      throw new Error('Failed to update user quota usage');
    }
  }

  /**
   * Check if user has exceeded quota
   */
  async checkUserQuota(userId: string, quotaType: string): Promise<{
    hasQuota: boolean;
    usage: number;
    limit: number;
    remainingUsage: number;
    percentageUsed: number;
  }> {
    try {
      const quota = await dynamodb.send(new GetCommand({
        TableName: TABLES.USER_QUOTAS,
        Key: {
          user_id: userId,
          quota_type: quotaType
        }
      }));

      if (!quota.Item) {
        return {
          hasQuota: false,
          usage: 0,
          limit: -1, // Unlimited
          remainingUsage: -1,
          percentageUsed: 0
        };
      }

      const item = quota.Item as UserQuota;
      const remaining = item.limit_value - item.current_usage;
      const percentageUsed = (item.current_usage / item.limit_value) * 100;

      return {
        hasQuota: true,
        usage: item.current_usage,
        limit: item.limit_value,
        remainingUsage: Math.max(0, remaining),
        percentageUsed: Math.min(100, percentageUsed)
      };
    } catch (error) {
      console.error('Error checking user quota:', error);
      return {
        hasQuota: false,
        usage: 0,
        limit: -1,
        remainingUsage: -1,
        percentageUsed: 0
      };
    }
  }

  /**
   * Create or update a role
   */
  async createRole(
    roleId: string,
    roleName: string,
    description: string,
    permissions: string[],
    createdBy: string,
    organizationId?: string,
    roleType: 'system' | 'custom' = 'custom'
  ): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Create the role
      await dynamodb.send(new PutCommand({
        TableName: TABLES.ROLES,
        Item: {
          role_id: roleId,
          role_name: roleName,
          description: description,
          role_type: roleType,
          organization_id: organizationId,
          created_at: now,
          updated_at: now,
          created_by: createdBy,
          is_active: true
        }
      }));

      // Add role permissions
      const permissionPromises = permissions.map(permission => 
        dynamodb.send(new PutCommand({
          TableName: TABLES.ROLE_PERMISSIONS,
          Item: {
            role_id: roleId,
            permission: permission,
            feature_area: permission.split(':')[1] || 'general',
            granted_at: now,
            granted_by: createdBy
          }
        }))
      );

      await Promise.all(permissionPromises);
    } catch (error) {
      console.error('Error creating role:', error);
      throw new Error('Failed to create role');
    }
  }

  /**
   * Add user to team/organization
   */
  async addUserToTeam(
    organizationId: string,
    userId: string,
    role: string,
    invitedBy: string,
    permissionsOverride?: string[]
  ): Promise<void> {
    try {
      const now = new Date().toISOString();

      await dynamodb.send(new PutCommand({
        TableName: TABLES.TEAM_MEMBERSHIPS,
        Item: {
          organization_id: organizationId,
          user_id: userId,
          role: role,
          status: 'active',
          joined_at: now,
          updated_at: now,
          invited_by: invitedBy,
          permissions_override: permissionsOverride || []
        }
      }));
    } catch (error) {
      console.error('Error adding user to team:', error);
      throw new Error('Failed to add user to team');
    }
  }

  /**
   * Get organization settings
   */
  async getOrganizationSettings(organizationId: string, settingType: string): Promise<Record<string, unknown> | null> {
    try {
      const result = await dynamodb.send(new GetCommand({
        TableName: TABLES.ORGANIZATION_SETTINGS,
        Key: {
          organization_id: organizationId,
          setting_type: settingType
        }
      }));

      return result.Item?.settings || null;
    } catch (error) {
      console.error('Error getting organization settings:', error);
      return null;
    }
  }

  /**
   * Update organization settings
   */
  async updateOrganizationSettings(
    organizationId: string,
    settingType: string,
    settings: Record<string, unknown>,
    updatedBy: string
  ): Promise<void> {
    try {
      const now = new Date().toISOString();

      await dynamodb.send(new PutCommand({
        TableName: TABLES.ORGANIZATION_SETTINGS,
        Item: {
          organization_id: organizationId,
          setting_type: settingType,
          settings: settings,
          updated_at: now,
          updated_by: updatedBy
        }
      }));
    } catch (error) {
      console.error('Error updating organization settings:', error);
      throw new Error('Failed to update organization settings');
    }
  }

  /**
   * Feature-specific permission checks
   */
  async canAccessFeature(userId: string, feature: string): Promise<boolean> {
    const permissions = [
      `read:${feature}`,
      `write:${feature}`,
      `admin:${feature}`,
      `${feature}:*`,
      '*:*'
    ];

    for (const permission of permissions) {
      if (await this.hasPermission(userId, permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all permissions for debugging
   */
  async getUserPermissionsSummary(userId: string): Promise<{
    user: User | null;
    allPermissions: string[];
    roleBasedPermissions: string[];
    directPermissions: string[];
    teamPermissions: string[];
    quotaStatus: Record<string, unknown>;
  }> {
    const userWithPerms = await this.getUserWithPermissions(userId);
    
    const teamPermissions = userWithPerms.teamMemberships
      .flatMap(tm => tm.permissions_override || []);

    const quotaStatus: Record<string, unknown> = {};
    for (const quota of userWithPerms.quotas) {
      const status = await this.checkUserQuota(userId, quota.quota_type);
      quotaStatus[quota.quota_type] = status;
    }

    return {
      user: userWithPerms.user,
      allPermissions: userWithPerms.permissions,
      roleBasedPermissions: userWithPerms.rolePermissions,
      directPermissions: userWithPerms.directPermissions,
      teamPermissions,
      quotaStatus
    };
  }
}

// Singleton export
export const permissionsService = new PermissionsService();
