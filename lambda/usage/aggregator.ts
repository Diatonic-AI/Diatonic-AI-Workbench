import { EventBridgeHandler, Context } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, UpdateItemCommand, QueryCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-2',
});

const eventBridgeClient = new EventBridgeClient({
  region: process.env.AWS_REGION || 'us-east-2',
});

interface UsageEvent {
  tenantId: string;
  userId: string;
  resourceType: string;
  resourceId?: string;
  operation: string;
  timestamp: string;
  duration?: number;
  tokensConsumed?: number;
  costUsd: number;
  metadata?: Record<string, unknown>;
}

interface AggregatedUsage {
  tenantId: string;
  dateHour: string; // Format: YYYY-MM-DD-HH
  resourceType: string;
  totalEvents: number;
  totalDuration: number;
  totalTokens: number;
  totalCost: number;
  uniqueUsers: Set<string>;
  operations: Record<string, number>;
  lastUpdated: string;
}

interface QuotaCheck {
  tenantId: string;
  resourceType: string;
  limit: number;
  currentUsage: number;
  periodStart: string;
  periodEnd: string;
  exceeded: boolean;
}

/**
 * Usage aggregator Lambda for processing usage events from EventBridge
 * Aggregates usage data for analytics and quota enforcement
 */
export const handler: EventBridgeHandler<string, UsageEvent, void> = async (
  event,
  context: Context
): Promise<void> => {
  console.log('Usage aggregator triggered', {
    requestId: context.awsRequestId,
    source: event.source,
    detailType: event['detail-type'],
    time: event.time,
  });

  try {
    const usageEvent = event.detail;
    
    console.log('Processing usage event', {
      tenantId: usageEvent.tenantId,
      userId: usageEvent.userId,
      resourceType: usageEvent.resourceType,
      operation: usageEvent.operation,
      costUsd: usageEvent.costUsd,
      tokensConsumed: usageEvent.tokensConsumed,
    });

    // Validate required fields
    if (!usageEvent.tenantId || !usageEvent.userId || !usageEvent.resourceType) {
      console.error('Missing required fields in usage event', { usageEvent });
      return;
    }

    // Process usage aggregation
    await Promise.all([
      aggregateHourlyUsage(usageEvent),
      aggregateDailyUsage(usageEvent),
      aggregateMonthlyUsage(usageEvent),
      updateResourceMetrics(usageEvent),
      checkQuotas(usageEvent),
    ]);

    console.log('Usage event processed successfully', {
      tenantId: usageEvent.tenantId,
      resourceType: usageEvent.resourceType,
    });

  } catch (error) {
    console.error('Usage aggregation error:', {
      error: error.message,
      stack: error.stack,
      event: event.detail,
    });
    
    // Re-throw for DLQ processing
    throw error;
  }
};

/**
 * Aggregate usage data by hour for real-time analytics
 */
