// AI Nexus Workbench - Dataset Management API Handlers

import { APIRequest, APIResponse, Dataset, DatasetConfig, DatasetMetadata, PaginatedResponse } from '../types';
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
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * List datasets for a project
 * GET /v1/tenants/{tenantId}/projects/{projectId}/datasets
 */
export const listDatasets = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId, projectId } = event.pathParameters || {};
    const { limit = 20, nextToken, status, type } = event.queryStringParameters || {};

    // Validate parameters
    if (!tenantId || !projectId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    // Query datasets for the project
    const gsi1Keys = generateGSI1Keys('PROJECT', projectId, 'DATASET');
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

    const datasets = result.items.map(item => ({
      id: item.id,
      projectId: item.projectId,
      tenantId: item.tenantId,
      name: item.name,
      description: item.description,
      type: item.type,
      status: item.status,
      config: item.config,
      metadata: item.metadata,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    const response: PaginatedResponse<Dataset> = {
      items: datasets,
      pagination: {
        nextToken: result.nextToken,
        hasMore: !!result.nextToken,
        limit: parseInt(limit as string),
      },
      requestId: event.requestId,
    };

    return successResponse(response, event.requestId);

  } catch (error) {
    console.error('List datasets error:', error);
    return errorResponse('Failed to list datasets', 500, event.requestId);
  }
};

/**
 * Get a specific dataset
 * GET /v1/tenants/{tenantId}/projects/{projectId}/datasets/{datasetId}
 */
export const getDataset = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId, projectId, datasetId } = event.pathParameters || {};

    if (!tenantId || !projectId || !datasetId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    const item = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `DATASET#${datasetId}`,
    });

    if (!item || item.projectId !== projectId) {
      return notFoundResponse('Dataset not found', event.requestId);
    }

    const dataset: Dataset = {
      id: item.id,
      projectId: item.projectId,
      tenantId: item.tenantId,
      name: item.name,
      description: item.description,
      type: item.type,
      status: item.status,
      config: item.config,
      metadata: item.metadata,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };

    return successResponse(dataset, event.requestId);

  } catch (error) {
    console.error('Get dataset error:', error);
    return errorResponse('Failed to get dataset', 500, event.requestId);
  }
};

/**
 * Create a new dataset
 * POST /v1/tenants/{tenantId}/projects/{projectId}/datasets
 */
export const createDataset = async (event: APIRequest): Promise<APIResponse> => {
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
        enum: ['training', 'validation', 'test', 'evaluation', 'reference']
      },
      config: { type: 'object', required: true },
      description: { type: 'string', maxLength: 500 },
    });

    if (!validationResult.isValid) {
      return errorResponse('Invalid request data', 400, event.requestId, validationResult.errors);
    }

    // Validate dataset config
    const configValidation = validateDatasetConfig(body.config);
    if (!configValidation.isValid) {
      return errorResponse('Invalid dataset configuration', 400, event.requestId, configValidation.errors);
    }

    const datasetId = generateId();
    const timestamp = generateTimestamp();
    const gsi1Keys = generateGSI1Keys('PROJECT', projectId, 'DATASET');

    // Initialize dataset metadata
    const metadata: DatasetMetadata = {
      recordCount: 0,
      sizeBytes: 0,
      version: '1.0.0',
      checksum: '',
      s3Location: `datasets/${tenantId}/${projectId}/${datasetId}/`,
      lastValidated: null,
      processingLog: [{
        timestamp: timestamp,
        operation: 'create',
        status: 'success',
        message: 'Dataset created successfully',
      }],
    };

    const datasetItem = {
      PK: `TENANT#${tenantId}`,
      SK: `DATASET#${datasetId}`,
      GSI1PK: gsi1Keys.GSI1PK,
      GSI1SK: gsi1Keys.GSI1SK,
      entityType: 'DATASET',
      tenantId: tenantId as string,
      id: datasetId,
      projectId: projectId as string,
      name: body.name,
      description: body.description || null,
      type: body.type,
      status: 'processing',
      config: body.config,
      metadata,
      createdBy: event.userId || 'system',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await createItem(datasetItem);

    const dataset: Dataset = {
      id: datasetId,
      projectId: projectId as string,
      tenantId: tenantId as string,
      name: body.name,
      description: body.description,
      type: body.type,
      status: 'processing',
      config: body.config,
      metadata,
      createdBy: event.userId || 'system',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    return createdResponse(dataset, event.requestId);

  } catch (error) {
    console.error('Create dataset error:', error);
    return errorResponse('Failed to create dataset', 500, event.requestId);
  }
};

