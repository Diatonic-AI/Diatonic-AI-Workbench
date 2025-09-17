// AI Nexus User Profile API Lambda Function
// Lightweight implementation with minimal dependencies

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

// Configuration
const TABLES = {
    USER_PROFILES: process.env.USER_PROFILES_TABLE || 'aws-devops-dev-user-profiles',
    USER_ANALYTICS: process.env.USER_ANALYTICS_TABLE || 'aws-devops-dev-user-analytics'
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

// Validate email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Get user profile
const getUserProfile = async (userId) => {
    if (!userId) {
        return errorResponse(401, 'Authentication required');
    }

    try {
        const result = await dynamodb.get({
            TableName: TABLES.USER_PROFILES,
            Key: { id: userId }
        }).promise();
        
        if (!result.Item) {
            return errorResponse(404, 'User profile not found');
        }
        
        // Remove sensitive information
        const { password_hash, ...publicProfile } = result.Item;
        
        return successResponse(200, publicProfile);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return errorResponse(500, 'Failed to fetch user profile', error.message);
    }
};

// Create or update user profile
const createOrUpdateProfile = async (userId, profileData) => {
    if (!userId) {
        return errorResponse(401, 'Authentication required');
    }

    // Validate required fields
    if (!profileData.email) {
        return errorResponse(400, 'Email is required');
    }

    if (!isValidEmail(profileData.email)) {
        return errorResponse(400, 'Invalid email format');
    }

    if (profileData.display_name && profileData.display_name.length < 2) {
        return errorResponse(400, 'Display name must be at least 2 characters');
    }

    try {
        const timestamp = new Date().toISOString();
        
        // Check if profile already exists
        const existingProfile = await dynamodb.get({
            TableName: TABLES.USER_PROFILES,
            Key: { id: userId }
        }).promise();

        const isUpdate = !!existingProfile.Item;
        
        // Build the profile object
        const profile = {
            id: userId,
            email: profileData.email,
            display_name: profileData.display_name || profileData.email.split('@')[0],
            first_name: profileData.first_name || '',
            last_name: profileData.last_name || '',
            bio: profileData.bio || '',
            location: profileData.location || '',
            website: profileData.website || '',
            linkedin_profile: profileData.linkedin_profile || '',
            github_profile: profileData.github_profile || '',
            twitter_handle: profileData.twitter_handle || '',
            skills: profileData.skills || [],
            interests: profileData.interests || [],
            experience_level: profileData.experience_level || 'beginner', // beginner, intermediate, advanced, expert
            job_title: profileData.job_title || '',
            company: profileData.company || '',
            timezone: profileData.timezone || 'UTC',
            language_preference: profileData.language_preference || 'en',
            email_notifications: profileData.email_notifications !== false, // Default to true
            push_notifications: profileData.push_notifications !== false, // Default to true
            profile_visibility: profileData.profile_visibility || 'public', // public, private, connections
            updated_at: timestamp
        };

        // Set created_at for new profiles
        if (!isUpdate) {
            profile.created_at = timestamp;
            profile.is_verified = false;
            profile.is_active = true;
            profile.profile_completion = calculateProfileCompletion(profile);
        } else {
            // Preserve some existing fields
            profile.created_at = existingProfile.Item.created_at;
            profile.is_verified = existingProfile.Item.is_verified;
            profile.is_active = existingProfile.Item.is_active !== undefined ? existingProfile.Item.is_active : true;
            profile.profile_completion = calculateProfileCompletion(profile);
        }

        await dynamodb.put({
            TableName: TABLES.USER_PROFILES,
            Item: profile
        }).promise();
        
        // Remove sensitive information from response
        const { password_hash, ...publicProfile } = profile;
        
        return successResponse(isUpdate ? 200 : 201, {
            message: isUpdate ? 'Profile updated successfully' : 'Profile created successfully',
            profile: publicProfile
        });
    } catch (error) {
        console.error('Error creating/updating profile:', error);
        return errorResponse(500, 'Failed to save profile', error.message);
    }
};

// Calculate profile completion percentage
const calculateProfileCompletion = (profile) => {
    const fields = [
        'display_name', 'first_name', 'last_name', 'bio', 
        'location', 'job_title', 'company', 'experience_level'
    ];
    
    const arrayFields = ['skills', 'interests'];
    
    let completed = 0;
    let total = fields.length + arrayFields.length;
    
    // Check regular fields
    fields.forEach(field => {
        if (profile[field] && profile[field].trim() !== '') {
            completed++;
        }
    });
    
    // Check array fields
    arrayFields.forEach(field => {
        if (profile[field] && Array.isArray(profile[field]) && profile[field].length > 0) {
            completed++;
        }
    });
    
    return Math.round((completed / total) * 100);
};

// Update specific profile fields
const updateProfileFields = async (userId, updateData) => {
    if (!userId) {
        return errorResponse(401, 'Authentication required');
    }

    try {
        // First check if profile exists
        const existingProfile = await dynamodb.get({
            TableName: TABLES.USER_PROFILES,
            Key: { id: userId }
        }).promise();
        
        if (!existingProfile.Item) {
            return errorResponse(404, 'User profile not found');
        }

        const timestamp = new Date().toISOString();
        const updateExpression = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        
        // Build dynamic update expression for allowed fields
        const allowedFields = [
            'display_name', 'first_name', 'last_name', 'bio', 'location', 'website',
            'linkedin_profile', 'github_profile', 'twitter_handle', 'skills', 'interests',
            'experience_level', 'job_title', 'company', 'timezone', 'language_preference',
            'email_notifications', 'push_notifications', 'profile_visibility'
        ];
        
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                updateExpression.push(`#${key} = :${key}`);
                expressionAttributeNames[`#${key}`] = key;
                expressionAttributeValues[`:${key}`] = updateData[key];
            }
        });
        
        if (updateExpression.length === 0) {
            return errorResponse(400, 'No valid fields provided for update');
        }
        
        // Always update the timestamp and recalculate profile completion
        updateExpression.push('#updated_at = :updated_at');
        expressionAttributeNames['#updated_at'] = 'updated_at';
        expressionAttributeValues[':updated_at'] = timestamp;
        
        // Calculate new profile completion
        const updatedProfile = { ...existingProfile.Item, ...updateData };
        const newCompletion = calculateProfileCompletion(updatedProfile);
        
        updateExpression.push('#profile_completion = :profile_completion');
        expressionAttributeNames['#profile_completion'] = 'profile_completion';
        expressionAttributeValues[':profile_completion'] = newCompletion;

        const result = await dynamodb.update({
            TableName: TABLES.USER_PROFILES,
            Key: { id: userId },
            UpdateExpression: 'SET ' + updateExpression.join(', '),
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        }).promise();
        
        // Remove sensitive information from response
        const { password_hash, ...publicProfile } = result.Attributes;
        
        return successResponse(200, {
            message: 'Profile updated successfully',
            profile: publicProfile
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        return errorResponse(500, 'Failed to update profile', error.message);
    }
};

