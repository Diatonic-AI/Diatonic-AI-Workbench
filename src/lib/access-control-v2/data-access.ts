/**
 * Data Access Layer v2 - DynamoDB Operations for Tenant System
 * 
 * This module provides the data access layer for the tenant-based authorization system:
 * - Tenant CRUD operations
 * - Membership management
 * - Subscription and usage tracking
 * - Audit logging
 * - Efficient querying with proper indexes
 */

import { 
  DynamoDBClient, 
  QueryCommand, 
  GetItemCommand, 
  PutItemCommand, 
  UpdateItemCommand, 
  DeleteItemCommand,
  BatchGetItemCommand,
  BatchWriteItemCommand,
  TransactWriteItemsCommand,
  ConditionExpression
} from '@aws-sdk/client-dynamodb';

import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

import {
  TenantAccount,
  TenantAccountType,
  TenantMembership,
  TenantMembershipStatus,
  TenantRole,
  TenantSubscription,
  TenantUsage,
  AuditLogEntry,
  UserTenantContext,
  TenantMembershipContext,
  createTenantAccount,
  createTenantMembership,
  createTenantSubscription,
  createTenantUsage,
  createAuditLogEntry
} from './tenancy';

// ==============================================================================
// CONFIGURATION
// ==============================================================================

/**
 * DynamoDB configuration
 */
export interface DynamoConfig {
  /** DynamoDB client */
  client: DynamoDBClient;
  
  /** Table names */
  tables: {
    /** Main tenant data table */
    tenants: string;
    /** Audit logs table */
    auditLogs: string;
  };
  
  /** Index names */
  indexes: {
    /** GSI for querying by user ID */
    userMemberships: string;
    /** GSI for querying by tenant ID */
    tenantMemberships: string;
    /** GSI for audit logs by tenant */
    auditByTenant: string;
    /** GSI for audit logs by user */
    auditByUser: string;
  };
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: Partial<DynamoConfig> = {
  tables: {
    tenants: 'AuthV2Tenants',
    auditLogs: 'AuthV2AuditLogs',
  },
  indexes: {
    userMemberships: 'UserMembershipsGSI',
    tenantMemberships: 'TenantMembershipsGSI',
    auditByTenant: 'AuditByTenantGSI',
    auditByUser: 'AuditByUserGSI',
  },
};

// ==============================================================================
// ERROR TYPES
// ==============================================================================

export class TenantDataError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'TenantDataError';
  }
}

export class TenantNotFoundError extends TenantDataError {
  constructor(tenantId: string) {
    super(`Tenant not found: ${tenantId}`, 'TENANT_NOT_FOUND', 404);
  }
}

export class MembershipNotFoundError extends TenantDataError {
  constructor(userId: string, tenantId: string) {
    super(`Membership not found for user ${userId} in tenant ${tenantId}`, 'MEMBERSHIP_NOT_FOUND', 404);
  }
}

export class DuplicateTenantError extends TenantDataError {
  constructor(tenantId: string) {
    super(`Tenant already exists: ${tenantId}`, 'TENANT_EXISTS', 409);
  }
}

export class DuplicateMembershipError extends TenantDataError {
  constructor(userId: string, tenantId: string) {
    super(`User ${userId} is already a member of tenant ${tenantId}`, 'MEMBERSHIP_EXISTS', 409);
  }
}

// ==============================================================================
// QUERY INTERFACES
// ==============================================================================

/**
 * Pagination options
 */
export interface PaginationOptions {
  /** Page size limit */
  limit?: number;
  /** Continuation token */
  nextToken?: string;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  /** Result items */
  items: T[];
  /** Next page token */
  nextToken?: string;
  /** Total count (if available) */
  count?: number;
}

/**
 * Query filters
 */
export interface TenantQueryFilters {
  accountType?: TenantAccountType;
  status?: 'active' | 'suspended' | 'deleted';
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface MembershipQueryFilters {
  tenantRole?: TenantRole;
  status?: TenantMembershipStatus;
  joinedAfter?: Date;
  joinedBefore?: Date;
}

export interface AuditLogQueryFilters {
  action?: string;
  resourceType?: string;
  timestampAfter?: Date;
  timestampBefore?: Date;
}

// ==============================================================================
// DATA ACCESS CLASS
// ==============================================================================

/**
 * Data access layer for tenant operations
 */
export class TenantDataAccess {
  private config: DynamoConfig;

