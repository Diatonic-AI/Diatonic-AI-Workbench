import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
import { v4 as uuidv4 } from 'uuid';

// ================================================================================
// ENVIRONMENT CONFIGURATION
// ================================================================================

const {
  NODE_ENV = 'dev',
  METRICS_TABLE_NAME = '',
  AGGREGATES_TABLE_NAME = '',
  SESSIONS_TABLE_NAME = '',
  EVENTS_TABLE_NAME = '',
  EVENT_BUS_NAME = '',
  ANALYTICS_STREAM_NAME = '',
  DATA_LAKE_BUCKET = '',
  CORS_ORIGINS = '["*"]',
  RETENTION_DAYS = '30',
} = process.env;

// ================================================================================
// AWS CLIENTS INITIALIZATION
// ================================================================================

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-2' });
const kinesisClient = new KinesisClient({ region: process.env.AWS_REGION || 'us-east-2' });

const corsOrigins = JSON.parse(CORS_ORIGINS);
const retentionDays = parseInt(RETENTION_DAYS);

// ================================================================================
// TYPES AND INTERFACES
// ================================================================================

interface MetricRecord {
  PK: string; // metric_type#tenant_id
  SK: string; // timestamp#user_id
  metric_id: string;
  tenant_id: string;
  user_id: string;
  session_id?: string;
  metric_type: string;
  metric_name: string;
  value: number;
  unit: string;
  dimensions: Record<string, string>;
  properties: Record<string, unknown>;
  timestamp: string;
  ttl: number;
}

interface EventRecord {
  PK: string; // event_type#date
  SK: string; // timestamp#event_id
  event_id: string;
  tenant_id: string;
  user_id: string;
  session_id?: string;
  event_type: string;
  event_name: string;
  properties: Record<string, unknown>;
  timestamp: string;
  ttl: number;
}

interface SessionRecord {
  session_id: string;
  updated_at: string;
  user_id: string;
  tenant_id: string;
  started_at: string;
  last_activity: string;
  duration_seconds: number;
  page_views: number;
  events_count: number;
  device_info: {
    user_agent: string;
    platform: string;
    screen_resolution?: string;
    timezone: string;
  };
  referrer?: string;
  utm_parameters?: Record<string, string>;
  custom_properties: Record<string, unknown>;
  ttl: number;
}

interface AggregateRecord {
  PK: string; // aggregation_type#period
  SK: string; // tenant_id#timestamp
  aggregate_id: string;
  tenant_id: string;
  aggregation_type: string;
  period: 'hour' | 'day' | 'week' | 'month';
  period_start: string;
  period_end: string;
  metrics: Record<string, number>;
  dimensions: Record<string, string>;
  created_at: string;
  updated_at: string;
}

interface RequestContext {
  userId?: string;
  tenantId: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

// ================================================================================
// UTILITY FUNCTIONS
// ================================================================================

const generateId = (): string => uuidv4();

const getCurrentTimestamp = (): string => new Date().toISOString();

const getTTL = (days: number = retentionDays): number => {
  return Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60);
};

const getDateString = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

const getPeriodStart = (period: string, timestamp: string): string => {
  const date = new Date(timestamp);
  
  switch (period) {
    case 'hour':
      date.setMinutes(0, 0, 0);
      return date.toISOString();
    case 'day':
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    case 'week': {
      const dayOfWeek = date.getUTCDay();
      const diff = date.getUTCDate() - dayOfWeek;
      date.setUTCDate(diff);
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    }
    case 'month':
      date.setUTCDate(1);
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    default:
      return timestamp;
  }
};

const getContextFromEvent = (event: APIGatewayProxyEvent): RequestContext => {
  const claims = event.requestContext.authorizer?.claims;
  return {
    userId: claims?.sub || claims?.username,
    tenantId: claims?.['custom:tenant_id'] || claims?.tenant_id || 'default',
    sessionId: event.headers['X-Session-ID'] || event.headers['x-session-id'],
    userAgent: event.headers['User-Agent'] || event.headers['user-agent'],
    ipAddress: event.requestContext.identity?.sourceIp,
  };
};

