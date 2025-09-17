// AI Nexus Workbench - Database Utility Functions

import {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  GetItemCommand,
  BatchGetItemCommand,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommandOutput,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand,
  BatchGetCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

import {
  DynamoDBItem,
  QueryOptions,
  FilterExpression,
  PaginationInfo,
} from '../types';

// Initialize DynamoDB client
const dynamodb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-2',
  })
);

// Table names from environment variables
export const TABLES = {
  ENTITIES: process.env.ENTITIES_TABLE_NAME!,
  USAGE: process.env.USAGE_TABLE_NAME!,
  TENANTS: process.env.TENANTS_TABLE_NAME!,
} as const;

// ===== Core Database Operations =====

export interface DatabaseService {
  // Single item operations
  getItem<T>(tableName: string, key: Record<string, unknown>): Promise<T | null>;
  putItem<T>(tableName: string, item: T & DynamoDBItem): Promise<void>;
  updateItem<T>(
    tableName: string,
    key: Record<string, unknown>,
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, unknown>
  ): Promise<T | null>;
  deleteItem(tableName: string, key: Record<string, unknown>): Promise<void>;

  // Query operations
  query<T>(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, unknown>,
    options?: QueryOptions
  ): Promise<{ items: T[]; pagination: PaginationInfo }>;

  queryGSI<T>(
    tableName: string,
    indexName: string,
    keyConditionExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, unknown>,
    options?: QueryOptions
  ): Promise<{ items: T[]; pagination: PaginationInfo }>;

  // Batch operations
  batchGet<T>(
    tableName: string,
    keys: Record<string, unknown>[]
  ): Promise<T[]>;
  
  batchWrite(
    tableName: string,
    items: { put?: DynamoDBItem[]; delete?: Record<string, unknown>[] }
  ): Promise<void>;

  // Utility operations
  itemExists(tableName: string, key: Record<string, unknown>): Promise<boolean>;
  getNextSequenceNumber(tenantId: string, entityType: string): Promise<number>;
}

class DynamoDBService implements DatabaseService {
  async getItem<T>(tableName: string, key: Record<string, unknown>): Promise<T | null> {
    try {
      const result = await dynamodb.send(
        new GetCommand({
          TableName: tableName,
          Key: key,
        })
      );

      return result.Item as T || null;
    } catch (error) {
      console.error('DynamoDB GetItem error:', error);
      throw new DatabaseError('Failed to retrieve item', error as Error);
    }
  }

  async putItem<T>(tableName: string, item: T & DynamoDBItem): Promise<void> {
    const now = new Date().toISOString();
    const itemWithTimestamps = {
      ...item,
      updatedAt: now,
      createdAt: item.createdAt || now,
    };

    try {
      await dynamodb.send(
        new PutCommand({
          TableName: tableName,
          Item: itemWithTimestamps,
          ConditionExpression: 'attribute_not_exists(PK)',
        })
      );
    } catch (error) {
      if ((error as Error & { name: string }).name === 'ConditionalCheckFailedException') {
        throw new DatabaseError('Item already exists', error as Error);
      }
      console.error('DynamoDB PutItem error:', error);
      throw new DatabaseError('Failed to create item', error as Error);
    }
  }

  async updateItem<T>(
    tableName: string,
    key: Record<string, unknown>,
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, unknown>
  ): Promise<T | null> {
    try {
      // Add updated timestamp
      const enhancedExpression = updateExpression + ', updatedAt = :updatedAt';
      const enhancedValues = {
        ...expressionAttributeValues,
        ':updatedAt': new Date().toISOString(),
      };

      const result = await dynamodb.send(
        new UpdateCommand({
          TableName: tableName,
          Key: key,
          UpdateExpression: enhancedExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: enhancedValues,
          ReturnValues: 'ALL_NEW',
        })
      );

      return result.Attributes as T || null;
    } catch (error) {
      console.error('DynamoDB UpdateItem error:', error);
      throw new DatabaseError('Failed to update item', error as Error);
    }
  }