  constructor(config: DynamoConfig) {
    this.config = config;
  }

  // ==========================================================================
  // TENANT OPERATIONS
  // ==========================================================================

  /**
   * Create a new tenant
   */
  async createTenant(
    tenantId: string,
    name: string,
    accountType: TenantAccountType,
    ownerId: string,
    metadata?: Record<string, any>
  ): Promise<TenantAccount> {
    try {
      const tenant = createTenantAccount(tenantId, name, accountType, ownerId, metadata);
      
      const params = {
        TableName: this.config.tables.tenants,
        Item: marshall({
          PK: `TENANT#${tenantId}`,
          SK: `TENANT#${tenantId}`,
          Type: 'TENANT',
          ...tenant,
        }),
        ConditionExpression: 'attribute_not_exists(PK)',
      };

      await this.config.client.send(new PutItemCommand(params));
      return tenant;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new DuplicateTenantError(tenantId);
      }
      throw new TenantDataError(`Failed to create tenant: ${error.message}`, 'CREATE_TENANT_FAILED');
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string): Promise<TenantAccount | null> {
    try {
      const params = {
        TableName: this.config.tables.tenants,
        Key: marshall({
          PK: `TENANT#${tenantId}`,
          SK: `TENANT#${tenantId}`,
        }),
      };

      const result = await this.config.client.send(new GetItemCommand(params));
      
      if (!result.Item) {
        return null;
      }

      const item = unmarshall(result.Item);
      const { PK, SK, Type, ...tenant } = item;
      return tenant as TenantAccount;
    } catch (error: any) {
      throw new TenantDataError(`Failed to get tenant: ${error.message}`, 'GET_TENANT_FAILED');
    }
  }

  /**
   * Update tenant
   */
  async updateTenant(
    tenantId: string,
    updates: Partial<Pick<TenantAccount, 'name' | 'metadata' | 'updatedAt'>>
  ): Promise<TenantAccount> {
    try {
      const updateExpression: string[] = [];
      const expressionAttributeValues: Record<string, any> = {};
      const expressionAttributeNames: Record<string, string> = {};

      if (updates.name) {
        updateExpression.push('#name = :name');
        expressionAttributeNames['#name'] = 'name';
        expressionAttributeValues[':name'] = updates.name;
      }

      if (updates.metadata) {
        updateExpression.push('metadata = :metadata');
        expressionAttributeValues[':metadata'] = updates.metadata;
      }

      updateExpression.push('updatedAt = :updatedAt');
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const params = {
        TableName: this.config.tables.tenants,
        Key: marshall({
          PK: `TENANT#${tenantId}`,
          SK: `TENANT#${tenantId}`,
        }),
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ExpressionAttributeNames: expressionAttributeNames,
        ConditionExpression: 'attribute_exists(PK)',
        ReturnValues: 'ALL_NEW',
      };

      const result = await this.config.client.send(new UpdateItemCommand(params));
      
      if (!result.Attributes) {
        throw new TenantNotFoundError(tenantId);
      }

      const item = unmarshall(result.Attributes);
      const { PK, SK, Type, ...tenant } = item;
      return tenant as TenantAccount;
    } catch (error: any) {
      if (error instanceof TenantNotFoundError) {
        throw error;
      }
      if (error.name === 'ConditionalCheckFailedException') {
        throw new TenantNotFoundError(tenantId);
      }
      throw new TenantDataError(`Failed to update tenant: ${error.message}`, 'UPDATE_TENANT_FAILED');
    }
  }

  /**
   * Delete tenant (soft delete)
   */
  async deleteTenant(tenantId: string): Promise<void> {
    try {
      const params = {
        TableName: this.config.tables.tenants,
        Key: marshall({
          PK: `TENANT#${tenantId}`,
          SK: `TENANT#${tenantId}`,
        }),
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: marshall({
          ':status': 'deleted',
          ':updatedAt': new Date().toISOString(),
        }),
        ConditionExpression: 'attribute_exists(PK)',
      };

      await this.config.client.send(new UpdateItemCommand(params));
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new TenantNotFoundError(tenantId);
      }
      throw new TenantDataError(`Failed to delete tenant: ${error.message}`, 'DELETE_TENANT_FAILED');
    }
  }

  // ==========================================================================
  // MEMBERSHIP OPERATIONS
  // ==========================================================================