/**
 * Update a dataset
 * PUT /v1/tenants/{tenantId}/projects/{projectId}/datasets/{datasetId}
 */
export const updateDataset = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId, projectId, datasetId } = event.pathParameters || {};
    
    if (!tenantId || !projectId || !datasetId) {
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
      config: { type: 'object' },
    });

    if (!validationResult.isValid) {
      return errorResponse('Invalid request data', 400, event.requestId, validationResult.errors);
    }

    // Get existing dataset
    const existingItem = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `DATASET#${datasetId}`,
    });

    if (!existingItem || existingItem.projectId !== projectId) {
      return notFoundResponse('Dataset not found', event.requestId);
    }

    // Don't allow config changes on processing datasets
    if (existingItem.status === 'processing' && body.config) {
      return errorResponse('Cannot modify config of processing dataset', 400, event.requestId);
    }

    // Validate config if provided
    if (body.config) {
      const configValidation = validateDatasetConfig(body.config);
      if (!configValidation.isValid) {
        return errorResponse('Invalid dataset configuration', 400, event.requestId, configValidation.errors);
      }
    }

    const timestamp = generateTimestamp();
    const updateData: Record<string, unknown> = {
      updatedAt: timestamp,
    };

    // Add fields that can be updated
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.config !== undefined) updateData.config = body.config;

    // Update processing log
    const processingLog = [...(existingItem.metadata?.processingLog || [])];
    processingLog.push({
      timestamp,
      operation: 'update',
      status: 'success',
      message: 'Dataset configuration updated',
    });
    
    updateData.metadata = {
      ...existingItem.metadata,
      processingLog,
    };

    const updatedItem = await updateItem({
      PK: `TENANT#${tenantId}`,
      SK: `DATASET#${datasetId}`,
    }, updateData);

    const dataset: Dataset = {
      id: updatedItem.id,
      projectId: updatedItem.projectId,
      tenantId: updatedItem.tenantId,
      name: updatedItem.name,
      description: updatedItem.description,
      type: updatedItem.type,
      status: updatedItem.status,
      config: updatedItem.config,
      metadata: updatedItem.metadata,
      createdBy: updatedItem.createdBy,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
    };

    return successResponse(dataset, event.requestId);

  } catch (error) {
    console.error('Update dataset error:', error);
    return errorResponse('Failed to update dataset', 500, event.requestId);
  }
};

/**
 * Delete a dataset
 * DELETE /v1/tenants/{tenantId}/projects/{projectId}/datasets/{datasetId}
 */
export const deleteDataset = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId, projectId, datasetId } = event.pathParameters || {};
    
    if (!tenantId || !projectId || !datasetId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    // Get existing dataset to verify ownership
    const existingItem = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `DATASET#${datasetId}`,
    });

    if (!existingItem || existingItem.projectId !== projectId) {
      return notFoundResponse('Dataset not found', event.requestId);
    }

    // Don't allow deletion of processing datasets
    if (existingItem.status === 'processing') {
      return errorResponse('Cannot delete processing dataset', 400, event.requestId);
    }

    // Delete S3 objects if they exist
    if (existingItem.metadata?.s3Location && event.context?.clients?.s3) {
      try {
        // In a real implementation, you'd list and delete all objects in the prefix
        const s3Key = `${existingItem.metadata.s3Location}data.json`;
        await event.context.clients.s3.send(new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: s3Key,
        }));
      } catch (s3Error) {
        console.error('Failed to delete S3 objects:', s3Error);
        // Continue with database deletion even if S3 deletion fails
      }
    }

    await deleteItem({
      PK: `TENANT#${tenantId}`,
      SK: `DATASET#${datasetId}`,
    });

    return successResponse({ deleted: true }, event.requestId);

  } catch (error) {
    console.error('Delete dataset error:', error);
    return errorResponse('Failed to delete dataset', 500, event.requestId);
  }
};

/**
 * Get dataset upload URL for file uploads
 * POST /v1/tenants/{tenantId}/projects/{projectId}/datasets/{datasetId}/upload
 */
