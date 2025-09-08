// AI Nexus Workbench - Agent Management API Handlers

import { v4 as uuidv4 } from 'uuid';
import { APIRequest, APIResponse, Agent, AgentConfig, AgentMetadata, AgentRun, RunMetadata, DynamoDBItem } from '../types';
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
  logApiCall,
  checkTenantLimits,
  detectPII,
  sanitizeInput,
} from '../utils/api';
import { db, TABLES, keyUtils, tenantService, usageService, DatabaseError } from '../utils/database';

// ===== Agent CRUD Operations =====

export const listAgents = async (event: APIRequest): Promise<APIResponse> => {
  const startTime = Date.now();
  
  try {
    const user = extractUserFromEvent(event);
    const tenant = extractTenantFromEvent(event);
    const { tenantId, projectId } = parsePathParams(event);
    const queryParams = parseQueryParams(event);

    // Verify tenant access
    if (tenantId !== user.tenantId) {
      logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}/agents', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Access denied to tenant resources', event.requestId);
    }

    // Verify project exists
    const project = await db.getItem(TABLES.ENTITIES, keyUtils.projectKey(tenantId, projectId));
    if (!project) {
      logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}/agents', 404, Date.now() - startTime, tenantId, user.userId);
      return notFoundResponse('Project not found', event.requestId);
    }

    // Query agents for the project
    const result = await db.query<Agent & DynamoDBItem>(
      TABLES.ENTITIES,
      'PK = :pk',
      undefined,
      {
        ':pk': `TENANT#${tenantId}#PROJECT#${projectId}#AGENT`,
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
    const agents = result.items;
    if (queryParams.search) {
      const searchLower = queryParams.search.toLowerCase();
      agents = agents.filter(agent => 
        agent.name.toLowerCase().includes(searchLower) ||
        agent.description?.toLowerCase().includes(searchLower) ||
        agent.config.systemPrompt?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by type if provided
    if (queryParams.type) {
      agents = agents.filter(agent => agent.type === queryParams.type);
    }

    logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}/agents', 200, Date.now() - startTime, tenantId, user.userId);
    
    return paginatedResponse(
      agents,
      result.pagination,
      event.requestId
    );

  } catch (error) {
    console.error('List agents error:', error);
    logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}/agents', 500, Date.now() - startTime);
    return badRequestResponse(
      error instanceof Error ? error.message : 'Failed to list agents',
      undefined,
      event.requestId
    );
  }
};

export const getAgent = async (event: APIRequest): Promise<APIResponse> => {
  const startTime = Date.now();
  
  try {
    const user = extractUserFromEvent(event);
    const { tenantId, projectId, agentId } = parsePathParams(event);

    // Verify tenant access
    if (tenantId !== user.tenantId) {
      logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Access denied to tenant resources', event.requestId);
    }

    // Get agent
    const agent = await db.getItem<Agent & DynamoDBItem>(
      TABLES.ENTITIES,
      keyUtils.agentKey(tenantId, projectId, agentId)
    );

    if (!agent) {
      logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 404, Date.now() - startTime, tenantId, user.userId);
      return notFoundResponse('Agent not found', event.requestId);
    }

    logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 200, Date.now() - startTime, tenantId, user.userId);
    
    return successResponse(agent, undefined, event.requestId);

  } catch (error) {
    console.error('Get agent error:', error);
    logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 500, Date.now() - startTime);
    return badRequestResponse(
      error instanceof Error ? error.message : 'Failed to get agent',
      undefined,
      event.requestId
    );
  }
};

