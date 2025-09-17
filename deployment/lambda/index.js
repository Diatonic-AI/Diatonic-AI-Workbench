const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const jwt = require('jsonwebtoken');
const { ulid } = require('ulid');

// Initialize AWS SDK v3 clients
const dynamodbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-2',
  maxAttempts: 3
});

const dynamodb = DynamoDBDocument.from(dynamodbClient);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2'
});

// Configuration
const COURSES_TABLE = process.env.COURSES_TABLE || 'aws-devops-dev-courses';
const LESSONS_TABLE = process.env.LESSONS_TABLE || 'aws-devops-dev-lessons';
const PROGRESS_TABLE = process.env.PROGRESS_TABLE || 'aws-devops-dev-lesson-progress';
const ENROLLMENTS_TABLE = process.env.ENROLLMENTS_TABLE || 'aws-devops-dev-enrollments';
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'aiworkbench-education-content-prod';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Logging utility
const logger = {
  info: (message, data = {}) => {
    if (['info', 'debug'].includes(LOG_LEVEL)) {
      console.log(JSON.stringify({ level: 'INFO', message, ...data, timestamp: new Date().toISOString() }));
    }
  },
  error: (message, error = {}) => {
    console.error(JSON.stringify({ level: 'ERROR', message, error: error.message || error, timestamp: new Date().toISOString() }));
  },
  debug: (message, data = {}) => {
    if (LOG_LEVEL === 'debug') {
      console.log(JSON.stringify({ level: 'DEBUG', message, ...data, timestamp: new Date().toISOString() }));
    }
  }
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

// Response helper
const createResponse = (statusCode, body, additionalHeaders = {}) => ({
  statusCode,
  headers: { ...corsHeaders, ...additionalHeaders },
  body: JSON.stringify(body)
});

// Authentication middleware
const validateAuth = (event) => {
  try {
    // Extract auth info from Cognito authorizer context
    const authorizer = event.requestContext?.authorizer;
    if (!authorizer || !authorizer.claims) {
      throw new Error('No authentication context found');
    }

    const claims = authorizer.claims;
    const userId = claims.sub;
    const tenantId = claims['custom:tenant'] || claims.tenant || 'default';
    const userRole = claims['custom:role'] || claims.role || 'basic';

    logger.debug('Auth validation successful', { userId, tenantId, userRole });

    return {
      userId,
      tenantId,
      userRole,
      isInstructor: ['instructor', 'admin'].includes(userRole),
      isAdmin: userRole === 'admin'
    };
  } catch (error) {
    logger.error('Auth validation failed', error);
    throw new Error('Authentication failed');
  }
};

// Input validation
const validateModuleInput = (data, isUpdate = false) => {
  const errors = [];

  if (!isUpdate || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Title is required and must be a non-empty string');
    } else if (data.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }
  }

  if (!isUpdate || data.description !== undefined) {
    if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
      errors.push('Description is required and must be a non-empty string');
    } else if (data.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }
  }

  if (!isUpdate || data.category !== undefined) {
    if (!data.category || typeof data.category !== 'string') {
      errors.push('Category is required and must be a string');
    }
  }

  if (!isUpdate || data.level !== undefined) {
    const validLevels = ['beginner', 'intermediate', 'advanced'];
    if (!data.level || !validLevels.includes(data.level)) {
      errors.push(`Level must be one of: ${validLevels.join(', ')}`);
    }
  }

  if (!isUpdate || data.estimatedDuration !== undefined) {
    if (!data.estimatedDuration || typeof data.estimatedDuration !== 'number' || data.estimatedDuration <= 0) {
      errors.push('Estimated duration is required and must be a positive number');
    }
  }

  if (!isUpdate || data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push('Tags must be an array');
    } else if (data.tags.some(tag => typeof tag !== 'string' || tag.trim().length === 0)) {
      errors.push('All tags must be non-empty strings');
    }
  }

  return errors;
};

