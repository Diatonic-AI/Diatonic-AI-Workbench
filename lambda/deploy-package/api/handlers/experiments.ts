// AI Nexus Workbench - Experiment Management API Handlers

import { APIRequest, APIResponse, Experiment, ExperimentConfig, ExperimentResults, PaginatedResponse } from '../types';
import { 
  successResponse, 
  errorResponse, 
  createdResponse, 
  notFoundResponse,
  validateRequest,
  parseRequestBody
} from '../utils/api';
import { 
  createItem, 
  getItem, 
  updateItem, 
  deleteItem, 
  queryItems,
  generateId,
  generateGSI1Keys,
  generateTimestamp
} from '../utils/database';

/**
 * List experiments for a project
 * GET /v1/tenants/{tenantId}/projects/{projectId}/experiments
 */
export const listExperiments = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId, projectId } = event.pathParameters || {};
    const { limit = 20, nextToken, status, type } = event.queryStringParameters || {};

    // Validate parameters
    if (!tenantId || !projectId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    // Query experiments for the project
    const gsi1Keys = generateGSI1Keys('PROJECT', projectId, 'EXPERIMENT');
    const queryParams: Record<string, unknown> = {
      GSI1PK: gsi1Keys.GSI1PK,
      limit: Math.min(parseInt(limit as string), 100),
      nextToken: nextToken as string,
      filter: {
        tenantId: tenantId as string,
      },
    };

    // Add status filter if provided
    if (status) {
      queryParams.filter.status = status as string;
    }

    // Add type filter if provided  
    if (type) {
      queryParams.filter.type = type as string;
    }

    const result = await queryItems(queryParams);

    const experiments = result.items.map(item => ({
      id: item.id,
      projectId: item.projectId,
      tenantId: item.tenantId,
      name: item.name,
      description: item.description,
      type: item.type,
      status: item.status,
      config: item.config,
      results: item.results,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      completedAt: item.completedAt,
    }));

    const response: PaginatedResponse<Experiment> = {
      items: experiments,
      pagination: {
        nextToken: result.nextToken,
        hasMore: !!result.nextToken,
        limit: parseInt(limit as string),
      },
      requestId: event.requestId,
    };

    return successResponse(response, event.requestId);

  } catch (error) {
    console.error('List experiments error:', error);
    return errorResponse('Failed to list experiments', 500, event.requestId);
  }
};

/**
 * Get a specific experiment
 * GET /v1/tenants/{tenantId}/projects/{projectId}/experiments/{experimentId}
 */
export const getExperiment = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId, projectId, experimentId } = event.pathParameters || {};

    if (!tenantId || !projectId || !experimentId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    const item = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `EXPERIMENT#${experimentId}`,
    });

    if (!item || item.projectId !== projectId) {
      return notFoundResponse('Experiment not found', event.requestId);
    }

    const experiment: Experiment = {
      id: item.id,
      projectId: item.projectId,
      tenantId: item.tenantId,
      name: item.name,
      description: item.description,
      type: item.type,
      status: item.status,
      config: item.config,
      results: item.results,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      completedAt: item.completedAt,
    };

    return successResponse(experiment, event.requestId);

  } catch (error) {
    console.error('Get experiment error:', error);
    return errorResponse('Failed to get experiment', 500, event.requestId);
  }
};

/**
 * Create a new experiment
 * POST /v1/tenants/{tenantId}/projects/{projectId}/experiments
 */
export const createExperiment = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId, projectId } = event.pathParameters || {};
    
    if (!tenantId || !projectId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    const body = parseRequestBody(event);
    if (!body) {
      return errorResponse('Request body is required', 400, event.requestId);
    }

    // Validate required fields
    const validationResult = validateRequest(body, {
      name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
      type: { 
        type: 'string', 
        required: true, 
        enum: ['ab_test', 'prompt_optimization', 'model_comparison', 'parameter_tuning', 'dataset_evaluation']
      },
      config: { type: 'object', required: true },
      description: { type: 'string', maxLength: 500 },
    });

    if (!validationResult.isValid) {
      return errorResponse('Invalid request data', 400, event.requestId, validationResult.errors);
    }

    // Validate experiment config based on type
    const configValidation = validateExperimentConfig(body.type, body.config);
    if (!configValidation.isValid) {
      return errorResponse('Invalid experiment configuration', 400, event.requestId, configValidation.errors);
    }

    const experimentId = generateId();
    const timestamp = generateTimestamp();
    const gsi1Keys = generateGSI1Keys('PROJECT', projectId, 'EXPERIMENT');

    const experimentItem = {
      PK: `TENANT#${tenantId}`,
      SK: `EXPERIMENT#${experimentId}`,
      GSI1PK: gsi1Keys.GSI1PK,
      GSI1SK: gsi1Keys.GSI1SK,
      entityType: 'EXPERIMENT',
      tenantId: tenantId as string,
      id: experimentId,
      projectId: projectId as string,
      name: body.name,
      description: body.description || null,
      type: body.type,
      status: 'draft',
      config: body.config,
      results: null,
      createdBy: event.userId || 'system',
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
    };

    await createItem(experimentItem);

    const experiment: Experiment = {
      id: experimentId,
      projectId: projectId as string,
      tenantId: tenantId as string,
      name: body.name,
      description: body.description,
      type: body.type,
      status: 'draft',
      config: body.config,
      results: null,
      createdBy: event.userId || 'system',
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
    };

    return createdResponse(experiment, event.requestId);

  } catch (error) {
    console.error('Create experiment error:', error);
    return errorResponse('Failed to create experiment', 500, event.requestId);
  }
};