export const getDatasetUploadUrl = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId, projectId, datasetId } = event.pathParameters || {};
    
    if (!tenantId || !projectId || !datasetId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    const body = parseRequestBody(event);
    if (!body) {
      return errorResponse('Request body is required', 400, event.requestId);
    }

    const validationResult = validateRequest(body, {
      filename: { type: 'string', required: true, minLength: 1 },
      contentType: { type: 'string', required: true },
      size: { type: 'number', required: true, min: 1, max: 1000000000 }, // Max 1GB
    });

    if (!validationResult.isValid) {
      return errorResponse('Invalid request data', 400, event.requestId, validationResult.errors);
    }

    // Verify dataset exists
    const datasetItem = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `DATASET#${datasetId}`,
    });

    if (!datasetItem || datasetItem.projectId !== projectId) {
      return notFoundResponse('Dataset not found', event.requestId);
    }

    // Generate S3 key
    const s3Key = `${datasetItem.metadata.s3Location}${body.filename}`;
    
    // Generate presigned URL for upload
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || 'ai-nexus-workbench-datasets',
      Key: s3Key,
      ContentType: body.contentType,
      ContentLength: body.size,
      Metadata: {
        tenantId: tenantId as string,
        projectId: projectId as string,
        datasetId: datasetId as string,
        uploadedBy: event.userId || 'system',
      },
    });

    const uploadUrl = await getSignedUrl(event.context?.clients?.s3, uploadCommand, {
      expiresIn: 3600, // 1 hour
    });

    return successResponse({
      uploadUrl,
      s3Key,
      expiresIn: 3600,
      uploadInstructions: {
        method: 'PUT',
        headers: {
          'Content-Type': body.contentType,
          'Content-Length': body.size.toString(),
        },
      },
    }, event.requestId);

  } catch (error) {
    console.error('Get upload URL error:', error);
    return errorResponse('Failed to generate upload URL', 500, event.requestId);
  }
};

/**
 * Process uploaded dataset file
 * POST /v1/tenants/{tenantId}/projects/{projectId}/datasets/{datasetId}/process
 */
export const processDataset = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId, projectId, datasetId } = event.pathParameters || {};
    
    if (!tenantId || !projectId || !datasetId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    const body = parseRequestBody(event);
    if (!body) {
      return errorResponse('Request body is required', 400, event.requestId);
    }

    const validationResult = validateRequest(body, {
      s3Key: { type: 'string', required: true },
      validateSchema: { type: 'boolean' },
      applyPreprocessing: { type: 'boolean' },
    });

    if (!validationResult.isValid) {
      return errorResponse('Invalid request data', 400, event.requestId, validationResult.errors);
    }

    // Verify dataset exists
    const datasetItem = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `DATASET#${datasetId}`,
    });

    if (!datasetItem || datasetItem.projectId !== projectId) {
      return notFoundResponse('Dataset not found', event.requestId);
    }

    // Update dataset status to processing
    const timestamp = generateTimestamp();
    const processingLog = [...(datasetItem.metadata?.processingLog || [])];
    processingLog.push({
      timestamp,
      operation: 'process_start',
      status: 'success',
      message: `Started processing file: ${body.s3Key}`,
    });

    await updateItem({
      PK: `TENANT#${tenantId}`,
      SK: `DATASET#${datasetId}`,
    }, {
      status: 'processing',
      updatedAt: timestamp,
      metadata: {
        ...datasetItem.metadata,
        processingLog,
      },
    });

    // Simulate dataset processing (in real implementation, this would be async)
    const processingResult = await simulateDatasetProcessing(
      body.s3Key, 
      datasetItem.config,
      body.validateSchema,
      body.applyPreprocessing
    );

    // Update dataset with processing results
    const finalProcessingLog = [...processingLog];
    finalProcessingLog.push({
      timestamp: generateTimestamp(),
      operation: 'process_complete',
      status: processingResult.success ? 'success' : 'error',
      message: processingResult.message,
      details: processingResult.details,
    });

    await updateItem({
      PK: `TENANT#${tenantId}`,
      SK: `DATASET#${datasetId}`,
    }, {
      status: processingResult.success ? 'ready' : 'error',
      updatedAt: generateTimestamp(),
      metadata: {
        ...datasetItem.metadata,
        recordCount: processingResult.recordCount || 0,
        sizeBytes: processingResult.sizeBytes || 0,
        checksum: processingResult.checksum || '',
        lastValidated: processingResult.success ? generateTimestamp() : null,
        processingLog: finalProcessingLog,
      },
    });

    return successResponse(processingResult, event.requestId);

  } catch (error) {
    console.error('Process dataset error:', error);
    return errorResponse('Failed to process dataset', 500, event.requestId);
  }
};