  async deleteItem(tableName: string, key: Record<string, unknown>): Promise<void> {
    try {
      await dynamodb.send(
        new DeleteCommand({
          TableName: tableName,
          Key: key,
        })
      );
    } catch (error) {
      console.error('DynamoDB DeleteItem error:', error);
      throw new DatabaseError('Failed to delete item', error as Error);
    }
  }

  async query<T>(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, unknown>,
    options?: QueryOptions
  ): Promise<{ items: T[]; pagination: PaginationInfo }> {
    try {
      const command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: options?.limit || 50,
        ExclusiveStartKey: options?.nextToken ? JSON.parse(
          Buffer.from(options.nextToken, 'base64').toString()
        ) : undefined,
        ScanIndexForward: options?.sortOrder !== 'desc',
        FilterExpression: options?.filter ? this.buildFilterExpression(options.filter) : undefined,
      });

      const result = await dynamodb.send(command);

      return {
        items: result.Items as T[] || [],
        pagination: {
          nextToken: result.LastEvaluatedKey ? 
            Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : 
            undefined,
          hasMore: !!result.LastEvaluatedKey,
          limit: options?.limit || 50,
        },
      };
    } catch (error) {
      console.error('DynamoDB Query error:', error);
      throw new DatabaseError('Failed to query items', error as Error);
    }
  }

  async queryGSI<T>(
    tableName: string,
    indexName: string,
    keyConditionExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, unknown>,
    options?: QueryOptions
  ): Promise<{ items: T[]; pagination: PaginationInfo }> {
    try {
      const command = new QueryCommand({
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: options?.limit || 50,
        ExclusiveStartKey: options?.nextToken ? JSON.parse(
          Buffer.from(options.nextToken, 'base64').toString()
        ) : undefined,
        ScanIndexForward: options?.sortOrder !== 'desc',
        FilterExpression: options?.filter ? this.buildFilterExpression(options.filter) : undefined,
      });

      const result = await dynamodb.send(command);

      return {
        items: result.Items as T[] || [],
        pagination: {
          nextToken: result.LastEvaluatedKey ? 
            Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : 
            undefined,
          hasMore: !!result.LastEvaluatedKey,
          limit: options?.limit || 50,
        },
      };
    } catch (error) {
      console.error('DynamoDB QueryGSI error:', error);
      throw new DatabaseError('Failed to query GSI', error as Error);
    }
  }

  async batchGet<T>(
    tableName: string,
    keys: Record<string, unknown>[]
  ): Promise<T[]> {
    if (keys.length === 0) return [];
    
    // DynamoDB batch get limit is 100 items
    const batches = this.chunkArray(keys, 100);
    const results: T[] = [];

    for (const batch of batches) {
      try {
        const result = await dynamodb.send(
          new BatchGetCommand({
            RequestItems: {
              [tableName]: {
                Keys: batch,
              },
            },
          })
        );

        if (result.Responses && result.Responses[tableName]) {
          results.push(...(result.Responses[tableName] as T[]));
        }
      } catch (error) {
        console.error('DynamoDB BatchGet error:', error);
        throw new DatabaseError('Failed to batch get items', error as Error);
      }
    }

    return results;
  }

  async batchWrite(
    tableName: string,
    items: { put?: DynamoDBItem[]; delete?: Record<string, unknown>[] }
  ): Promise<void> {
    const writeRequests = [];

    // Add put requests
    if (items.put) {
      for (const item of items.put) {
        const now = new Date().toISOString();
        writeRequests.push({
          PutRequest: {
            Item: {
              ...item,
              updatedAt: now,
              createdAt: item.createdAt || now,
            },
          },
        });
      }
    }

    // Add delete requests
    if (items.delete) {
      for (const key of items.delete) {
        writeRequests.push({
          DeleteRequest: {
            Key: key,
          },
        });
      }
    }

    if (writeRequests.length === 0) return;

    // DynamoDB batch write limit is 25 items
    const batches = this.chunkArray(writeRequests, 25);

    for (const batch of batches) {
      try {
        await dynamodb.send(
          new BatchWriteCommand({
            RequestItems: {
              [tableName]: batch,
            },
          })
        );
      } catch (error) {
        console.error('DynamoDB BatchWrite error:', error);
        throw new DatabaseError('Failed to batch write items', error as Error);
      }
    }
  }

  async itemExists(tableName: string, key: Record<string, unknown>): Promise<boolean> {
    try {
      const result = await dynamodb.send(
        new GetCommand({
          TableName: tableName,
          Key: key,
          ProjectionExpression: 'PK',
        })
      );

      return !!result.Item;
    } catch (error) {
      console.error('DynamoDB ItemExists error:', error);
      return false;
    }
  }

  async getNextSequenceNumber(tenantId: string, entityType: string): Promise<number> {
    const sequenceKey = {
      PK: `SEQUENCE#${tenantId}`,
      SK: entityType,
    };

    try {
      const result = await dynamodb.send(
        new UpdateCommand({
          TableName: TABLES.ENTITIES,
          Key: sequenceKey,
          UpdateExpression: 'SET #counter = if_not_exists(#counter, :start) + :increment',
          ExpressionAttributeNames: {
            '#counter': 'counter',
          },
          ExpressionAttributeValues: {
            ':start': 0,
            ':increment': 1,
          },
          ReturnValues: 'UPDATED_NEW',
        })
      );

      return result.Attributes?.counter as number || 1;
    } catch (error) {
      console.error('Failed to get sequence number:', error);
      throw new DatabaseError('Failed to generate sequence number', error as Error);
    }
  }

  // Private helper methods
  private buildFilterExpression(filter: FilterExpression): string {
    const { field, operator, value } = filter;
    
    switch (operator) {
      case 'eq':
        return `${field} = :filterValue`;
      case 'ne':
        return `${field} <> :filterValue`;
      case 'lt':
        return `${field} < :filterValue`;
      case 'le':
        return `${field} <= :filterValue`;
      case 'gt':
        return `${field} > :filterValue`;
      case 'ge':
        return `${field} >= :filterValue`;
      case 'begins_with':
        return `begins_with(${field}, :filterValue)`;
      case 'contains':
        return `contains(${field}, :filterValue)`;
      default:
        throw new Error(`Unsupported filter operator: ${operator}`);
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Singleton instance
export const db = new DynamoDBService();

// ===== Specialized Database Operations =====

export class TenantService {
  async getTenant(tenantId: string) {
    return await db.getItem(TABLES.TENANTS, {
      PK: `TENANT#${tenantId}`,
      SK: 'CONFIG',
    });
  }

  async updateTenantUsage(
    tenantId: string,
    usage: Partial<{
      users: number;
      projects: number;
      agents: number;
      experiments: number;
      datasets: number;
      storageGb: number;
      monthlyRequests: number;
      monthlyTokens: number;
      monthlyCostUsd: number;
    }>
  ) {
    const updateExpressions = Object.keys(usage).map(
      (key, index) => `current_usage.${key} = :val${index}`
    );

    const expressionAttributeValues = Object.entries(usage).reduce(
      (acc, [key, value], index) => ({
        ...acc,
        [`:val${index}`]: value,
      }),
      {}
    );

    return await db.updateItem(
      TABLES.TENANTS,
      {
        PK: `TENANT#${tenantId}`,
        SK: 'CONFIG',
      },
      `SET ${updateExpressions.join(', ')}`,
      undefined,
      expressionAttributeValues
    );
  }

  async checkTenantLimits(tenantId: string, resource: string, increment = 1): Promise<boolean> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) return false;

    const limits = tenant.limits as Record<string, number>;
    const usage = tenant.current_usage as Record<string, number>;

    const resourceLimit = limits[`max_${resource}`];
    const currentUsage = usage[resource] || 0;

    // -1 means unlimited
    if (resourceLimit === -1) return true;
    
    return currentUsage + increment <= resourceLimit;
  }
}

