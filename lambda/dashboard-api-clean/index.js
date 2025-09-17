const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, ScanCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.DYNAMODB_REGION || 'us-east-2'
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Table names from environment
const USER_ANALYTICS_TABLE = process.env.USER_ANALYTICS_TABLE || 'aws-devops-dev-user-analytics';
const AGENT_WORKFLOWS_TABLE = process.env.AGENT_WORKFLOWS_TABLE || 'aws-devops-dev-agent-workflows';
const POSTS_TABLE = process.env.POSTS_TABLE || 'aws-devops-dev-posts';
const COURSES_TABLE = process.env.COURSES_TABLE || 'aws-devops-dev-courses';
const MODELS_TABLE = process.env.MODELS_TABLE || 'aws-devops-dev-models';

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true'
};

// Response helper
const response = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { ...CORS_HEADERS, ...headers },
  body: JSON.stringify(body)
});

// Error response helper
const errorResponse = (statusCode, message, details = null) => {
  console.error(`Error ${statusCode}: ${message}`, details);
  return response(statusCode, {
    error: message,
    ...(details && process.env.ENABLE_DEBUG_MODE === 'true' && { details })
  });
};

// Get tenant from JWT token or headers
const getTenant = (event) => {
  if (event.requestContext?.authorizer?.claims?.['custom:organization_id']) {
    return event.requestContext.authorizer.claims['custom:organization_id'];
  }
  return event.headers?.['X-Tenant-ID'] || process.env.DEFAULT_ORGANIZATION_ID || 'default';
};

// Get user ID from JWT token
const getUserId = (event) => {
  return event.requestContext?.authorizer?.claims?.sub || 'anonymous';
};

// Dashboard overview metrics
const getDashboardOverview = async (tenant, userId) => {
  const promises = [
    // User analytics count
    docClient.send(new QueryCommand({
      TableName: USER_ANALYTICS_TABLE,
      IndexName: 'tenant-user-index',
      KeyConditionExpression: 'tenant_id = :tenant AND user_id = :userId',
      ExpressionAttributeValues: { ':tenant': tenant, ':userId': userId },
      Select: 'COUNT'
    })),

    // Agent workflows count
    docClient.send(new QueryCommand({
      TableName: AGENT_WORKFLOWS_TABLE,
      IndexName: 'tenant-created-index',
      KeyConditionExpression: 'tenant_id = :tenant',
      ExpressionAttributeValues: { ':tenant': tenant },
      Select: 'COUNT'
    })),

    // Community posts count
    docClient.send(new QueryCommand({
      TableName: POSTS_TABLE,
      IndexName: 'tenant-created-index',
      KeyConditionExpression: 'tenant_id = :tenant',
      ExpressionAttributeValues: { ':tenant': tenant },
      Select: 'COUNT'
    })),

    // Courses count
    docClient.send(new QueryCommand({
      TableName: COURSES_TABLE,
      IndexName: 'tenant-created-index',
      KeyConditionExpression: 'tenant_id = :tenant',
      ExpressionAttributeValues: { ':tenant': tenant },
      Select: 'COUNT'
    }))
  ];

  const [analyticsResult, workflowsResult, postsResult, coursesResult] = await Promise.all(promises);

  return {
    analytics_events: analyticsResult.Count || 0,
    agent_workflows: workflowsResult.Count || 0,
    community_posts: postsResult.Count || 0,
    courses: coursesResult.Count || 0
  };
};

// Recent activity feed
const getRecentActivity = async (tenant, userId, limit = 20) => {
  const activities = [];

  try {
    // Recent user analytics
    const analyticsResult = await docClient.send(new QueryCommand({
      TableName: USER_ANALYTICS_TABLE,
      IndexName: 'tenant-created-index',
      KeyConditionExpression: 'tenant_id = :tenant',
      ExpressionAttributeValues: { ':tenant': tenant },
      ScanIndexForward: false,
      Limit: Math.floor(limit / 2)
    }));

    analyticsResult.Items?.forEach(item => {
      activities.push({
        type: 'analytics',
        action: item.event_type || 'unknown',
        timestamp: item.created_at,
        details: {
          user_id: item.user_id,
          source: item.source || 'dashboard'
        }
      });
    });

    // Recent agent workflows
    const workflowsResult = await docClient.send(new QueryCommand({
      TableName: AGENT_WORKFLOWS_TABLE,
      IndexName: 'tenant-created-index',
      KeyConditionExpression: 'tenant_id = :tenant',
      ExpressionAttributeValues: { ':tenant': tenant },
      ScanIndexForward: false,
      Limit: Math.floor(limit / 2)
    }));

    workflowsResult.Items?.forEach(item => {
      activities.push({
        type: 'workflow',
        action: item.status || 'unknown',
        timestamp: item.created_at,
        details: {
          workflow_id: item.id,
          name: item.name || 'Unnamed Workflow'
        }
      });
    });

  } catch (error) {
    console.warn('Error fetching recent activity:', error);
  }

  // Sort by timestamp and return top activities
  return activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
};