// Database operations
const dbOperations = {
  async getAllModules(tenantId) {
    // Use scan with filter since we don't have the required GSI
    // In a production setup, we'd want to add a proper GSI for tenant queries
    const params = {
      TableName: COURSES_TABLE,
      FilterExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':tenantId': tenantId
      }
    };

    logger.debug('Scanning modules for tenant', { tenantId, params });
    
    const result = await dynamodb.scan(params);
    return result.Items || [];
  },

  async getModule(moduleId, tenantId) {
    const params = {
      TableName: COURSES_TABLE,
      Key: {
        pk: `MODULE#${moduleId}`,
        sk: `MODULE#${moduleId}`
      }
    };

    logger.debug('Getting module', { moduleId, tenantId });
    
    const result = await dynamodb.get(params);
    
    if (!result.Item) {
      throw new Error('Module not found');
    }

    // Verify tenant ownership
    if (result.Item.tenantId !== tenantId) {
      throw new Error('Access denied: Module belongs to different tenant');
    }

    return result.Item;
  },

  async createModule(moduleData, auth) {
    const now = new Date().toISOString();
    const moduleId = ulid();

    const item = {
      pk: `MODULE#${moduleId}`,
      sk: `MODULE#${moduleId}`,
      gsi1pk: `TENANT#${auth.tenantId}`,
      gsi1sk: `MODULE#${now}`,
      
      moduleId,
      tenantId: auth.tenantId,
      title: moduleData.title.trim(),
      description: moduleData.description.trim(),
      category: moduleData.category,
      level: moduleData.level,
      estimatedDuration: moduleData.estimatedDuration,
      tags: moduleData.tags || [],
      isPublished: moduleData.isPublished || false,
      contentUrl: moduleData.contentUrl || null,
      
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
      version: '1.0.0'
    };

    const params = {
      TableName: COURSES_TABLE,
      Item: item,
      ConditionExpression: 'attribute_not_exists(pk)'
    };

    logger.debug('Creating module', { moduleId, tenantId: auth.tenantId });
    
    await dynamodb.put(params);
    return item;
  },

  async updateModule(moduleId, updateData, auth) {
    // First verify module exists and user has access
    const existingModule = await this.getModule(moduleId, auth.tenantId);
    
    const now = new Date().toISOString();
    
    // Build update expression dynamically
    let updateExpression = 'SET updatedAt = :updatedAt';
    const expressionAttributeValues = {
      ':updatedAt': now
    };
    
    // Update fields that were provided
    Object.keys(updateData).forEach((key, index) => {
      if (['title', 'description', 'category', 'level', 'estimatedDuration', 'tags', 'isPublished', 'contentUrl'].includes(key)) {
        const valueKey = `:val${index}`;
        updateExpression += `, ${key} = ${valueKey}`;
        expressionAttributeValues[valueKey] = updateData[key];
      }
    });

    const params = {
      TableName: COURSES_TABLE,
      Key: {
        pk: `MODULE#${moduleId}`,
        sk: `MODULE#${moduleId}`
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    logger.debug('Updating module', { moduleId, updateData });
    
    const result = await dynamodb.update(params);
    return result.Attributes;
  },

  async deleteModule(moduleId, auth) {
    // First verify module exists and user has access
    await this.getModule(moduleId, auth.tenantId);

    const params = {
      TableName: COURSES_TABLE,
      Key: {
        pk: `MODULE#${moduleId}`,
        sk: `MODULE#${moduleId}`
      }
    };

    logger.debug('Deleting module', { moduleId, tenantId: auth.tenantId });
    
    await dynamodb.delete(params);
    return { success: true, moduleId };
  }
};

// S3 operations
const s3Operations = {
  async generatePresignedUploadUrl(moduleId, fileName, contentType, auth) {
    const key = `modules/${auth.tenantId}/${moduleId}/${Date.now()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
      Metadata: {
        'module-id': moduleId,
        'tenant-id': auth.tenantId,
        'uploaded-by': auth.userId
      }
    });

    logger.debug('Generating presigned URL', { key, contentType });
    
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
    const contentUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${key}`;

    return {
      uploadUrl,
      contentUrl,
      key
    };
  }
};

// Route handlers
const handlers = {
  async getAllModules(event) {
    const auth = validateAuth(event);
    
    logger.info('Getting all modules', { tenantId: auth.tenantId, userId: auth.userId });
    
    const modules = await dbOperations.getAllModules(auth.tenantId);
    
    return createResponse(200, {
      success: true,
      modules,
      count: modules.length
    });
  },

  async getModule(event) {
    const auth = validateAuth(event);
    const moduleId = event.pathParameters?.moduleId;

    if (!moduleId) {
      return createResponse(400, { error: 'Module ID is required' });
    }

    logger.info('Getting module', { moduleId, tenantId: auth.tenantId, userId: auth.userId });
    
    const module = await dbOperations.getModule(moduleId, auth.tenantId);
    
    return createResponse(200, {
      success: true,
      module
    });
  },

  async createModule(event) {
    const auth = validateAuth(event);

    // Check permissions
    if (!auth.isInstructor) {
      return createResponse(403, { error: 'Insufficient permissions. Instructor or admin role required.' });
    }

    const body = JSON.parse(event.body || '{}');
    
    // Validate input
    const validationErrors = validateModuleInput(body, false);
    if (validationErrors.length > 0) {
      return createResponse(400, { error: 'Validation failed', details: validationErrors });
    }

    logger.info('Creating module', { tenantId: auth.tenantId, userId: auth.userId, title: body.title });
    
    const module = await dbOperations.createModule(body, auth);
    
    return createResponse(201, {
      success: true,
      module
    });
  },

  async updateModule(event) {
    const auth = validateAuth(event);
    const moduleId = event.pathParameters?.moduleId;

    // Check permissions
    if (!auth.isInstructor) {
      return createResponse(403, { error: 'Insufficient permissions. Instructor or admin role required.' });
    }

    if (!moduleId) {
      return createResponse(400, { error: 'Module ID is required' });
    }

    const body = JSON.parse(event.body || '{}');
    
    // Validate input for update
    const validationErrors = validateModuleInput(body, true);
    if (validationErrors.length > 0) {
      return createResponse(400, { error: 'Validation failed', details: validationErrors });
    }

    logger.info('Updating module', { moduleId, tenantId: auth.tenantId, userId: auth.userId });
    
    const module = await dbOperations.updateModule(moduleId, body, auth);
    
    return createResponse(200, {
      success: true,
      module
    });
  },

  async deleteModule(event) {
    const auth = validateAuth(event);
    const moduleId = event.pathParameters?.moduleId;

    // Check permissions
    if (!auth.isInstructor) {
      return createResponse(403, { error: 'Insufficient permissions. Instructor or admin role required.' });
    }

    if (!moduleId) {
      return createResponse(400, { error: 'Module ID is required' });
    }

    logger.info('Deleting module', { moduleId, tenantId: auth.tenantId, userId: auth.userId });
    
    const result = await dbOperations.deleteModule(moduleId, auth);
    
    return createResponse(200, {
      success: true,
      result
    });
  },

  async generateUploadUrl(event) {
    const auth = validateAuth(event);
    const moduleId = event.pathParameters?.moduleId;

    // Check permissions
    if (!auth.isInstructor) {
      return createResponse(403, { error: 'Insufficient permissions. Instructor or admin role required.' });
    }

    if (!moduleId) {
      return createResponse(400, { error: 'Module ID is required' });
    }

    const body = JSON.parse(event.body || '{}');
    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      return createResponse(400, { error: 'fileName and contentType are required' });
    }

    // Validate file type
    const allowedTypes = [
      'video/mp4', 'video/quicktime', 'video/x-msvideo',
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip', 'application/x-zip-compressed'
    ];

    if (!allowedTypes.includes(contentType)) {
      return createResponse(400, { error: 'Unsupported file type' });
    }

    // Verify module exists and user has access
    await dbOperations.getModule(moduleId, auth.tenantId);

    logger.info('Generating upload URL', { moduleId, fileName, contentType, tenantId: auth.tenantId });
    
    const uploadData = await s3Operations.generatePresignedUploadUrl(moduleId, fileName, contentType, auth);
    
    return createResponse(200, {
      success: true,
      ...uploadData
    });
  }
};