const createSuccessResponse = (data: unknown, statusCode: number = 200): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigins.includes('*') ? '*' : corsOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Request-ID,X-Session-ID',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  },
  body: JSON.stringify({
    success: true,
    data,
    timestamp: getCurrentTimestamp(),
  }),
});

const createErrorResponse = (error: string, statusCode: number = 500): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigins.includes('*') ? '*' : corsOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Request-ID,X-Session-ID',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  },
  body: JSON.stringify({
    success: false,
    error,
    timestamp: getCurrentTimestamp(),
  }),
});

const publishEvent = async (eventType: string, detail: unknown, source: string = 'ai-nexus.observatory') => {
  try {
    await eventBridgeClient.send(new PutEventsCommand({
      Entries: [{
        Source: source,
        DetailType: eventType,
        Detail: JSON.stringify(detail),
        EventBusName: EVENT_BUS_NAME,
        Time: new Date(),
      }],
    }));
  } catch (error) {
    console.error('Error publishing event:', error);
  }
};

const streamToAnalytics = async (data: unknown) => {
  if (!ANALYTICS_STREAM_NAME) return;
  
  try {
    await kinesisClient.send(new PutRecordCommand({
      StreamName: ANALYTICS_STREAM_NAME,
      Data: Buffer.from(JSON.stringify(data)),
      PartitionKey: data.tenant_id || 'default',
    }));
  } catch (error) {
    console.error('Error streaming to analytics:', error);
  }
};

// ================================================================================
// METRICS MANAGEMENT
// ================================================================================

const recordMetric = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const context = getContextFromEvent(event);
    const body = JSON.parse(event.body || '{}');

    const {
      metricName,
      value,
      unit = 'count',
      dimensions = {},
      properties = {},
      timestamp: customTimestamp,
    } = body;

    if (!metricName || value === undefined) {
      return createErrorResponse('Metric name and value are required', 400);
    }

    const now = customTimestamp || getCurrentTimestamp();
    const metricId = generateId();
    const metricType = metricName.split('.')[0] || 'custom';

    const metric: MetricRecord = {
      PK: `${metricType}#${context.tenantId}`,
      SK: `${now}#${context.userId || 'anonymous'}`,
      metric_id: metricId,
      tenant_id: context.tenantId,
      user_id: context.userId || 'anonymous',
      session_id: context.sessionId,
      metric_type: metricType,
      metric_name: metricName,
      value: typeof value === 'number' ? value : parseFloat(value),
      unit,
      dimensions: { ...dimensions, user_agent: context.userAgent?.split(' ')[0] || 'unknown' },
      properties,
      timestamp: now,
      ttl: getTTL(),
    };

    await docClient.send(new PutCommand({
      TableName: METRICS_TABLE_NAME,
      Item: metric,
    }));

    // Stream to real-time analytics if enabled
    await streamToAnalytics(metric);

    // Publish event for aggregation
    await publishEvent('Metric Recorded', {
      metricId,
      tenantId: context.tenantId,
      userId: context.userId,
      metricType,
      metricName,
      value: metric.value,
      timestamp: now,
    });

    return createSuccessResponse({ metricId }, 201);
  } catch (error) {
    console.error('Error recording metric:', error);
    return createErrorResponse('Failed to record metric', 500);
  }
};

const trackEvent = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const context = getContextFromEvent(event);
    const body = JSON.parse(event.body || '{}');

    const {
      eventName,
      eventType = 'custom',
      properties = {},
      timestamp: customTimestamp,
    } = body;

    if (!eventName) {
      return createErrorResponse('Event name is required', 400);
    }

    const now = customTimestamp || getCurrentTimestamp();
    const eventId = generateId();
    const dateString = getDateString(new Date(now));

    const eventRecord: EventRecord = {
      PK: `${eventType}#${dateString}`,
      SK: `${now}#${eventId}`,
      event_id: eventId,
      tenant_id: context.tenantId,
      user_id: context.userId || 'anonymous',
      session_id: context.sessionId,
      event_type: eventType,
      event_name: eventName,
      properties: {
        ...properties,
        user_agent: context.userAgent,
        ip_address: context.ipAddress,
      },
      timestamp: now,
      ttl: getTTL(),
    };

    await docClient.send(new PutCommand({
      TableName: EVENTS_TABLE_NAME,
      Item: eventRecord,
    }));

    // Stream to real-time analytics if enabled
    await streamToAnalytics(eventRecord);

    // Update session if session_id provided
    if (context.sessionId) {
      await updateSession(context.sessionId, context.tenantId, context.userId || 'anonymous');
    }

    // Publish event
    await publishEvent('Event Tracked', {
      eventId,
      tenantId: context.tenantId,
      userId: context.userId,
      eventType,
      eventName,
      timestamp: now,
    });

    return createSuccessResponse({ eventId }, 201);
  } catch (error) {
    console.error('Error tracking event:', error);
    return createErrorResponse('Failed to track event', 500);
  }
};

