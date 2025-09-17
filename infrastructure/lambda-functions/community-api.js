// AI Nexus Community API Lambda Function
// Lightweight implementation with minimal dependencies

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

// Configuration
const TABLES = {
    POSTS: process.env.POSTS_TABLE || 'aws-devops-dev-community-posts',
    COMMENTS: process.env.COMMENTS_TABLE || 'aws-devops-dev-community-comments',
    USER_PROFILES: process.env.USER_PROFILES_TABLE || 'aws-devops-dev-user-profiles'
};

// CORS headers
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// Error response helper
const errorResponse = (statusCode, message, error = null) => ({
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
        error: message,
        ...(error && process.env.NODE_ENV !== 'production' && { details: error })
    })
});

// Success response helper
const successResponse = (statusCode, data) => ({
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(data)
});

// Get all posts with pagination
const getPosts = async (queryParams) => {
    try {
        const limit = parseInt(queryParams?.limit) || 20;
        const lastEvaluatedKey = queryParams?.lastKey ? JSON.parse(decodeURIComponent(queryParams.lastKey)) : undefined;
        
        const params = {
            TableName: TABLES.POSTS,
            Limit: Math.min(limit, 100), // Cap at 100
            ScanIndexForward: false // Most recent first
        };
        
        if (lastEvaluatedKey) {
            params.ExclusiveStartKey = lastEvaluatedKey;
        }
        
        const result = await dynamodb.scan(params).promise();
        
        const response = {
            posts: result.Items || [],
            count: result.Items?.length || 0
        };
        
        if (result.LastEvaluatedKey) {
            response.lastKey = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
        }
        
        return successResponse(200, response);
    } catch (error) {
        console.error('Error fetching posts:', error);
        return errorResponse(500, 'Failed to fetch posts', error.message);
    }
};

// Get post by ID with comments
const getPostById = async (postId) => {
    if (!postId) {
        return errorResponse(400, 'Post ID is required');
    }

    try {
        // Get the post
        const postResult = await dynamodb.get({
            TableName: TABLES.POSTS,
            Key: { id: postId }
        }).promise();
        
        if (!postResult.Item) {
            return errorResponse(404, 'Post not found');
        }
        
        // Get comments for this post
        const commentsResult = await dynamodb.query({
            TableName: TABLES.COMMENTS,
            IndexName: 'post-id-index',
            KeyConditionExpression: 'post_id = :postId',
            ExpressionAttributeValues: { ':postId': postId },
            ScanIndexForward: true // Oldest first
        }).promise();
        
        const post = {
            ...postResult.Item,
            comments: commentsResult.Items || []
        };
        
        return successResponse(200, post);
    } catch (error) {
        console.error('Error fetching post:', error);
        return errorResponse(500, 'Failed to fetch post', error.message);
    }
};

// Create new post
const createPost = async (userId, postData) => {
    if (!userId) {
        return errorResponse(401, 'Authentication required');
    }
    
    if (!postData.title || !postData.content) {
        return errorResponse(400, 'Title and content are required');
    }

    try {
        const postId = uuidv4();
        const timestamp = new Date().toISOString();
        
        const post = {
            id: postId,
            user_id: userId,
            title: postData.title,
            content: postData.content,
            tags: postData.tags || [],
            category: postData.category || 'general',
            likes_count: 0,
            comments_count: 0,
            is_pinned: false,
            is_locked: false,
            created_at: timestamp,
            updated_at: timestamp
        };

        await dynamodb.put({
            TableName: TABLES.POSTS,
            Item: post
        }).promise();
        
        return successResponse(201, {
            message: 'Post created successfully',
            post
        });
    } catch (error) {
        console.error('Error creating post:', error);
        return errorResponse(500, 'Failed to create post', error.message);
    }
};

// Update post
const updatePost = async (userId, postId, updateData) => {
    if (!userId) {
        return errorResponse(401, 'Authentication required');
    }
    
    if (!postId) {
        return errorResponse(400, 'Post ID is required');
    }

    try {
        // First check if post exists and user owns it
        const existingPost = await dynamodb.get({
            TableName: TABLES.POSTS,
            Key: { id: postId }
        }).promise();
        
        if (!existingPost.Item) {
            return errorResponse(404, 'Post not found');
        }
        
        if (existingPost.Item.user_id !== userId) {
            return errorResponse(403, 'You can only edit your own posts');
        }

        const timestamp = new Date().toISOString();
        const updateExpression = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        
        // Build dynamic update expression
        if (updateData.title) {
            updateExpression.push('#title = :title');
            expressionAttributeNames['#title'] = 'title';
            expressionAttributeValues[':title'] = updateData.title;
        }
        
        if (updateData.content) {
            updateExpression.push('#content = :content');
            expressionAttributeNames['#content'] = 'content';
            expressionAttributeValues[':content'] = updateData.content;
        }
        
        if (updateData.tags !== undefined) {
            updateExpression.push('#tags = :tags');
            expressionAttributeNames['#tags'] = 'tags';
            expressionAttributeValues[':tags'] = updateData.tags;
        }
        
        if (updateData.category) {
            updateExpression.push('#category = :category');
            expressionAttributeNames['#category'] = 'category';
            expressionAttributeValues[':category'] = updateData.category;
        }
        
        // Always update the timestamp
        updateExpression.push('#updated_at = :updated_at');
        expressionAttributeNames['#updated_at'] = 'updated_at';
        expressionAttributeValues[':updated_at'] = timestamp;

        const result = await dynamodb.update({
            TableName: TABLES.POSTS,
            Key: { id: postId },
            UpdateExpression: 'SET ' + updateExpression.join(', '),
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        }).promise();
        
        return successResponse(200, {
            message: 'Post updated successfully',
            post: result.Attributes
        });
    } catch (error) {
        console.error('Error updating post:', error);
        return errorResponse(500, 'Failed to update post', error.message);
    }
};

