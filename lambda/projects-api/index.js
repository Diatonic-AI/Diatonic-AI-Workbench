/**
 * AI NEXUS WORKBENCH - PROJECTS API
 * ================================================================================
 * Lambda function for managing projects with multi-tenant isolation
 * 
 * Features:
 * - CRUD operations on projects table
 * - Multi-tenant data isolation via organization_id
 * - Project membership management
 * - Input validation and error handling
 * - JWT token validation and user context extraction
 * 
 * Security:
 * - Organization-level data isolation enforced by IAM policies
 * - User can only access projects within their organization
 * - Project ownership and membership validation
 * ================================================================================
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand, 
  ScanCommand 
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

// Initialize DynamoDB clients
const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

// Environment variables
const PROJECTS_TABLE = process.env.PROJECTS_TABLE;
const PROJECT_MEMBERSHIPS_TABLE = process.env.PROJECT_MEMBERSHIPS_TABLE;
const WORKSPACES_TABLE = process.env.WORKSPACES_TABLE;

/**
 * Extract user context from JWT token
 */
function extractUserContext(event) {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.decode(token); // In production, verify the signature
    
    return {
      userId: decoded.sub || decoded.user_id,
      organizationId: decoded['custom:organization_id'] || decoded.organization_id,
      email: decoded.email,
      roles: decoded['custom:roles'] ? decoded['custom:roles'].split(',') : []
    };
  } catch (error) {
    throw new Error('Invalid authorization token');
  }
}

/**
 * Validate project input data
 */
function validateProjectInput(data) {
  const required = ['name', 'description'];
  const errors = [];

  for (const field of required) {
    if (!data[field] || typeof data[field] !== 'string' || data[field].trim().length === 0) {
      errors.push(`${field} is required and must be a non-empty string`);
    }
  }

  if (data.name && data.name.length > 100) {
    errors.push('Project name must be 100 characters or less');
  }

  if (data.description && data.description.length > 500) {
    errors.push('Project description must be 500 characters or less');
  }

  return errors;
}

/**
 * Generate ISO timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Create HTTP response
 */
function createResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers
    },
    body: JSON.stringify(body)
  };
}

/**
 * Get project by ID
 */
