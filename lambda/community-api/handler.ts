// AI Nexus Workbench - Community API Lambda Handler
// Comprehensive API supporting all backend functionality

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler as mainHandler } from '../api/handler';

// The comprehensive API is in ../api/handler.ts
// This handler delegates to the main handler with proper environment setup

// ================================================================================
// ENVIRONMENT MAPPING
// ================================================================================

// Map community-specific environment variables to the main API expected format
const mapEnvironmentVariables = () => {
  // Set up the main API environment variables from community-specific ones
  if (process.env.POSTS_TABLE_NAME) {
    process.env.DYNAMODB_TABLE = process.env.POSTS_TABLE_NAME;
  }
  
  if (process.env.CONTENT_BUCKET_NAME) {
    process.env.S3_BUCKET = process.env.CONTENT_BUCKET_NAME;
  }
  
  if (process.env.EVENT_BUS_NAME) {
    process.env.EVENTBRIDGE_BUS = process.env.EVENT_BUS_NAME;
  }
  
  if (process.env.USER_POOL_ID) {
    process.env.COGNITO_USER_POOL_ID = process.env.USER_POOL_ID;
  }
  
  // Ensure required environment variables are set
  process.env.API_BASE_URL = process.env.API_BASE_URL || 'https://api.example.com';
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
};

// Map environment variables on module load
mapEnvironmentVariables();

// ================================================================================
// AWS CLIENTS INITIALIZATION
// ================================================================================

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-2' });
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-2' });
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-2' });

const corsOrigins = JSON.parse(CORS_ORIGINS);

// ================================================================================
// TYPES AND INTERFACES
// ================================================================================

interface CommunityPost {
  id: string;
  PK: string; // POST#post_id
  SK: string; // METADATA
  tenant_id: string;
  author_id: string;
  author_name: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  engagement_score: number;
  status: 'draft' | 'published' | 'archived' | 'moderated';
  attachments?: Array<{
    type: 'image' | 'video' | 'document';
    url: string;
    filename: string;
    size: number;
  }>;
  metadata: {
    visibility: 'public' | 'private' | 'group';
    allow_comments: boolean;
    allow_reactions: boolean;
    pinned: boolean;
  };
}

interface CommunityGroup {
  id: string;
  PK: string; // GROUP#group_id
  SK: string; // METADATA
  tenant_id: string;
  name: string;
  description: string;
  group_type: 'public' | 'private' | 'restricted';
  category: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  post_count: number;
  avatar_url?: string;
  banner_url?: string;
  rules?: string[];
  metadata: {
    approval_required: boolean;
    invite_only: boolean;
    discoverable: boolean;
  };
}

interface UserInteraction {
  PK: string; // INTERACTION#interaction_type#content_id
  SK: string; // user_id#timestamp
  interaction_id: string;
  user_id: string;
  content_id: string;
  content_type: 'post' | 'comment' | 'group' | 'user';
  interaction_type: 'like' | 'follow' | 'comment' | 'share' | 'bookmark';
  created_at: string;
  ttl?: number; // For temporary interactions
  metadata?: Record<string, any>;
}

interface RequestContext {
  userId: string;
  tenantId: string;
  userRole: string;
  claims: Record<string, any>;
}

// ================================================================================
// UTILITY FUNCTIONS
// ================================================================================

const generateId = (): string => uuidv4();

const getCurrentTimestamp = (): string => new Date().toISOString();

const getTenantFromEvent = (event: APIGatewayProxyEvent): string => {
  // Extract tenant from JWT claims or headers
  const claims = event.requestContext.authorizer?.claims;
  return claims?.['custom:tenant_id'] || claims?.tenant_id || 'default';
};

const getUserFromEvent = (event: APIGatewayProxyEvent): RequestContext => {
  const claims = event.requestContext.authorizer?.claims;
  return {
    userId: claims?.sub || claims?.username || '',
    tenantId: claims?.['custom:tenant_id'] || claims?.tenant_id || 'default',
    userRole: claims?.['custom:role'] || claims?.role || 'user',
    claims: claims || {},
  };
};

