const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.DYNAMODB_REGION || 'us-east-2'
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Table names from environment
const COURSES_TABLE = process.env.COURSES_TABLE || 'aws-devops-dev-courses';
const LESSONS_TABLE = process.env.LESSONS_TABLE || 'aws-devops-dev-lessons';
const ENROLLMENTS_TABLE = process.env.ENROLLMENTS_TABLE || 'aws-devops-dev-enrollments';
const PROGRESS_TABLE = process.env.PROGRESS_TABLE || 'aws-devops-dev-lesson-progress';

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

// Courses operations
const handleCourses = async (event, method, pathParams) => {
  const tenant = getTenant(event);
  const userId = getUserId(event);

  try {
    switch (method) {
      case 'GET':
        if (pathParams?.id) {
          // Get single course
          const courseResult = await docClient.send(new GetCommand({
            TableName: COURSES_TABLE,
            Key: { id: pathParams.id, tenant_id: tenant }
          }));
          
          if (!courseResult.Item) {
            return errorResponse(404, 'Course not found');
          }

          return response(200, { course: courseResult.Item });
        } else {
          // List courses with pagination
          const limit = parseInt(event.queryStringParameters?.limit) || 20;
          const queryResult = await docClient.send(new QueryCommand({
            TableName: COURSES_TABLE,
            IndexName: 'tenant-created-index',
            KeyConditionExpression: 'tenant_id = :tenant',
            ExpressionAttributeValues: { ':tenant': tenant },
            ScanIndexForward: false,
            Limit: limit
          }));

          return response(200, {
            courses: queryResult.Items || [],
            hasMore: !!queryResult.LastEvaluatedKey
          });
        }

      case 'POST':
        const courseData = JSON.parse(event.body || '{}');
        const requiredFields = ['title', 'description'];
        const missing = validateRequired(courseData, requiredFields);
        
        if (missing) {
          return errorResponse(400, `Missing required fields: ${missing.join(', ')}`);
        }

        const newCourse = {
          id: uuidv4(),
          tenant_id: tenant,
          instructor_id: userId,
          title: courseData.title.trim(),
          description: courseData.description.trim(),
          category: courseData.category || 'general',
          difficulty: courseData.difficulty || 'beginner',
          duration_minutes: courseData.duration_minutes || 0,
          tags: courseData.tags || [],
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          enrollment_count: 0,
          rating: 0,
          rating_count: 0
        };

        await docClient.send(new PutCommand({
          TableName: COURSES_TABLE,
          Item: newCourse,
          ConditionExpression: 'attribute_not_exists(id)'
        }));

        return response(201, { course: newCourse });

      case 'PUT':
        if (!pathParams?.id) {
          return errorResponse(400, 'Course ID is required');
        }

        const updateData = JSON.parse(event.body || '{}');
        const updateExpr = [];
        const attrNames = {};
        const attrValues = {};

        if (updateData.title) {
          updateExpr.push('#title = :title');
          attrNames['#title'] = 'title';
          attrValues[':title'] = updateData.title.trim();
        }

        if (updateData.description) {
          updateExpr.push('#description = :description');
          attrNames['#description'] = 'description';
          attrValues[':description'] = updateData.description.trim();
        }

        if (updateData.category) {
          updateExpr.push('category = :category');
          attrValues[':category'] = updateData.category;
        }

        if (updateData.difficulty) {
          updateExpr.push('difficulty = :difficulty');
          attrValues[':difficulty'] = updateData.difficulty;
        }

        if (updateData.tags !== undefined) {
          updateExpr.push('tags = :tags');
          attrValues[':tags'] = updateData.tags;
        }

        if (updateData.status) {
          updateExpr.push('#status = :status');
          attrNames['#status'] = 'status';
          attrValues[':status'] = updateData.status;
        }

        if (updateExpr.length === 0) {
          return errorResponse(400, 'No valid fields to update');
        }

        updateExpr.push('updated_at = :updated_at');
        attrValues[':updated_at'] = new Date().toISOString();

        const updateResult = await docClient.send(new UpdateCommand({
          TableName: COURSES_TABLE,
          Key: { id: pathParams.id, tenant_id: tenant },
          UpdateExpression: 'SET ' + updateExpr.join(', '),
          ExpressionAttributeNames: Object.keys(attrNames).length > 0 ? attrNames : undefined,
          ExpressionAttributeValues: attrValues,
          ConditionExpression: 'attribute_exists(id) AND instructor_id = :instructor_id',
          ReturnValues: 'ALL_NEW'
        }));

        attrValues[':instructor_id'] = userId;

        return response(200, { course: updateResult.Attributes });

      case 'DELETE':
        if (!pathParams?.id) {
          return errorResponse(400, 'Course ID is required');
        }

        await docClient.send(new DeleteCommand({
          TableName: COURSES_TABLE,
          Key: { id: pathParams.id, tenant_id: tenant },
          ConditionExpression: 'attribute_exists(id) AND instructor_id = :instructor_id',
          ExpressionAttributeValues: { ':instructor_id': userId }
        }));

        return response(204, {});

      default:
        return errorResponse(405, 'Method not allowed');
    }
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return errorResponse(403, 'Access denied or resource not found');
    }
    return errorResponse(500, 'Internal server error', error.message);
  }
};

