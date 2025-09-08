/**
 * DynamoDB Permissions Service
 * 
 * This service provides comprehensive database operations for the permissions system
 * including users, roles, permissions, subscriptions, and quota management.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocument, 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand, 
  BatchGetCommand,
  BatchWriteCommand,
  TransactWriteCommand
} from '@aws-sdk/lib-dynamodb';

import { 
  UserRole, 
  Permission, 
  SubscriptionTier, 
  SubscriptionLimits,
  SUBSCRIPTION_LIMITS,
  PermissionUtils,
  ROLE_PERMISSIONS
} from '../permissions';

// DynamoDB client configuration
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-2'
});
const docClient = DynamoDBDocument.from(dynamoClient);

// Table names from environment variables
const TABLES = {
  USERS: process.env.USERS_TABLE || 'ai-nexus-dev-users',
  USER_PERMISSIONS: process.env.USER_PERMISSIONS_TABLE || 'ai-nexus-dev-user-permissions',
  ROLES: process.env.ROLES_TABLE || 'ai-nexus-dev-roles',
  ROLE_PERMISSIONS: process.env.ROLE_PERMISSIONS_TABLE || 'ai-nexus-dev-role-permissions',
  SUBSCRIPTION_LIMITS: process.env.SUBSCRIPTION_LIMITS_TABLE || 'ai-nexus-dev-subscription-limits',
  USER_QUOTAS: process.env.USER_QUOTAS_TABLE || 'ai-nexus-dev-user-quotas',
  COGNITO_GROUP_MAPPINGS: process.env.COGNITO_GROUP_MAPPINGS_TABLE || 'ai-nexus-dev-cognito-group-mappings',
  ORGANIZATION_SETTINGS: process.env.ORGANIZATION_SETTINGS_TABLE || 'ai-nexus-dev-organization-settings',
  TEAM_MEMBERSHIPS: process.env.TEAM_MEMBERSHIPS_TABLE || 'ai-nexus-dev-team-memberships',
  SUBSCRIPTION_BILLING: process.env.SUBSCRIPTION_BILLING_TABLE || 'ai-nexus-dev-subscription-billing'
};

// Type definitions for database entities

export interface DBUser {
  user_id: string;
  email: string;
  cognito_sub: string;
  organization_id: string;
  role: UserRole;
  subscription_tier: SubscriptionTier;
  display_name?: string;
  avatar_url?: string;
  preferences?: Record<string, any>;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  email_verified: boolean;
  onboarding_completed: boolean;
}

export interface DBUserPermission {
  user_id: string;
  permission: Permission;
  granted_at: string;
  granted_by: string;
  expires_at?: string;
  conditions?: Record<string, any>;
}

export interface DBRole {
  role_id: string;
  organization_id?: string;
  role_name: string;
  role_type: 'internal' | 'subscription' | 'custom';
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface DBRolePermission {
  role_id: string;
  permission: Permission;
  feature_area: string;
  conditions?: Record<string, any>;
}

export interface DBSubscriptionLimits {
  user_id: string;
  limit_type: string;
  subscription_tier: SubscriptionTier;
  current_usage: number;
  limit_value: number | 'unlimited';
  period_start: string;
  period_end: string;
  reset_frequency: 'monthly' | 'daily' | 'hourly';
  expires_at: number; // TTL timestamp
}

export interface DBUserQuota {
  user_id: string;
  quota_type: string;
  organization_id: string;
  current_value: number;
  limit_value: number | 'unlimited';
  last_reset: string;
  updated_at: string;
}

export interface DBCognitoGroupMapping {
  cognito_group: string;
  role: UserRole;
  description?: string;
  is_active: boolean;
  updated_at: string;
}

export interface DBTeamMembership {
  organization_id: string;
  user_id: string;
  role: UserRole;
  status: 'active' | 'pending' | 'inactive';
  permissions?: Permission[];
  joined_at: string;
  invited_by?: string;
  updated_at: string;
}

/**
 * Comprehensive Permissions Service for DynamoDB operations
 */
export class PermissionsService {
  
  /**
   * USER MANAGEMENT
   */
  
  // Get user by ID
  static async getUser(userId: string): Promise<DBUser | null> {
    try {
      const result = await docClient.send(new GetCommand({
        TableName: TABLES.USERS,
        Key: { user_id: userId }
      }));
      
      return result.Item as DBUser || null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<DBUser | null> {
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: TABLES.USERS,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
        Limit: 1
      }));
      
