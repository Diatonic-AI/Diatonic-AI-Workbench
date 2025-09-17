// AWS DynamoDB Client Configuration for Diatonic AI
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import { awsConfig, getEnvironment } from '../aws-config';

/**
 * DynamoDB table names for the current environment
 */
export const TABLE_NAMES = {
  AGENT_TEMPLATES: `dev-ai-nexus-agent-templates`,
  FLOW_NODE_CONFIGS: `dev-ai-nexus-flow-node-configs`,
  AGENT_EXECUTION_HISTORY: `dev-ai-nexus-agent-execution-history`,
  LAB_MODEL_REGISTRY: `dev-ai-nexus-lab-model-registry`,
  EXPERIMENT_RUN_LOGS: `dev-ai-nexus-experiment-run-logs`,
} as const;

/**
 * DynamoDB Global Secondary Index names
 */
export const GSI_NAMES = {
  // Agent Templates GSIs
  POPULAR_TEMPLATES: 'popular-templates-index',
  TENANT_TEMPLATES: 'tenant-templates-index',
  CATEGORY_RATING: 'category-rating-index',
  PUBLIC_USAGE: 'public-usage-index',
  
  // Flow Node Configs GSIs
  TEMPLATE_NODES: 'template-nodes-index',
  TENANT_FLOWS: 'tenant-flows-index',
  
  // Agent Execution History GSIs
  AGENT_EXECUTIONS: 'agent-executions-index',
  TENANT_HISTORY: 'tenant-history-index',
  STATUS_EXECUTIONS: 'status-executions-index',
  
  // Lab Model Registry GSIs
  PROVIDER_MODELS: 'provider-models-index',
  TENANT_MODELS: 'tenant-models-index',
  PUBLIC_MODELS: 'public-models-index',
  
  // Experiment Run Logs GSIs
  EXPERIMENT_RUNS: 'experiment-runs-index',
  TENANT_EXPERIMENTS: 'tenant-experiments-index',
  STATUS_RUNS: 'status-runs-index',
} as const;

/**
 * Initialize DynamoDB client with Cognito credentials
 */
let dynamodbClient: DynamoDBDocumentClient | null = null;

export const initializeDynamoDBClient = async (): Promise<DynamoDBDocumentClient> => {
  if (dynamodbClient) {
    return dynamodbClient;
  }

  try {
    const clientConfig: any = {
      region: awsConfig.region,
    };
    
    // Add development endpoint if available
    if (awsConfig.dynamodb?.endpoint) {
      clientConfig.endpoint = awsConfig.dynamodb.endpoint;
      // Use fake credentials for local DynamoDB
      clientConfig.credentials = {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      };
    } else {
      // Use Cognito credentials for production
      clientConfig.credentials = fromCognitoIdentityPool({
        clientConfig: { region: awsConfig.region },
        identityPoolId: awsConfig.cognito.identityPoolId,
      });
    }
    
    const client = new DynamoDBClient(clientConfig);

    dynamodbClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });

    console.log('✅ DynamoDB client initialized successfully');
    return dynamodbClient;
  } catch (error) {
    console.error('❌ Failed to initialize DynamoDB client:', error);
    throw new Error('Failed to initialize DynamoDB client');
  }
};

/**
 * Get the initialized DynamoDB client
 */
export const getDynamoDBClient = (): DynamoDBDocumentClient => {
  if (!dynamodbClient) {
    throw new Error('DynamoDB client not initialized. Call initializeDynamoDBClient() first.');
  }
  return dynamodbClient;
};

/**
 * Base interface for all DynamoDB items
 */
export interface BaseDynamoDBItem {
  created_at: string;
  updated_at?: string;
  tenant_id?: string;
  created_by: string;
  updated_by?: string;
}

/**
 * Agent Template interface
 */
export interface AgentTemplate extends BaseDynamoDBItem {
  template_id: string;
  template_name: string;
  description: string;
  template_type: 'conversational' | 'task-based' | 'analytical' | 'creative';
  category: string;
  configuration: string; // JSON string of template configuration
  is_public: string; // 'true' or 'false' for GSI compatibility
  usage_count: number;
  rating?: number;
  tags?: string[];
}

/**
 * Flow Node Configuration interface
 */
export interface FlowNodeConfig extends BaseDynamoDBItem {
  node_id: string;
  template_id?: string;
  node_type: 'trigger' | 'llm' | 'output' | 'transform' | 'decision';
  node_configuration: string; // JSON string of node properties
  position: number;
  connections: string; // JSON string of input/output connections
}

/**
 * Agent Execution History interface
 */
export interface AgentExecutionHistory extends BaseDynamoDBItem {
  execution_id: string;
  agent_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  execution_metrics: string; // JSON string of performance metrics
  error_details?: string;
  input_data?: string; // JSON string of input
  output_data?: string; // JSON string of output
}

