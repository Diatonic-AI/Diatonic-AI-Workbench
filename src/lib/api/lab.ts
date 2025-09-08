// Lab API Service for Models, Experiments, and Run Logs
import { 
  createDynamoDBOperations, 
  TABLE_NAMES, 
  GSI_NAMES, 
  LabModelRegistry,
  ExperimentRunLog,
  generateId, 
  getCurrentTenantId, 
  getCurrentUserId 
} from './dynamodb-client';

export interface CreateModelInput {
  model_name: string;
  provider: string;
  model_version: string;
  model_type: 'llm' | 'embedding' | 'image' | 'audio' | 'multimodal';
  description: string;
  parameters: unknown; // Will be JSON stringified
  is_public?: boolean;
  capabilities: string[];
  pricing_info?: unknown; // Will be JSON stringified
}

export interface CreateExperimentRunInput {
  experiment_name: string;
  model_id: string;
  dataset_id?: string;
  parameters: unknown; // Will be JSON stringified
}

export interface UpdateExperimentRunInput {
  status?: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  completed_at?: string;
  duration_seconds?: number;
  results?: unknown; // Will be JSON stringified
  error_message?: string;
  resource_usage?: unknown; // Will be JSON stringified
}

export interface LabFilter {
  provider?: string;
  model_type?: string;
  is_public?: boolean;
  tenant_id?: string;
  status?: string;
  limit?: number;
}

/**
 * Lab Service Class for managing models, experiments, and runs
 */
export class LabService {
  private dbOps: unknown;
  private initialized = false;

  private async ensureInitialized() {
    if (!this.initialized) {
      this.dbOps = await createDynamoDBOperations();
      this.initialized = true;
    }
  }

  // ==================== MODEL REGISTRY METHODS ====================

  /**
   * Create a new model in the registry
   */
  async createModel(input: CreateModelInput): Promise<LabModelRegistry> {
    await this.ensureInitialized();

    const model: LabModelRegistry = {
      model_id: generateId(),
      model_name: input.model_name,
      provider: input.provider,
      model_version: input.model_version,
      model_type: input.model_type,
      description: input.description,
      parameters: JSON.stringify(input.parameters),
      is_public: input.is_public ? 'true' : 'false',
      rating: 0,
      capabilities: input.capabilities,
      pricing_info: input.pricing_info ? JSON.stringify(input.pricing_info) : undefined,
      created_at: new Date().toISOString(),
      tenant_id: getCurrentTenantId(),
      created_by: getCurrentUserId(),
    };

    await this.dbOps.putItem(TABLE_NAMES.LAB_MODEL_REGISTRY, model);
    return model;
  }

  /**
   * Get a model by ID
   */
  async getModel(modelId: string): Promise<LabModelRegistry | null> {
    await this.ensureInitialized();

    return await this.dbOps.getItem<LabModelRegistry>(
      TABLE_NAMES.LAB_MODEL_REGISTRY,
      { model_id: modelId }
    );
  }

  /**
   * Get models by provider
   */
  async getModelsByProvider(provider: string, limit: number = 20): Promise<LabModelRegistry[]> {
    await this.ensureInitialized();

    return await this.dbOps.queryGSI<LabModelRegistry>(
      TABLE_NAMES.LAB_MODEL_REGISTRY,
      GSI_NAMES.PROVIDER_MODELS,
      'provider = :provider',
      { ':provider': provider },
      undefined,
      limit,
      false // Sort by created_at descending
    );
  }

  /**
   * Get tenant-specific models
   */
  async getTenantModels(tenantId?: string, limit: number = 20): Promise<LabModelRegistry[]> {
    await this.ensureInitialized();

    const targetTenantId = tenantId || getCurrentTenantId();

    return await this.dbOps.queryGSI<LabModelRegistry>(
      TABLE_NAMES.LAB_MODEL_REGISTRY,
      GSI_NAMES.TENANT_MODELS,
      'tenant_id = :tenant_id',
      { ':tenant_id': targetTenantId },
      undefined,
      limit,
      false // Sort by created_at descending
    );
  }

  /**
   * Get public models by rating
   */
  async getPublicModels(limit: number = 20): Promise<LabModelRegistry[]> {
    await this.ensureInitialized();

    return await this.dbOps.queryGSI<LabModelRegistry>(
      TABLE_NAMES.LAB_MODEL_REGISTRY,
      GSI_NAMES.PUBLIC_MODELS,
      'is_public = :is_public',
      { ':is_public': 'true' },
      undefined,
      limit,
      false // Sort by rating descending
    );
  }

