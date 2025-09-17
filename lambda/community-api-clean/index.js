const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Initialize DynamoDB client with configuration from environment
const dynamoClient = new DynamoDBClient({
  region: process.env.DYNAMODB_REGION || 'us-east-2'
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Table names from environment variables
const POSTS_TABLE = process.env.POSTS_TABLE || 'aws-devops-dev-posts';
const COMMENTS_TABLE = process.env.COMMENTS_TABLE || 'aws-devops-dev-comments';

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
  // Extract from Cognito JWT claims if available
  if (event.requestContext?.authorizer?.claims?.['custom:organization_id']) {
    return event.requestContext.authorizer.claims['custom:organization_id'];
  }
  // Fallback to headers or default
  return event.headers?.['X-Tenant-ID'] || process.env.DEFAULT_ORGANIZATION_ID || 'default';
};

// Get user ID from JWT token
const getUserId = (event) => {
  return event.requestContext?.authorizer?.claims?.sub || 'anonymous';
};

// Posts operations
const handlePosts = async (event, method, pathParams) => {
  const tenant = getTenant(event);
  const userId = getUserId(event);

  try {
    switch (method) {
      case 'GET':
        if (pathParams?.id) {
          // Get single post
          const getResult = await docClient.send(new GetCommand({
            TableName: POSTS_TABLE,
            Key: { id: pathParams.id, tenant_id: tenant }
          }));
          
          if (!getResult.Item) {
            return errorResponse(404, 'Post not found');
          }
          
          return response(200, { post: getResult.Item });
        } else {
          // List posts with pagination
          const limit = parseInt(event.queryStringParameters?.limit) || 20;
          const lastEvaluatedKey = event.queryStringParameters?.cursor ? 
            JSON.parse(Buffer.from(event.queryStringParameters.cursor, 'base64').toString()) : 
            undefined;

          const queryResult = await docClient.send(new QueryCommand({
            TableName: POSTS_TABLE,
            IndexName: 'tenant-created-index',
            KeyConditionExpression: 'tenant_id = :tenant',
            ExpressionAttributeValues: { ':tenant': tenant },
            ScanIndexForward: false, // Most recent first
            Limit: limit,
            ExclusiveStartKey: lastEvaluatedKey
          }));

          const nextCursor = queryResult.LastEvaluatedKey ? 
            Buffer.from(JSON.stringify(queryResult.LastEvaluatedKey)).toString('base64') : 
            null;

          return response(200, {
            posts: queryResult.Items || [],
            nextCursor,
            hasMore: !!queryResult.LastEvaluatedKey
          });
        }

      case 'POST':
        const postData = JSON.parse(event.body || '{}');
        const requiredFields = ['title', 'content'];
        const missing = validateRequired(postData, requiredFields);
        
        if (missing) {
          return errorResponse(400, `Missing required fields: ${missing.join(', ')}`);
        }

        const newPost = {
          id: uuidv4(),
          tenant_id: tenant,
          author_id: userId,
          title: postData.title.trim(),
          content: postData.content.trim(),
          tags: postData.tags || [],
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          likes_count: 0,
          comments_count: 0
        };

        await docClient.send(new PutCommand({
          TableName: POSTS_TABLE,
          Item: newPost,
          ConditionExpression: 'attribute_not_exists(id)'
        }));

        return response(201, { post: newPost });

      case 'PUT':
        if (!pathParams?.id) {
          return errorResponse(400, 'Post ID is required');
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

        if (updateData.content) {
          updateExpr.push('#content = :content');
          attrNames['#content'] = 'content';
          attrValues[':content'] = updateData.content.trim();
        }

        if (updateData.tags !== undefined) {
          updateExpr.push('tags = :tags');
          attrValues[':tags'] = updateData.tags;
        }

        if (updateExpr.length === 0) {
          return errorResponse(400, 'No valid fields to update');
        }

        updateExpr.push('updated_at = :updated_at');
        attrValues[':updated_at'] = new Date().toISOString();

        const updateResult = await docClient.send(new UpdateCommand({
          TableName: POSTS_TABLE,
          Key: { id: pathParams.id, tenant_id: tenant },
          UpdateExpression: 'SET ' + updateExpr.join(', '),
          ExpressionAttributeNames: Object.keys(attrNames).length > 0 ? attrNames : undefined,
          ExpressionAttributeValues: attrValues,
          ConditionExpression: 'attribute_exists(id) AND author_id = :author_id',
          ReturnValues: 'ALL_NEW'
        }));

        attrValues[':author_id'] = userId;

        return response(200, { post: updateResult.Attributes });

      case 'DELETE':
        if (!pathParams?.id) {
          return errorResponse(400, 'Post ID is required');
        }

        await docClient.send(new DeleteCommand({
          TableName: POSTS_TABLE,
          Key: { id: pathParams.id, tenant_id: tenant },
          ConditionExpression: 'attribute_exists(id) AND author_id = :author_id',
          ExpressionAttributeValues: { ':author_id': userId }
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

// Comments operations
const handleComments = async (event, method, pathParams) => {
  const tenant = getTenant(event);
  const userId = getUserId(event);

  try {
    switch (method) {
      case 'GET':
        if (!pathParams?.postId) {
          return errorResponse(400, 'Post ID is required');
        }

        const limit = parseInt(event.queryStringParameters?.limit) || 20;
        const queryResult = await docClient.send(new QueryCommand({
          TableName: COMMENTS_TABLE,
          IndexName: 'post-created-index',
          KeyConditionExpression: 'post_id = :post_id AND tenant_id = :tenant',
          ExpressionAttributeValues: { 
            ':post_id': pathParams.postId,
            ':tenant': tenant 
          },
          ScanIndexForward: true, // Oldest first
          Limit: limit
        }));

        return response(200, {
          comments: queryResult.Items || [],
          postId: pathParams.postId
        });

      case 'POST':
        if (!pathParams?.postId) {
          return errorResponse(400, 'Post ID is required');
        }

        const commentData = JSON.parse(event.body || '{}');
        if (!commentData.content?.trim()) {
          return errorResponse(400, 'Comment content is required');
        }

        const newComment = {
          id: uuidv4(),
          post_id: pathParams.postId,
          tenant_id: tenant,
          author_id: userId,
          content: commentData.content.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await docClient.send(new PutCommand({
          TableName: COMMENTS_TABLE,
          Item: newComment
        }));

        // Update post comment count (you might want to do this atomically)
        try {
          await docClient.send(new UpdateCommand({
            TableName: POSTS_TABLE,
            Key: { id: pathParams.postId, tenant_id: tenant },
            UpdateExpression: 'ADD comments_count :one',
            ExpressionAttributeValues: { ':one': 1 },
            ConditionExpression: 'attribute_exists(id)'
          }));
        } catch (updateError) {
          console.warn('Failed to update post comment count:', updateError);
        }

        return response(201, { comment: newComment });

      case 'DELETE':
        if (!pathParams?.commentId) {
          return errorResponse(400, 'Comment ID is required');
        }

        await docClient.send(new DeleteCommand({
          TableName: COMMENTS_TABLE,
          Key: { id: pathParams.commentId, tenant_id: tenant },
          ConditionExpression: 'attribute_exists(id) AND author_id = :author_id',
          ExpressionAttributeValues: { ':author_id': userId }
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
    if (path.includes('/posts') && !path.includes('/comments')) {
      return await handlePosts(event, method, pathParams);
    } else if (path.includes('/comments') || (pathParams.postId && !pathParams.id)) {
      return await handleComments(event, method, pathParams);
    } else {
      return response(200, {
        message: 'AI Nexus Community API',
        version: '1.0.0',
        endpoints: {
          posts: 'GET /posts, POST /posts, PUT /posts/{id}, DELETE /posts/{id}',
          comments: 'GET /posts/{postId}/comments, POST /posts/{postId}/comments, DELETE /comments/{commentId}'
        }
      });
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return errorResponse(500, 'Internal server error', error.message);
  }
};