// Delete post
const deletePost = async (userId, postId) => {
    if (!userId) {
        return errorResponse(401, 'Authentication required');
    }
    
    if (!postId) {
        return errorResponse(400, 'Post ID is required');
    }

    try {
        // Check if post exists and user owns it
        const existingPost = await dynamodb.get({
            TableName: TABLES.POSTS,
            Key: { id: postId }
        }).promise();
        
        if (!existingPost.Item) {
            return errorResponse(404, 'Post not found');
        }
        
        if (existingPost.Item.user_id !== userId) {
            return errorResponse(403, 'You can only delete your own posts');
        }

        await dynamodb.delete({
            TableName: TABLES.POSTS,
            Key: { id: postId }
        }).promise();
        
        return successResponse(200, {
            message: 'Post deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting post:', error);
        return errorResponse(500, 'Failed to delete post', error.message);
    }
};

// Add comment to post
const addComment = async (userId, postId, commentData) => {
    if (!userId) {
        return errorResponse(401, 'Authentication required');
    }
    
    if (!postId || !commentData.content) {
        return errorResponse(400, 'Post ID and comment content are required');
    }

    try {
        // Verify post exists
        const postResult = await dynamodb.get({
            TableName: TABLES.POSTS,
            Key: { id: postId }
        }).promise();
        
        if (!postResult.Item) {
            return errorResponse(404, 'Post not found');
        }
        
        const commentId = uuidv4();
        const timestamp = new Date().toISOString();
        
        const comment = {
            id: commentId,
            post_id: postId,
            user_id: userId,
            content: commentData.content,
            likes_count: 0,
            created_at: timestamp,
            updated_at: timestamp
        };

        // Add the comment
        await dynamodb.put({
            TableName: TABLES.COMMENTS,
            Item: comment
        }).promise();
        
        // Update post comment count
        await dynamodb.update({
            TableName: TABLES.POSTS,
            Key: { id: postId },
            UpdateExpression: 'SET comments_count = comments_count + :increment',
            ExpressionAttributeValues: { ':increment': 1 }
        }).promise();
        
        return successResponse(201, {
            message: 'Comment added successfully',
            comment
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        return errorResponse(500, 'Failed to add comment', error.message);
    }
};

// Main Lambda handler
exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        // Handle CORS preflight
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: ''
            };
        }

        const { httpMethod, path, pathParameters, queryStringParameters, body } = event;
        const userId = event.requestContext?.authorizer?.claims?.sub;
        
        // Parse request body
        let requestBody = {};
        if (body) {
            try {
                requestBody = JSON.parse(body);
            } catch (error) {
                return errorResponse(400, 'Invalid JSON in request body');
            }
        }

        // Route handling
        switch (httpMethod) {
            case 'GET':
                if (path === '/community/posts') {
                    return await getPosts(queryStringParameters);
                } 
                else if (path.match(/^\/community\/posts\/[\w-]+$/)) {
                    const postId = pathParameters?.postId || path.split('/').pop();
                    return await getPostById(postId);
                }
                break;
                
            case 'POST':
                if (path === '/community/posts') {
                    return await createPost(userId, requestBody);
                } 
                else if (path.match(/^\/community\/posts\/[\w-]+\/comments$/)) {
                    const postId = pathParameters?.postId || path.split('/')[3];
                    return await addComment(userId, postId, requestBody);
                }
                break;
                
            case 'PUT':
                if (path.match(/^\/community\/posts\/[\w-]+$/)) {
                    const postId = pathParameters?.postId || path.split('/').pop();
                    return await updatePost(userId, postId, requestBody);
                }
                break;
                
            case 'DELETE':
                if (path.match(/^\/community\/posts\/[\w-]+$/)) {
                    const postId = pathParameters?.postId || path.split('/').pop();
                    return await deletePost(userId, postId);
                }
                break;
        }
        
        return errorResponse(404, 'Endpoint not found');
        
    } catch (error) {
        console.error('Unhandled error:', error);
        return errorResponse(500, 'Internal server error', error.message);
    }
};