// ================================================================================
// SESSIONS MANAGEMENT
// ================================================================================

const createSession = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const context = getContextFromEvent(event);
    const body = JSON.parse(event.body || '{}');

    const {
      deviceInfo = {},
      referrer,
      utmParameters = {},
      customProperties = {},
    } = body;

    const sessionId = generateId();
    const now = getCurrentTimestamp();

    const session: SessionRecord = {
      session_id: sessionId,
      updated_at: now,
      user_id: context.userId || 'anonymous',
      tenant_id: context.tenantId,
      started_at: now,
      last_activity: now,
      duration_seconds: 0,
      page_views: 0,
      events_count: 0,
      device_info: {
        user_agent: context.userAgent || 'unknown',
        platform: deviceInfo.platform || 'unknown',
        screen_resolution: deviceInfo.screenResolution,
        timezone: deviceInfo.timezone || 'UTC',
      },
      referrer,
      utm_parameters: utmParameters,
      custom_properties: customProperties,
      ttl: getTTL(7), // Sessions kept for 7 days
    };

    await docClient.send(new PutCommand({
      TableName: SESSIONS_TABLE_NAME,
      Item: session,
    }));

    return createSuccessResponse({ sessionId }, 201);
  } catch (error) {
    console.error('Error creating session:', error);
    return createErrorResponse('Failed to create session', 500);
  }
};

const updateSession = async (sessionId: string, tenantId: string, userId: string): Promise<void> => {
  try {
    const now = getCurrentTimestamp();
    
    await docClient.send(new UpdateCommand({
      TableName: SESSIONS_TABLE_NAME,
      Key: { session_id: sessionId },
      UpdateExpression: 'SET last_activity = :now, updated_at = :now, events_count = events_count + :inc',
      ConditionExpression: 'tenant_id = :tenantId',
      ExpressionAttributeValues: {
        ':now': now,
        ':inc': 1,
        ':tenantId': tenantId,
      },
    }));
  } catch (error) {
    console.error('Error updating session:', error);
    // Don't fail the main operation for session update errors
  }
};

// ================================================================================
// ANALYTICS AND REPORTING
// ================================================================================

const getMetrics = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const context = getContextFromEvent(event);
    const {
      metricType,
      startTime,
      endTime,
      limit = '100',
      granularity = 'hour',
    } = event.queryStringParameters || {};

    if (!metricType) {
      return createErrorResponse('Metric type is required', 400);
    }

    // Query aggregated metrics first
    const aggregateResult = await docClient.send(new QueryCommand({
      TableName: AGGREGATES_TABLE_NAME,
      IndexName: 'TenantAggregatesIndex',
      KeyConditionExpression: 'tenant_id = :tenantId',
      FilterExpression: 'aggregation_type = :aggregationType',
      ExpressionAttributeValues: {
        ':tenantId': context.tenantId,
        ':aggregationType': `${metricType}_${granularity}`,
      },
      Limit: parseInt(limit),
      ScanIndexForward: false, // Most recent first
    }));

    const aggregatedMetrics = aggregateResult.Items as AggregateRecord[];

    // If no aggregated data, query raw metrics
    let rawMetrics: MetricRecord[] = [];
    if (aggregatedMetrics.length === 0) {
      const rawResult = await docClient.send(new QueryCommand({
        TableName: METRICS_TABLE_NAME,
        IndexName: 'MetricTypeIndex',
        KeyConditionExpression: 'metric_type = :metricType',
        FilterExpression: 'tenant_id = :tenantId',
        ExpressionAttributeValues: {
          ':metricType': metricType,
          ':tenantId': context.tenantId,
        },
        Limit: parseInt(limit),
        ScanIndexForward: false,
      }));
      
      rawMetrics = rawResult.Items as MetricRecord[];
    }

    return createSuccessResponse({
      aggregatedMetrics,
      rawMetrics,
      granularity,
      metricType,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return createErrorResponse('Failed to fetch metrics', 500);
  }
};

