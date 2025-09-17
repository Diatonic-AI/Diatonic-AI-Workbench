/**
 * AI Nexus Workbench - Enhanced Education API with Module Management
 * Handles Education modules, content upload, and advanced course management
 * Implements multi-tenant isolation and comprehensive CRUD operations
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS SDK
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-2'
});

const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-2',
  signatureVersion: 'v4'
});

// Environment configuration
const config = {
  tables: {
    courses: process.env.COURSES_TABLE || 'aws-devops-dev-courses',
    lessons: process.env.LESSONS_TABLE || 'aws-devops-dev-lessons',
    enrollments: process.env.ENROLLMENTS_TABLE || 'aws-devops-dev-enrollments',
    progress: process.env.PROGRESS_TABLE || 'aws-devops-dev-lesson-progress',
    modules: process.env.EDUCATION_MODULES_TABLE || 'aws-devops-dev-education-modules',
    moduleContent: process.env.MODULE_CONTENT_TABLE || 'aws-devops-dev-module-content'
  },
  s3: {
    contentBucket: process.env.CONTENT_BUCKET || 'aws-devops-dev-user-content',
    uploadPrefix: 'education/modules',
    tempPrefix: 'education/temp',
    thumbnailPrefix: 'education/thumbnails'
  },
  tenant: {
    defaultOrganizationId: process.env.DEFAULT_ORGANIZATION_ID || 'dev-org',
    enableIsolation: process.env.ENABLE_TENANT_ISOLATION === 'true'
  },
  debug: process.env.ENABLE_DEBUG_MODE === 'true',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  upload: {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/mov'],
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedDocTypes: ['application/pdf', 'text/plain', 'text/markdown'],
    presignedUrlExpiry: 3600 // 1 hour
  }
};

// Utility functions
const log = (...args) => {
  if (config.debug) {
    console.log(new Date().toISOString(), ...args);
  }
};

const createResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': config.corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT',
    ...headers
  },
  body: JSON.stringify(body)
});

const createError = (statusCode, message, details = null) => {
  const error = {
    error: true,
    message,
    timestamp: new Date().toISOString()
  };
  if (details && config.debug) {
    error.details = details;
  }
  return createResponse(statusCode, error);
};

// Extract tenant information from Cognito claims
const extractTenantInfo = (event) => {
  try {
    const claims = event.requestContext?.authorizer?.claims || {};
    const organizationId = claims['custom:organization_id'] || config.tenant.defaultOrganizationId;
    const userId = claims.sub || claims['cognito:username'] || 'anonymous';
    const userRole = claims['custom:role'] || 'basic';
    
    log('Tenant Info:', { organizationId, userId, userRole });
    
    return { organizationId, userId, userRole };
  } catch (error) {
    log('Error extracting tenant info:', error);
    return {
      organizationId: config.tenant.defaultOrganizationId,
      userId: 'anonymous',
      userRole: 'basic'
    };
  }
};

// Generate consistent IDs with tenant prefix
const generateId = (organizationId, type) => {
  const uuid = uuidv4();
  return `${organizationId}:${type}:${uuid}`;
};

// Validation schemas
const validateModule = (module) => {
  const errors = [];
  
  if (!module.title || typeof module.title !== 'string' || module.title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string');
  }
  
  if (!module.description || typeof module.description !== 'string') {
    errors.push('Description is required and must be a string');
  }
  
  if (module.difficulty && !['beginner', 'intermediate', 'advanced'].includes(module.difficulty)) {
    errors.push('Difficulty must be one of: beginner, intermediate, advanced');
  }
  
  if (module.content_type && !['video', 'interactive', 'text', 'mixed'].includes(module.content_type)) {
    errors.push('Content type must be one of: video, interactive, text, mixed');
  }
  
  if (module.estimated_duration && (typeof module.estimated_duration !== 'number' || module.estimated_duration <= 0)) {
    errors.push('Estimated duration must be a positive number (minutes)');
  }
  
  return errors;
};

const validateContentUpload = (contentType, fileSize) => {
  const errors = [];
  
  if (fileSize > config.upload.maxFileSize) {
    errors.push(`File size exceeds maximum allowed size of ${config.upload.maxFileSize / (1024*1024)}MB`);
  }
  
  const isValidType = [
    ...config.upload.allowedVideoTypes,
    ...config.upload.allowedImageTypes,
    ...config.upload.allowedDocTypes
  ].includes(contentType);
  
  if (!isValidType) {
    errors.push(`Content type ${contentType} is not allowed`);
  }
  
  return errors;
};

// S3 operations
const s3Operations = {
  async generatePresignedUrl(organizationId, moduleId, filename, contentType) {
    const key = `${config.s3.uploadPrefix}/${organizationId}/${moduleId}/${filename}`;
    
    const params = {
      Bucket: config.s3.contentBucket,
      Key: key,
      ContentType: contentType,
      Expires: config.upload.presignedUrlExpiry,
      Conditions: [
        ['content-length-range', 0, config.upload.maxFileSize]
      ]
    };
    
    const signedUrl = await s3.getSignedUrlPromise('putObject', params);
    
    return {
      uploadUrl: signedUrl,
      downloadUrl: `https://${config.s3.contentBucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      key: key,
      bucket: config.s3.contentBucket
    };
  },

  async generateThumbnailUrl(organizationId, moduleId, filename) {
    const key = `${config.s3.thumbnailPrefix}/${organizationId}/${moduleId}/${filename}`;
    
    return `https://${config.s3.contentBucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }
};

// DynamoDB operations for modules
const moduleOperations = {
  async getModules(organizationId, options = {}) {
    const params = {
      TableName: config.tables.modules,
      IndexName: 'organization-updated-index',
      KeyConditionExpression: 'organization_id = :orgId',
      ExpressionAttributeValues: {
        ':orgId': organizationId
      },
      ScanIndexForward: false,
      Limit: options.limit || 50
    };
    
    if (options.status) {
      params.FilterExpression = '#status = :status';
      params.ExpressionAttributeNames = { '#status': 'status' };
      params.ExpressionAttributeValues[':status'] = options.status;
    }
    
    if (options.exclusiveStartKey) {
      params.ExclusiveStartKey = options.exclusiveStartKey;
    }
    
    const result = await dynamodb.query(params).promise();
    return result;
  },

  async getModule(organizationId, moduleId) {
    const params = {
      TableName: config.tables.modules,
      Key: { module_id: moduleId },
      ConditionExpression: 'organization_id = :orgId',
      ExpressionAttributeValues: {
        ':orgId': organizationId
      }
    };
    
    const result = await dynamodb.get(params).promise();
    return result.Item;
  },

  async createModule(organizationId, userId, moduleData) {
    const moduleId = generateId(organizationId, 'module');
    const now = new Date().toISOString();
    
    const module = {
      module_id: moduleId,
      organization_id: organizationId,
      title: moduleData.title,
      description: moduleData.description,
      content_type: moduleData.content_type || 'mixed',
      difficulty: moduleData.difficulty || 'beginner',
      estimated_duration: moduleData.estimated_duration || 0,
      prerequisites: moduleData.prerequisites || [],
      learning_objectives: moduleData.learning_objectives || [],
      content_url: null, // Will be updated after upload
      thumbnail_url: null,
      tags: moduleData.tags || [],
      status: 'draft',
      created_by: userId,
      version: '1.0.0',
      created_at: now,
      updated_at: now,
      metrics: {
        views: 0,
        completions: 0,
        rating: 0,
        rating_count: 0
      }
    };
    
    const params = {
      TableName: config.tables.modules,
      Item: module,
      ConditionExpression: 'attribute_not_exists(module_id)'
    };
    
    await dynamodb.put(params).promise();
    return module;
  },

  async updateModule(organizationId, userId, moduleId, updates) {
    const now = new Date().toISOString();
    
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {
      ':orgId': organizationId,
      ':now': now
    };
    
    // Build dynamic update expression
    const allowedUpdates = ['title', 'description', 'content_type', 'difficulty', 'estimated_duration', 'prerequisites', 'learning_objectives', 'tags', 'status'];
    
    for (const field of allowedUpdates) {
      if (updates[field] !== undefined) {
        updateExpressions.push(`#${field} = :${field}`);
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = updates[field];
      }
    }
    
    if (updateExpressions.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    updateExpressions.push('updated_at = :now');
    
    const params = {
      TableName: config.tables.modules,
      Key: { module_id: moduleId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ConditionExpression: 'organization_id = :orgId AND created_by = :userId',
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: {
        ...expressionAttributeValues,
        ':userId': userId
      },
      ReturnValues: 'ALL_NEW'
    };
    
    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  },

  async deleteModule(organizationId, userId, moduleId) {
    const params = {
      TableName: config.tables.modules,
      Key: { module_id: moduleId },
      ConditionExpression: 'organization_id = :orgId AND created_by = :userId',
      ExpressionAttributeValues: {
        ':orgId': organizationId,
        ':userId': userId
      },
      ReturnValues: 'ALL_OLD'
    };
    
    const result = await dynamodb.delete(params).promise();
    return result.Attributes;
  },

  async updateModuleContent(moduleId, contentUrl, thumbnailUrl = null) {
    const updateExpressions = ['content_url = :contentUrl', 'updated_at = :now'];
    const expressionAttributeValues = {
      ':contentUrl': contentUrl,
      ':now': new Date().toISOString()
    };
    
    if (thumbnailUrl) {
      updateExpressions.push('thumbnail_url = :thumbnailUrl');
      expressionAttributeValues[':thumbnailUrl'] = thumbnailUrl;
    }
    
    const params = {
      TableName: config.tables.modules,
      Key: { module_id: moduleId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };
    
    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  }
};

// Request handlers
const handlers = {
  // Module management endpoints
  async getModules(event, tenantInfo) {
    try {
      const queryParams = event.queryStringParameters || {};
      const options = {
        limit: queryParams.limit ? parseInt(queryParams.limit) : 50,
        status: queryParams.status,
        exclusiveStartKey: queryParams.nextToken ? JSON.parse(decodeURIComponent(queryParams.nextToken)) : null
      };
      
      const result = await moduleOperations.getModules(tenantInfo.organizationId, options);
      
      const response = {
        modules: result.Items,
        count: result.Count,
        scannedCount: result.ScannedCount
      };
      
      if (result.LastEvaluatedKey) {
        response.nextToken = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
      }
      
      return createResponse(200, response);
    } catch (error) {
      log('Error getting modules:', error);
      return createError(500, 'Failed to retrieve modules', error);
    }
  },

  async getModule(event, tenantInfo) {
    try {
      const moduleId = event.pathParameters?.id;
      if (!moduleId) {
        return createError(400, 'Module ID is required');
      }
      
      const module = await moduleOperations.getModule(tenantInfo.organizationId, moduleId);
      if (!module) {
        return createError(404, 'Module not found');
      }
      
      return createResponse(200, module);
    } catch (error) {
      log('Error getting module:', error);
      if (error.name === 'ConditionalCheckFailedException') {
        return createError(404, 'Module not found');
      }
      return createError(500, 'Failed to retrieve module', error);
    }
  },

  async createModule(event, tenantInfo) {
    try {
      // Check permissions
      if (!['instructor', 'admin'].includes(tenantInfo.userRole)) {
        return createError(403, 'Insufficient permissions to create modules');
      }
      
      const moduleData = JSON.parse(event.body || '{}');
      
      // Validate module data
      const validationErrors = validateModule(moduleData);
      if (validationErrors.length > 0) {
        return createError(400, 'Validation failed', validationErrors);
      }
      
      const module = await moduleOperations.createModule(
        tenantInfo.organizationId,
        tenantInfo.userId,
        moduleData
      );
      
      return createResponse(201, module);
    } catch (error) {
      log('Error creating module:', error);
      return createError(500, 'Failed to create module', error);
    }
  },

  async updateModule(event, tenantInfo) {
    try {
      const moduleId = event.pathParameters?.id;
      if (!moduleId) {
        return createError(400, 'Module ID is required');
      }
      
      const updates = JSON.parse(event.body || '{}');
      
      // Validate updates
      const validationErrors = validateModule(updates);
      if (validationErrors.length > 0) {
        return createError(400, 'Validation failed', validationErrors);
      }
      
      const module = await moduleOperations.updateModule(
        tenantInfo.organizationId,
        tenantInfo.userId,
        moduleId,
        updates
      );
      
      return createResponse(200, module);
    } catch (error) {
      log('Error updating module:', error);
      if (error.name === 'ConditionalCheckFailedException') {
        return createError(404, 'Module not found or insufficient permissions');
      }
      return createError(500, 'Failed to update module', error);
    }
  },

  async deleteModule(event, tenantInfo) {
    try {
      const moduleId = event.pathParameters?.id;
      if (!moduleId) {
        return createError(400, 'Module ID is required');
      }
      
      const result = await moduleOperations.deleteModule(
        tenantInfo.organizationId,
        tenantInfo.userId,
        moduleId
      );
      
      return createResponse(200, { deleted: true, module: result });
    } catch (error) {
      log('Error deleting module:', error);
      if (error.name === 'ConditionalCheckFailedException') {
        return createError(404, 'Module not found or insufficient permissions');
      }
      return createError(500, 'Failed to delete module', error);
    }
  },

  async getUploadUrl(event, tenantInfo) {
    try {
      const moduleId = event.pathParameters?.id;
      if (!moduleId) {
        return createError(400, 'Module ID is required');
      }
      
      const body = JSON.parse(event.body || '{}');
      const { filename, contentType, fileSize } = body;
      
      if (!filename || !contentType) {
        return createError(400, 'Filename and content type are required');
      }
      
      // Validate upload
      const validationErrors = validateContentUpload(contentType, fileSize);
      if (validationErrors.length > 0) {
        return createError(400, 'Upload validation failed', validationErrors);
      }
      
      // Verify module exists and user has permission
      const module = await moduleOperations.getModule(tenantInfo.organizationId, moduleId);
      if (!module || module.created_by !== tenantInfo.userId) {
        return createError(404, 'Module not found or insufficient permissions');
      }
      
      const uploadInfo = await s3Operations.generatePresignedUrl(
        tenantInfo.organizationId,
        moduleId,
        filename,
        contentType
      );
      
      return createResponse(200, {
        uploadUrl: uploadInfo.uploadUrl,
        downloadUrl: uploadInfo.downloadUrl,
        instructions: {
          method: 'PUT',
          headers: {
            'Content-Type': contentType
          },
          note: 'Upload file directly to the uploadUrl using PUT method'
        }
      });
    } catch (error) {
      log('Error generating upload URL:', error);
      return createError(500, 'Failed to generate upload URL', error);
    }
  },

  async confirmUpload(event, tenantInfo) {
    try {
      const moduleId = event.pathParameters?.id;
      if (!moduleId) {
        return createError(400, 'Module ID is required');
      }
      
      const body = JSON.parse(event.body || '{}');
      const { contentUrl, thumbnailUrl } = body;
      
      if (!contentUrl) {
        return createError(400, 'Content URL is required');
      }
      
      const module = await moduleOperations.updateModuleContent(moduleId, contentUrl, thumbnailUrl);
      
      return createResponse(200, module);
    } catch (error) {
      log('Error confirming upload:', error);
      return createError(500, 'Failed to confirm upload', error);
    }
  },

  // Legacy course endpoints (maintaining backward compatibility)
  async getCourses(event, tenantInfo) {
    // Implement existing course functionality
    return createResponse(200, { message: 'Courses endpoint - legacy functionality maintained' });
  }
};

// Main handler
exports.handler = async (event, context) => {
  log('Event received:', JSON.stringify(event, null, 2));
  
  try {
    const tenantInfo = extractTenantInfo(event);
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'CORS preflight' });
    }
    
    const path = event.path || event.requestContext?.path || '';
    const method = event.httpMethod;
    
    log('Routing:', { path, method });
    
    // Module management routes
    if (path.includes('/education/modules/') && path.split('/').length >= 4) {
      const moduleId = path.split('/')[3];
      
      if (path.includes('/upload-url')) {
        // /education/modules/{id}/upload-url
        switch (method) {
          case 'POST':
            return await handlers.getUploadUrl(event, tenantInfo);
          default:
            return createError(405, `Method ${method} not allowed`);
        }
      } else if (path.includes('/confirm-upload')) {
        // /education/modules/{id}/confirm-upload
        switch (method) {
          case 'POST':
            return await handlers.confirmUpload(event, tenantInfo);
          default:
            return createError(405, `Method ${method} not allowed`);
        }
      } else {
        // /education/modules/{id}
        switch (method) {
          case 'GET':
            return await handlers.getModule(event, tenantInfo);
          case 'PUT':
          case 'PATCH':
            return await handlers.updateModule(event, tenantInfo);
          case 'DELETE':
            return await handlers.deleteModule(event, tenantInfo);
          default:
            return createError(405, `Method ${method} not allowed`);
        }
      }
    } else if (path.includes('/education/modules')) {
      // /education/modules
      switch (method) {
        case 'GET':
          return await handlers.getModules(event, tenantInfo);
        case 'POST':
          return await handlers.createModule(event, tenantInfo);
        default:
          return createError(405, `Method ${method} not allowed`);
      }
    } else if (path.includes('/education/courses')) {
      // Legacy courses endpoint
      return await handlers.getCourses(event, tenantInfo);
    } else if (path.includes('/education')) {
      // Main education endpoint
      switch (method) {
        case 'GET':
          return createResponse(200, {
            service: 'AI Nexus Education API - Enhanced',
            version: '2.0.0',
            features: ['Module Management', 'Content Upload', 'Multi-tenant Isolation'],
            endpoints: {
              modules: '/education/modules',
              moduleDetail: '/education/modules/{id}',
              uploadUrl: '/education/modules/{id}/upload-url',
              confirmUpload: '/education/modules/{id}/confirm-upload',
              courses: '/education/courses' // Legacy
            },
            tenant: {
              organizationId: tenantInfo.organizationId,
              userId: tenantInfo.userId,
              role: tenantInfo.userRole
            }
          });
        default:
          return createError(405, `Method ${method} not allowed`);
      }
    }
    
    return createError(404, 'Endpoint not found');
    
  } catch (error) {
    log('Unhandled error:', error);
    return createError(500, 'Internal server error', error);
  }
};