  /**
   * Search models with filters
   */
  async searchModels(filters: LabFilter): Promise<LabModelRegistry[]> {
    await this.ensureInitialized();

    const limit = filters.limit || 20;
    
    // Use GSI when possible for better performance
    if (filters.provider) {
      return this.getModelsByProvider(filters.provider, limit);
    }

    if (filters.is_public === true) {
      return this.getPublicModels(limit);
    }

    if (filters.tenant_id || !filters.is_public) {
      return this.getTenantModels(filters.tenant_id, limit);
    }

    // Default to scan with filters
    const filterExpression = {};
    const filterParts: string[] = [];

    if (filters.model_type) {
      filterParts.push('model_type = :model_type');
      expressionAttributeValues[':model_type'] = filters.model_type;
    }

    if (filters.is_public !== undefined) {
      filterParts.push('is_public = :is_public');
      expressionAttributeValues[':is_public'] = filters.is_public ? 'true' : 'false';
    }

    if (filterParts.length > 0) {
      filterExpression = filterParts.join(' AND ');
    }

    return await this.dbOps.scanTable<LabModelRegistry>(
      TABLE_NAMES.LAB_MODEL_REGISTRY,
      filterExpression,
      Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
      undefined,
      limit
    );
  }

  /**
   * Update model rating
   */
  async updateModelRating(modelId: string, newRating: number): Promise<void> {
    await this.ensureInitialized();

    if (newRating < 0 || newRating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }

    await this.dbOps.updateItem(
      TABLE_NAMES.LAB_MODEL_REGISTRY,
      { model_id: modelId },
      'SET rating = :rating, updated_at = :updated_at',
      {
        ':rating': newRating,
        ':updated_at': new Date().toISOString(),
      }
    );
  }

  // ==================== EXPERIMENT RUN METHODS ====================

  /**
   * Create a new experiment run
   */
  async createExperimentRun(input: CreateExperimentRunInput): Promise<ExperimentRunLog> {
    await this.ensureInitialized();

    const experimentId = generateId();
    const run: ExperimentRunLog = {
      run_id: generateId(),
      experiment_id: experimentId,
      experiment_name: input.experiment_name,
      model_id: input.model_id,
      dataset_id: input.dataset_id,
      status: 'queued',
      started_at: new Date().toISOString(),
      parameters: JSON.stringify(input.parameters),
      results: JSON.stringify({}),
      created_at: new Date().toISOString(),
      tenant_id: getCurrentTenantId(),
      created_by: getCurrentUserId(),
    };

    await this.dbOps.putItem(TABLE_NAMES.EXPERIMENT_RUN_LOGS, run);
    return run;
  }

  /**
   * Get an experiment run by ID
   */
  async getExperimentRun(runId: string): Promise<ExperimentRunLog | null> {
    await this.ensureInitialized();

    return await this.dbOps.getItem<ExperimentRunLog>(
      TABLE_NAMES.EXPERIMENT_RUN_LOGS,
      { run_id: runId }
    );
  }

  /**
   * Update an experiment run
   */
  async updateExperimentRun(runId: string, input: UpdateExperimentRunInput): Promise<ExperimentRunLog | null> {
    await this.ensureInitialized();

    const updateExpressionParts: string[] = [];
    const expressionAttributeValues: Record<string, any> = {
      ':updated_at': new Date().toISOString(),
    };

    if (input.status) {
      updateExpressionParts.push('#status = :status');
      expressionAttributeValues[':status'] = input.status;
    }

    if (input.completed_at) {
      updateExpressionParts.push('completed_at = :completed_at');
      expressionAttributeValues[':completed_at'] = input.completed_at;
    }

    if (input.duration_seconds) {
      updateExpressionParts.push('duration_seconds = :duration_seconds');
      expressionAttributeValues[':duration_seconds'] = input.duration_seconds;
    }

    if (input.results) {
      updateExpressionParts.push('#results = :results');
      expressionAttributeValues[':results'] = JSON.stringify(input.results);
    }

    if (input.error_message) {
      updateExpressionParts.push('error_message = :error_message');
      expressionAttributeValues[':error_message'] = input.error_message;
    }

    if (input.resource_usage) {
      updateExpressionParts.push('resource_usage = :resource_usage');
      expressionAttributeValues[':resource_usage'] = JSON.stringify(input.resource_usage);
    }

    if (updateExpressionParts.length === 0) {
      throw new Error('No update fields provided');
    }

    const updateExpression = `SET ${updateExpressionParts.join(', ')}, updated_at = :updated_at`;
    const expressionAttributeNames: Record<string, string> = {};

    if (input.status) {
      expressionAttributeNames['#status'] = 'status';
    }
    if (input.results) {
      expressionAttributeNames['#results'] = 'results';
    }

    return await this.dbOps.updateItem<ExperimentRunLog>(
      TABLE_NAMES.EXPERIMENT_RUN_LOGS,
      { run_id: runId },
      updateExpression,
      expressionAttributeValues,
      Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined
    );
  }