const getDashboard = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const context = getContextFromEvent(event);
    const {
      period = 'day',
      days = '7',
    } = event.queryStringParameters || {};

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));

    // Get various aggregated metrics for dashboard
    const promises = [
      // Page views
      docClient.send(new QueryCommand({
        TableName: AGGREGATES_TABLE_NAME,
        IndexName: 'AggregationTypeIndex',
        KeyConditionExpression: 'aggregation_type = :type',
        FilterExpression: 'tenant_id = :tenantId AND period_start >= :startDate',
        ExpressionAttributeValues: {
          ':type': `page_view_${period}`,
          ':tenantId': context.tenantId,
          ':startDate': startDate.toISOString(),
        },
        Limit: parseInt(days),
      })),
      
      // User sessions
      docClient.send(new QueryCommand({
        TableName: AGGREGATES_TABLE_NAME,
        IndexName: 'AggregationTypeIndex',
        KeyConditionExpression: 'aggregation_type = :type',
        FilterExpression: 'tenant_id = :tenantId AND period_start >= :startDate',
        ExpressionAttributeValues: {
          ':type': `session_${period}`,
          ':tenantId': context.tenantId,
          ':startDate': startDate.toISOString(),
        },
        Limit: parseInt(days),
      })),
      
      // Custom events
      docClient.send(new QueryCommand({
        TableName: AGGREGATES_TABLE_NAME,
        IndexName: 'AggregationTypeIndex',
        KeyConditionExpression: 'aggregation_type = :type',
        FilterExpression: 'tenant_id = :tenantId AND period_start >= :startDate',
        ExpressionAttributeValues: {
          ':type': `event_${period}`,
          ':tenantId': context.tenantId,
          ':startDate': startDate.toISOString(),
        },
        Limit: parseInt(days),
      })),
    ];

    const [pageViewsResult, sessionsResult, eventsResult] = await Promise.all(promises);

    const dashboard = {
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      metrics: {
        pageViews: pageViewsResult.Items as AggregateRecord[],
        sessions: sessionsResult.Items as AggregateRecord[],
        events: eventsResult.Items as AggregateRecord[],
      },
      summary: {
        totalPageViews: (pageViewsResult.Items as AggregateRecord[])
          .reduce((sum, item) => sum + (item.metrics?.count || 0), 0),
        totalSessions: (sessionsResult.Items as AggregateRecord[])
          .reduce((sum, item) => sum + (item.metrics?.unique_sessions || 0), 0),
        totalEvents: (eventsResult.Items as AggregateRecord[])
          .reduce((sum, item) => sum + (item.metrics?.count || 0), 0),
      },
    };

    return createSuccessResponse(dashboard);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return createErrorResponse('Failed to fetch dashboard data', 500);
  }
};