// Delete user profile (soft delete)
const deleteProfile = async (userId) => {
    if (!userId) {
        return errorResponse(401, 'Authentication required');
    }

    try {
        // Check if profile exists
        const existingProfile = await dynamodb.get({
            TableName: TABLES.USER_PROFILES,
            Key: { id: userId }
        }).promise();
        
        if (!existingProfile.Item) {
            return errorResponse(404, 'User profile not found');
        }

        const timestamp = new Date().toISOString();
        
        // Soft delete by marking as inactive
        await dynamodb.update({
            TableName: TABLES.USER_PROFILES,
            Key: { id: userId },
            UpdateExpression: 'SET is_active = :inactive, updated_at = :timestamp, deleted_at = :timestamp',
            ExpressionAttributeValues: {
                ':inactive': false,
                ':timestamp': timestamp
            }
        }).promise();
        
        return successResponse(200, {
            message: 'Profile deactivated successfully'
        });
    } catch (error) {
        console.error('Error deleting profile:', error);
        return errorResponse(500, 'Failed to delete profile', error.message);
    }
};

// Get public profiles (for admin or user search)
const getPublicProfiles = async (queryParams) => {
    try {
        const limit = Math.min(parseInt(queryParams?.limit) || 20, 50); // Cap at 50
        const lastEvaluatedKey = queryParams?.lastKey ? JSON.parse(decodeURIComponent(queryParams.lastKey)) : undefined;
        
        const params = {
            TableName: TABLES.USER_PROFILES,
            FilterExpression: 'profile_visibility = :visibility AND is_active = :active',
            ExpressionAttributeValues: {
                ':visibility': 'public',
                ':active': true
            },
            ProjectionExpression: 'id, display_name, first_name, last_name, bio, location, job_title, company, experience_level, skills, created_at, profile_completion',
            Limit: limit
        };
        
        if (lastEvaluatedKey) {
            params.ExclusiveStartKey = lastEvaluatedKey;
        }
        
        const result = await dynamodb.scan(params).promise();
        
        const response = {
            profiles: result.Items || [],
            count: result.Items?.length || 0
        };
        
        if (result.LastEvaluatedKey) {
            response.lastKey = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
        }
        
        return successResponse(200, response);
    } catch (error) {
        console.error('Error fetching public profiles:', error);
        return errorResponse(500, 'Failed to fetch public profiles', error.message);
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
                if (path === '/profile/me' || path === '/profile') {
                    return await getUserProfile(userId);
                }
                else if (path === '/profile/public') {
                    return await getPublicProfiles(queryStringParameters);
                }
                else if (path.match(/^\/profile\/[\w-]+$/)) {
                    const targetUserId = pathParameters?.userId || path.split('/').pop();
                    // For now, only allow users to get their own profile
                    // In a full implementation, you'd check privacy settings
                    if (targetUserId === userId) {
                        return await getUserProfile(userId);
                    } else {
                        return errorResponse(403, 'Access denied');
                    }
                }
                break;
                
            case 'POST':
                if (path === '/profile' || path === '/profile/me') {
                    return await createOrUpdateProfile(userId, requestBody);
                }
                break;
                
            case 'PUT':
                if (path === '/profile' || path === '/profile/me') {
                    return await updateProfileFields(userId, requestBody);
                }
                break;
                
            case 'DELETE':
                if (path === '/profile' || path === '/profile/me') {
                    return await deleteProfile(userId);
                }
                break;
        }
        
        return errorResponse(404, 'Endpoint not found');
        
    } catch (error) {
        console.error('Unhandled error:', error);
        return errorResponse(500, 'Internal server error', error.message);
    }
};