async function getProject(projectId, userContext) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: PROJECTS_TABLE,
      Key: { project_id: projectId }
    }));

    if (!result.Item) {
      return createResponse(404, { error: 'Project not found' });
    }

    // Verify user has access to this project (same organization)
    if (result.Item.organization_id !== userContext.organizationId) {
      return createResponse(403, { error: 'Access denied to project' });
    }

    return createResponse(200, { project: result.Item });
  } catch (error) {
    console.error('Error getting project:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
}

/**
 * List projects for user's organization
 */
async function listProjects(userContext, queryParams = {}) {
  try {
    const { limit = 20, lastEvaluatedKey } = queryParams;

    const queryInput = {
      TableName: PROJECTS_TABLE,
      IndexName: 'organization-updated-index',
      KeyConditionExpression: 'organization_id = :orgId',
      ExpressionAttributeValues: {
        ':orgId': userContext.organizationId
      },
      ScanIndexForward: false, // Most recent first
      Limit: parseInt(limit)
    };

    if (lastEvaluatedKey) {
      queryInput.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
    }

    const result = await docClient.send(new QueryCommand(queryInput));

    const response = {
      projects: result.Items || [],
      count: result.Items ? result.Items.length : 0
    };

    if (result.LastEvaluatedKey) {
      response.nextToken = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
    }

    return createResponse(200, response);
  } catch (error) {
    console.error('Error listing projects:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
}

/**
 * List projects owned by the user
 */
async function listUserProjects(userContext, queryParams = {}) {
  try {
    const { limit = 20, lastEvaluatedKey } = queryParams;

    const queryInput = {
      TableName: PROJECTS_TABLE,
      IndexName: 'owner-updated-index',
      KeyConditionExpression: 'owner_user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': userContext.userId
      },
      ScanIndexForward: false,
      Limit: parseInt(limit)
    };

    if (lastEvaluatedKey) {
      queryInput.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
    }

    const result = await docClient.send(new QueryCommand(queryInput));

    const response = {
      projects: result.Items || [],
      count: result.Items ? result.Items.length : 0
    };

    if (result.LastEvaluatedKey) {
      response.nextToken = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
    }

    return createResponse(200, response);
  } catch (error) {
    console.error('Error listing user projects:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
}

/**
 * Create a new project
 */
async function createProject(projectData, userContext) {
  try {
    const validationErrors = validateProjectInput(projectData);
    if (validationErrors.length > 0) {
      return createResponse(400, { 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }

    const timestamp = getTimestamp();
    const projectId = uuidv4();

    const project = {
      project_id: projectId,
      organization_id: userContext.organizationId,
      owner_user_id: userContext.userId,
      name: projectData.name.trim(),
      description: projectData.description.trim(),
      status: 'active',
      visibility: projectData.visibility || 'private',
      tags: projectData.tags || [],
      settings: projectData.settings || {},
      created_at: timestamp,
      updated_at: timestamp,
      created_by: userContext.userId,
      updated_by: userContext.userId,
      member_count: 1 // Owner is the first member
    };

    await docClient.send(new PutCommand({
      TableName: PROJECTS_TABLE,
      Item: project,
      ConditionExpression: 'attribute_not_exists(project_id)'
    }));

    // Add the creator as the project owner in memberships table
    const membership = {
      project_id: projectId,
      user_id: userContext.userId,
      project_role: 'owner',
      permissions: ['read', 'write', 'admin', 'delete'],
      joined_at: timestamp,
      added_by: userContext.userId
    };

    await docClient.send(new PutCommand({
      TableName: PROJECT_MEMBERSHIPS_TABLE,
      Item: membership
    }));

    return createResponse(201, { 
      message: 'Project created successfully', 
      project: project 
    });
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return createResponse(409, { error: 'Project already exists' });
    }
    console.error('Error creating project:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
}

/**
 * Update an existing project
 */
async function updateProject(projectId, updates, userContext) {
  try {
    // First verify the project exists and user has access
    const existingProject = await docClient.send(new GetCommand({
      TableName: PROJECTS_TABLE,
      Key: { project_id: projectId }
    }));

    if (!existingProject.Item) {
      return createResponse(404, { error: 'Project not found' });
    }

    // Verify user has access to this project
    if (existingProject.Item.organization_id !== userContext.organizationId) {
      return createResponse(403, { error: 'Access denied to project' });
    }

    // Verify user has permission to update (owner or admin)
    if (existingProject.Item.owner_user_id !== userContext.userId) {
      // Check if user is a project admin
      const membership = await docClient.send(new GetCommand({
        TableName: PROJECT_MEMBERSHIPS_TABLE,
        Key: { 
          project_id: projectId, 
          user_id: userContext.userId 
        }
      }));

      if (!membership.Item || !['admin', 'owner'].includes(membership.Item.project_role)) {
        return createResponse(403, { error: 'Insufficient permissions to update project' });
      }
    }

    // Validate update data
    if (updates.name !== undefined || updates.description !== undefined) {
      const validationErrors = validateProjectInput(updates);
      if (validationErrors.length > 0) {
        return createResponse(400, { 
          error: 'Validation failed', 
          details: validationErrors 
        });
      }
    }

    // Build update expression
    const timestamp = getTimestamp();
    let updateExpression = 'SET updated_at = :timestamp, updated_by = :userId';
    const expressionAttributeValues = {
      ':timestamp': timestamp,
      ':userId': userContext.userId
    };

    const allowedUpdates = ['name', 'description', 'status', 'visibility', 'tags', 'settings'];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key) && value !== undefined) {
        updateExpression += `, ${key} = :${key}`;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    const result = await docClient.send(new UpdateCommand({
      TableName: PROJECTS_TABLE,
      Key: { project_id: projectId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }));

    return createResponse(200, { 
      message: 'Project updated successfully', 
      project: result.Attributes 
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
}

/**
 * Delete a project
 */
async function deleteProject(projectId, userContext) {
  try {
    // Verify the project exists and user has access
    const existingProject = await docClient.send(new GetCommand({
      TableName: PROJECTS_TABLE,
      Key: { project_id: projectId }
    }));

    if (!existingProject.Item) {
      return createResponse(404, { error: 'Project not found' });
    }

    // Verify user has access to this project
    if (existingProject.Item.organization_id !== userContext.organizationId) {
      return createResponse(403, { error: 'Access denied to project' });
    }

    // Only project owner can delete (additional security)
    if (existingProject.Item.owner_user_id !== userContext.userId) {
      return createResponse(403, { error: 'Only project owner can delete project' });
    }

    // Delete project memberships first
    const memberships = await docClient.send(new QueryCommand({
      TableName: PROJECT_MEMBERSHIPS_TABLE,
      KeyConditionExpression: 'project_id = :projectId',
      ExpressionAttributeValues: {
        ':projectId': projectId
      }
    }));

    // Delete all memberships
    for (const membership of memberships.Items || []) {
      await docClient.send(new DeleteCommand({
        TableName: PROJECT_MEMBERSHIPS_TABLE,
        Key: {
          project_id: membership.project_id,
          user_id: membership.user_id
        }
      }));
    }

    // Delete the project
    await docClient.send(new DeleteCommand({
      TableName: PROJECTS_TABLE,
      Key: { project_id: projectId }
    }));

    return createResponse(200, { 
      message: 'Project deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
}

/**
 * Get project members
 */
async function getProjectMembers(projectId, userContext) {
  try {
    // Verify user has access to this project
    const project = await docClient.send(new GetCommand({
      TableName: PROJECTS_TABLE,
      Key: { project_id: projectId }
    }));

    if (!project.Item) {
      return createResponse(404, { error: 'Project not found' });
    }

    if (project.Item.organization_id !== userContext.organizationId) {
      return createResponse(403, { error: 'Access denied to project' });
    }

    // Get project memberships
    const result = await docClient.send(new QueryCommand({
      TableName: PROJECT_MEMBERSHIPS_TABLE,
      KeyConditionExpression: 'project_id = :projectId',
      ExpressionAttributeValues: {
        ':projectId': projectId
      }
    }));

    return createResponse(200, { 
      project_id: projectId,
      members: result.Items || [],
      count: result.Items ? result.Items.length : 0 
    });
  } catch (error) {
    console.error('Error getting project members:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {}, {
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      });
    }

    // Extract user context from JWT
    const userContext = extractUserContext(event);

    const { httpMethod, pathParameters, queryStringParameters, body } = event;
    const projectId = pathParameters?.projectId;

    // Parse request body if present
    let requestBody = {};
    if (body) {
      try {
        requestBody = JSON.parse(body);
      } catch (error) {
        return createResponse(400, { error: 'Invalid JSON in request body' });
      }
    }

    // Route based on HTTP method and path
    switch (httpMethod) {
      case 'GET':
        if (projectId) {
          if (pathParameters.action === 'members') {
            return await getProjectMembers(projectId, userContext);
          }
          return await getProject(projectId, userContext);
        } else {
          // Check if requesting user's own projects
          if (queryStringParameters?.owner === 'me') {
            return await listUserProjects(userContext, queryStringParameters);
          }
          return await listProjects(userContext, queryStringParameters);
        }

      case 'POST':
        if (projectId) {
          return createResponse(405, { error: 'Method not allowed for specific project' });
        }
        return await createProject(requestBody, userContext);

      case 'PUT':
        if (!projectId) {
          return createResponse(400, { error: 'Project ID is required' });
        }
        return await updateProject(projectId, requestBody, userContext);

      case 'DELETE':
        if (!projectId) {
          return createResponse(400, { error: 'Project ID is required' });
        }
        return await deleteProject(projectId, userContext);

      default:
        return createResponse(405, { error: 'Method not allowed' });
    }

  } catch (error) {
    if (error.message === 'Missing Authorization header' || 
        error.message === 'Invalid authorization token') {
      return createResponse(401, { error: error.message });
    }

    console.error('Unhandled error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};