const createSuccessResponse = (data: any, statusCode: number = 200): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigins.includes('*') ? '*' : corsOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Request-ID',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
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
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Request-ID',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  },
  body: JSON.stringify({
    success: false,
    error,
    timestamp: getCurrentTimestamp(),
  }),
});

const publishEvent = async (eventType: string, detail: any, source: string = 'ai-nexus.community') => {
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
    // Don't fail the main operation for event publishing errors
  }
};

// ================================================================================
// POSTS MANAGEMENT
// ================================================================================

const createPost = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const context = getUserFromEvent(event);
    const body = JSON.parse(event.body || '{}');

    const {
      title,
      content,
      category = 'general',
      tags = [],
      visibility = 'public',
      allowComments = true,
      allowReactions = true,
    } = body;

    if (!title || !content) {
      return createErrorResponse('Title and content are required', 400);
    }

    const postId = generateId();
    const now = getCurrentTimestamp();

    const post: CommunityPost = {
      id: postId,
      PK: `POST#${postId}`,
      SK: 'METADATA',
      tenant_id: context.tenantId,
      author_id: context.userId,
      author_name: context.claims.name || context.claims.email || 'Unknown',
      title,
      content,
      category,
      tags: Array.isArray(tags) ? tags : [],
      created_at: now,
      updated_at: now,
      like_count: 0,
      comment_count: 0,
      engagement_score: 0,
      status: 'published',
      metadata: {
        visibility,
        allow_comments: allowComments,
        allow_reactions: allowReactions,
        pinned: false,
      },
    };

    await docClient.send(new PutCommand({
      TableName: POSTS_TABLE_NAME,
      Item: post,
    }));

    // Publish event
    await publishEvent('Post Created', {
      postId,
      tenantId: context.tenantId,
      authorId: context.userId,
      category,
      tags,
    });

    return createSuccessResponse(post, 201);
  } catch (error) {
    console.error('Error creating post:', error);
    return createErrorResponse('Failed to create post', 500);
  }
};

const getPosts = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const context = getUserFromEvent(event);
    const {
      limit = '20',
      category,
      author,
      tag,
      sortBy = 'created_at',
      order = 'desc',
      cursor,
    } = event.queryStringParameters || {};

    let queryParams: any = {
      TableName: POSTS_TABLE_NAME,
      IndexName: 'TenantTimeIndex',
      KeyConditionExpression: 'tenant_id = :tenantId',
      ExpressionAttributeValues: {
        ':tenantId': context.tenantId,
      },
      Limit: parseInt(limit),
      ScanIndexForward: order === 'asc',
    };

    // Add filters based on query parameters
    if (category) {
      queryParams.IndexName = 'CategoryPostsIndex';
      queryParams.KeyConditionExpression = 'category = :category';
      queryParams.ExpressionAttributeValues = {
        ':category': category,
      };
    }

    if (author) {
      queryParams.IndexName = 'AuthorPostsIndex';
      queryParams.KeyConditionExpression = 'author_id = :authorId';
      queryParams.ExpressionAttributeValues = {
        ':authorId': author,
      };
    }

    if (cursor) {
      queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64').toString());
    }

    const result = await docClient.send(new QueryCommand(queryParams));

    let posts = result.Items as CommunityPost[];

    // Filter by tag if specified (DynamoDB doesn't support array contains in GSI)
    if (tag) {
      posts = posts.filter(post => post.tags && post.tags.includes(tag));
    }

    // Generate next cursor
    let nextCursor: string | undefined;
    if (result.LastEvaluatedKey) {
      nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    return createSuccessResponse({
      posts,
      pagination: {
        limit: parseInt(limit),
        nextCursor,
        hasMore: !!nextCursor,
      },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return createErrorResponse('Failed to fetch posts', 500);
  }
};

const getPost = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const context = getUserFromEvent(event);
    const postId = event.pathParameters?.id;

    if (!postId) {
      return createErrorResponse('Post ID is required', 400);
    }

    const result = await docClient.send(new QueryCommand({
      TableName: POSTS_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `POST#${postId}`,
        ':sk': 'METADATA',
      },
    }));

    const post = result.Items?.[0] as CommunityPost;

    if (!post) {
      return createErrorResponse('Post not found', 404);
    }

    // Check tenant access
    if (post.tenant_id !== context.tenantId) {
      return createErrorResponse('Access denied', 403);
    }

    return createSuccessResponse(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    return createErrorResponse('Failed to fetch post', 500);
  }
};