/**
 * Update an experiment
 * PUT /v1/tenants/{tenantId}/projects/{projectId}/experiments/{experimentId}
 */
export const updateExperiment = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId, projectId, experimentId } = event.pathParameters || {};
    
    if (!tenantId || !projectId || !experimentId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    const body = parseRequestBody(event);
    if (!body) {
      return errorResponse('Request body is required', 400, event.requestId);
    }

    // Validate updatable fields
    const validationResult = validateRequest(body, {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      status: { 
        type: 'string', 
        enum: ['draft', 'running', 'completed', 'failed', 'cancelled'] 
      },
      config: { type: 'object' },
    });

    if (!validationResult.isValid) {
      return errorResponse('Invalid request data', 400, event.requestId, validationResult.errors);
    }

    // Get existing experiment
    const existingItem = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `EXPERIMENT#${experimentId}`,
    });

    if (!existingItem || existingItem.projectId !== projectId) {
      return notFoundResponse('Experiment not found', event.requestId);
    }

    // Don't allow config changes on running experiments
    if (existingItem.status === 'running' && body.config) {
      return errorResponse('Cannot modify config of running experiment', 400, event.requestId);
    }

    // Validate config if provided
    if (body.config) {
      const configValidation = validateExperimentConfig(existingItem.type, body.config);
      if (!configValidation.isValid) {
        return errorResponse('Invalid experiment configuration', 400, event.requestId, configValidation.errors);
      }
    }

    const timestamp = generateTimestamp();
    const updateData: Record<string, unknown> = {
      updatedAt: timestamp,
    };

    // Add fields that can be updated
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'completed') {
        updateData.completedAt = timestamp;
      }
    }
    if (body.config !== undefined) updateData.config = body.config;

    const updatedItem = await updateItem({
      PK: `TENANT#${tenantId}`,
      SK: `EXPERIMENT#${experimentId}`,
    }, updateData);

    const experiment: Experiment = {
      id: updatedItem.id,
      projectId: updatedItem.projectId,
      tenantId: updatedItem.tenantId,
      name: updatedItem.name,
      description: updatedItem.description,
      type: updatedItem.type,
      status: updatedItem.status,
      config: updatedItem.config,
      results: updatedItem.results,
      createdBy: updatedItem.createdBy,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
      completedAt: updatedItem.completedAt,
    };

    return successResponse(experiment, event.requestId);

  } catch (error) {
    console.error('Update experiment error:', error);
    return errorResponse('Failed to update experiment', 500, event.requestId);
  }
};

/**
 * Delete an experiment
 * DELETE /v1/tenants/{tenantId}/projects/{projectId}/experiments/{experimentId}
 */
export const deleteExperiment = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId, projectId, experimentId } = event.pathParameters || {};
    
    if (!tenantId || !projectId || !experimentId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    // Get existing experiment to verify ownership
    const existingItem = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `EXPERIMENT#${experimentId}`,
    });

    if (!existingItem || existingItem.projectId !== projectId) {
      return notFoundResponse('Experiment not found', event.requestId);
    }

    // Don't allow deletion of running experiments
    if (existingItem.status === 'running') {
      return errorResponse('Cannot delete running experiment', 400, event.requestId);
    }

    await deleteItem({
      PK: `TENANT#${tenantId}`,
      SK: `EXPERIMENT#${experimentId}`,
    });

    return successResponse({ deleted: true }, event.requestId);

  } catch (error) {
    console.error('Delete experiment error:', error);
    return errorResponse('Failed to delete experiment', 500, event.requestId);
  }
};

/**
 * Start an experiment
 * POST /v1/tenants/{tenantId}/projects/{projectId}/experiments/{experimentId}/start
 */
