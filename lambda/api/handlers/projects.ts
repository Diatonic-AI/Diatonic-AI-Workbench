// AI Nexus Workbench - Project Management API Handlers

import { v4 as uuidv4 } from 'uuid';
import { APIRequest, APIResponse, Project, ProjectSettings, ProjectMetadata, DynamoDBItem } from '../types';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  forbiddenResponse,
  unprocessableEntityResponse,
  paginatedResponse,
  extractUserFromEvent,
  extractTenantFromEvent,
  parseQueryParams,
  parsePathParams,
  parseRequestBody,
  Validator,
  commonValidationRules,
  measureExecutionTime,
  logApiCall,
  checkTenantLimits,
} from '../utils/api';
import { db, TABLES, keyUtils, tenantService, usageService, DatabaseError } from '../utils/database';

// ===== Project CRUD Operations =====

export const listProjects = async (event: APIRequest): Promise<APIResponse> => {
  const startTime = Date.now();
  
  try {
    const user = extractUserFromEvent(event);
    const tenant = extractTenantFromEvent(event);
    const { tenantId } = parsePathParams(event);
    const queryParams = parseQueryParams(event);

    // Verify tenant access
    if (tenantId !== user.tenantId) {
      logApiCall('GET', '/tenants/{tenantId}/projects', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Access denied to tenant resources', event.requestId);
    }

    // Query projects for the tenant
    const result = await db.query<Project & DynamoDBItem>(
      TABLES.ENTITIES,
      'PK = :pk',
      undefined,
      {
        ':pk': `TENANT#${tenantId}#PROJECT`,
      },
      {
        limit: queryParams.limit,
        nextToken: queryParams.nextToken,
        sortOrder: queryParams.sortOrder,
        filter: queryParams.status ? {
          field: 'status',
          operator: 'eq',
          value: queryParams.status,
        } : undefined,
      }
    );

    // Filter by search if provided
    let projects = result.items;
    if (queryParams.search) {
      const searchLower = queryParams.search.toLowerCase();
      projects = projects.filter(project => 
        project.name.toLowerCase().includes(searchLower) ||
        project.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by tags if provided
    if (queryParams.tags) {
      projects = projects.filter(project =>
        queryParams.tags!.some(tag => project.settings.tags.includes(tag))
      );
    }

    logApiCall('GET', '/tenants/{tenantId}/projects', 200, Date.now() - startTime, tenantId, user.userId);
    
    return paginatedResponse(
      projects,
      result.pagination,
      event.requestId
    );

  } catch (error) {
    console.error('List projects error:', error);
    logApiCall('GET', '/tenants/{tenantId}/projects', 500, Date.now() - startTime);
    return badRequestResponse(
      error instanceof Error ? error.message : 'Failed to list projects',
      undefined,
      event.requestId
    );
  }
};

export const getProject = async (event: APIRequest): Promise<APIResponse> => {
  const startTime = Date.now();
  
  try {
    const user = extractUserFromEvent(event);
    const tenant = extractTenantFromEvent(event);
    const { tenantId, projectId } = parsePathParams(event);

    // Verify tenant access
    if (tenantId !== user.tenantId) {
      logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Access denied to tenant resources', event.requestId);
    }

    // Get project
    const project = await db.getItem<Project & DynamoDBItem>(
      TABLES.ENTITIES,
      keyUtils.projectKey(tenantId, projectId)
    );

    if (!project) {
      logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}', 404, Date.now() - startTime, tenantId, user.userId);
      return notFoundResponse('Project not found', event.requestId);
    }

    logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}', 200, Date.now() - startTime, tenantId, user.userId);
    
    return successResponse(project, undefined, event.requestId);

  } catch (error) {
    console.error('Get project error:', error);
    logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}', 500, Date.now() - startTime);
    return badRequestResponse(
      error instanceof Error ? error.message : 'Failed to get project',
      undefined,
      event.requestId
    );
  }
};