// System health status
const getSystemHealth = async (tenant) => {
  const healthChecks = {
    database: 'healthy',
    api: 'healthy',
    authentication: 'healthy',
    storage: 'healthy'
  };

  try {
    // Test database connectivity with a simple query
    await docClient.send(new QueryCommand({
      TableName: USER_ANALYTICS_TABLE,
      KeyConditionExpression: 'tenant_id = :tenant',
      ExpressionAttributeValues: { ':tenant': tenant },
      Limit: 1
    }));
  } catch (error) {
    healthChecks.database = 'unhealthy';
    console.error('Database health check failed:', error);
  }

  // Calculate overall health
  const unhealthyServices = Object.values(healthChecks).filter(status => status === 'unhealthy').length;
  const overallHealth = unhealthyServices === 0 ? 'healthy' : 
                       unhealthyServices <= 1 ? 'degraded' : 'unhealthy';

  return {
    overall: overallHealth,
    services: healthChecks,
    timestamp: new Date().toISOString()
  };
};

// Usage analytics
const getUsageAnalytics = async (tenant, userId, timeRange = '7d') => {
  const endDate = new Date();
  const startDate = new Date();
  
  // Calculate start date based on time range
  switch (timeRange) {
    case '24h':
      startDate.setDate(endDate.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    default:
      startDate.setDate(endDate.getDate() - 7);
  }

  try {
    const result = await docClient.send(new QueryCommand({
      TableName: USER_ANALYTICS_TABLE,
      IndexName: 'tenant-created-index',
      KeyConditionExpression: 'tenant_id = :tenant',
      FilterExpression: 'created_at BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':tenant': tenant,
        ':start': startDate.toISOString(),
        ':end': endDate.toISOString()
      }
    }));

    // Group analytics by event type
    const analyticsData = {};
    result.Items?.forEach(item => {
      const eventType = item.event_type || 'unknown';
      analyticsData[eventType] = (analyticsData[eventType] || 0) + 1;
    });

    return {
      timeRange,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalEvents: result.Items?.length || 0,
      eventsByType: analyticsData
    };
  } catch (error) {
    console.error('Error fetching usage analytics:', error);
    return {
      timeRange,
      totalEvents: 0,
      eventsByType: {},
      error: 'Failed to fetch analytics data'
    };
  }
};

// Performance metrics
const getPerformanceMetrics = async (tenant) => {
  const metrics = {
    api_response_time: Math.floor(Math.random() * 100) + 50, // Simulated
    database_query_time: Math.floor(Math.random() * 50) + 10, // Simulated
    error_rate: Math.random() * 0.05, // Simulated 0-5%
    throughput: Math.floor(Math.random() * 1000) + 500 // Simulated requests/hour
  };

  return {
    ...metrics,
    timestamp: new Date().toISOString(),
    status: metrics.error_rate < 0.01 ? 'excellent' : 
            metrics.error_rate < 0.03 ? 'good' : 'needs_attention'
  };
};

// Main Lambda handler
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return response(200, {});
  }

  try {
    const method = event.httpMethod;
    const path = event.path || event.resource || '';
    const pathParams = event.pathParameters || {};
    const queryParams = event.queryStringParameters || {};

    const tenant = getTenant(event);
    const userId = getUserId(event);

    // Route requests based on path
    switch (true) {
      case path.includes('/overview'):
        if (method === 'GET') {
          const overview = await getDashboardOverview(tenant, userId);
          return response(200, { overview });
        }
        break;

      case path.includes('/activity'):
        if (method === 'GET') {
          const limit = parseInt(queryParams.limit) || 20;
          const activity = await getRecentActivity(tenant, userId, limit);
          return response(200, { activity });
        }
        break;

      case path.includes('/health'):
        if (method === 'GET') {
          const health = await getSystemHealth(tenant);
          return response(200, { health });
        }
        break;

      case path.includes('/analytics'):
        if (method === 'GET') {
          const timeRange = queryParams.timeRange || '7d';
          const analytics = await getUsageAnalytics(tenant, userId, timeRange);
          return response(200, { analytics });
        }
        break;

      case path.includes('/metrics'):
        if (method === 'GET') {
          const metrics = await getPerformanceMetrics(tenant);
          return response(200, { metrics });
        }
        break;

      default:
        // Dashboard API root
        return response(200, {
          message: 'AI Nexus Dashboard API',
          version: '1.0.0',
          tenant,
          endpoints: {
            overview: 'GET /dashboard/overview',
            activity: 'GET /dashboard/activity?limit=20',
            health: 'GET /dashboard/health',
            analytics: 'GET /dashboard/analytics?timeRange=7d',
            metrics: 'GET /dashboard/metrics'
          }
        });
    }

    return errorResponse(405, 'Method not allowed');

  } catch (error) {
    console.error('Unhandled error:', error);
    return errorResponse(500, 'Internal server error', error.message);
  }
};
