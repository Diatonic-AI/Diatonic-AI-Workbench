const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.DYNAMODB_REGION || 'us-east-2'
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Table names from environment
const USER_PROFILES_TABLE = process.env.USER_PROFILES_TABLE || 'aws-devops-dev-user-profiles';
const USER_SETTINGS_TABLE = process.env.USER_SETTINGS_TABLE || 'aws-devops-dev-user-settings';
const USER_ANALYTICS_TABLE = process.env.USER_ANALYTICS_TABLE || 'aws-devops-dev-user-analytics';

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

// Validate required fields
const validateRequired = (obj, fields) => {
  const missing = fields.filter(field => !obj[field]);
  return missing.length > 0 ? missing : null;
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

// Get user profile
const getUserProfile = async (tenant, userId, targetUserId = null) => {
  const profileUserId = targetUserId || userId;

  try {
    const result = await docClient.send(new GetCommand({
      TableName: USER_PROFILES_TABLE,
      Key: { user_id: profileUserId, tenant_id: tenant }
    }));

    if (!result.Item) {
      return null;
    }

    // Remove sensitive information if viewing another user's profile
    const profile = result.Item;
    if (targetUserId && targetUserId !== userId) {
      delete profile.email;
      delete profile.phone_number;
      delete profile.private_settings;
    }

    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Create or update user profile
const upsertUserProfile = async (tenant, userId, profileData) => {
  const now = new Date().toISOString();
  
  const profile = {
    user_id: userId,
    tenant_id: tenant,
    display_name: profileData.display_name?.trim() || '',
    email: profileData.email?.toLowerCase().trim() || '',
    avatar_url: profileData.avatar_url || '',
    bio: profileData.bio?.trim() || '',
    location: profileData.location?.trim() || '',
    website: profileData.website?.trim() || '',
    github_username: profileData.github_username?.trim() || '',
    linkedin_username: profileData.linkedin_username?.trim() || '',
    preferences: profileData.preferences || {},
    skills: profileData.skills || [],
    interests: profileData.interests || [],
    status: profileData.status || 'active',
    updated_at: now
  };

  try {
    // Check if profile exists
    const existing = await docClient.send(new GetCommand({
      TableName: USER_PROFILES_TABLE,
      Key: { user_id: userId, tenant_id: tenant }
    }));

    if (existing.Item) {
      // Update existing profile
      const updateExpr = [];
      const attrNames = {};
      const attrValues = {};

      Object.keys(profile).forEach(key => {
        if (key !== 'user_id' && key !== 'tenant_id' && profile[key] !== undefined) {
          updateExpr.push(`#${key} = :${key}`);
          attrNames[`#${key}`] = key;
          attrValues[`:${key}`] = profile[key];
        }
      });

      const updateResult = await docClient.send(new UpdateCommand({
        TableName: USER_PROFILES_TABLE,
        Key: { user_id: userId, tenant_id: tenant },
        UpdateExpression: 'SET ' + updateExpr.join(', '),
        ExpressionAttributeNames: attrNames,
        ExpressionAttributeValues: attrValues,
        ReturnValues: 'ALL_NEW'
      }));

      return updateResult.Attributes;
    } else {
      // Create new profile
      profile.created_at = now;
      
      await docClient.send(new PutCommand({
        TableName: USER_PROFILES_TABLE,
        Item: profile,
        ConditionExpression: 'attribute_not_exists(user_id)'
      }));

      return profile;
    }
  } catch (error) {
    console.error('Error upserting user profile:', error);
    throw error;
  }
};

// Get user settings
const getUserSettings = async (tenant, userId) => {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: USER_SETTINGS_TABLE,
      Key: { user_id: userId, tenant_id: tenant }
    }));

    return result.Item || {
      user_id: userId,
      tenant_id: tenant,
      theme: 'light',
      notifications: {
        email: true,
        push: true,
        in_app: true
      },
      privacy: {
        profile_visibility: 'public',
        activity_visibility: 'friends'
      },
      language: 'en',
      timezone: 'UTC'
    };
  } catch (error) {
    console.error('Error fetching user settings:', error);
    throw error;
  }
};

