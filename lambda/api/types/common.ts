/**
 * Common TypeScript interfaces and types to replace 'any' usage
 * throughout the Lambda API codebase
 */

// AWS Lambda Event Types
export interface APIGatewayEvent {
  httpMethod: string;
  path: string;
  pathParameters: Record<string, string> | null;
  queryStringParameters: Record<string, string> | null;
  headers: Record<string, string>;
  body: string | null;
  requestContext: {
    requestId: string;
    accountId: string;
    stage: string;
    identity: {
      sourceIp: string;
      userAgent?: string;
      cognitoIdentityId?: string;
      cognitoAuthenticationType?: string;
      cognitoAuthenticationProvider?: string;
    };
    authorizer?: {
      claims?: Record<string, string>;
      principalId?: string;
    };
  };
  isBase64Encoded: boolean;
}

export interface APIGatewayContext {
  callbackWaitsForEmptyEventLoop: boolean;
  functionName: string;
  functionVersion: string;
  invokedFunctionArn: string;
  memoryLimitInMB: string;
  awsRequestId: string;
  logGroupName: string;
  logStreamName: string;
  getRemainingTimeInMillis(): number;
}

export interface APIGatewayResult {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

// Database and DynamoDB Types
export interface DynamoDBRecord {
  [key: string]: unknown;
}

export interface QueryResult {
  Items?: DynamoDBRecord[];
  Count?: number;
  ScannedCount?: number;
  LastEvaluatedKey?: Record<string, unknown>;
}

export interface DatabaseConnection {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// HTTP Request/Response Types
export interface RequestBody {
  [key: string]: unknown;
}

export interface ResponseData {
  [key: string]: unknown;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export type APIResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

// Authentication and Authorization Types
export interface CognitoUser {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  'custom:tenant_id'?: string;
  'custom:role'?: string;
  'cognito:groups'?: string[];
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  tenantId?: string;
  role?: string;
  groups?: string[];
  claims: Record<string, string>;
}

export interface TenantContext {
  tenantId: string;
  domain?: string;
  settings?: Record<string, unknown>;
}

// Middleware Types
export interface MiddlewareRequest {
  event: APIGatewayEvent;
  context: APIGatewayContext;
  user?: AuthenticatedUser;
  tenant?: TenantContext;
  body?: RequestBody;
  queryParams?: Record<string, string>;
  pathParams?: Record<string, string>;
}

export interface MiddlewareResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export type MiddlewareNext = () => Promise<MiddlewareResponse>;

export type MiddlewareFunction = (
  req: MiddlewareRequest,
  res: MiddlewareResponse,
  next: MiddlewareNext
) => Promise<MiddlewareResponse | void>;

// Agent and AI Types
export interface AgentConfiguration {
  id: string;
  name: string;
  description?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: AgentTool[];
  metadata?: Record<string, unknown>;
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  required?: string[];
}

export interface AgentExecution {
  id: string;
  agentId: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Analytics and Metrics Types
export interface AnalyticsEvent {
  eventType: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  properties: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface MetricsAggregation {
  metric: string;
  value: number;
  timestamp: string;
  dimensions?: Record<string, string>;
}

export interface UsageMetrics {
  apiCalls: number;
  storageUsed: number;
  computeTime: number;
  period: string;
  userId?: string;
  tenantId?: string;
}

// Billing and Subscription Types
export interface BillingAccount {
  id: string;
  tenantId: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  usage: UsageMetrics;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

// Dataset and Experiment Types
export interface Dataset {
  id: string;
  name: string;
  description?: string;
  schema?: Record<string, unknown>;
  records: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  userId: string;
}

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  datasetIds: string[];
  configuration: Record<string, unknown>;
  results?: Record<string, unknown>;
  status: 'draft' | 'running' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  userId: string;
}

// Project Management Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  type: string;
  configuration: Record<string, unknown>;
  resources?: string[];
  collaborators?: ProjectCollaborator[];
  status: 'active' | 'archived' | 'deleted';
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  userId: string;
}

export interface ProjectCollaborator {
  userId: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  addedAt: string;
}

// Webhook Types
export interface WebhookEvent {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  data: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  url: string;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttempt?: string;
  response?: {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  };
}

// Logger Types
export interface LogContext {
  requestId?: string;
  userId?: string;
  tenantId?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
}

// Permission and Security Types
export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  tenantId?: string;
}

export interface SecurityContext {
  user: AuthenticatedUser;
  tenant?: TenantContext;
  permissions: Permission[];
  ipAddress?: string;
  userAgent?: string;
}

// File and Storage Types
export interface FileUpload {
  filename: string;
  contentType: string;
  size: number;
  buffer: Buffer;
}

export interface StoredFile {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  metadata?: Record<string, unknown>;
  uploadedAt: string;
  tenantId: string;
  userId: string;
}

// Validation and Schema Types
export interface ValidationRule {
  field: string;
  type: 'required' | 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url';
  constraints?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

// Generic Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// API Pagination Types
export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total?: number;
    limit: number;
    offset?: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

// Environment and Configuration Types
export interface AppConfig {
  environment: 'development' | 'staging' | 'production';
  aws: {
    region: string;
    cognito: {
      userPoolId: string;
      clientId: string;
    };
    dynamodb: {
      region: string;
      endpoint?: string;
    };
    s3: {
      bucket: string;
      region: string;
    };
  };
  api: {
    baseUrl: string;
    version: string;
    timeout: number;
  };
  features: Record<string, boolean>;
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    structured: boolean;
  };
}