export const createProject = async (event: APIRequest): Promise<APIResponse> => {
  const startTime = Date.now();
  
  try {
    const user = extractUserFromEvent(event);
    const tenant = extractTenantFromEvent(event);
    const { tenantId } = parsePathParams(event);

    // Verify tenant access
    if (tenantId !== user.tenantId) {
      logApiCall('POST', '/tenants/{tenantId}/projects', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Access denied to tenant resources', event.requestId);
    }

    // Check tenant limits
    if (!checkTenantLimits(tenant, 'projects', 1)) {
      logApiCall('POST', '/tenants/{tenantId}/projects', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Project limit exceeded for tenant', event.requestId);
    }

    // Parse and validate request body
    const requestBody = parseRequestBody<{
      name: string;
      description?: string;
      settings?: Partial<ProjectSettings>;
    }>(event);

    const validator = new Validator();
    const validationErrors = validator.validate(requestBody, [
      commonValidationRules.name(),
      commonValidationRules.description(false),
      {
        field: 'settings.defaultModel',
        required: false,
        type: 'string',
        enum: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'claude-3-haiku'],
      },
      {
        field: 'settings.retentionDays',
        required: false,
        type: 'number',
        min: 1,
        max: 3650,
      },
      {
        field: 'settings.tags',
        required: false,
        type: 'array',
        custom: (value) => Array.isArray(value) && value.every(tag => typeof tag === 'string' && tag.length <= 50),
        customMessage: 'Tags must be an array of strings, each no longer than 50 characters',
      },
    ]);

    if (validationErrors.length > 0) {
      logApiCall('POST', '/tenants/{tenantId}/projects', 422, Date.now() - startTime, tenantId, user.userId);
      return unprocessableEntityResponse(
        'Validation failed',
        { errors: validationErrors },
        event.requestId
      );
    }

    // Create project
    const projectId = uuidv4();
    const now = new Date().toISOString();

    const defaultSettings: ProjectSettings = {
      defaultModel: 'gpt-4',
      retentionDays: 90,
      enableLogging: true,
      enableMonitoring: true,
      tags: [],
      ...requestBody.settings,
    };

    const defaultMetadata: ProjectMetadata = {
      agentCount: 0,
      experimentCount: 0,
      datasetCount: 0,
      totalRuns: 0,
      storageUsedBytes: 0,
    };

    const project: Project & DynamoDBItem = {
      // DynamoDB keys
      ...keyUtils.projectKey(tenantId, projectId),
      ...keyUtils.userEntitiesGSI(tenantId, user.userId, 'project'),
      entityType: 'project',
      tenantId,
      createdAt: now,
      updatedAt: now,
      
      // Project data
      id: projectId,
      name: requestBody.name,
      description: requestBody.description,
      createdBy: user.userId,
      status: 'active',
      settings: defaultSettings,
      metadata: defaultMetadata,
    };

    // Save to database
    await db.putItem(TABLES.ENTITIES, project);

    // Update tenant usage
    await tenantService.updateTenantUsage(tenantId, {
      projects: tenant.currentUsage.projects + 1,
    });

    // Record usage event
    await usageService.recordUsageEvent({
      tenantId,
      userId: user.userId,
      resourceType: 'project',
      resourceId: projectId,
      operation: 'create',
      costUsd: 0.00, // No cost for creating projects
      metadata: {
        projectName: project.name,
      },
    });

    logApiCall('POST', '/tenants/{tenantId}/projects', 201, Date.now() - startTime, tenantId, user.userId);
    
    return createdResponse(project, 'Project created successfully', event.requestId);

  } catch (error) {
    console.error('Create project error:', error);
    logApiCall('POST', '/tenants/{tenantId}/projects', 500, Date.now() - startTime);
    
    if (error instanceof DatabaseError) {
      return badRequestResponse(error.message, undefined, event.requestId);
    }
    
    return badRequestResponse(
      error instanceof Error ? error.message : 'Failed to create project',
      undefined,
      event.requestId
    );
  }
};

export const updateProject = async (event: APIRequest): Promise<APIResponse> => {
  const startTime = Date.now();
  
  try {
    const user = extractUserFromEvent(event);
    const tenant = extractTenantFromEvent(event);
    const { tenantId, projectId } = parsePathParams(event);

    // Verify tenant access
    if (tenantId !== user.tenantId) {
      logApiCall('PUT', '/tenants/{tenantId}/projects/{projectId}', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Access denied to tenant resources', event.requestId);
    }

    // Check if project exists
    const existingProject = await db.getItem<Project & DynamoDBItem>(
      TABLES.ENTITIES,
      keyUtils.projectKey(tenantId, projectId)
    );

    if (!existingProject) {
      logApiCall('PUT', '/tenants/{tenantId}/projects/{projectId}', 404, Date.now() - startTime, tenantId, user.userId);
      return notFoundResponse('Project not found', event.requestId);
    }

    // Check permissions (only creator or tenant admin can update)
    if (existingProject.createdBy !== user.userId && user.role !== 'tenant_admin') {
      logApiCall('PUT', '/tenants/{tenantId}/projects/{projectId}', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Insufficient permissions to update project', event.requestId);
    }

    // Parse and validate request body
    const requestBody = parseRequestBody<{
      name?: string;
      description?: string;
      status?: 'active' | 'archived' | 'template';
      settings?: Partial<ProjectSettings>;
    }>(event);

    const validator = new Validator();
    const validationErrors = validator.validate(requestBody, [
      { ...commonValidationRules.name(false) },
      commonValidationRules.description(false),
      {
        field: 'status',
        required: false,
        type: 'string',
        enum: ['active', 'archived', 'template'],
      },
      {
        field: 'settings.defaultModel',
        required: false,
        type: 'string',
        enum: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'claude-3-haiku'],
      },
      {
        field: 'settings.retentionDays',
        required: false,
        type: 'number',
        min: 1,
        max: 3650,
      },
      {
        field: 'settings.tags',
        required: false,
        type: 'array',
        custom: (value) => Array.isArray(value) && value.every(tag => typeof tag === 'string' && tag.length <= 50),
        customMessage: 'Tags must be an array of strings, each no longer than 50 characters',
      },
    ]);

    if (validationErrors.length > 0) {
      logApiCall('PUT', '/tenants/{tenantId}/projects/{projectId}', 422, Date.now() - startTime, tenantId, user.userId);
      return unprocessableEntityResponse(
        'Validation failed',
        { errors: validationErrors },
        event.requestId
      );
    }

    // Build update expression
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, string | number | boolean | Record<string, unknown> | null> = {};

    if (requestBody.name) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = requestBody.name;
    }

    if (requestBody.description !== undefined) {
      updateExpressions.push('description = :description');
      expressionAttributeValues[':description'] = requestBody.description;
    }

    if (requestBody.status) {
      updateExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = requestBody.status;
    }

    if (requestBody.settings) {
      const currentSettings = existingProject.settings;
      const updatedSettings = { ...currentSettings, ...requestBody.settings };
      updateExpressions.push('settings = :settings');
      expressionAttributeValues[':settings'] = updatedSettings;
    }

    if (updateExpressions.length === 0) {
      logApiCall('PUT', '/tenants/{tenantId}/projects/{projectId}', 400, Date.now() - startTime, tenantId, user.userId);
      return badRequestResponse('No valid fields to update', undefined, event.requestId);
    }

    // Update project
    const updatedProject = await db.updateItem<Project & DynamoDBItem>(
      TABLES.ENTITIES,
      keyUtils.projectKey(tenantId, projectId),
      `SET ${updateExpressions.join(', ')}`,
      Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      expressionAttributeValues
    );

    // Record usage event
    await usageService.recordUsageEvent({
      tenantId,
      userId: user.userId,
      resourceType: 'project',
      resourceId: projectId,
      operation: 'update',
      costUsd: 0.00,
      metadata: {
        updatedFields: Object.keys(requestBody),
      },
    });

    logApiCall('PUT', '/tenants/{tenantId}/projects/{projectId}', 200, Date.now() - startTime, tenantId, user.userId);
    
    return successResponse(updatedProject, 'Project updated successfully', event.requestId);

  } catch (error) {
    console.error('Update project error:', error);
    logApiCall('PUT', '/tenants/{tenantId}/projects/{projectId}', 500, Date.now() - startTime);
    return badRequestResponse(
      error instanceof Error ? error.message : 'Failed to update project',
      undefined,
      event.requestId
    );
  }
};

export const deleteProject = async (event: APIRequest): Promise<APIResponse> => {
  const startTime = Date.now();
  
  try {
    const user = extractUserFromEvent(event);
    const tenant = extractTenantFromEvent(event);
    const { tenantId, projectId } = parsePathParams(event);

    // Verify tenant access
    if (tenantId !== user.tenantId) {
      logApiCall('DELETE', '/tenants/{tenantId}/projects/{projectId}', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Access denied to tenant resources', event.requestId);
    }

    // Check if project exists
    const existingProject = await db.getItem<Project & DynamoDBItem>(
      TABLES.ENTITIES,
      keyUtils.projectKey(tenantId, projectId)
    );

    if (!existingProject) {
      logApiCall('DELETE', '/tenants/{tenantId}/projects/{projectId}', 404, Date.now() - startTime, tenantId, user.userId);
      return notFoundResponse('Project not found', event.requestId);
    }

    // Check permissions (only creator or tenant admin can delete)
    if (existingProject.createdBy !== user.userId && user.role !== 'tenant_admin') {
      logApiCall('DELETE', '/tenants/{tenantId}/projects/{projectId}', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Insufficient permissions to delete project', event.requestId);
    }

    // Check if project has dependent resources
    const hasAgents = await db.itemExists(
      TABLES.ENTITIES,
      keyUtils.agentKey(tenantId, projectId, 'check')
    );

    const hasExperiments = await db.itemExists(
      TABLES.ENTITIES,
      keyUtils.experimentKey(tenantId, projectId, 'check')
    );

    const hasDatasets = await db.itemExists(
      TABLES.ENTITIES,
      keyUtils.datasetKey(tenantId, projectId, 'check')
    );

    if (hasAgents || hasExperiments || hasDatasets) {
      logApiCall('DELETE', '/tenants/{tenantId}/projects/{projectId}', 409, Date.now() - startTime, tenantId, user.userId);
      return badRequestResponse(
        'Cannot delete project with existing agents, experiments, or datasets. Please delete them first.',
        {
          hasAgents,
          hasExperiments,
          hasDatasets,
        },
        event.requestId
      );
    }

    // Delete project
    await db.deleteItem(
      TABLES.ENTITIES,
      keyUtils.projectKey(tenantId, projectId)
    );

    // Update tenant usage
    await tenantService.updateTenantUsage(tenantId, {
      projects: Math.max(0, tenant.currentUsage.projects - 1),
    });

    // Record usage event
    await usageService.recordUsageEvent({
      tenantId,
      userId: user.userId,
      resourceType: 'project',
      resourceId: projectId,
      operation: 'delete',
      costUsd: 0.00,
      metadata: {
        projectName: existingProject.name,
        deletedBy: user.userId,
      },
    });

    logApiCall('DELETE', '/tenants/{tenantId}/projects/{projectId}', 200, Date.now() - startTime, tenantId, user.userId);
    
    return successResponse(
      undefined,
      'Project deleted successfully',
      event.requestId
    );

  } catch (error) {
    console.error('Delete project error:', error);
    logApiCall('DELETE', '/tenants/{tenantId}/projects/{projectId}', 500, Date.now() - startTime);
    return badRequestResponse(
      error instanceof Error ? error.message : 'Failed to delete project',
      undefined,
      event.requestId
    );
  }
};

// ===== Project Statistics and Analytics =====

export const getProjectStats = async (event: APIRequest): Promise<APIResponse> => {
  const startTime = Date.now();
  
  try {
    const user = extractUserFromEvent(event);
    const { tenantId, projectId } = parsePathParams(event);

    // Verify tenant access
    if (tenantId !== user.tenantId) {
      logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}/stats', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Access denied to tenant resources', event.requestId);
    }

    // Get project
    const project = await db.getItem<Project & DynamoDBItem>(
      TABLES.ENTITIES,
      keyUtils.projectKey(tenantId, projectId)
    );

    if (!project) {
      logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}/stats', 404, Date.now() - startTime, tenantId, user.userId);
      return notFoundResponse('Project not found', event.requestId);
    }

    // Get detailed statistics
    const stats = {
      overview: {
        id: project.id,
        name: project.name,
        status: project.status,
        createdAt: project.createdAt,
        lastActivity: project.metadata.lastActivity,
      },
      resources: {
        agents: project.metadata.agentCount,
        experiments: project.metadata.experimentCount,
        datasets: project.metadata.datasetCount,
        totalRuns: project.metadata.totalRuns,
        storageUsedBytes: project.metadata.storageUsedBytes,
      },
      settings: project.settings,
      activity: {
        // In a real implementation, these would be calculated from usage events
        runsLast7Days: 0,
        runsLast30Days: 0,
        avgLatencyMs: 0,
        errorRate: 0,
      },
    };

    logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}/stats', 200, Date.now() - startTime, tenantId, user.userId);
    
    return successResponse(stats, undefined, event.requestId);

  } catch (error) {
    console.error('Get project stats error:', error);
    logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}/stats', 500, Date.now() - startTime);
    return badRequestResponse(
      error instanceof Error ? error.message : 'Failed to get project statistics',
      undefined,
      event.requestId
    );
  }
};
