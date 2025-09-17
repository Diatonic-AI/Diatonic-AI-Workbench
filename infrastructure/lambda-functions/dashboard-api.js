// AI Nexus Dashboard Analytics API Lambda Function
// Lightweight implementation for user analytics and system metrics

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Configuration
const TABLES = {
    USER_ANALYTICS: process.env.USER_ANALYTICS_TABLE || 'aws-devops-dev-user-analytics',
    COURSE_PROGRESS: process.env.COURSE_PROGRESS_TABLE || 'aws-devops-dev-course-progress',
    COMMUNITY_POSTS: process.env.POSTS_TABLE || 'aws-devops-dev-community-posts',
    USER_PROFILES: process.env.USER_PROFILES_TABLE || 'aws-devops-dev-user-profiles',
    COURSES: process.env.COURSES_TABLE || 'aws-devops-dev-courses'
};

// CORS headers
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
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

// Get user's dashboard analytics
const getUserAnalytics = async (userId) => {
    if (!userId) {
        return errorResponse(401, 'Authentication required');
    }

    try {
        // Get user's course progress
        const courseProgressResult = await dynamodb.query({
            TableName: TABLES.COURSE_PROGRESS,
            IndexName: 'user-id-index',
            KeyConditionExpression: 'user_id = :userId',
            ExpressionAttributeValues: { ':userId': userId }
        }).promise();

        // Get user's recent posts
        const userPostsResult = await dynamodb.query({
            TableName: TABLES.COMMUNITY_POSTS,
            IndexName: 'user-id-index',
            KeyConditionExpression: 'user_id = :userId',
            ExpressionAttributeValues: { ':userId': userId },
            ScanIndexForward: false, // Most recent first
            Limit: 5
        }).promise();

        // Calculate learning stats
        const courseProgress = courseProgressResult.Items || [];
        const completedCourses = courseProgress.filter(cp => cp.progress_percentage >= 100).length;
        const inProgressCourses = courseProgress.filter(cp => cp.progress_percentage > 0 && cp.progress_percentage < 100).length;
        const totalCourses = courseProgress.length;

        // Calculate total learning time (assuming hours_spent field exists)
        const totalLearningHours = courseProgress.reduce((sum, cp) => sum + (cp.hours_spent || 0), 0);

        // Calculate community engagement
        const userPosts = userPostsResult.Items || [];
        const totalLikes = userPosts.reduce((sum, post) => sum + (post.likes_count || 0), 0);
        const totalComments = userPosts.reduce((sum, post) => sum + (post.comments_count || 0), 0);

        const analytics = {
            learning: {
                total_courses: totalCourses,
                completed_courses: completedCourses,
                in_progress_courses: inProgressCourses,
                completion_rate: totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0,
                total_learning_hours: Math.round(totalLearningHours * 10) / 10,
                average_progress: totalCourses > 0 ? 
                    Math.round(courseProgress.reduce((sum, cp) => sum + (cp.progress_percentage || 0), 0) / totalCourses) : 0
            },
            community: {
                total_posts: userPosts.length,
                total_likes_received: totalLikes,
                total_comments_received: totalComments,
                engagement_score: Math.round((totalLikes + totalComments) / Math.max(userPosts.length, 1))
            },
            recent_activity: {
                recent_posts: userPosts.slice(0, 3).map(post => ({
                    id: post.id,
                    title: post.title,
                    likes_count: post.likes_count || 0,
                    comments_count: post.comments_count || 0,
                    created_at: post.created_at
                })),
                recent_course_progress: courseProgress
                    .filter(cp => cp.last_accessed)
                    .sort((a, b) => new Date(b.last_accessed) - new Date(a.last_accessed))
                    .slice(0, 3)
                    .map(cp => ({
                        course_id: cp.course_id,
                        progress_percentage: cp.progress_percentage || 0,
                        last_accessed: cp.last_accessed
                    }))
            }
        };

        return successResponse(200, analytics);
    } catch (error) {
        console.error('Error fetching user analytics:', error);
        return errorResponse(500, 'Failed to fetch user analytics', error.message);
    }
};