/**
 * Lab Model Registry interface
 */
export interface LabModelRegistry extends BaseDynamoDBItem {
  model_id: string;
  model_name: string;
  provider: string; // OpenAI, Anthropic, HuggingFace, etc.
  model_version: string;
  model_type: 'llm' | 'embedding' | 'image' | 'audio' | 'multimodal';
  description: string;
  parameters: string; // JSON string of model parameters
  is_public: string; // 'true' or 'false' for GSI compatibility
  rating?: number;
  capabilities: string[]; // Array of capability tags
  pricing_info?: string; // JSON string of pricing details
}

/**
 * Experiment Run Logs interface
 */
export interface ExperimentRunLog extends BaseDynamoDBItem {
  run_id: string;
  experiment_id: string;
  experiment_name: string;
  model_id: string;
  dataset_id?: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  results: string; // JSON string of experiment results
  parameters: string; // JSON string of experiment parameters
  error_message?: string;
  resource_usage?: string; // JSON string of compute resource usage
}

/**
 * Generic DynamoDB operations class
 */
export class DynamoDBOperations {
  private client: DynamoDBDocumentClient;

  constructor(client: DynamoDBDocumentClient) {
    this.client = client;
  }

  /**
   * Put an item into a table
   */
  async putItem<T extends Record<string, any>>(tableName: string, item: T): Promise<void> {
    try {
      await this.client.send(new PutCommand({
        TableName: tableName,
        Item: {
          ...item,
          updated_at: new Date().toISOString(),
        },
      }));
    } catch (error) {
      console.error(`Error putting item to ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get an item from a table
   */
  async getItem<T>(tableName: string, key: Record<string, any>): Promise<T | null> {
    try {
      const result = await this.client.send(new GetCommand({
        TableName: tableName,
        Key: key,
      }));
      return result.Item as T || null;
    } catch (error) {
      console.error(`Error getting item from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Update an item in a table
   */
  async updateItem<T>(
    tableName: string,
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeValues: Record<string, any>,
    expressionAttributeNames?: Record<string, string>
  ): Promise<T | null> {
    try {
      const result = await this.client.send(new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: {
          ...expressionAttributeValues,
          ':updated_at': new Date().toISOString(),
        },
        ExpressionAttributeNames: expressionAttributeNames,
        ReturnValues: 'ALL_NEW',
      }));
      return result.Attributes as T || null;
    } catch (error) {
      console.error(`Error updating item in ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Delete an item from a table
   */
  async deleteItem(tableName: string, key: Record<string, any>): Promise<void> {
    try {
      await this.client.send(new DeleteCommand({
        TableName: tableName,
        Key: key,
      }));
    } catch (error) {
      console.error(`Error deleting item from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Query items with a GSI
   */
  async queryGSI<T>(
    tableName: string,
    indexName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    expressionAttributeNames?: Record<string, string>,
    limit?: number,
    scanIndexForward: boolean = false
  ): Promise<T[]> {
    try {
      const result = await this.client.send(new QueryCommand({
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        Limit: limit,
        ScanIndexForward: scanIndexForward,
      }));
      return result.Items as T[] || [];
    } catch (error) {
      console.error(`Error querying GSI ${indexName} on ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Scan items from a table with optional filters
   */
  async scanTable<T>(
    tableName: string,
    filterExpression?: string,
    expressionAttributeValues?: Record<string, any>,
    expressionAttributeNames?: Record<string, string>,
    limit?: number
  ): Promise<T[]> {
    try {
      const result = await this.client.send(new ScanCommand({
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        Limit: limit,
      }));
      return result.Items as T[] || [];
    } catch (error) {
      console.error(`Error scanning table ${tableName}:`, error);
      throw error;
    }
  }
}

/**
 * Initialize and export DynamoDB operations instance
 */
export const createDynamoDBOperations = async (): Promise<DynamoDBOperations> => {
  const client = await initializeDynamoDBClient();
  return new DynamoDBOperations(client);
};

/**
 * Utility function to generate ULID for new items
 */
export const generateId = (): string => {
  // Simple ULID-like ID generation (timestamp + random)
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `${timestamp}${random}`.toUpperCase();
};

/**
 * Utility function to get current tenant ID from auth context
 * This should be replaced with actual tenant resolution logic
 */
export const getCurrentTenantId = (): string => {
  // For development, use a consistent tenant ID
  // In production, this would be resolved from the authenticated user's context
  const env = import.meta.env.VITE_NODE_ENV || import.meta.env.NODE_ENV || 'development';
  if (env === 'development') {
    return 'dev-tenant';
  }
  return 'default-tenant';
};

/**
 * Utility function to get current user ID from auth context
 * This should be replaced with actual user resolution logic  
 */
export const getCurrentUserId = (): string => {
  // TODO: Replace with actual user resolution from auth context
  return 'current-user';
};

export default DynamoDBOperations;