/**
 * Validate dataset schema and content
 * POST /v1/tenants/{tenantId}/projects/{projectId}/datasets/{datasetId}/validate
 */
export const validateDatasetSchema = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId, projectId, datasetId } = event.pathParameters || {};
    
    if (!tenantId || !projectId || !datasetId) {
      return errorResponse('Missing required path parameters', 400, event.requestId);
    }

    // Verify dataset exists
    const datasetItem = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `DATASET#${datasetId}`,
    });

    if (!datasetItem || datasetItem.projectId !== projectId) {
      return notFoundResponse('Dataset not found', event.requestId);
    }

    if (datasetItem.status !== 'ready') {
      return errorResponse('Dataset must be ready for validation', 400, event.requestId);
    }

    // Simulate schema validation
    const validationResult = await simulateSchemaValidation(datasetItem);

    // Update dataset with validation results
    const timestamp = generateTimestamp();
    const processingLog = [...(datasetItem.metadata?.processingLog || [])];
    processingLog.push({
      timestamp,
      operation: 'validate',
      status: validationResult.isValid ? 'success' : 'warning',
      message: validationResult.message,
      details: validationResult.details,
    });

    await updateItem({
      PK: `TENANT#${tenantId}`,
      SK: `DATASET#${datasetId}`,
    }, {
      updatedAt: timestamp,
      metadata: {
        ...datasetItem.metadata,
        lastValidated: timestamp,
        processingLog,
      },
    });

    return successResponse(validationResult, event.requestId);

  } catch (error) {
    console.error('Validate dataset error:', error);
    return errorResponse('Failed to validate dataset', 500, event.requestId);
  }
};

// Helper function to validate dataset configuration
function validateDatasetConfig(config: DatasetConfig): { isValid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (!config.format) {
    errors.push('Dataset format is required');
  } else if (!['json', 'jsonl', 'csv', 'parquet', 'text'].includes(config.format)) {
    errors.push('Invalid dataset format');
  }

  if (config.schema) {
    if (!config.schema.fields || !Array.isArray(config.schema.fields)) {
      errors.push('Schema fields must be an array');
    } else {
      for (const field of config.schema.fields) {
        if (!field.name || !field.type) {
          errors.push('Schema fields must have name and type');
          break;
        }
      }
    }
  }

  if (config.validation) {
    if (!config.validation.rules || !Array.isArray(config.validation.rules)) {
      errors.push('Validation rules must be an array');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Simulate dataset processing (in real implementation, this would be a separate service)
async function simulateDatasetProcessing(
  s3Key: string,
  config: DatasetConfig,
  validateSchema = true,
  applyPreprocessing = true
): Promise<{
  success: boolean;
  message: string;
  recordCount: number;
  sizeBytes: number;
  checksum: string;
  details: Record<string, unknown>;
}> {
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate processing results
  const recordCount = Math.floor(Math.random() * 10000) + 100;
  const sizeBytes = recordCount * 256; // Approximate size
  
  return {
    success: true,
    message: 'Dataset processed successfully',
    recordCount,
    sizeBytes,
    checksum: `sha256-${Math.random().toString(36).substring(2)}`,
    details: {
      validationPassed: validateSchema,
      preprocessingApplied: applyPreprocessing,
      format: config.format,
      recordsProcessed: recordCount,
      recordsSkipped: Math.floor(recordCount * 0.01), // 1% skipped
      processingTimeMs: 5000,
    },
  };
}

// Simulate schema validation
async function simulateSchemaValidation(datasetItem: Record<string, unknown>): Promise<{
  isValid: boolean;
  message: string;
  details: {
    totalRecords: number;
    validRecords: number;
    violations: Array<{ field: string; issue: string; count: number }>;
    validationRules: number;
  };
}> {
  const violations = Math.floor(Math.random() * 10);
  
  return {
    isValid: violations === 0,
    message: violations === 0 ? 'Schema validation passed' : `Found ${violations} schema violations`,
    details: {
      totalRecords: datasetItem.metadata?.recordCount || 0,
      validRecords: (datasetItem.metadata?.recordCount || 0) - violations,
      violations: violations > 0 ? [
        { field: 'email', issue: 'Invalid format', count: Math.ceil(violations / 2) },
        { field: 'age', issue: 'Out of range', count: Math.floor(violations / 2) },
      ] : [],
      validationRules: datasetItem.config?.validation?.rules?.length || 0,
    },
  };
}