// Get system-wide dashboard metrics (for admin users)
const getSystemMetrics = async () => {
    try {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Get total users count (this would ideally be from a user table or Cognito)
        const totalUsersResult = await dynamodb.scan({
            TableName: TABLES.USER_PROFILES,
            Select: 'COUNT'
        }).promise();

        // Get total courses count
        const totalCoursesResult = await dynamodb.scan({
            TableName: TABLES.COURSES,
            Select: 'COUNT'
        }).promise();

        // Get recent posts count
        const recentPostsResult = await dynamodb.scan({
            TableName: TABLES.COMMUNITY_POSTS,
            FilterExpression: 'created_at >= :weekAgo',
            ExpressionAttributeValues: {
                ':weekAgo': oneWeekAgo.toISOString()
            },
            Select: 'COUNT'
        }).promise();

        // Get active learners (users with recent course activity)
        const activeLearners = await dynamodb.scan({
            TableName: TABLES.COURSE_PROGRESS,
            FilterExpression: 'last_accessed >= :weekAgo',
            ExpressionAttributeValues: {
                ':weekAgo': oneWeekAgo.toISOString()
            },
            Select: 'COUNT'
        }).promise();

        // Calculate course completion metrics
        const allProgressResult = await dynamodb.scan({
            TableName: TABLES.COURSE_PROGRESS,
            ProjectionExpression: 'progress_percentage'
        }).promise();

        const progressData = allProgressResult.Items || [];
        const completedProgress = progressData.filter(p => p.progress_percentage >= 100).length;
        const totalProgress = progressData.length;

        const metrics = {
            overview: {
                total_users: totalUsersResult.Count || 0,
                total_courses: totalCoursesResult.Count || 0,
                active_learners_7d: activeLearners.Count || 0,
                recent_posts_7d: recentPostsResult.Count || 0
            },
            learning: {
                total_enrollments: totalProgress,
                completed_courses: completedProgress,
                completion_rate: totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : 0,
                average_progress: totalProgress > 0 ? 
                    Math.round(progressData.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / totalProgress) : 0
            },
            engagement: {
                posts_per_week: recentPostsResult.Count || 0,
                active_user_ratio: totalUsersResult.Count > 0 ? 
                    Math.round((activeLearners.Count / totalUsersResult.Count) * 100) : 0
            }
        };

        return successResponse(200, metrics);
    } catch (error) {
        console.error('Error fetching system metrics:', error);
        return errorResponse(500, 'Failed to fetch system metrics', error.message);
    }
};

// Get popular courses analytics
const getPopularCourses = async () => {
    try {
        // Get all course progress to analyze popularity
        const allProgressResult = await dynamodb.scan({
            TableName: TABLES.COURSE_PROGRESS,
            ProjectionExpression: 'course_id, progress_percentage, last_accessed'
        }).promise();

        const progressData = allProgressResult.Items || [];
        
        // Group by course and calculate metrics
        const courseMetrics = {};
        progressData.forEach(progress => {
            const courseId = progress.course_id;
            if (!courseMetrics[courseId]) {
                courseMetrics[courseId] = {
                    course_id: courseId,
                    enrollments: 0,
                    completions: 0,
                    active_learners: 0,
                    average_progress: 0,
                    recent_activity: 0
                };
            }
            
            courseMetrics[courseId].enrollments++;
            
            if (progress.progress_percentage >= 100) {
                courseMetrics[courseId].completions++;
            }
            
            courseMetrics[courseId].average_progress += progress.progress_percentage || 0;
            
            // Check if accessed in last 7 days
            const lastAccessed = new Date(progress.last_accessed || 0);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            if (lastAccessed > weekAgo) {
                courseMetrics[courseId].active_learners++;
                courseMetrics[courseId].recent_activity++;
            }
        });

        // Calculate averages and sort by popularity
        const coursesAnalytics = Object.values(courseMetrics)
            .map(course => ({
                ...course,
                average_progress: Math.round(course.average_progress / course.enrollments),
                completion_rate: Math.round((course.completions / course.enrollments) * 100),
                popularity_score: course.enrollments + (course.recent_activity * 2) + (course.completions * 3)
            }))
            .sort((a, b) => b.popularity_score - a.popularity_score)
            .slice(0, 10); // Top 10

        return successResponse(200, {
            popular_courses: coursesAnalytics,
            total_courses_analyzed: Object.keys(courseMetrics).length
        });
    } catch (error) {
        console.error('Error fetching popular courses:', error);
        return errorResponse(500, 'Failed to fetch popular courses', error.message);
    }
};

// Record user activity for analytics
const recordActivity = async (userId, activityData) => {
    if (!userId) {
        return errorResponse(401, 'Authentication required');
    }

    if (!activityData.action || !activityData.resource_type) {
        return errorResponse(400, 'Activity action and resource type are required');
    }

    try {
        const timestamp = new Date().toISOString();
        const activityId = `${userId}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

        const activity = {
            id: activityId,
            user_id: userId,
            action: activityData.action, // 'view', 'complete', 'like', 'comment', etc.
            resource_type: activityData.resource_type, // 'course', 'post', 'lesson', etc.
            resource_id: activityData.resource_id,
            metadata: activityData.metadata || {},
            timestamp: timestamp,
            session_id: activityData.session_id
        };

        await dynamodb.put({
            TableName: TABLES.USER_ANALYTICS,
            Item: activity
        }).promise();

        return successResponse(201, {
            message: 'Activity recorded successfully',
            activity_id: activityId
        });
    } catch (error) {
        console.error('Error recording activity:', error);
        return errorResponse(500, 'Failed to record activity', error.message);
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

        const { httpMethod, path, queryStringParameters, body } = event;
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
                if (path === '/dashboard/analytics/user') {
                    return await getUserAnalytics(userId);
                } 
                else if (path === '/dashboard/analytics/system') {
                    // This would typically require admin role check
                    return await getSystemMetrics();
                }
                else if (path === '/dashboard/analytics/popular-courses') {
                    return await getPopularCourses();
                }
                break;
                
            case 'POST':
                if (path === '/dashboard/analytics/activity') {
                    return await recordActivity(userId, requestBody);
                }
                break;
        }
        
        return errorResponse(404, 'Endpoint not found');
        
    } catch (error) {
        console.error('Unhandled error:', error);
        return errorResponse(500, 'Internal server error', error.message);
    }
};