const updatePost = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const context = getUserFromEvent(event);
    const postId = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');

    if (!postId) {
      return createErrorResponse('Post ID is required', 400);
    }

    // First, get the existing post to check ownership
    const existingResult = await docClient.send(new QueryCommand({
      TableName: POSTS_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `POST#${postId}`,
        ':sk': 'METADATA',
      },
    }));

    const existingPost = existingResult.Items?.[0] as CommunityPost;

    if (!existingPost) {
      return createErrorResponse('Post not found', 404);
    }

    if (existingPost.tenant_id !== context.tenantId || existingPost.author_id !== context.userId) {
      return createErrorResponse('Access denied', 403);
    }

    const {
      title,
      content,
      category,
      tags,
      status,
      metadata,
    } = body;

    const updateExpression: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    if (title !== undefined) {
      updateExpression.push('title = :title');
      expressionAttributeValues[':title'] = title;
    }

    if (content !== undefined) {
      updateExpression.push('content = :content');
      expressionAttributeValues[':content'] = content;
    }

    if (category !== undefined) {
      updateExpression.push('category = :category');
      expressionAttributeValues[':category'] = category;
    }

    if (tags !== undefined) {
      updateExpression.push('tags = :tags');
      expressionAttributeValues[':tags'] = tags;
    }

    if (status !== undefined) {
      updateExpression.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = status;
    }

    if (metadata !== undefined) {
      updateExpression.push('metadata = :metadata');
      expressionAttributeValues[':metadata'] = { ...existingPost.metadata, ...metadata };
    }

    updateExpression.push('updated_at = :updatedAt');
    expressionAttributeValues[':updatedAt'] = getCurrentTimestamp();

    const result = await docClient.send(new UpdateCommand({
      TableName: POSTS_TABLE_NAME,
      Key: {
        PK: `POST#${postId}`,
        SK: 'METADATA',
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(Object.keys(expressionAttributeNames).length > 0 && {
        ExpressionAttributeNames: expressionAttributeNames,
      }),
      ReturnValues: 'ALL_NEW',
    }));

    // Publish event
    await publishEvent('Post Updated', {
      postId,
      tenantId: context.tenantId,
      authorId: context.userId,
      changes: body,
    });

    return createSuccessResponse(result.Attributes);
  } catch (error) {
    console.error('Error updating post:', error);
    return createErrorResponse('Failed to update post', 500);
  }
};

// ================================================================================
// INTERACTIONS MANAGEMENT
// ================================================================================

const addInteraction = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const context = getUserFromEvent(event);
    const body = JSON.parse(event.body || '{}');

    const {
      contentId,
      contentType,
      interactionType,
      metadata = {},
    } = body;

    if (!contentId || !contentType || !interactionType) {
      return createErrorResponse('Content ID, content type, and interaction type are required', 400);
    }

    const now = getCurrentTimestamp();
    const interactionId = generateId();

    const interaction: UserInteraction = {
      PK: `INTERACTION#${interactionType}#${contentId}`,
      SK: `${context.userId}#${now}`,
      interaction_id: interactionId,
      user_id: context.userId,
      content_id: contentId,
      content_type: contentType,
      interaction_type: interactionType,
      created_at: now,
      metadata,
    };

    await docClient.send(new PutCommand({
      TableName: INTERACTIONS_TABLE_NAME,
      Item: interaction,
    }));

    // Update engagement count on the content
    if (contentType === 'post' && (interactionType === 'like' || interactionType === 'comment')) {
      const countField = interactionType === 'like' ? 'like_count' : 'comment_count';
      
      await docClient.send(new UpdateCommand({
        TableName: POSTS_TABLE_NAME,
        Key: {
          PK: `POST#${contentId}`,
          SK: 'METADATA',
        },
        UpdateExpression: `SET ${countField} = ${countField} + :inc, engagement_score = engagement_score + :score`,
        ExpressionAttributeValues: {
          ':inc': 1,
          ':score': interactionType === 'like' ? 1 : 2, // Comments worth more than likes
        },
      }));
    }

    // Publish event
    await publishEvent('Interaction Added', {
      interactionId,
      userId: context.userId,
      tenantId: context.tenantId,
      contentId,
      contentType,
      interactionType,
    });

    return createSuccessResponse(interaction, 201);
  } catch (error) {
    console.error('Error adding interaction:', error);
    return createErrorResponse('Failed to add interaction', 500);
  }
};

