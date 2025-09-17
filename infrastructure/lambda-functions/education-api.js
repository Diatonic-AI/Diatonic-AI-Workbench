// AI Nexus Education API Lambda Function
// Lightweight implementation with minimal dependencies

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

// Configuration
const TABLES = {
    COURSES: process.env.COURSES_TABLE || 'aws-devops-dev-education-courses',
    USER_PROGRESS: process.env.USER_PROGRESS_TABLE || 'aws-devops-dev-user-progress',
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

// Get all courses
const getCourses = async () => {
    try {
        const result = await dynamodb.scan({
            TableName: TABLES.COURSES,
            ProjectionExpression: 'id, title, description, difficulty_level, estimated_duration, tags, created_at'
        }).promise();
        
        return successResponse(200, {
            courses: result.Items || [],
            count: result.Items?.length || 0
        });
    } catch (error) {
        console.error('Error fetching courses:', error);
        return errorResponse(500, 'Failed to fetch courses', error.message);
    }
};

// Get course by ID
const getCourseById = async (courseId) => {
    if (!courseId) {
        return errorResponse(400, 'Course ID is required');
    }

    try {
        const result = await dynamodb.get({
            TableName: TABLES.COURSES,
            Key: { id: courseId }
        }).promise();
        
        if (!result.Item) {
            return errorResponse(404, 'Course not found');
        }
        
        return successResponse(200, result.Item);
    } catch (error) {
        console.error('Error fetching course:', error);
        return errorResponse(500, 'Failed to fetch course', error.message);
    }
};

// Get user progress
const getUserProgress = async (userId, courseId = null) => {
    if (!userId) {
        return errorResponse(400, 'User ID is required');
    }

    try {
        const params = {
            TableName: TABLES.USER_PROGRESS,
            IndexName: 'user-id-index',
            KeyConditionExpression: 'user_id = :userId',
            ExpressionAttributeValues: { ':userId': userId }
        };

        if (courseId) {
            params.FilterExpression = 'course_id = :courseId';
            params.ExpressionAttributeValues[':courseId'] = courseId;
        }

        const result = await dynamodb.query(params).promise();
        
        return successResponse(200, {
            progress: result.Items || [],
            count: result.Items?.length || 0
        });
    } catch (error) {
        console.error('Error fetching user progress:', error);
        return errorResponse(500, 'Failed to fetch progress', error.message);
    }
};

// Update user progress
const updateUserProgress = async (userId, courseId, progressData) => {
    if (!userId || !courseId) {
        return errorResponse(400, 'User ID and Course ID are required');
    }

    try {
        const progressId = `${userId}-${courseId}`;
        const timestamp = new Date().toISOString();
        
        const item = {
            id: progressId,
            user_id: userId,
            course_id: courseId,
            completed_lessons: progressData.completed_lessons || [],
            progress_percentage: progressData.progress_percentage || 0,
            last_accessed: timestamp,
            updated_at: timestamp,
            ...(progressData.completion_date && { completion_date: progressData.completion_date }),
            ...(progressData.notes && { notes: progressData.notes })
        };

        await dynamodb.put({
            TableName: TABLES.USER_PROGRESS,
            Item: item
        }).promise();
        
        return successResponse(200, { 
            message: 'Progress updated successfully',
            progress: item
        });
    } catch (error) {
        console.error('Error updating progress:', error);
        return errorResponse(500, 'Failed to update progress', error.message);
    }
};

// Create new course (admin only)
const createCourse = async (courseData) => {
    try {
        const courseId = uuidv4();
        const timestamp = new Date().toISOString();
        
        const course = {
            id: courseId,
            title: courseData.title,
            description: courseData.description,
            difficulty_level: courseData.difficulty_level || 'beginner',
            estimated_duration: courseData.estimated_duration,
            tags: courseData.tags || [],
            lessons: courseData.lessons || [],
            prerequisites: courseData.prerequisites || [],
            created_at: timestamp,
            updated_at: timestamp,
            is_published: courseData.is_published || false
        };

        await dynamodb.put({
            TableName: TABLES.COURSES,
            Item: course
        }).promise();
        
        return successResponse(201, {
            message: 'Course created successfully',
            course
        });
    } catch (error) {
        console.error('Error creating course:', error);
        return errorResponse(500, 'Failed to create course', error.message);
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
                if (path === '/education/courses') {
                    return await getCourses();
                } 
                else if (path.match(/^\/education\/courses\/[\w-]+$/)) {
                    const courseId = pathParameters?.courseId || path.split('/').pop();
                    return await getCourseById(courseId);
                } 
                else if (path === '/education/progress') {
                    const courseId = queryStringParameters?.courseId;
                    return await getUserProgress(userId, courseId);
                }
                break;
                
            case 'POST':
                if (path === '/education/courses') {
                    return await createCourse(requestBody);
                } 
                else if (path === '/education/progress') {
                    const { course_id, ...progressData } = requestBody;
                    return await updateUserProgress(userId, course_id, progressData);
                }
                break;
                
            case 'PUT':
                if (path === '/education/progress') {
                    const { course_id, ...progressData } = requestBody;
                    return await updateUserProgress(userId, course_id, progressData);
                }
                break;
        }
        
        return errorResponse(404, 'Endpoint not found');
        
    } catch (error) {
        console.error('Unhandled error:', error);
        return errorResponse(500, 'Internal server error', error.message);
    }
};