export const createAgent = async (event: APIRequest): Promise<APIResponse> => {
  const startTime = Date.now();
  
  try {
    const user = extractUserFromEvent(event);
    const tenant = extractTenantFromEvent(event);
    const { tenantId, projectId } = parsePathParams(event);

    // Verify tenant access
    if (tenantId !== user.tenantId) {
      logApiCall('POST', '/tenants/{tenantId}/projects/{projectId}/agents', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Access denied to tenant resources', event.requestId);
    }

    // Check tenant limits
    if (!checkTenantLimits(tenant, 'agents', 1)) {
      logApiCall('POST', '/tenants/{tenantId}/projects/{projectId}/agents', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Agent limit exceeded for tenant', event.requestId);
    }

    // Verify project exists
    const project = await db.getItem(TABLES.ENTITIES, keyUtils.projectKey(tenantId, projectId));
    if (!project) {
      logApiCall('POST', '/tenants/{tenantId}/projects/{projectId}/agents', 404, Date.now() - startTime, tenantId, user.userId);
      return notFoundResponse('Project not found', event.requestId);
    }

    // Parse and validate request body
    const requestBody = parseRequestBody<{
      name: string;
      description?: string;
      type: 'conversational' | 'completion' | 'code_generation' | 'analysis' | 'custom';
      config: AgentConfig;
    }>(event);

    const validator = new Validator();
    const validationErrors = validator.validate(requestBody, [
      commonValidationRules.name(),
      commonValidationRules.description(false),
      {
        field: 'type',
        required: true,
        type: 'string',
        enum: ['conversational', 'completion', 'code_generation', 'analysis', 'custom'],
      },
      {
        field: 'config.model',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100,
      },
      {
        field: 'config.provider',
        required: true,
        type: 'string',
        enum: ['openai', 'anthropic', 'bedrock', 'azure', 'custom'],
      },
      {
        field: 'config.temperature',
        required: false,
        type: 'number',
        min: 0,
        max: 2,
      },
      {
        field: 'config.maxTokens',
        required: false,
        type: 'number',
        min: 1,
        max: 8192,
      },
      {
        field: 'config.systemPrompt',
        required: false,
        type: 'string',
        maxLength: 10000,
      },
    ]);

    if (validationErrors.length > 0) {
      logApiCall('POST', '/tenants/{tenantId}/projects/{projectId}/agents', 422, Date.now() - startTime, tenantId, user.userId);
      return unprocessableEntityResponse(
        'Validation failed',
        { errors: validationErrors },
        event.requestId
      );
    }

    // Security: Check for PII in system prompt
    if (requestBody.config.systemPrompt) {
      const piiCheck = detectPII(requestBody.config.systemPrompt);
      if (piiCheck.detected) {
        logApiCall('POST', '/tenants/{tenantId}/projects/{projectId}/agents', 400, Date.now() - startTime, tenantId, user.userId);
        return badRequestResponse(
          'System prompt contains potential PII. Please remove sensitive information.',
          { detectedTypes: piiCheck.types },
          event.requestId
        );
      }
    }

    // Create agent
    const agentId = uuidv4();
    const now = new Date().toISOString();

    const defaultConfig: AgentConfig = {
      model: requestBody.config.model,
      provider: requestBody.config.provider,
      temperature: requestBody.config.temperature ?? 0.7,
      maxTokens: requestBody.config.maxTokens ?? 1000,
      systemPrompt: requestBody.config.systemPrompt ? sanitizeInput(requestBody.config.systemPrompt) : undefined,
      stopSequences: requestBody.config.stopSequences || [],
      tools: requestBody.config.tools || [],
      memory: requestBody.config.memory || { type: 'none' },
      safety: requestBody.config.safety || {
        contentFilter: true,
        piiDetection: true,
        toxicityFilter: true,
      },
    };

    const defaultMetadata: AgentMetadata = {
      totalRuns: 0,
      averageLatency: 0,
      errorRate: 0,
      tags: [],
    };

    const agent: Agent & DynamoDBItem = {
      // DynamoDB keys
      ...keyUtils.agentKey(tenantId, projectId, agentId),
      ...keyUtils.userEntitiesGSI(tenantId, user.userId, 'agent'),
      ...keyUtils.projectEntitiesGSI(tenantId, projectId, 'agent'),
      entityType: 'agent',
      tenantId,
      createdAt: now,
      updatedAt: now,
      
      // Agent data
      id: agentId,
      projectId,
      name: requestBody.name,
      description: requestBody.description,
      type: requestBody.type,
      status: 'draft',
      config: defaultConfig,
      version: '1.0.0',
      createdBy: user.userId,
      metadata: defaultMetadata,
    };

    // Save to database
    await db.putItem(TABLES.ENTITIES, agent);

    // Update tenant usage
    await tenantService.updateTenantUsage(tenantId, {
      agents: tenant.currentUsage.agents + 1,
    });

    // Update project metadata
    await db.updateItem(
      TABLES.ENTITIES,
      keyUtils.projectKey(tenantId, projectId),
      'SET metadata.agentCount = metadata.agentCount + :inc',
      undefined,
      { ':inc': 1 }
    );

    // Record usage event
    await usageService.recordUsageEvent({
      tenantId,
      userId: user.userId,
      resourceType: 'agent',
      resourceId: agentId,
      operation: 'create',
      costUsd: 0.00,
      metadata: {
        agentName: agent.name,
        agentType: agent.type,
        model: agent.config.model,
        provider: agent.config.provider,
      },
    });

    logApiCall('POST', '/tenants/{tenantId}/projects/{projectId}/agents', 201, Date.now() - startTime, tenantId, user.userId);
    
    return createdResponse(agent, 'Agent created successfully', event.requestId);

  } catch (error) {
    console.error('Create agent error:', error);
    logApiCall('POST', '/tenants/{tenantId}/projects/{projectId}/agents', 500, Date.now() - startTime);
    
    if (error instanceof DatabaseError) {
      return badRequestResponse(error.message, undefined, event.requestId);
    }
    
    return badRequestResponse(
      error instanceof Error ? error.message : 'Failed to create agent',
      undefined,
      event.requestId
    );
  }
};

export const updateAgent = async (event: APIRequest): Promise<APIResponse> => {
  const startTime = Date.now();
  
  try {
    const user = extractUserFromEvent(event);
    const { tenantId, projectId, agentId } = parsePathParams(event);

    // Verify tenant access
    if (tenantId !== user.tenantId) {
      logApiCall('PUT', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Access denied to tenant resources', event.requestId);
    }

    // Check if agent exists
    const existingAgent = await db.getItem<Agent & DynamoDBItem>(
      TABLES.ENTITIES,
      keyUtils.agentKey(tenantId, projectId, agentId)
    );

    if (!existingAgent) {
      logApiCall('PUT', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 404, Date.now() - startTime, tenantId, user.userId);
      return notFoundResponse('Agent not found', event.requestId);
    }

    // Check permissions
    if (existingAgent.createdBy !== user.userId && user.role !== 'tenant_admin') {
      logApiCall('PUT', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Insufficient permissions to update agent', event.requestId);
    }

    // Parse and validate request body
    const requestBody = parseRequestBody<{
      name?: string;
      description?: string;
      status?: 'draft' | 'active' | 'paused' | 'archived' | 'error';
      config?: Partial<AgentConfig>;
    }>(event);

    const validator = new Validator();
    const validationErrors = validator.validate(requestBody, [
      { ...commonValidationRules.name(false) },
      commonValidationRules.description(false),
      {
        field: 'status',
        required: false,
        type: 'string',
        enum: ['draft', 'active', 'paused', 'archived', 'error'],
      },
      {
        field: 'config.systemPrompt',
        required: false,
        type: 'string',
        maxLength: 10000,
      },
      {
        field: 'config.temperature',
        required: false,
        type: 'number',
        min: 0,
        max: 2,
      },
      {
        field: 'config.maxTokens',
        required: false,
        type: 'number',
        min: 1,
        max: 8192,
      },
    ]);

    if (validationErrors.length > 0) {
      logApiCall('PUT', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 422, Date.now() - startTime, tenantId, user.userId);
      return unprocessableEntityResponse(
        'Validation failed',
        { errors: validationErrors },
        event.requestId
      );
    }

    // Security: Check for PII in updated system prompt
    if (requestBody.config?.systemPrompt) {
      const piiCheck = detectPII(requestBody.config.systemPrompt);
      if (piiCheck.detected) {
        logApiCall('PUT', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 400, Date.now() - startTime, tenantId, user.userId);
        return badRequestResponse(
          'System prompt contains potential PII. Please remove sensitive information.',
          { detectedTypes: piiCheck.types },
          event.requestId
        );
      }
    }

    // Build update expression
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

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

    if (requestBody.config) {
      const currentConfig = existingAgent.config;
      const updatedConfig = { 
        ...currentConfig, 
        ...requestBody.config,
        systemPrompt: requestBody.config.systemPrompt ? 
          sanitizeInput(requestBody.config.systemPrompt) : 
          currentConfig.systemPrompt,
      };
      updateExpressions.push('config = :config');
      expressionAttributeValues[':config'] = updatedConfig;
    }

    if (updateExpressions.length === 0) {
      logApiCall('PUT', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 400, Date.now() - startTime, tenantId, user.userId);
      return badRequestResponse('No valid fields to update', undefined, event.requestId);
    }

    // Update agent
    const updatedAgent = await db.updateItem<Agent & DynamoDBItem>(
      TABLES.ENTITIES,
      keyUtils.agentKey(tenantId, projectId, agentId),
      `SET ${updateExpressions.join(', ')}`,
      Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      expressionAttributeValues
    );

    // Record usage event
    await usageService.recordUsageEvent({
      tenantId,
      userId: user.userId,
      resourceType: 'agent',
      resourceId: agentId,
      operation: 'update',
      costUsd: 0.00,
      metadata: {
        updatedFields: Object.keys(requestBody),
      },
    });

    logApiCall('PUT', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 200, Date.now() - startTime, tenantId, user.userId);
    
    return successResponse(updatedAgent, 'Agent updated successfully', event.requestId);

  } catch (error) {
    console.error('Update agent error:', error);
    logApiCall('PUT', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 500, Date.now() - startTime);
    return badRequestResponse(
      error instanceof Error ? error.message : 'Failed to update agent',
      undefined,
      event.requestId
    );
  }
};

export const deleteAgent = async (event: APIRequest): Promise<APIResponse> => {
  const startTime = Date.now();
  
  try {
    const user = extractUserFromEvent(event);
    const tenant = extractTenantFromEvent(event);
    const { tenantId, projectId, agentId } = parsePathParams(event);

    // Verify tenant access
    if (tenantId !== user.tenantId) {
      logApiCall('DELETE', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Access denied to tenant resources', event.requestId);
    }

    // Check if agent exists
    const existingAgent = await db.getItem<Agent & DynamoDBItem>(
      TABLES.ENTITIES,
      keyUtils.agentKey(tenantId, projectId, agentId)
    );

    if (!existingAgent) {
      logApiCall('DELETE', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 404, Date.now() - startTime, tenantId, user.userId);
      return notFoundResponse('Agent not found', event.requestId);
    }

    // Check permissions
    if (existingAgent.createdBy !== user.userId && user.role !== 'tenant_admin') {
      logApiCall('DELETE', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Insufficient permissions to delete agent', event.requestId);
    }

    // Delete agent
    await db.deleteItem(
      TABLES.ENTITIES,
      keyUtils.agentKey(tenantId, projectId, agentId)
    );

    // Update tenant usage
    await tenantService.updateTenantUsage(tenantId, {
      agents: Math.max(0, tenant.currentUsage.agents - 1),
    });

    // Update project metadata
    await db.updateItem(
      TABLES.ENTITIES,
      keyUtils.projectKey(tenantId, projectId),
      'SET metadata.agentCount = metadata.agentCount - :dec',
      undefined,
      { ':dec': 1 }
    );

    // Record usage event
    await usageService.recordUsageEvent({
      tenantId,
      userId: user.userId,
      resourceType: 'agent',
      resourceId: agentId,
      operation: 'delete',
      costUsd: 0.00,
      metadata: {
        agentName: existingAgent.name,
        deletedBy: user.userId,
      },
    });

    logApiCall('DELETE', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 200, Date.now() - startTime, tenantId, user.userId);
    
    return successResponse(
      undefined,
      'Agent deleted successfully',
      event.requestId
    );

  } catch (error) {
    console.error('Delete agent error:', error);
    logApiCall('DELETE', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}', 500, Date.now() - startTime);
    return badRequestResponse(
      error instanceof Error ? error.message : 'Failed to delete agent',
      undefined,
      event.requestId
    );
  }
};

// ===== Agent Execution Operations =====

export const runAgent = async (event: APIRequest): Promise<APIResponse> => {
  const startTime = Date.now();
  
  try {
    const user = extractUserFromEvent(event);
    const tenant = extractTenantFromEvent(event);
    const { tenantId, projectId, agentId } = parsePathParams(event);

    // Verify tenant access
    if (tenantId !== user.tenantId) {
      logApiCall('POST', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}/run', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Access denied to tenant resources', event.requestId);
    }

    // Check if agent exists and is active
    const agent = await db.getItem<Agent & DynamoDBItem>(
      TABLES.ENTITIES,
      keyUtils.agentKey(tenantId, projectId, agentId)
    );

    if (!agent) {
      logApiCall('POST', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}/run', 404, Date.now() - startTime, tenantId, user.userId);
      return notFoundResponse('Agent not found', event.requestId);
    }

    if (agent.status !== 'active') {
      logApiCall('POST', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}/run', 400, Date.now() - startTime, tenantId, user.userId);
      return badRequestResponse('Agent must be active to run', undefined, event.requestId);
    }

    // Parse request body
    const requestBody = parseRequestBody<{
      inputs: Record<string, any>;
      stream?: boolean;
      metadata?: Record<string, any>;
    }>(event);

    // Validate inputs
    if (!requestBody.inputs || typeof requestBody.inputs !== 'object') {
      logApiCall('POST', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}/run', 400, Date.now() - startTime, tenantId, user.userId);
      return badRequestResponse('Valid inputs object is required', undefined, event.requestId);
    }

    // Check for PII in inputs
    const inputText = JSON.stringify(requestBody.inputs);
    const piiCheck = detectPII(inputText);
    if (piiCheck.detected) {
      logApiCall('POST', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}/run', 400, Date.now() - startTime, tenantId, user.userId);
      return badRequestResponse(
        'Inputs contain potential PII. Please remove sensitive information.',
        { detectedTypes: piiCheck.types },
        event.requestId
      );
    }

    // Create run record
    const runId = uuidv4();
    const runStartTime = Date.now();
    const now = new Date().toISOString();

    const run: AgentRun & DynamoDBItem = {
      // DynamoDB keys
      ...keyUtils.runKey(tenantId, agentId, runId),
      ...keyUtils.userEntitiesGSI(tenantId, user.userId, 'run'),
      entityType: 'agent_run',
      tenantId,
      createdAt: now,
      updatedAt: now,
      
      // Run data
      id: runId,
      agentId,
      projectId,
      status: 'pending',
      inputs: requestBody.inputs,
      metadata: {
        executionTimeMs: 0,
        tokensConsumed: 0,
        costUsd: 0,
        model: agent.config.model,
        provider: agent.config.provider,
      },
    };

    // Save run to database
    await db.putItem(TABLES.ENTITIES, run);

    // Simulate agent execution (in real implementation, this would call LLM providers)
    const executionResult = await simulateAgentExecution(agent, requestBody.inputs);
    const executionTime = Date.now() - runStartTime;

    // Calculate cost (simplified pricing model)
    const costUsd = calculateExecutionCost(agent.config.provider, executionResult.tokensConsumed);

    // Update run with results
    const updatedRun = await db.updateItem<AgentRun & DynamoDBItem>(
      TABLES.ENTITIES,
      keyUtils.runKey(tenantId, agentId, runId),
      'SET #status = :status, outputs = :outputs, completedAt = :completedAt, metadata = :metadata',
      { '#status': 'status' },
      {
        ':status': executionResult.success ? 'completed' : 'failed',
        ':outputs': executionResult.outputs,
        ':completedAt': new Date().toISOString(),
        ':metadata': {
          executionTimeMs: executionTime,
          tokensConsumed: executionResult.tokensConsumed,
          costUsd,
          model: agent.config.model,
          provider: agent.config.provider,
          traceId: uuidv4(),
        },
      }
    );

    // Update agent metadata
    const newTotalRuns = agent.metadata.totalRuns + 1;
    const newAverageLatency = ((agent.metadata.averageLatency * agent.metadata.totalRuns) + executionTime) / newTotalRuns;
    const newErrorRate = executionResult.success ? 
      (agent.metadata.errorRate * agent.metadata.totalRuns) / newTotalRuns :
      ((agent.metadata.errorRate * agent.metadata.totalRuns) + 1) / newTotalRuns;

    await db.updateItem(
      TABLES.ENTITIES,
      keyUtils.agentKey(tenantId, projectId, agentId),
      'SET metadata.totalRuns = :totalRuns, metadata.averageLatency = :avgLatency, metadata.errorRate = :errorRate, lastRun = :lastRun',
      undefined,
      {
        ':totalRuns': newTotalRuns,
        ':avgLatency': newAverageLatency,
        ':errorRate': newErrorRate,
        ':lastRun': now,
      }
    );

    // Update project metadata
    await db.updateItem(
      TABLES.ENTITIES,
      keyUtils.projectKey(tenantId, projectId),
      'SET metadata.totalRuns = metadata.totalRuns + :inc, metadata.lastActivity = :lastActivity',
      undefined,
      { ':inc': 1, ':lastActivity': now }
    );

    // Record usage event
    await usageService.recordUsageEvent({
      tenantId,
      userId: user.userId,
      resourceType: 'agent',
      resourceId: agentId,
      operation: 'run',
      duration: executionTime,
      tokensConsumed: executionResult.tokensConsumed,
      costUsd,
      metadata: {
        runId,
        agentName: agent.name,
        model: agent.config.model,
        provider: agent.config.provider,
        inputTokens: Math.floor(executionResult.tokensConsumed * 0.7), // Approximate
        outputTokens: Math.floor(executionResult.tokensConsumed * 0.3),
        success: executionResult.success,
      },
    });

    // Update tenant usage
    await tenantService.updateTenantUsage(tenantId, {
      monthlyRequests: tenant.currentUsage.monthlyRequests + 1,
      monthlyTokens: tenant.currentUsage.monthlyTokens + executionResult.tokensConsumed,
      monthlyCostUsd: tenant.currentUsage.monthlyCostUsd + costUsd,
    });

    logApiCall('POST', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}/run', 200, Date.now() - startTime, tenantId, user.userId);
    
    return successResponse(updatedRun, 'Agent executed successfully', event.requestId);

  } catch (error) {
    console.error('Run agent error:', error);
    logApiCall('POST', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}/run', 500, Date.now() - startTime);
    return badRequestResponse(
      error instanceof Error ? error.message : 'Failed to run agent',
      undefined,
      event.requestId
    );
  }
};

export const listAgentRuns = async (event: APIRequest): Promise<APIResponse> => {
  const startTime = Date.now();
  
  try {
    const user = extractUserFromEvent(event);
    const { tenantId, projectId, agentId } = parsePathParams(event);
    const queryParams = parseQueryParams(event);

    // Verify tenant access
    if (tenantId !== user.tenantId) {
      logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}/runs', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Access denied to tenant resources', event.requestId);
    }

    // Query runs for the agent
    const result = await db.query<AgentRun & DynamoDBItem>(
      TABLES.ENTITIES,
      'PK = :pk',
      undefined,
      {
        ':pk': `TENANT#${tenantId}#AGENT#${agentId}#RUN`,
      },
      {
        limit: queryParams.limit,
        nextToken: queryParams.nextToken,
        sortOrder: 'desc', // Show most recent runs first
        filter: queryParams.status ? {
          field: 'status',
          operator: 'eq',
          value: queryParams.status,
        } : undefined,
      }
    );

    logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}/runs', 200, Date.now() - startTime, tenantId, user.userId);
    
    return paginatedResponse(
      result.items,
      result.pagination,
      event.requestId
    );

  } catch (error) {
    console.error('List agent runs error:', error);
    logApiCall('GET', '/tenants/{tenantId}/projects/{projectId}/agents/{agentId}/runs', 500, Date.now() - startTime);
    return badRequestResponse(
      error instanceof Error ? error.message : 'Failed to list agent runs',
      undefined,
      event.requestId
    );
  }
};

export const getAgentRun = async (event: APIRequest): Promise<APIResponse> => {
  const startTime = Date.now();
  
  try {
    const user = extractUserFromEvent(event);
    const { tenantId, agentId, runId } = parsePathParams(event);

    // Verify tenant access
    if (tenantId !== user.tenantId) {
      logApiCall('GET', '/tenants/{tenantId}/agents/{agentId}/runs/{runId}', 403, Date.now() - startTime, tenantId, user.userId);
      return forbiddenResponse('Access denied to tenant resources', event.requestId);
    }

    // Get run
    const run = await db.getItem<AgentRun & DynamoDBItem>(
      TABLES.ENTITIES,
      keyUtils.runKey(tenantId, agentId, runId)
    );

    if (!run) {
      logApiCall('GET', '/tenants/{tenantId}/agents/{agentId}/runs/{runId}', 404, Date.now() - startTime, tenantId, user.userId);
      return notFoundResponse('Run not found', event.requestId);
    }

    logApiCall('GET', '/tenants/{tenantId}/agents/{agentId}/runs/{runId}', 200, Date.now() - startTime, tenantId, user.userId);
    
    return successResponse(run, undefined, event.requestId);

  } catch (error) {
    console.error('Get agent run error:', error);
    logApiCall('GET', '/tenants/{tenantId}/agents/{agentId}/runs/{runId}', 500, Date.now() - startTime);
    return badRequestResponse(
      error instanceof Error ? error.message : 'Failed to get agent run',
      undefined,
      event.requestId
    );
  }
};

// ===== Helper Functions =====

// Simulate agent execution (in real implementation, this would integrate with LLM providers)
async function simulateAgentExecution(
  agent: Agent & DynamoDBItem,
  inputs: Record<string, any>
): Promise<{ success: boolean; outputs: Record<string, any>; tokensConsumed: number }> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

  // Simulate success/failure (95% success rate)
  const success = Math.random() > 0.05;

  if (!success) {
    return {
      success: false,
      outputs: { error: 'Simulated execution error' },
      tokensConsumed: Math.floor(Math.random() * 100) + 10,
    };
  }

  // Simulate realistic token consumption based on model and inputs
  const inputText = JSON.stringify(inputs);
  const baseTokens = Math.ceil(inputText.length / 4); // Rough approximation
  const outputTokens = Math.floor(Math.random() * agent.config.maxTokens * 0.8) + 50;
  const totalTokens = baseTokens + outputTokens;

  return {
    success: true,
    outputs: {
      response: `This is a simulated response from ${agent.name} (${agent.config.model}). Input: ${JSON.stringify(inputs)}`,
      confidence: Math.random() * 0.3 + 0.7, // 70-100%
      processingTime: Math.floor(Math.random() * 2000) + 500,
    },
    tokensConsumed: totalTokens,
  };
}

// Calculate execution cost based on provider and token usage
function calculateExecutionCost(provider: string, tokensConsumed: number): number {
  // Simplified pricing model (per 1K tokens)
  const pricing = {
    openai: 0.002, // $0.002 per 1K tokens (approximate)
    anthropic: 0.003,
    bedrock: 0.001,
    azure: 0.002,
    custom: 0.001,
  };

  const pricePerToken = (pricing[provider as keyof typeof pricing] || pricing.custom) / 1000;
  return Number((tokensConsumed * pricePerToken).toFixed(6));
}