// Main Lambda handler
exports.handler = async (event, context) => {
  // Set up request context
  context.callbackWaitsForEmptyEventLoop = false;
  
  const requestId = context.awsRequestId;
  const startTime = Date.now();
  
  logger.info('Request started', {
    requestId,
    httpMethod: event.httpMethod,
    path: event.path,
    pathParameters: event.pathParameters
  });

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'CORS preflight successful' });
    }

    // Route requests
    const path = event.path;
    const method = event.httpMethod;
    
    // Define routes
    if (method === 'GET' && path === '/education/modules') {
      return await handlers.getAllModules(event);
    } else if (method === 'POST' && path === '/education/modules') {
      return await handlers.createModule(event);
    } else if (method === 'GET' && path.match(/^\/education\/modules\/[^\/]+$/)) {
      return await handlers.getModule(event);
    } else if (method === 'PUT' && path.match(/^\/education\/modules\/[^\/]+$/)) {
      return await handlers.updateModule(event);
    } else if (method === 'DELETE' && path.match(/^\/education\/modules\/[^\/]+$/)) {
      return await handlers.deleteModule(event);
    } else if (method === 'POST' && path.match(/^\/education\/modules\/[^\/]+\/upload-url$/)) {
      return await handlers.generateUploadUrl(event);
    } else {
      return createResponse(404, { error: 'Route not found' });
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Request failed', {
      requestId,
      duration,
      error: error.message,
      stack: error.stack
    });

    // Handle specific error types
    if (error.message === 'Authentication failed') {
      return createResponse(401, { error: 'Authentication failed' });
    } else if (error.message === 'Module not found') {
      return createResponse(404, { error: 'Module not found' });
    } else if (error.message.includes('Access denied')) {
      return createResponse(403, { error: error.message });
    } else if (error.code === 'ConditionalCheckFailedException') {
      return createResponse(409, { error: 'Resource already exists or conflict detected' });
    } else {
      return createResponse(500, { 
        error: 'Internal server error',
        requestId,
        ...(LOG_LEVEL === 'debug' && { details: error.message })
      });
    }
  } finally {
    const duration = Date.now() - startTime;
    logger.info('Request completed', { requestId, duration });
  }
};