export const tenantService = new TenantService();

// ===== Usage Tracking Service =====

export class UsageService {
  async recordUsageEvent(event: {
    tenantId: string;
    userId: string;
    resourceType: string;
    resourceId: string;
    operation: string;
    duration?: number;
    tokensConsumed?: number;
    costUsd: number;
    metadata?: Record<string, unknown>;
  }) {
    const eventId = uuidv4();
    const timestamp = new Date().toISOString();
    const yearMonth = timestamp.substring(0, 7); // YYYY-MM

    const usageItem = {
      PK: `USAGE#${event.tenantId}#${yearMonth}`,
      SK: `${timestamp}#${eventId}`,
      GSI1PK: `USER#${event.userId}#${yearMonth}`,
      GSI1SK: timestamp,
      GSI2PK: `RESOURCE#${event.resourceType}#${yearMonth}`,
      GSI2SK: timestamp,
      entityType: 'usage_event',
      tenantId: event.tenantId,
      userId: event.userId,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      operation: event.operation,
      duration: event.duration,
      tokensConsumed: event.tokensConsumed,
      costUsd: event.costUsd,
      metadata: event.metadata || {},
      createdAt: timestamp,
      updatedAt: timestamp,
      // TTL: 2 years from creation
      ttl: Math.floor(Date.now() / 1000) + (2 * 365 * 24 * 60 * 60),
    };

    await db.putItem(TABLES.USAGE, usageItem);
  }