  /**
   * Create tenant membership
   */
  async createMembership(
    userId: string,
    tenantId: string,
    tenantRole: TenantRole,
    invitedBy?: string,
    customPermissions?: string[]
  ): Promise<TenantMembership> {
    try {
      const membership = createTenantMembership(
        userId,
        tenantId,
        tenantRole,
        invitedBy,
        customPermissions
      );

      const params = {
        TableName: this.config.tables.tenants,
        Item: marshall({
          PK: `TENANT#${tenantId}`,
          SK: `USER#${userId}`,
          Type: 'MEMBERSHIP',
          GSI1PK: `USER#${userId}`,
          GSI1SK: `TENANT#${tenantId}`,
          ...membership,
        }),
        ConditionExpression: 'attribute_not_exists(PK)',
      };

      await this.config.client.send(new PutItemCommand(params));
      return membership;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new DuplicateMembershipError(userId, tenantId);
      }
      throw new TenantDataError(`Failed to create membership: ${error.message}`, 'CREATE_MEMBERSHIP_FAILED');
    }
  }

  /**
   * Get membership
   */
  async getMembership(userId: string, tenantId: string): Promise<TenantMembership | null> {
    try {
      const params = {
        TableName: this.config.tables.tenants,
        Key: marshall({
          PK: `TENANT#${tenantId}`,
          SK: `USER#${userId}`,
        }),
      };

      const result = await this.config.client.send(new GetItemCommand(params));
      
      if (!result.Item) {
        return null;
      }

      const item = unmarshall(result.Item);
      const { PK, SK, Type, GSI1PK, GSI1SK, ...membership } = item;
      return membership as TenantMembership;
    } catch (error: any) {
      throw new TenantDataError(`Failed to get membership: ${error.message}`, 'GET_MEMBERSHIP_FAILED');
    }
  }

  /**
   * Update membership
   */
  async updateMembership(
    userId: string,
    tenantId: string,
    updates: Partial<Pick<TenantMembership, 'tenantRole' | 'status' | 'customPermissions' | 'updatedAt'>>
  ): Promise<TenantMembership> {
    try {
      const updateExpression: string[] = [];
      const expressionAttributeValues: Record<string, any> = {};

      if (updates.tenantRole) {
        updateExpression.push('tenantRole = :tenantRole');
        expressionAttributeValues[':tenantRole'] = updates.tenantRole;
      }

      if (updates.status) {
        updateExpression.push('#status = :status');
        expressionAttributeValues[':status'] = updates.status;
      }

      if (updates.customPermissions !== undefined) {
        updateExpression.push('customPermissions = :customPermissions');
        expressionAttributeValues[':customPermissions'] = updates.customPermissions;
      }

      updateExpression.push('updatedAt = :updatedAt');
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const params = {
        TableName: this.config.tables.tenants,
        Key: marshall({
          PK: `TENANT#${tenantId}`,
          SK: `USER#${userId}`,
        }),
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ExpressionAttributeNames: updates.status ? { '#status': 'status' } : undefined,
        ConditionExpression: 'attribute_exists(PK)',
        ReturnValues: 'ALL_NEW',
      };

      const result = await this.config.client.send(new UpdateItemCommand(params));
      
      if (!result.Attributes) {
        throw new MembershipNotFoundError(userId, tenantId);
      }

      const item = unmarshall(result.Attributes);
      const { PK, SK, Type, GSI1PK, GSI1SK, ...membership } = item;
      return membership as TenantMembership;
    } catch (error: any) {
      if (error instanceof MembershipNotFoundError) {
        throw error;
      }
      if (error.name === 'ConditionalCheckFailedException') {
        throw new MembershipNotFoundError(userId, tenantId);
      }
      throw new TenantDataError(`Failed to update membership: ${error.message}`, 'UPDATE_MEMBERSHIP_FAILED');
    }
  }

  /**
   * Delete membership
   */
  async deleteMembership(userId: string, tenantId: string): Promise<void> {
    try {
      const params = {
        TableName: this.config.tables.tenants,
        Key: marshall({
          PK: `TENANT#${tenantId}`,
          SK: `USER#${userId}`,
        }),
        ConditionExpression: 'attribute_exists(PK)',
      };

      await this.config.client.send(new DeleteItemCommand(params));
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new MembershipNotFoundError(userId, tenantId);
      }
      throw new TenantDataError(`Failed to delete membership: ${error.message}`, 'DELETE_MEMBERSHIP_FAILED');
    }
  }

  /**
   * Get user memberships across all tenants
   */
  async getUserMemberships(
    userId: string,
    pagination?: PaginationOptions,
    filters?: MembershipQueryFilters
  ): Promise<PaginatedResult<TenantMembershipContext>> {
    try {
      const keyConditionExpression = 'GSI1PK = :userId';
      const expressionAttributeValues: Record<string, any> = {
        ':userId': `USER#${userId}`,
      };

      let filterExpression: string | undefined;

      if (filters) {
        const filterParts: string[] = [];

        if (filters.tenantRole) {
          filterParts.push('tenantRole = :tenantRole');
          expressionAttributeValues[':tenantRole'] = filters.tenantRole;
        }

        if (filters.status) {
          filterParts.push('#status = :status');
          expressionAttributeValues[':status'] = filters.status;
        }

        if (filterParts.length > 0) {
          filterExpression = filterParts.join(' AND ');
        }
      }

      const params = {
        TableName: this.config.tables.tenants,
        IndexName: this.config.indexes.userMemberships,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ExpressionAttributeNames: filters?.status ? { '#status': 'status' } : undefined,
        FilterExpression: filterExpression,
        Limit: pagination?.limit || 50,
        ExclusiveStartKey: pagination?.nextToken ? JSON.parse(pagination.nextToken) : undefined,
      };

      const result = await this.config.client.send(new QueryCommand(params));
      
      const memberships: TenantMembership[] = result.Items?.map(item => {
        const unmarshalled = unmarshall(item);
        const { PK, SK, Type, GSI1PK, GSI1SK, ...membership } = unmarshalled;
        return membership as TenantMembership;
      }) || [];

      // Get tenant details for each membership
      const tenantIds = memberships.map(m => m.tenantId);
      const tenants = await this.getTenantsBatch(tenantIds);
      const subscriptions = await this.getSubscriptionsBatch(tenantIds);

      const membershipContexts: TenantMembershipContext[] = memberships.map(membership => {
        const tenant = tenants.find(t => t.tenantId === membership.tenantId);
        const subscription = subscriptions.find(s => s.tenantId === membership.tenantId);

        if (!tenant) {
          throw new TenantNotFoundError(membership.tenantId);
        }

        return {
          membership,
          tenant,
          subscription: subscription || undefined,
        };
      });

      return {
        items: membershipContexts,
        nextToken: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : undefined,
        count: result.Count,
      };
    } catch (error: any) {
      throw new TenantDataError(`Failed to get user memberships: ${error.message}`, 'GET_USER_MEMBERSHIPS_FAILED');
    }
  }

  /**
   * Get tenant memberships
   */
  async getTenantMemberships(
    tenantId: string,
    pagination?: PaginationOptions,
    filters?: MembershipQueryFilters
  ): Promise<PaginatedResult<TenantMembership>> {
    try {
      const keyConditionExpression = 'PK = :tenantId AND begins_with(SK, :skPrefix)';
      const expressionAttributeValues: Record<string, any> = {
        ':tenantId': `TENANT#${tenantId}`,
        ':skPrefix': 'USER#',
      };

      let filterExpression: string | undefined;

      if (filters) {
        const filterParts: string[] = [];

        if (filters.tenantRole) {
          filterParts.push('tenantRole = :tenantRole');
          expressionAttributeValues[':tenantRole'] = filters.tenantRole;
        }

        if (filters.status) {
          filterParts.push('#status = :status');
          expressionAttributeValues[':status'] = filters.status;
        }

        if (filterParts.length > 0) {
          filterExpression = filterParts.join(' AND ');
        }
      }

      const params = {
        TableName: this.config.tables.tenants,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ExpressionAttributeNames: filters?.status ? { '#status': 'status' } : undefined,
        FilterExpression: filterExpression,
        Limit: pagination?.limit || 50,
        ExclusiveStartKey: pagination?.nextToken ? JSON.parse(pagination.nextToken) : undefined,
      };

      const result = await this.config.client.send(new QueryCommand(params));
      
      const memberships: TenantMembership[] = result.Items?.map(item => {
        const unmarshalled = unmarshall(item);
        const { PK, SK, Type, GSI1PK, GSI1SK, ...membership } = unmarshalled;
        return membership as TenantMembership;
      }) || [];

      return {
        items: memberships,
        nextToken: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : undefined,
        count: result.Count,
      };
    } catch (error: any) {
      throw new TenantDataError(`Failed to get tenant memberships: ${error.message}`, 'GET_TENANT_MEMBERSHIPS_FAILED');
    }
  }

  // ==========================================================================
  // SUBSCRIPTION OPERATIONS
  // ==========================================================================

  /**
   * Create or update subscription
   */
  async upsertSubscription(subscription: TenantSubscription): Promise<TenantSubscription> {
    try {
      const params = {
        TableName: this.config.tables.tenants,
        Item: marshall({
          PK: `TENANT#${subscription.tenantId}`,
          SK: `SUBSCRIPTION#${subscription.tenantId}`,
          Type: 'SUBSCRIPTION',
          ...subscription,
        }),
      };

      await this.config.client.send(new PutItemCommand(params));
      return subscription;
    } catch (error: any) {
      throw new TenantDataError(`Failed to upsert subscription: ${error.message}`, 'UPSERT_SUBSCRIPTION_FAILED');
    }
  }

  /**
   * Get subscription
   */
  async getSubscription(tenantId: string): Promise<TenantSubscription | null> {
    try {
      const params = {
        TableName: this.config.tables.tenants,
        Key: marshall({
          PK: `TENANT#${tenantId}`,
          SK: `SUBSCRIPTION#${tenantId}`,
        }),
      };

      const result = await this.config.client.send(new GetItemCommand(params));
      
      if (!result.Item) {
        return null;
      }

      const item = unmarshall(result.Item);
      const { PK, SK, Type, ...subscription } = item;
      return subscription as TenantSubscription;
    } catch (error: any) {
      throw new TenantDataError(`Failed to get subscription: ${error.message}`, 'GET_SUBSCRIPTION_FAILED');
    }
  }

  /**
   * Create or update usage
   */
  async upsertUsage(usage: TenantUsage): Promise<TenantUsage> {
    try {
      const params = {
        TableName: this.config.tables.tenants,
        Item: marshall({
          PK: `TENANT#${usage.tenantId}`,
          SK: `USAGE#${usage.period}`,
          Type: 'USAGE',
          ...usage,
        }),
      };

      await this.config.client.send(new PutItemCommand(params));
      return usage;
    } catch (error: any) {
      throw new TenantDataError(`Failed to upsert usage: ${error.message}`, 'UPSERT_USAGE_FAILED');
    }
  }

  /**
   * Get current usage
   */
  async getCurrentUsage(tenantId: string): Promise<TenantUsage | null> {
    try {
      // Get current month usage
      const currentPeriod = new Date().toISOString().substring(0, 7); // YYYY-MM format
      
      const params = {
        TableName: this.config.tables.tenants,
        Key: marshall({
          PK: `TENANT#${tenantId}`,
          SK: `USAGE#${currentPeriod}`,
        }),
      };

      const result = await this.config.client.send(new GetItemCommand(params));
      
      if (!result.Item) {
        return null;
      }

      const item = unmarshall(result.Item);
      const { PK, SK, Type, ...usage } = item;
      return usage as TenantUsage;
    } catch (error: any) {
      throw new TenantDataError(`Failed to get current usage: ${error.message}`, 'GET_USAGE_FAILED');
    }
  }

  // ==========================================================================
  // AUDIT LOG OPERATIONS
  // ==========================================================================

  /**
   * Create audit log entry
   */
  async createAuditLogEntry(auditEntry: AuditLogEntry): Promise<void> {
    try {
      const params = {
        TableName: this.config.tables.auditLogs,
        Item: marshall({
          PK: `TENANT#${auditEntry.tenantId}#${auditEntry.timestamp}`,
          SK: `USER#${auditEntry.userId}`,
          Type: 'AUDIT_LOG',
          GSI1PK: `TENANT#${auditEntry.tenantId}`,
          GSI1SK: auditEntry.timestamp,
          GSI2PK: `USER#${auditEntry.userId}`,
          GSI2SK: auditEntry.timestamp,
          ...auditEntry,
        }),
      };

      await this.config.client.send(new PutItemCommand(params));
    } catch (error: any) {
      throw new TenantDataError(`Failed to create audit log entry: ${error.message}`, 'CREATE_AUDIT_LOG_FAILED');
    }
  }

  /**
   * Get audit logs by tenant
   */
  async getAuditLogsByTenant(
    tenantId: string,
    pagination?: PaginationOptions,
    filters?: AuditLogQueryFilters
  ): Promise<PaginatedResult<AuditLogEntry>> {
    try {
      const keyConditionExpression = 'GSI1PK = :tenantId';
      const expressionAttributeValues: Record<string, any> = {
        ':tenantId': `TENANT#${tenantId}`,
      };

      let filterExpression: string | undefined;

      if (filters) {
        const filterParts: string[] = [];

        if (filters.action) {
          filterParts.push('action = :action');
          expressionAttributeValues[':action'] = filters.action;
        }

        if (filters.resourceType) {
          filterParts.push('resourceType = :resourceType');
          expressionAttributeValues[':resourceType'] = filters.resourceType;
        }

        if (filterParts.length > 0) {
          filterExpression = filterParts.join(' AND ');
        }
      }

      const params = {
        TableName: this.config.tables.auditLogs,
        IndexName: this.config.indexes.auditByTenant,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        FilterExpression: filterExpression,
        ScanIndexForward: false, // Newest first
        Limit: pagination?.limit || 50,
        ExclusiveStartKey: pagination?.nextToken ? JSON.parse(pagination.nextToken) : undefined,
      };

      const result = await this.config.client.send(new QueryCommand(params));
      
      const auditLogs: AuditLogEntry[] = result.Items?.map(item => {
        const unmarshalled = unmarshall(item);
        const { PK, SK, Type, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...auditEntry } = unmarshalled;
        return auditEntry as AuditLogEntry;
      }) || [];

      return {
        items: auditLogs,
        nextToken: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : undefined,
        count: result.Count,
      };
    } catch (error: any) {
      throw new TenantDataError(`Failed to get audit logs by tenant: ${error.message}`, 'GET_AUDIT_LOGS_FAILED');
    }
  }

  // ==========================================================================
  // BATCH OPERATIONS
  // ==========================================================================

  /**
   * Get tenants in batch
   */
  async getTenantsBatch(tenantIds: string[]): Promise<TenantAccount[]> {
    if (tenantIds.length === 0) return [];

    try {
      const requests = tenantIds.map(tenantId => ({
        PK: `TENANT#${tenantId}`,
        SK: `TENANT#${tenantId}`,
      }));

      const params = {
        RequestItems: {
          [this.config.tables.tenants]: {
            Keys: requests.map(key => marshall(key)),
          },
        },
      };

      const result = await this.config.client.send(new BatchGetItemCommand(params));
      
      const tenants: TenantAccount[] = result.Responses?.[this.config.tables.tenants]?.map(item => {
        const unmarshalled = unmarshall(item);
        const { PK, SK, Type, ...tenant } = unmarshalled;
        return tenant as TenantAccount;
      }) || [];

      return tenants;
    } catch (error: any) {
      throw new TenantDataError(`Failed to get tenants batch: ${error.message}`, 'GET_TENANTS_BATCH_FAILED');
    }
  }

  /**
   * Get subscriptions in batch
   */
  async getSubscriptionsBatch(tenantIds: string[]): Promise<TenantSubscription[]> {
    if (tenantIds.length === 0) return [];

    try {
      const requests = tenantIds.map(tenantId => ({
        PK: `TENANT#${tenantId}`,
        SK: `SUBSCRIPTION#${tenantId}`,
      }));

      const params = {
        RequestItems: {
          [this.config.tables.tenants]: {
            Keys: requests.map(key => marshall(key)),
          },
        },
      };

      const result = await this.config.client.send(new BatchGetItemCommand(params));
      
      const subscriptions: TenantSubscription[] = result.Responses?.[this.config.tables.tenants]?.map(item => {
        const unmarshalled = unmarshall(item);
        const { PK, SK, Type, ...subscription } = unmarshalled;
        return subscription as TenantSubscription;
      }) || [];

      return subscriptions;
    } catch (error: any) {
      throw new TenantDataError(`Failed to get subscriptions batch: ${error.message}`, 'GET_SUBSCRIPTIONS_BATCH_FAILED');
    }
  }
}

// ==============================================================================
// FACTORY FUNCTIONS
// ==============================================================================

/**
 * Create data access instance
 */
export function createTenantDataAccess(
  dynamoClient: DynamoDBClient,
  config?: Partial<DynamoConfig>
): TenantDataAccess {
  const fullConfig: DynamoConfig = {
    client: dynamoClient,
    ...DEFAULT_CONFIG,
    ...config,
  } as DynamoConfig;

  return new TenantDataAccess(fullConfig);
}

export default TenantDataAccess;