async function aggregateHourlyUsage(usageEvent: UsageEvent): Promise<void> {
  const hour = new Date(usageEvent.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
  const dateHour = hour.replace('T', '-'); // YYYY-MM-DD-HH
  
  const aggregateKey = {
    PK: `USAGE#${usageEvent.tenantId}#HOURLY`,
    SK: `${dateHour}#${usageEvent.resourceType}`,
  };

  try {
    // Try to update existing aggregate
    const updateExpression = `
      ADD totalEvents :events,
          totalDuration :duration,
          totalTokens :tokens,
          totalCost :cost
      SET lastUpdated = :timestamp,
          uniqueUsers = if_not_exists(uniqueUsers, :emptySet),
          operations = if_not_exists(operations, :emptyMap)
      ADD operations.#operation :events,
          uniqueUsers :userSet
    `;

    const expressionAttributeNames = {
      '#operation': usageEvent.operation,
    };

    const expressionAttributeValues = marshall({
      ':events': 1,
      ':duration': usageEvent.duration || 0,
      ':tokens': usageEvent.tokensConsumed || 0,
      ':cost': usageEvent.costUsd,
      ':timestamp': new Date().toISOString(),
      ':emptySet': new Set<string>(),
      ':emptyMap': {},
      ':userSet': new Set([usageEvent.userId]),
    });

    const command = new UpdateItemCommand({
      TableName: process.env.ANALYTICS_TABLE_NAME,
      Key: marshall(aggregateKey),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    await dynamoClient.send(command);
    
    console.log('Hourly usage updated', {
      tenantId: usageEvent.tenantId,
      dateHour,
      resourceType: usageEvent.resourceType,
    });

  } catch (error) {
    // If update fails, try to create new aggregate
    console.log('Creating new hourly aggregate', { dateHour, resourceType: usageEvent.resourceType });
    
    const newAggregate = {
      ...aggregateKey,
      tenantId: usageEvent.tenantId,
      dateHour,
      resourceType: usageEvent.resourceType,
      totalEvents: 1,
      totalDuration: usageEvent.duration || 0,
      totalTokens: usageEvent.tokensConsumed || 0,
      totalCost: usageEvent.costUsd,
      uniqueUsers: new Set([usageEvent.userId]),
      operations: { [usageEvent.operation]: 1 },
      lastUpdated: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days TTL
    };

    const putCommand = new PutItemCommand({
      TableName: process.env.ANALYTICS_TABLE_NAME,
      Item: marshall(newAggregate, { removeUndefinedValues: true }),
    });

    await dynamoClient.send(putCommand);
  }
}

/**
 * Aggregate usage data by day for analytics dashboard
 */
async function aggregateDailyUsage(usageEvent: UsageEvent): Promise<void> {
  const date = new Date(usageEvent.timestamp).toISOString().slice(0, 10); // YYYY-MM-DD
  
  const aggregateKey = {
    PK: `USAGE#${usageEvent.tenantId}#DAILY`,
    SK: `${date}#${usageEvent.resourceType}`,
  };

  try {
    const updateExpression = `
      ADD totalEvents :events,
          totalDuration :duration,
          totalTokens :tokens,
          totalCost :cost
      SET lastUpdated = :timestamp,
          uniqueUsers = if_not_exists(uniqueUsers, :emptySet),
          operations = if_not_exists(operations, :emptyMap)
      ADD operations.#operation :events,
          uniqueUsers :userSet
    `;

    const command = new UpdateItemCommand({
      TableName: process.env.ANALYTICS_TABLE_NAME,
      Key: marshall(aggregateKey),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: {
        '#operation': usageEvent.operation,
      },
      ExpressionAttributeValues: marshall({
        ':events': 1,
        ':duration': usageEvent.duration || 0,
        ':tokens': usageEvent.tokensConsumed || 0,
        ':cost': usageEvent.costUsd,
        ':timestamp': new Date().toISOString(),
        ':emptySet': new Set<string>(),
        ':emptyMap': {},
        ':userSet': new Set([usageEvent.userId]),
      }),
    });

    await dynamoClient.send(command);

  } catch (error) {
    // Create new daily aggregate
    const newAggregate = {
      ...aggregateKey,
      tenantId: usageEvent.tenantId,
      date,
      resourceType: usageEvent.resourceType,
      totalEvents: 1,
      totalDuration: usageEvent.duration || 0,
      totalTokens: usageEvent.tokensConsumed || 0,
      totalCost: usageEvent.costUsd,
      uniqueUsers: new Set([usageEvent.userId]),
      operations: { [usageEvent.operation]: 1 },
      lastUpdated: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days TTL
    };

    const putCommand = new PutItemCommand({
      TableName: process.env.ANALYTICS_TABLE_NAME,
      Item: marshall(newAggregate, { removeUndefinedValues: true }),
    });

    await dynamoClient.send(putCommand);
  }
}

/**
 * Aggregate usage data by month for long-term analytics
 */
async function aggregateMonthlyUsage(usageEvent: UsageEvent): Promise<void> {
  const month = new Date(usageEvent.timestamp).toISOString().slice(0, 7); // YYYY-MM
  
  const aggregateKey = {
    PK: `USAGE#${usageEvent.tenantId}#MONTHLY`,
    SK: `${month}#${usageEvent.resourceType}`,
  };

  try {
    const updateExpression = `
      ADD totalEvents :events,
          totalDuration :duration,
          totalTokens :tokens,
          totalCost :cost
      SET lastUpdated = :timestamp,
          uniqueUsers = if_not_exists(uniqueUsers, :emptySet),
          operations = if_not_exists(operations, :emptyMap)
      ADD operations.#operation :events,
          uniqueUsers :userSet
    `;

    const command = new UpdateItemCommand({
      TableName: process.env.ANALYTICS_TABLE_NAME,
      Key: marshall(aggregateKey),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: {
        '#operation': usageEvent.operation,
      },
      ExpressionAttributeValues: marshall({
        ':events': 1,
        ':duration': usageEvent.duration || 0,
        ':tokens': usageEvent.tokensConsumed || 0,
        ':cost': usageEvent.costUsd,
        ':timestamp': new Date().toISOString(),
        ':emptySet': new Set<string>(),
        ':emptyMap': {},
        ':userSet': new Set([usageEvent.userId]),
      }),
    });

    await dynamoClient.send(command);

  } catch (error) {
    // Create new monthly aggregate
    const newAggregate = {
      ...aggregateKey,
      tenantId: usageEvent.tenantId,
      month,
      resourceType: usageEvent.resourceType,
      totalEvents: 1,
      totalDuration: usageEvent.duration || 0,
      totalTokens: usageEvent.tokensConsumed || 0,
      totalCost: usageEvent.costUsd,
      uniqueUsers: new Set([usageEvent.userId]),
      operations: { [usageEvent.operation]: 1 },
      lastUpdated: new Date().toISOString(),
      // No TTL for monthly data - kept indefinitely
    };

    const putCommand = new PutItemCommand({
      TableName: process.env.ANALYTICS_TABLE_NAME,
      Item: marshall(newAggregate, { removeUndefinedValues: true }),
    });

    await dynamoClient.send(putCommand);
  }
}

/**
 * Update resource-specific metrics
 */
async function updateResourceMetrics(usageEvent: UsageEvent): Promise<void> {
  if (!usageEvent.resourceId) return;

  const metricsKey = {
    PK: `RESOURCE#${usageEvent.tenantId}#${usageEvent.resourceType}`,
    SK: usageEvent.resourceId,
  };

  const updateExpression = `
    ADD totalUsageEvents :events,
        totalExecutionTime :duration,
        totalTokensConsumed :tokens,
        totalCostUsd :cost
    SET lastUsed = :timestamp,
        lastOperation = :operation
  `;

  const command = new UpdateItemCommand({
    TableName: process.env.ANALYTICS_TABLE_NAME,
    Key: marshall(metricsKey),
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: marshall({
      ':events': 1,
      ':duration': usageEvent.duration || 0,
      ':tokens': usageEvent.tokensConsumed || 0,
      ':cost': usageEvent.costUsd,
      ':timestamp': new Date().toISOString(),
      ':operation': usageEvent.operation,
    }),
  });

  try {
    await dynamoClient.send(command);
    
    console.log('Resource metrics updated', {
      tenantId: usageEvent.tenantId,
      resourceType: usageEvent.resourceType,
      resourceId: usageEvent.resourceId,
    });
  } catch (error) {
    console.error('Error updating resource metrics:', error);
  }
}

/**
 * Check quotas and emit alerts if exceeded
 */
async function checkQuotas(usageEvent: UsageEvent): Promise<void> {
  try {
    // Get tenant quota configuration
    const tenantQuotas = await getTenantQuotas(usageEvent.tenantId);
    
    if (!tenantQuotas || tenantQuotas.length === 0) {
      return; // No quotas configured
    }

    // Check relevant quotas for this resource type
    const relevantQuotas = tenantQuotas.filter(quota => 
      quota.resourceType === usageEvent.resourceType || quota.resourceType === 'all'
    );

    for (const quota of relevantQuotas) {
      const quotaCheck = await performQuotaCheck(usageEvent.tenantId, quota);
      
      if (quotaCheck.exceeded) {
        console.warn('Quota exceeded', {
          tenantId: usageEvent.tenantId,
          resourceType: quota.resourceType,
          limit: quota.limit,
          currentUsage: quotaCheck.currentUsage,
        });

        // Emit quota exceeded event
        await emitQuotaEvent(quotaCheck, usageEvent);
      }
    }

  } catch (error) {
    console.error('Error checking quotas:', error);
  }
}

/**
 * Get tenant quota configuration
 */
async function getTenantQuotas(tenantId: string): Promise<any[]> {
  const command = new QueryCommand({
    TableName: process.env.USAGE_TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: marshall({
      ':pk': `TENANT#${tenantId}`,
      ':sk': 'QUOTA#',
    }),
  });

  const response = await dynamoClient.send(command);
  
  if (!response.Items || response.Items.length === 0) {
    return [];
  }

  return response.Items.map(item => unmarshall(item));
}

/**
 * Perform quota check for a specific quota
 */
async function performQuotaCheck(tenantId: string, quota: any): Promise<QuotaCheck> {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

  // Get current usage for the month
  const usageKey = {
    PK: `USAGE#${tenantId}#MONTHLY`,
    SK: `${currentMonth}#${quota.resourceType}`,
  };

  const command = new GetItemCommand({
    TableName: process.env.ANALYTICS_TABLE_NAME,
    Key: marshall(usageKey),
  });

  const response = await dynamoClient.send(command);
  const usage = response.Item ? unmarshall(response.Item) : null;
  
  const currentUsage = usage ? (usage.totalEvents || 0) : 0;
  const exceeded = currentUsage >= quota.limit;

  return {
    tenantId,
    resourceType: quota.resourceType,
    limit: quota.limit,
    currentUsage,
    periodStart: `${currentMonth}-01T00:00:00.000Z`,
    periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
    exceeded,
  };
}

/**
 * Emit quota exceeded event to EventBridge
 */
async function emitQuotaEvent(quotaCheck: QuotaCheck, originalEvent: UsageEvent): Promise<void> {
  const event = {
    Source: 'diatonic-ai.usage',
    DetailType: 'Quota Event',
    Detail: JSON.stringify({
      type: 'quota_exceeded',
      tenantId: quotaCheck.tenantId,
      resourceType: quotaCheck.resourceType,
      limit: quotaCheck.limit,
      currentUsage: quotaCheck.currentUsage,
      utilizationPercent: Math.round((quotaCheck.currentUsage / quotaCheck.limit) * 100),
      periodStart: quotaCheck.periodStart,
      periodEnd: quotaCheck.periodEnd,
      triggerEvent: {
        resourceType: originalEvent.resourceType,
        operation: originalEvent.operation,
        userId: originalEvent.userId,
      },
      timestamp: new Date().toISOString(),
    }),
  };

  const command = new PutEventsCommand({
    Entries: [event],
  });

  await eventBridgeClient.send(command);
  
  console.log('Quota exceeded event emitted', {
    tenantId: quotaCheck.tenantId,
    resourceType: quotaCheck.resourceType,
  });
}