  /**
   * Get experiment runs by experiment ID
   */
  async getExperimentRuns(experimentId: string, limit: number = 20): Promise<ExperimentRunLog[]> {
    await this.ensureInitialized();

    return await this.dbOps.queryGSI<ExperimentRunLog>(
      TABLE_NAMES.EXPERIMENT_RUN_LOGS,
      GSI_NAMES.EXPERIMENT_RUNS,
      'experiment_id = :experiment_id',
      { ':experiment_id': experimentId },
      undefined,
      limit,
      false // Sort by started_at descending
    );
  }

  /**
   * Get tenant experiment runs
   */
  async getTenantExperimentRuns(tenantId?: string, limit: number = 20): Promise<ExperimentRunLog[]> {
    await this.ensureInitialized();

    const targetTenantId = tenantId || getCurrentTenantId();

    return await this.dbOps.queryGSI<ExperimentRunLog>(
      TABLE_NAMES.EXPERIMENT_RUN_LOGS,
      GSI_NAMES.TENANT_EXPERIMENTS,
      'tenant_id = :tenant_id',
      { ':tenant_id': targetTenantId },
      undefined,
      limit,
      false // Sort by started_at descending
    );
  }

  /**
   * Get experiment runs by status
   */
  async getExperimentRunsByStatus(
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled',
    limit: number = 20
  ): Promise<ExperimentRunLog[]> {
    await this.ensureInitialized();

    return await this.dbOps.queryGSI<ExperimentRunLog>(
      TABLE_NAMES.EXPERIMENT_RUN_LOGS,
      GSI_NAMES.STATUS_RUNS,
      '#status = :status',
      { ':status': status },
      { '#status': 'status' },
      limit,
      false // Sort by started_at descending
    );
  }

  /**
   * Get running experiments (for monitoring)
   */
  async getRunningExperiments(limit: number = 50): Promise<ExperimentRunLog[]> {
    return this.getExperimentRunsByStatus('running', limit);
  }

  /**
   * Cancel an experiment run
   */
  async cancelExperimentRun(runId: string): Promise<void> {
    await this.ensureInitialized();

    await this.updateExperimentRun(runId, {
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    });
  }

  /**
   * Mark experiment as completed with results
   */
  async completeExperimentRun(
    runId: string, 
    results: any, 
    resourceUsage?: any
  ): Promise<void> {
    const run = await this.getExperimentRun(runId);
    if (!run) {
      throw new Error('Experiment run not found');
    }

    const startedAt = new Date(run.started_at);
    const completedAt = new Date();
    const durationSeconds = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);

    await this.updateExperimentRun(runId, {
      status: 'completed',
      completed_at: completedAt.toISOString(),
      duration_seconds: durationSeconds,
      results,
      resource_usage: resourceUsage,
    });
  }

  /**
   * Mark experiment as failed with error
   */
  async failExperimentRun(runId: string, errorMessage: string): Promise<void> {
    await this.updateExperimentRun(runId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    });
  }

  // ==================== ANALYTICS AND INSIGHTS ====================

  /**
   * Get experiment statistics for a tenant
   */
  async getExperimentStats(tenantId?: string): Promise<{
    total: number;
    by_status: Record<string, number>;
    recent_runs: number;
    avg_duration: number;
  }> {
    await this.ensureInitialized();

    const runs = await this.getTenantExperimentRuns(tenantId, 100);
    
    const stats = {
      total: runs.length,
      by_status: {} as Record<string, number>,
      recent_runs: 0,
      avg_duration: 0,
    };

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const totalDuration = 0;
    const completedRuns = 0;

    runs.forEach(run => {
      // Count by status
      stats.by_status[run.status] = (stats.by_status[run.status] || 0) + 1;

      // Count recent runs
      if (new Date(run.started_at) > oneDayAgo) {
        stats.recent_runs++;
      }

      // Calculate average duration for completed runs
      if (run.status === 'completed' && run.duration_seconds) {
        totalDuration += run.duration_seconds;
        completedRuns++;
      }
    });

    stats.avg_duration = completedRuns > 0 ? Math.round(totalDuration / completedRuns) : 0;

    return stats;
  }

  /**
   * Get popular models (by experiment usage)
   */
  async getPopularModels(limit: number = 10): Promise<{ model_id: string; experiment_count: number }[]> {
    await this.ensureInitialized();

    const runs = await this.dbOps.scanTable<ExperimentRunLog>(
      TABLE_NAMES.EXPERIMENT_RUN_LOGS,
      undefined,
      undefined,
      undefined,
      1000 // Scan more for better analytics
    );

    const modelUsage = new Map<string, number>();
    runs.forEach(run => {
      const count = modelUsage.get(run.model_id) || 0;
      modelUsage.set(run.model_id, count + 1);
    });

    return Array.from(modelUsage.entries())
      .map(([model_id, experiment_count]) => ({ model_id, experiment_count }))
      .sort((a, b) => b.experiment_count - a.experiment_count)
      .slice(0, limit);
  }
}

// Export a singleton instance
export const labService = new LabService();
export default labService;