export const startExperiment = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId, projectId, experimentId } = event.pathParameters || {};
    
    if (!tenantId || !projectId || !experimentId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    // Get existing experiment
    const existingItem = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `EXPERIMENT#${experimentId}`,
    });

    if (!existingItem || existingItem.projectId !== projectId) {
      return notFoundResponse('Experiment not found', event.requestId);
    }

    if (existingItem.status !== 'draft') {
      return errorResponse('Only draft experiments can be started', 400, event.requestId);
    }

    // Validate that all required agents exist
    const configValidation = await validateExperimentAgents(existingItem.config, tenantId as string);
    if (!configValidation.isValid) {
      return errorResponse('Invalid experiment agents', 400, event.requestId, configValidation.errors);
    }

    const timestamp = generateTimestamp();
    const updatedItem = await updateItem({
      PK: `TENANT#${tenantId}`,
      SK: `EXPERIMENT#${experimentId}`,
    }, {
      status: 'running',
      updatedAt: timestamp,
    });

    // Here you would typically trigger the actual experiment execution
    // For now, we'll simulate it
    await simulateExperimentExecution(experimentId, existingItem.config);

    const experiment: Experiment = {
      id: updatedItem.id,
      projectId: updatedItem.projectId,
      tenantId: updatedItem.tenantId,
      name: updatedItem.name,
      description: updatedItem.description,
      type: updatedItem.type,
      status: updatedItem.status,
      config: updatedItem.config,
      results: updatedItem.results,
      createdBy: updatedItem.createdBy,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
      completedAt: updatedItem.completedAt,
    };

    return successResponse(experiment, event.requestId);

  } catch (error) {
    console.error('Start experiment error:', error);
    return errorResponse('Failed to start experiment', 500, event.requestId);
  }
};

/**
 * Get experiment results
 * GET /v1/tenants/{tenantId}/projects/{projectId}/experiments/{experimentId}/results
 */
export const getExperimentResults = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId, projectId, experimentId } = event.pathParameters || {};
    
    if (!tenantId || !projectId || !experimentId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    const item = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `EXPERIMENT#${experimentId}`,
    });

    if (!item || item.projectId !== projectId) {
      return notFoundResponse('Experiment not found', event.requestId);
    }

    if (!item.results) {
      return errorResponse('Experiment has no results yet', 404, event.requestId);
    }

    return successResponse(item.results, event.requestId);

  } catch (error) {
    console.error('Get experiment results error:', error);
    return errorResponse('Failed to get experiment results', 500, event.requestId);
  }
};

// Helper function to validate experiment configuration
function validateExperimentConfig(type: string, config: ExperimentConfig): { isValid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (!config.variants || !Array.isArray(config.variants) || config.variants.length === 0) {
    errors.push('Experiment must have at least one variant');
  }

  if (config.variants && config.variants.length > 10) {
    errors.push('Experiment cannot have more than 10 variants');
  }

  if (!config.metrics || !Array.isArray(config.metrics) || config.metrics.length === 0) {
    errors.push('Experiment must define at least one metric');
  }

  if (!config.sampleSize || config.sampleSize < 10) {
    errors.push('Experiment sample size must be at least 10');
  }

  if (config.sampleSize > 100000) {
    errors.push('Experiment sample size cannot exceed 100,000');
  }

  // Validate variants
  if (config.variants) {
    const totalWeight = config.variants.reduce((sum, variant) => sum + variant.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      errors.push('Variant weights must sum to 100');
    }

    const variantIds = new Set();
    for (const variant of config.variants) {
      if (!variant.id || !variant.name || !variant.agentId) {
        errors.push('All variants must have id, name, and agentId');
        break;
      }
      if (variantIds.has(variant.id)) {
        errors.push('Variant IDs must be unique');
        break;
      }
      variantIds.add(variant.id);
    }
  }

  // Type-specific validations
  switch (type) {
    case 'ab_test':
      if (config.variants && config.variants.length !== 2) {
        errors.push('A/B tests must have exactly 2 variants');
      }
      break;
    
    case 'prompt_optimization':
      if (!config.variants?.every(v => v.config?.systemPrompt)) {
        errors.push('Prompt optimization variants must include systemPrompt in config');
      }
      break;
    
    case 'model_comparison':
      if (!config.variants?.every(v => v.config?.model)) {
        errors.push('Model comparison variants must specify model in config');
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Helper function to validate experiment agents exist
async function validateExperimentAgents(config: ExperimentConfig, tenantId: string): Promise<{ isValid: boolean; errors?: string[] }> {
  const errors: string[] = [];

  try {
    for (const variant of config.variants) {
      const agentItem = await getItem({
        PK: `TENANT#${tenantId}`,
        SK: `AGENT#${variant.agentId}`,
      });

      if (!agentItem) {
        errors.push(`Agent ${variant.agentId} not found`);
      } else if (agentItem.status !== 'active') {
        errors.push(`Agent ${variant.agentId} is not active`);
      }
    }
  } catch (error) {
    errors.push('Failed to validate experiment agents');
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Simulate experiment execution (in real implementation, this would be async)
async function simulateExperimentExecution(experimentId: string, config: ExperimentConfig): Promise<void> {
  // This would typically:
  // 1. Create experiment runs for each variant
  // 2. Execute agents with test data
  // 3. Collect metrics and statistical analysis
  // 4. Update experiment with results
  
  // For simulation, we'll just log
  console.log(`Starting experiment ${experimentId} with ${config.variants.length} variants`);
}