// Update user settings
const updateUserSettings = async (tenant, userId, settingsData) => {
  const now = new Date().toISOString();
  
  const settings = {
    user_id: userId,
    tenant_id: tenant,
    theme: settingsData.theme || 'light',
    notifications: settingsData.notifications || {},
    privacy: settingsData.privacy || {},
    language: settingsData.language || 'en',
    timezone: settingsData.timezone || 'UTC',
    updated_at: now
  };

  try {
    // Check if settings exist
    const existing = await docClient.send(new GetCommand({
      TableName: USER_SETTINGS_TABLE,
      Key: { user_id: userId, tenant_id: tenant }
    }));

    if (existing.Item) {
      // Update existing settings
      const updateExpr = [];
      const attrNames = {};
      const attrValues = {};

      Object.keys(settings).forEach(key => {
        if (key !== 'user_id' && key !== 'tenant_id') {
          updateExpr.push(`#${key} = :${key}`);
          attrNames[`#${key}`] = key;
          attrValues[`:${key}`] = settings[key];
        }
      });

      const updateResult = await docClient.send(new UpdateCommand({
        TableName: USER_SETTINGS_TABLE,
        Key: { user_id: userId, tenant_id: tenant },
        UpdateExpression: 'SET ' + updateExpr.join(', '),
        ExpressionAttributeNames: attrNames,
        ExpressionAttributeValues: attrValues,
        ReturnValues: 'ALL_NEW'
      }));

      return updateResult.Attributes;
    } else {
      // Create new settings
      settings.created_at = now;
      
      await docClient.send(new PutCommand({
        TableName: USER_SETTINGS_TABLE,
        Item: settings
      }));

      return settings;
    }
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
};

// Get user activity summary
const getUserActivity = async (tenant, userId, timeRange = '30d') => {
  const endDate = new Date();
  const startDate = new Date();

  switch (timeRange) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }

  try {
    const result = await docClient.send(new QueryCommand({
      TableName: USER_ANALYTICS_TABLE,
      IndexName: 'user-created-index',
      KeyConditionExpression: 'user_id = :userId AND tenant_id = :tenant',
      FilterExpression: 'created_at BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':tenant': tenant,
        ':start': startDate.toISOString(),
        ':end': endDate.toISOString()
      }
    }));

    // Group analytics by event type and date
    const activityData = {};
    const dailyActivity = {};
    
    result.Items?.forEach(item => {
      const eventType = item.event_type || 'unknown';
      const date = item.created_at?.split('T')[0] || 'unknown';
      
      activityData[eventType] = (activityData[eventType] || 0) + 1;
      
      if (!dailyActivity[date]) {
        dailyActivity[date] = {};
      }
      dailyActivity[date][eventType] = (dailyActivity[date][eventType] || 0) + 1;
    });

    return {
      timeRange,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalEvents: result.Items?.length || 0,
      eventsByType: activityData,
      dailyActivity
    };
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return {
      timeRange,
      totalEvents: 0,
      eventsByType: {},
      dailyActivity: {},
      error: 'Failed to fetch activity data'
    };
  }
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
      case path.includes('/profile'):
        switch (method) {
          case 'GET':
            const targetUserId = pathParams.userId || userId;
            const profile = await getUserProfile(tenant, userId, targetUserId);
            
            if (!profile) {
              return errorResponse(404, 'Profile not found');
            }
            
            return response(200, { profile });

          case 'PUT':
          case 'POST':
            const profileData = JSON.parse(event.body || '{}');
            const updatedProfile = await upsertUserProfile(tenant, userId, profileData);
            return response(200, { profile: updatedProfile });

          case 'DELETE':
            await docClient.send(new DeleteCommand({
              TableName: USER_PROFILES_TABLE,
              Key: { user_id: userId, tenant_id: tenant },
              ConditionExpression: 'attribute_exists(user_id)'
            }));
            return response(204, {});

          default:
            return errorResponse(405, 'Method not allowed');
        }

      case path.includes('/settings'):
        switch (method) {
          case 'GET':
            const settings = await getUserSettings(tenant, userId);
            return response(200, { settings });

          case 'PUT':
          case 'POST':
            const settingsData = JSON.parse(event.body || '{}');
            const updatedSettings = await updateUserSettings(tenant, userId, settingsData);
            return response(200, { settings: updatedSettings });

          default:
            return errorResponse(405, 'Method not allowed');
        }

      case path.includes('/activity'):
        if (method === 'GET') {
          const timeRange = queryParams.timeRange || '30d';
          const activity = await getUserActivity(tenant, userId, timeRange);
          return response(200, { activity });
        }
        return errorResponse(405, 'Method not allowed');

      default:
        // User Profile API root
        return response(200, {
          message: 'AI Nexus User Profile API',
          version: '1.0.0',
          userId,
          tenant,
          endpoints: {
            profile: 'GET /profile, PUT /profile, DELETE /profile',
            settings: 'GET /settings, PUT /settings',
            activity: 'GET /activity?timeRange=30d',
            user_profile: 'GET /profile/{userId}'
          }
        });
    }

  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return errorResponse(403, 'Access denied or resource not found');
    }
    console.error('Unhandled error:', error);
    return errorResponse(500, 'Internal server error', error.message);
  }
};