// ================================================================================
// GROUPS MANAGEMENT
// ================================================================================

const createGroup = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const context = getUserFromEvent(event);
    const body = JSON.parse(event.body || '{}');

    const {
      name,
      description,
      groupType = 'public',
      category = 'general',
      rules = [],
      approvalRequired = false,
      inviteOnly = false,
      discoverable = true,
    } = body;

    if (!name || !description) {
      return createErrorResponse('Name and description are required', 400);
    }

    const groupId = generateId();
    const now = getCurrentTimestamp();

    const group: CommunityGroup = {
      id: groupId,
      PK: `GROUP#${groupId}`,
      SK: 'METADATA',
      tenant_id: context.tenantId,
      name,
      description,
      group_type: groupType,
      category,
      created_by: context.userId,
      created_at: now,
      updated_at: now,
      member_count: 1, // Creator is the first member
      post_count: 0,
      rules: Array.isArray(rules) ? rules : [],
      metadata: {
        approval_required: approvalRequired,
        invite_only: inviteOnly,
        discoverable,
      },
    };

    await docClient.send(new PutCommand({
      TableName: GROUPS_TABLE_NAME,
      Item: group,
    }));

    // Add creator as admin member
    await docClient.send(new PutCommand({
      TableName: GROUPS_TABLE_NAME,
      Item: {
        PK: `GROUP#${groupId}`,
        SK: `MEMBER#${context.userId}`,
        user_id: context.userId,
        role: 'admin',
        joined_at: now,
        status: 'active',
      },
    }));

    // Publish event
    await publishEvent('Group Created', {
      groupId,
      tenantId: context.tenantId,
      createdBy: context.userId,
      groupType,
      category,
    });

    return createSuccessResponse(group, 201);
  } catch (error) {
    console.error('Error creating group:', error);
    return createErrorResponse('Failed to create group', 500);
  }
};

// ================================================================================
// MAIN HANDLER
// ================================================================================

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Community API Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': corsOrigins.includes('*') ? '*' : corsOrigins[0],
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Request-ID',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: '',
    };
  }

  // Health check endpoint
  if (event.path === '/v1/health') {
    return createSuccessResponse({
      status: 'healthy',
      service: 'community-api',
      environment: NODE_ENV,
      timestamp: getCurrentTimestamp(),
    });
  }

  try {
    const { httpMethod, path } = event;
    const pathSegments = path.split('/').filter(Boolean);

    // Route handling
    if (pathSegments[1] === 'posts') {
      switch (httpMethod) {
        case 'POST':
          return await createPost(event);
        case 'GET':
          if (pathSegments[2]) {
            return await getPost(event);
          }
          return await getPosts(event);
        case 'PUT':
        case 'PATCH':
          return await updatePost(event);
        default:
          return createErrorResponse(`Method ${httpMethod} not allowed for posts`, 405);
      }
    }

    if (pathSegments[1] === 'interactions') {
      switch (httpMethod) {
        case 'POST':
          return await addInteraction(event);
        default:
          return createErrorResponse(`Method ${httpMethod} not allowed for interactions`, 405);
      }
    }

    if (pathSegments[1] === 'groups') {
      switch (httpMethod) {
        case 'POST':
          return await createGroup(event);
        default:
          return createErrorResponse(`Method ${httpMethod} not allowed for groups`, 405);
      }
    }

    return createErrorResponse('Route not found', 404);
  } catch (error) {
    console.error('Handler error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
