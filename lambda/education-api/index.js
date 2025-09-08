/**
 * AI Nexus Workbench - Education API Lambda Function
 * Handles all Education vertical operations (Courses, Lessons, Enrollments, Progress)
 * Implements multi-tenant isolation and comprehensive CRUD operations
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS SDK
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-2'
});

// Environment configuration
const config = {
  tables: {
    courses: process.env.COURSES_TABLE,
    lessons: process.env.LESSONS_TABLE,
    enrollments: process.env.ENROLLMENTS_TABLE,
    progress: process.env.PROGRESS_TABLE
  },
  tenant: {
    defaultOrganizationId: process.env.DEFAULT_ORGANIZATION_ID || 'default-org',
    enableIsolation: process.env.ENABLE_TENANT_ISOLATION === 'true'
  },
  debug: process.env.ENABLE_DEBUG_MODE === 'true',
  corsOrigin: process.env.CORS_ORIGIN || '*'
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
const validateCourse = (course) => {
  const errors = [];
  
  if (!course.title || typeof course.title !== 'string' || course.title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string');
  }
  
  if (!course.description || typeof course.description !== 'string') {
    errors.push('Description is required and must be a string');
  }
  
  if (course.difficulty && !['beginner', 'intermediate', 'advanced'].includes(course.difficulty)) {
    errors.push('Difficulty must be one of: beginner, intermediate, advanced');
  }
  
  return errors;
};

// DynamoDB operations with tenant isolation
const dbOperations = {
  async getCourses(organizationId, options = {}) {
    const params = {
      TableName: config.tables.courses,
      IndexName: 'organization-updated-index',
      KeyConditionExpression: 'organization_id = :orgId',
      ExpressionAttributeValues: {
        ':orgId': organizationId
      },
      ScanIndexForward: false, // Most recent first
      Limit: options.limit || 50
    };
    
    if (options.exclusiveStartKey) {
      params.ExclusiveStartKey = options.exclusiveStartKey;
    }
    
    const result = await dynamodb.query(params).promise();
    return result;
  },

  async getCourse(organizationId, courseId) {
    const params = {
      TableName: config.tables.courses,
      Key: { course_id: courseId },
      ConditionExpression: 'organization_id = :orgId',
      ExpressionAttributeValues: {
        ':orgId': organizationId
      }
    };
    
    const result = await dynamodb.get(params).promise();
    return result.Item;
  },

  async createCourse(organizationId, userId, courseData) {
    const courseId = generateId(organizationId, 'course');
    const now = new Date().toISOString();
    
    const course = {
      course_id: courseId,
      organization_id: organizationId,
      instructor_user_id: userId,
      title: courseData.title,
      description: courseData.description,
      difficulty: courseData.difficulty || 'beginner',
      tags: courseData.tags || [],
      status: 'draft',
      created_at: now,
      updated_at: now,
      lesson_count: 0,
      enrolled_count: 0,
      metadata: {
        version: '1.0.0',
        created_by: userId,
        last_modified_by: userId
      }
    };
    
    const params = {
      TableName: config.tables.courses,
      Item: course,
      ConditionExpression: 'attribute_not_exists(course_id)'
    };
    
    await dynamodb.put(params).promise();
    return course;
  },

  async updateCourse(organizationId, userId, courseId, updates) {
    const now = new Date().toISOString();
    
    // Build update expression
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {
      ':orgId': organizationId,
      ':userId': userId,
      ':now': now
    };
    
    if (updates.title) {
      updateExpressions.push('#title = :title');
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeValues[':title'] = updates.title;
    }
    
    if (updates.description) {
      updateExpressions.push('description = :description');
      expressionAttributeValues[':description'] = updates.description;
    }
    
    if (updates.difficulty) {
      updateExpressions.push('difficulty = :difficulty');
      expressionAttributeValues[':difficulty'] = updates.difficulty;
    }
    
    if (updates.tags) {
      updateExpressions.push('tags = :tags');
      expressionAttributeValues[':tags'] = updates.tags;
    }
    
    if (updates.status) {
      updateExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = updates.status;
    }
    
    // Always update timestamp and metadata
    updateExpressions.push('updated_at = :now');
    updateExpressions.push('metadata.last_modified_by = :userId');
    
    const params = {
      TableName: config.tables.courses,
      Key: { course_id: courseId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ConditionExpression: 'organization_id = :orgId AND instructor_user_id = :userId',
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };
    
    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  },

  async deleteCourse(organizationId, userId, courseId) {
    const params = {
      TableName: config.tables.courses,
      Key: { course_id: courseId },
      ConditionExpression: 'organization_id = :orgId AND instructor_user_id = :userId',
      ExpressionAttributeValues: {
        ':orgId': organizationId,
        ':userId': userId
      }
    };
    
    await dynamodb.delete(params).promise();
    return { deleted: true, course_id: courseId };
  }
};

// Route handlers
const handlers = {
  async getCourses(event, tenantInfo) {
    try {
      const { limit, nextToken } = event.queryStringParameters || {};
      
      const options = {};
      if (limit) options.limit = Math.min(parseInt(limit), 100);
      if (nextToken) {
        try {
          options.exclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
        } catch (e) {
          return createError(400, 'Invalid nextToken parameter');
        }
      }
      
      const result = await dbOperations.getCourses(tenantInfo.organizationId, options);
      
      const response = {
        courses: result.Items || [],
        count: result.Items?.length || 0
      };
      
      if (result.LastEvaluatedKey) {
        response.nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
      }
      
      return createResponse(200, response);
    } catch (error) {
      log('Error getting courses:', error);
      return createError(500, 'Failed to retrieve courses', error);
    }
  },

  async getCourse(event, tenantInfo) {
    try {
      const courseId = event.pathParameters?.id;
      if (!courseId) {
        return createError(400, 'Course ID is required');
      }
      
      const course = await dbOperations.getCourse(tenantInfo.organizationId, courseId);
      if (!course) {
        return createError(404, 'Course not found');
      }
      
      return createResponse(200, { course });
    } catch (error) {
      log('Error getting course:', error);
      if (error.name === 'ConditionalCheckFailedException') {
        return createError(404, 'Course not found');
      }
      return createError(500, 'Failed to retrieve course', error);
    }
  },

  async createCourse(event, tenantInfo) {
    try {
      let courseData;
      try {
        courseData = JSON.parse(event.body || '{}');
      } catch (e) {
        return createError(400, 'Invalid JSON in request body');
      }
      
      // Validate course data
      const validationErrors = validateCourse(courseData);
      if (validationErrors.length > 0) {
        return createError(400, 'Validation failed', { errors: validationErrors });
      }
      
      // Check permissions - only instructors and above can create courses
      if (!['instructor', 'admin', 'premium_user'].includes(tenantInfo.userRole)) {
        return createError(403, 'Insufficient permissions to create courses');
      }
      
      const course = await dbOperations.createCourse(
        tenantInfo.organizationId,
        tenantInfo.userId,
        courseData
      );
      
      return createResponse(201, { course });
    } catch (error) {
      log('Error creating course:', error);
      if (error.name === 'ConditionalCheckFailedException') {
        return createError(409, 'Course already exists');
      }
      return createError(500, 'Failed to create course', error);
    }
  },

  async updateCourse(event, tenantInfo) {
    try {
      const courseId = event.pathParameters?.id;
      if (!courseId) {
        return createError(400, 'Course ID is required');
      }
      
      let updates;
      try {
        updates = JSON.parse(event.body || '{}');
      } catch (e) {
        return createError(400, 'Invalid JSON in request body');
      }
      
      // Validate updates
      if (updates.title !== undefined) {
        const validationErrors = validateCourse({ title: updates.title, description: 'placeholder' });
        if (validationErrors.some(e => e.includes('title'))) {
          return createError(400, 'Invalid title provided');
        }
      }
      
      const course = await dbOperations.updateCourse(
        tenantInfo.organizationId,
        tenantInfo.userId,
        courseId,
        updates
      );
      
      return createResponse(200, { course });
    } catch (error) {
      log('Error updating course:', error);
      if (error.name === 'ConditionalCheckFailedException') {
        return createError(404, 'Course not found or insufficient permissions');
      }
      return createError(500, 'Failed to update course', error);
    }
  },

  async deleteCourse(event, tenantInfo) {
    try {
      const courseId = event.pathParameters?.id;
      if (!courseId) {
        return createError(400, 'Course ID is required');
      }
      
      const result = await dbOperations.deleteCourse(
        tenantInfo.organizationId,
        tenantInfo.userId,
        courseId
      );
      
      return createResponse(200, result);
    } catch (error) {
      log('Error deleting course:', error);
      if (error.name === 'ConditionalCheckFailedException') {
        return createError(404, 'Course not found or insufficient permissions');
      }
      return createError(500, 'Failed to delete course', error);
    }
  }
};

// Main handler
exports.handler = async (event, context) => {
  log('Event received:', JSON.stringify(event, null, 2));
  
  try {
    // Extract tenant information
    const tenantInfo = extractTenantInfo(event);
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'CORS preflight' });
    }
    
    // Route to appropriate handler based on path and method
    const path = event.path || event.requestContext?.path || '';
    const method = event.httpMethod;
    
    log('Routing:', { path, method });
    
    // Route matching
    if (path.includes('/education/courses/') && path.split('/').length >= 4) {
      // Specific course operations: /education/courses/{id}
      switch (method) {
        case 'GET':
          return await handlers.getCourse(event, tenantInfo);
        case 'PUT':
        case 'PATCH':
          return await handlers.updateCourse(event, tenantInfo);
        case 'DELETE':
          return await handlers.deleteCourse(event, tenantInfo);
        default:
          return createError(405, `Method ${method} not allowed for course detail`);
      }
    } else if (path.includes('/education/courses')) {
      // Courses collection operations: /education/courses
      switch (method) {
        case 'GET':
          return await handlers.getCourses(event, tenantInfo);
        case 'POST':
          return await handlers.createCourse(event, tenantInfo);
        default:
          return createError(405, `Method ${method} not allowed for courses collection`);
      }
    } else if (path.includes('/education')) {
      // Main education endpoint
      switch (method) {
        case 'GET':
          return createResponse(200, {
            service: 'AI Nexus Education API',
            version: '1.0.0',
            endpoints: {
              courses: '/education/courses',
              courseDetail: '/education/courses/{id}'
            },
            tenant: {
              organizationId: tenantInfo.organizationId,
              userId: tenantInfo.userId,
              role: tenantInfo.userRole
            }
          });
        default:
          return createError(405, `Method ${method} not allowed for education root`);
      }
    }
    
    return createError(404, 'Endpoint not found');
    
  } catch (error) {
    log('Unhandled error:', error);
    return createError(500, 'Internal server error', error);
  }
};