  async getTenantUsageForMonth(tenantId: string, yearMonth: string) {
    return await db.query(
      TABLES.USAGE,
      'PK = :pk',
      undefined,
      {
        ':pk': `USAGE#${tenantId}#${yearMonth}`,
      }
    );
  }

  async getUserUsageForMonth(userId: string, yearMonth: string) {
    return await db.queryGSI(
      TABLES.USAGE,
      'GSI1',
      'GSI1PK = :gsi1pk',
      undefined,
      {
        ':gsi1pk': `USER#${userId}#${yearMonth}`,
      }
    );
  }
}

export const usageService = new UsageService();

// ===== Error Classes =====

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// ===== Key Generation Utilities =====

export const keyUtils = {
  // Generate primary keys for different entity types
  projectKey: (tenantId: string, projectId: string) => ({
    PK: `TENANT#${tenantId}#PROJECT`,
    SK: projectId,
  }),

  agentKey: (tenantId: string, projectId: string, agentId: string) => ({
    PK: `TENANT#${tenantId}#PROJECT#${projectId}#AGENT`,
    SK: agentId,
  }),

  experimentKey: (tenantId: string, projectId: string, experimentId: string) => ({
    PK: `TENANT#${tenantId}#PROJECT#${projectId}#EXPERIMENT`,
    SK: experimentId,
  }),

  datasetKey: (tenantId: string, projectId: string, datasetId: string) => ({
    PK: `TENANT#${tenantId}#PROJECT#${projectId}#DATASET`,
    SK: datasetId,
  }),

  runKey: (tenantId: string, agentId: string, runId: string) => ({
    PK: `TENANT#${tenantId}#AGENT#${agentId}#RUN`,
    SK: runId,
  }),

  // Generate GSI keys for different access patterns
  userEntitiesGSI: (tenantId: string, userId: string, entityType: string) => ({
    GSI1PK: `TENANT#${tenantId}#USER#${userId}`,
    GSI1SK: `${entityType}#${new Date().toISOString()}`,
  }),

  projectEntitiesGSI: (tenantId: string, projectId: string, entityType: string) => ({
    GSI2PK: `TENANT#${tenantId}#PROJECT#${projectId}`,
    GSI2SK: `${entityType}#${new Date().toISOString()}`,
  }),
};