const getUserActivity = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const context = getContextFromEvent(event);
    const userId = event.pathParameters?.userId || context.userId;
    
    if (!userId) {
      return createErrorResponse('User ID is required', 400);
    }

    const {
      limit = '50',
      hours = '24',
    } = event.queryStringParameters || {};

    const sinceTime = new Date();
    sinceTime.setHours(sinceTime.getHours() - parseInt(hours));

    // Get user's recent activity
    const [metricsResult, eventsResult, sessionsResult] = await Promise.all([
      docClient.send(new QueryCommand({
        TableName: METRICS_TABLE_NAME,
        IndexName: 'UserActivityIndex',
        KeyConditionExpression: 'user_id = :userId',
        FilterExpression: 'tenant_id = :tenantId AND #timestamp >= :since',
        ExpressionAttributeNames: {
          '#timestamp': 'timestamp',
        },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':tenantId': context.tenantId,
          ':since': sinceTime.toISOString(),
        },
        Limit: parseInt(limit),
        ScanIndexForward: false,
      })),
      
      docClient.send(new QueryCommand({
        TableName: EVENTS_TABLE_NAME,
        IndexName: 'TenantEventsIndex',
        KeyConditionExpression: 'tenant_id = :tenantId',
        FilterExpression: 'user_id = :userId AND #timestamp >= :since',
        ExpressionAttributeNames: {
          '#timestamp': 'timestamp',
        },
        ExpressionAttributeValues: {
          ':tenantId': context.tenantId,
          ':userId': userId,
          ':since': sinceTime.toISOString(),
        },
        Limit: parseInt(limit),
        ScanIndexForward: false,
      })),
      
      docClient.send(new QueryCommand({
        TableName: SESSIONS_TABLE_NAME,
        IndexName: 'UserSessionsIndex',
        KeyConditionExpression: 'user_id = :userId',
        FilterExpression: 'tenant_id = :tenantId AND started_at >= :since',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':tenantId': context.tenantId,
          ':since': sinceTime.toISOString(),
        },
        Limit: 10,
        ScanIndexForward: false,
      })),
    ]);

    const activity = {
      userId,
      timeRange: {
        since: sinceTime.toISOString(),
        hours: parseInt(hours),
      },
      metrics: metricsResult.Items as MetricRecord[],
      events: eventsResult.Items as EventRecord[],
      sessions: sessionsResult.Items as SessionRecord[],
      summary: {
        metricsCount: metricsResult.Count || 0,
        eventsCount: eventsResult.Count || 0,
        sessionsCount: sessionsResult.Count || 0,
      },
    };

    return createSuccessResponse(activity);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return createErrorResponse('Failed to fetch user activity', 500);
  }
};

// ================================================================================
// MAIN HANDLER
// ================================================================================

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Observatory API Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': corsOrigins.includes('*') ? '*' : corsOrigins[0],
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Request-ID,X-Session-ID',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: '',
    };
  }

  // Health check endpoint
  if (event.path === '/v1/health') {
    return createSuccessResponse({
      status: 'healthy',
      service: 'observatory-api',
      environment: NODE_ENV,
      features: {
        realTimeAnalytics: !!ANALYTICS_STREAM_NAME,
        dataLake: !!DATA_LAKE_BUCKET,
      },
      timestamp: getCurrentTimestamp(),
    });
  }

  try {
    const { httpMethod, path } = event;
    const pathSegments = path.split('/').filter(Boolean);

    // Route handling
    if (pathSegments[1] === 'metrics') {
      switch (httpMethod) {
        case 'POST':
          return await recordMetric(event);
        case 'GET':
          return await getMetrics(event);
        default:
          return createErrorResponse(`Method ${httpMethod} not allowed for metrics`, 405);
      }
    }

    if (pathSegments[1] === 'events') {
      switch (httpMethod) {
        case 'POST':
          return await trackEvent(event);
        default:
          return createErrorResponse(`Method ${httpMethod} not allowed for events`, 405);
      }
    }

    if (pathSegments[1] === 'sessions') {
      switch (httpMethod) {
        case 'POST':
          return await createSession(event);
        default:
          return createErrorResponse(`Method ${httpMethod} not allowed for sessions`, 405);
      }
    }

    if (pathSegments[1] === 'dashboard') {
      switch (httpMethod) {
        case 'GET':
          return await getDashboard(event);
        default:
          return createErrorResponse(`Method ${httpMethod} not allowed for dashboard`, 405);
      }
    }

    if (pathSegments[1] === 'users') {
      if (pathSegments[2] && pathSegments[3] === 'activity') {
        switch (httpMethod) {
          case 'GET':
            return await getUserActivity(event);
          default:
            return createErrorResponse(`Method ${httpMethod} not allowed for user activity`, 405);
        }
      }
    }

    return createErrorResponse('Route not found', 404);
  } catch (error) {
    console.error('Handler error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