      return result.Items?.[0] as DBUser || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  // Create or update user
  static async upsertUser(user: Omit<DBUser, 'created_at' | 'updated_at'>): Promise<DBUser> {
    const now = new Date().toISOString();
    const existingUser = await this.getUser(user.user_id);
    
    const userData: DBUser = {
      ...user,
      created_at: existingUser?.created_at || now,
      updated_at: now
    };

    try {
      await docClient.send(new PutCommand({
        TableName: TABLES.USERS,
        Item: userData
      }));
      
      return userData;
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  }

  // Update user role and subscription
  static async updateUserRole(userId: string, role: UserRole, subscriptionTier?: SubscriptionTier): Promise<void> {
    try {
      const updateExpr = 'SET #role = :role, updated_at = :updatedAt';
      const exprNames: Record<string, string> = { '#role': 'role' };
      const exprValues: Record<string, any> = {
        ':role': role,
        ':updatedAt': new Date().toISOString()
      };

      if (subscriptionTier) {
        updateExpr.concat(', subscription_tier = :tier');
        exprValues[':tier'] = subscriptionTier;
      }

      await docClient.send(new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { user_id: userId },
        UpdateExpression: updateExpr,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues
      }));
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  // Get users by organization
  static async getUsersByOrganization(organizationId: string, role?: UserRole): Promise<DBUser[]> {
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: TABLES.USERS,
        IndexName: 'organization-role-index',
        KeyConditionExpression: role 
          ? 'organization_id = :orgId AND #role = :role'
          : 'organization_id = :orgId',
        ExpressionAttributeNames: role ? { '#role': 'role' } : undefined,
        ExpressionAttributeValues: role 
          ? { ':orgId': organizationId, ':role': role }
          : { ':orgId': organizationId }
      }));
      
      return result.Items as DBUser[] || [];
    } catch (error) {
      console.error('Error getting users by organization:', error);
      throw error;
    }
  }

  /**
   * PERMISSION MANAGEMENT
   */

  // Get user permissions (including role-based permissions)
  static async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      // Get user info to determine role
      const user = await this.getUser(userId);
      if (!user) return [];

      // Get role-based permissions
      const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
      
      // Get individual permissions
      const result = await docClient.send(new QueryCommand({
        TableName: TABLES.USER_PERMISSIONS,
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: { ':userId': userId }
      }));
      
      const individualPermissions = (result.Items as DBUserPermission[] || [])
        .filter(item => !item.expires_at || new Date(item.expires_at) > new Date())
        .map(item => item.permission);

      // Combine and deduplicate permissions
      const allPermissions = [...new Set([...rolePermissions, ...individualPermissions])];
      
      return allPermissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      throw error;
    }
  }

  // Grant permission to user
  static async grantUserPermission(
    userId: string, 
    permission: Permission, 
    grantedBy: string,
    expiresAt?: string,
    conditions?: Record<string, any>
  ): Promise<void> {
    try {
      const permissionData: DBUserPermission = {
        user_id: userId,
        permission,
        granted_at: new Date().toISOString(),
        granted_by: grantedBy,
        expires_at: expiresAt,
        conditions
      };

      await docClient.send(new PutCommand({
        TableName: TABLES.USER_PERMISSIONS,
        Item: permissionData
      }));
    } catch (error) {
      console.error('Error granting user permission:', error);
      throw error;
    }
  }

  // Revoke permission from user
  static async revokeUserPermission(userId: string, permission: Permission): Promise<void> {
    try {
      await docClient.send(new DeleteCommand({
        TableName: TABLES.USER_PERMISSIONS,
        Key: { user_id: userId, permission }
      }));
    } catch (error) {
      console.error('Error revoking user permission:', error);
      throw error;
    }
  }

  // Check if user has permission
  static async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId);
      return permissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * ROLE MANAGEMENT
   */

  // Create custom role
  static async createRole(
    roleId: string,
    roleName: string,
    organizationId?: string,
    description?: string,
    createdBy?: string
  ): Promise<DBRole> {
    const roleData: DBRole = {
      role_id: roleId,
      organization_id: organizationId,
      role_name: roleName,
      role_type: 'custom',
      description,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: createdBy || 'system'
    };

    try {
      await docClient.send(new PutCommand({
        TableName: TABLES.ROLES,
        Item: roleData
      }));
      
      return roleData;
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  // Add permission to role
  static async addPermissionToRole(
    roleId: string, 
    permission: Permission, 
    featureArea: string,
    conditions?: Record<string, any>
  ): Promise<void> {
    try {
      const permissionData: DBRolePermission = {
        role_id: roleId,
        permission,
        feature_area: featureArea,
        conditions
      };

      await docClient.send(new PutCommand({
        TableName: TABLES.ROLE_PERMISSIONS,
        Item: permissionData
      }));
    } catch (error) {
      console.error('Error adding permission to role:', error);
      throw error;
    }
  }

  // Get role permissions
  static async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: TABLES.ROLE_PERMISSIONS,
        KeyConditionExpression: 'role_id = :roleId',
        ExpressionAttributeValues: { ':roleId': roleId }
      }));
      
      return (result.Items as DBRolePermission[] || []).map(item => item.permission);
    } catch (error) {
      console.error('Error getting role permissions:', error);
      throw error;
    }
  }

  /**
   * SUBSCRIPTION & QUOTA MANAGEMENT
   */

  // Get user subscription limits
  static async getUserSubscriptionLimits(userId: string): Promise<SubscriptionLimits | null> {
    try {
      const user = await this.getUser(userId);
      if (!user) return null;

      return PermissionUtils.getSubscriptionLimits(user.role);
    } catch (error) {
      console.error('Error getting subscription limits:', error);
      throw error;
    }
  }

  // Update user quota
  static async updateUserQuota(
    userId: string, 
    quotaType: string, 
    newValue: number,
    organizationId: string
  ): Promise<void> {
    try {
      const quotaData: DBUserQuota = {
        user_id: userId,
        quota_type: quotaType,
        organization_id: organizationId,
        current_value: newValue,
        limit_value: 0, // This will be updated based on subscription
        last_reset: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await docClient.send(new PutCommand({
        TableName: TABLES.USER_QUOTAS,
        Item: quotaData,
        ConditionExpression: 'attribute_not_exists(user_id) OR updated_at < :timestamp',
        ExpressionAttributeValues: {
          ':timestamp': quotaData.updated_at
        }
      }));
    } catch (error) {
      console.error('Error updating user quota:', error);
      throw error;
    }
  }

  // Get user quota
  static async getUserQuota(userId: string, quotaType: string): Promise<DBUserQuota | null> {
    try {
      const result = await docClient.send(new GetCommand({
        TableName: TABLES.USER_QUOTAS,
        Key: { user_id: userId, quota_type: quotaType }
      }));
      
      return result.Item as DBUserQuota || null;
    } catch (error) {
      console.error('Error getting user quota:', error);
      throw error;
    }
  }

  // Check if user can create more AI agents
  static async canUserCreateMoreAgents(userId: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;

      const quota = await this.getUserQuota(userId, 'ai_agents_monthly');
      const currentCount = quota?.current_value || 0;

      return PermissionUtils.canCreateMoreAgents(user.role, currentCount);
    } catch (error) {
      console.error('Error checking agent creation limit:', error);
      return false;
    }
  }

  // Increment AI agent count
  static async incrementAgentCount(userId: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;

      const canCreate = await this.canUserCreateMoreAgents(userId);
      if (!canCreate) return false;

      // Update quota
      const quota = await this.getUserQuota(userId, 'ai_agents_monthly');
      const newCount = (quota?.current_value || 0) + 1;

      await this.updateUserQuota(userId, 'ai_agents_monthly', newCount, user.organization_id);
      return true;
    } catch (error) {
      console.error('Error incrementing agent count:', error);
      return false;
    }
  }

  /**
   * TEAM MEMBERSHIP MANAGEMENT
   */

  // Add user to team/organization
  static async addTeamMember(
    organizationId: string,
    userId: string,
    role: UserRole,
    invitedBy?: string,
    permissions?: Permission[]
  ): Promise<void> {
    try {
      const membershipData: DBTeamMembership = {
        organization_id: organizationId,
        user_id: userId,
        role,
        status: 'active',
        permissions,
        joined_at: new Date().toISOString(),
        invited_by: invitedBy,
        updated_at: new Date().toISOString()
      };

      await docClient.send(new PutCommand({
        TableName: TABLES.TEAM_MEMBERSHIPS,
        Item: membershipData
      }));
    } catch (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  }

  // Get team members
  static async getTeamMembers(organizationId: string, role?: UserRole): Promise<DBTeamMembership[]> {
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: TABLES.TEAM_MEMBERSHIPS,
        IndexName: role ? 'org-role-index' : undefined,
        KeyConditionExpression: role
          ? 'organization_id = :orgId AND #role = :role'
          : 'organization_id = :orgId',
        ExpressionAttributeNames: role ? { '#role': 'role' } : undefined,
        ExpressionAttributeValues: role
          ? { ':orgId': organizationId, ':role': role }
          : { ':orgId': organizationId }
      }));
      
      return result.Items as DBTeamMembership[] || [];
    } catch (error) {
      console.error('Error getting team members:', error);
      throw error;
    }
  }

  /**
   * COGNITO GROUP MAPPING
   */

  // Update Cognito group mapping
  static async updateCognitoGroupMapping(cognitoGroup: string, role: UserRole): Promise<void> {
    try {
      const mappingData: DBCognitoGroupMapping = {
        cognito_group: cognitoGroup,
        role,
        is_active: true,
        updated_at: new Date().toISOString()
      };

      await docClient.send(new PutCommand({
        TableName: TABLES.COGNITO_GROUP_MAPPINGS,
        Item: mappingData
      }));
    } catch (error) {
      console.error('Error updating Cognito group mapping:', error);
      throw error;
    }
  }

  // Get role from Cognito groups
  static async getRoleFromCognitoGroups(groups: string[]): Promise<UserRole> {
    try {
      // Get all group mappings
      const promises = groups.map(group => 
        docClient.send(new GetCommand({
          TableName: TABLES.COGNITO_GROUP_MAPPINGS,
          Key: { cognito_group: group }
        }))
      );

      const results = await Promise.all(promises);
      const mappings = results
        .map(result => result.Item as DBCognitoGroupMapping)
        .filter(item => item && item.is_active);

      // Use the utility function to determine the highest priority role
      const cognitoGroups = mappings.map(m => m.cognito_group);
      return PermissionUtils.mapCognitoGroupsToRole(cognitoGroups);
    } catch (error) {
      console.error('Error getting role from Cognito groups:', error);
      return 'free'; // Default fallback
    }
  }

  /**
   * ANALYTICS & REPORTING
   */

  // Get subscription tier distribution
  static async getSubscriptionTierStats(): Promise<Record<SubscriptionTier, number>> {
    try {
      const stats: Record<SubscriptionTier, number> = {
        free: 0,
        basic: 0,
        pro: 0,
        extreme: 0,
        enterprise: 0
      };

      // Query each subscription tier
      for (const tier of Object.keys(stats) as SubscriptionTier[]) {
        const result = await docClient.send(new QueryCommand({
          TableName: TABLES.USERS,
          IndexName: 'subscription-created-index',
          KeyConditionExpression: 'subscription_tier = :tier',
          ExpressionAttributeValues: { ':tier': tier },
          Select: 'COUNT'
        }));
        
        stats[tier] = result.Count || 0;
      }

      return stats;
    } catch (error) {
      console.error('Error getting subscription stats:', error);
      throw error;
    }
  }

  /**
   * BULK OPERATIONS
   */

  // Bulk update user roles
  static async bulkUpdateUserRoles(updates: Array<{ userId: string; role: UserRole; subscriptionTier?: SubscriptionTier }>): Promise<void> {
    try {
      const chunks = this.chunkArray(updates, 25); // DynamoDB batch limit
      
      for (const chunk of chunks) {
        const writeRequests = chunk.map(update => ({
          PutRequest: {
            Item: {
              user_id: update.userId,
              role: update.role,
              subscription_tier: update.subscriptionTier,
              updated_at: new Date().toISOString()
            }
          }
        }));

        await docClient.send(new BatchWriteCommand({
          RequestItems: {
            [TABLES.USERS]: writeRequests
          }
        }));
      }
    } catch (error) {
      console.error('Error bulk updating user roles:', error);
      throw error;
    }
  }

  /**
   * UTILITY METHODS
   */

  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Export the service and types
export default PermissionsService;