// Enrollments operations
const handleEnrollments = async (event, method, pathParams) => {
  const tenant = getTenant(event);
  const userId = getUserId(event);

  try {
    switch (method) {
      case 'GET':
        // Get user enrollments
        const enrollmentsResult = await docClient.send(new QueryCommand({
          TableName: ENROLLMENTS_TABLE,
          IndexName: 'user-tenant-index',
          KeyConditionExpression: 'user_id = :userId AND tenant_id = :tenant',
          ExpressionAttributeValues: { 
            ':userId': userId,
            ':tenant': tenant 
          }
        }));

        return response(200, {
          enrollments: enrollmentsResult.Items || [],
          userId
        });

      case 'POST':
        const enrollData = JSON.parse(event.body || '{}');
        if (!enrollData.course_id) {
          return errorResponse(400, 'Course ID is required');
        }

        // Check if course exists
        const courseCheck = await docClient.send(new GetCommand({
          TableName: COURSES_TABLE,
          Key: { id: enrollData.course_id, tenant_id: tenant }
        }));

        if (!courseCheck.Item) {
          return errorResponse(404, 'Course not found');
        }

        // Check if already enrolled
        const existingEnrollment = await docClient.send(new GetCommand({
          TableName: ENROLLMENTS_TABLE,
          Key: { 
            enrollment_id: `${userId}#${enrollData.course_id}`,
            tenant_id: tenant 
          }
        }));

        if (existingEnrollment.Item) {
          return errorResponse(409, 'Already enrolled in this course');
        }

        const enrollment = {
          enrollment_id: `${userId}#${enrollData.course_id}`,
          tenant_id: tenant,
          user_id: userId,
          course_id: enrollData.course_id,
          enrolled_at: new Date().toISOString(),
          status: 'active',
          progress_percentage: 0,
          last_accessed_at: new Date().toISOString()
        };

        await docClient.send(new PutCommand({
          TableName: ENROLLMENTS_TABLE,
          Item: enrollment
        }));

        // Update course enrollment count
        try {
          await docClient.send(new UpdateCommand({
            TableName: COURSES_TABLE,
            Key: { id: enrollData.course_id, tenant_id: tenant },
            UpdateExpression: 'ADD enrollment_count :one',
            ExpressionAttributeValues: { ':one': 1 }
          }));
        } catch (updateError) {
          console.warn('Failed to update course enrollment count:', updateError);
        }

        return response(201, { enrollment });

      default:
        return errorResponse(405, 'Method not allowed');
    }
  } catch (error) {
    return errorResponse(500, 'Internal server error', error.message);
  }
};

// Progress tracking operations
const handleProgress = async (event, method, pathParams) => {
  const tenant = getTenant(event);
  const userId = getUserId(event);

  try {
    switch (method) {
      case 'GET':
        if (pathParams?.courseId) {
          // Get course progress
          const progressResult = await docClient.send(new QueryCommand({
            TableName: PROGRESS_TABLE,
            IndexName: 'user-course-index',
            KeyConditionExpression: 'user_id = :userId AND course_id = :courseId',
            FilterExpression: 'tenant_id = :tenant',
            ExpressionAttributeValues: { 
              ':userId': userId,
              ':courseId': pathParams.courseId,
              ':tenant': tenant 
            }
          }));

          return response(200, {
            progress: progressResult.Items || [],
            courseId: pathParams.courseId
          });
        }
        return errorResponse(400, 'Course ID is required');

      case 'POST':
        const progressData = JSON.parse(event.body || '{}');
        const required = ['course_id', 'lesson_id'];
        const missing = validateRequired(progressData, required);
        
        if (missing) {
          return errorResponse(400, `Missing required fields: ${missing.join(', ')}`);
        }

        const progressEntry = {
          id: uuidv4(),
          tenant_id: tenant,
          user_id: userId,
          course_id: progressData.course_id,
          lesson_id: progressData.lesson_id,
          completed: progressData.completed || false,
          completion_percentage: progressData.completion_percentage || 0,
          time_spent_seconds: progressData.time_spent_seconds || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await docClient.send(new PutCommand({
          TableName: PROGRESS_TABLE,
          Item: progressEntry
        }));

        return response(201, { progress: progressEntry });

      default:
        return errorResponse(405, 'Method not allowed');
    }
  } catch (error) {
    return errorResponse(500, 'Internal server error', error.message);
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

    // Route requests based on path
    if (path.includes('/courses')) {
      return await handleCourses(event, method, pathParams);
    } else if (path.includes('/enrollments')) {
      return await handleEnrollments(event, method, pathParams);
    } else if (path.includes('/progress')) {
      return await handleProgress(event, method, pathParams);
    } else {
      return response(200, {
        message: 'AI Nexus Education API',
        version: '1.0.0',
        endpoints: {
          courses: 'GET /courses, POST /courses, PUT /courses/{id}, DELETE /courses/{id}',
          enrollments: 'GET /enrollments, POST /enrollments',
          progress: 'GET /progress/{courseId}, POST /progress'
        }
      });
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return errorResponse(500, 'Internal server error', error.message);
  }
};
