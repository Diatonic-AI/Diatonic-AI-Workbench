// AI Nexus Workbench - API Type Definitions

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

// ===== Core API Types =====

export interface APIRequest extends APIGatewayProxyEvent {
  user?: UserContext;
  tenant?: TenantContext;
  requestId: string;
  tenantId?: string;
  userId?: string;
  context?: any;
}

export interface APIResponse extends APIGatewayProxyResult {
  body: string;
}

export interface UserContext {
  userId: string;
  email: string;
  tenantId: string;
  role: UserRole;
  plan: SubscriptionPlan;
  features: string[];
  permissions: string[];
}

export interface TenantContext {
  tenantId: string;
  name: string;
  plan: SubscriptionPlan;
  status: TenantStatus;
  limits: TenantLimits;
  currentUsage: TenantUsage;
  billing?: BillingInfo;
}

export type UserRole = 
  | 'platform_admin' 
  | 'tenant_admin' 
  | 'developer' 
  | 'viewer' 
  | 'guest';

export type SubscriptionPlan = 
  | 'free' 
  | 'starter' 
  | 'pro' 
  | 'enterprise' 
  | 'custom';

export type TenantStatus = 
  | 'active' 
  | 'suspended' 
  | 'trial' 
  | 'cancelled';

// ===== Business Logic Types =====

export interface Project {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  createdBy: string;
  status: ProjectStatus;
  settings: ProjectSettings;
  metadata: ProjectMetadata;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 
  | 'active' 
  | 'archived' 
  | 'template';

export interface ProjectSettings {
  defaultModel?: string;
  retentionDays: number;
  enableLogging: boolean;
  enableMonitoring: boolean;
  tags: string[];
}

export interface ProjectMetadata {
  agentCount: number;
  experimentCount: number;
  datasetCount: number;
  lastActivity?: string;
  totalRuns: number;
  storageUsedBytes: number;
}

export interface Agent {
  id: string;
  projectId: string;
  tenantId: string;
  name: string;
  description?: string;
  type: AgentType;
  status: AgentStatus;
  config: AgentConfig;
  version: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastRun?: string;
  metadata: AgentMetadata;
}

export type AgentType = 
  | 'conversational' 
  | 'completion' 
  | 'code_generation' 
  | 'analysis' 
  | 'custom';

export type AgentStatus = 
  | 'draft' 
  | 'active' 
  | 'paused' 
  | 'archived' 
  | 'error';

export interface AgentConfig {
  model: string;
  provider: LLMProvider;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  stopSequences?: string[];
  tools?: AgentTool[];
  memory?: MemoryConfig;
  safety?: SafetyConfig;
}

export type LLMProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'bedrock' 
  | 'azure' 
  | 'custom';

export interface AgentTool {
  name: string;
  type: ToolType;
  config: Record<string, any>;
  enabled: boolean;
}

export type ToolType = 
  | 'function_calling' 
  | 'web_search' 
  | 'code_execution' 
  | 'file_access' 
  | 'database_query' 
  | 'api_call';

export interface MemoryConfig {
  type: MemoryType;
  maxMessages?: number;
  summaryThreshold?: number;
  vectorStore?: string;
}

export type MemoryType = 
  | 'none' 
  | 'buffer' 
  | 'summary' 
  | 'vector';

export interface SafetyConfig {
  contentFilter: boolean;
  piiDetection: boolean;
  toxicityFilter: boolean;
  customRules?: string[];
}

export interface AgentMetadata {
  totalRuns: number;
  averageLatency: number;
  errorRate: number;
  lastError?: string;
  tags: string[];
}

export interface AgentRun {
  id: string;
  agentId: string;
  tenantId: string;
  projectId: string;
  status: RunStatus;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  metadata: RunMetadata;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export type RunStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface RunMetadata {
  executionTimeMs: number;
  tokensConsumed: number;
  costUsd: number;
  model: string;
  provider: string;
  traceId?: string;
  parentRunId?: string;
}

export interface Experiment {
  id: string;
  projectId: string;
  tenantId: string;
  name: string;
  description?: string;
  type: ExperimentType;
  status: ExperimentStatus;
  config: ExperimentConfig;
  results?: ExperimentResults;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type ExperimentType = 
  | 'ab_test' 
  | 'prompt_optimization' 
  | 'model_comparison' 
  | 'parameter_tuning' 
  | 'dataset_evaluation';

export type ExperimentStatus = 
  | 'draft' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface ExperimentConfig {
  variants: ExperimentVariant[];
  metrics: string[];
  sampleSize: number;
  duration?: number;
  splitRatio?: number;
  seed?: number;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  agentId: string;
  weight: number;
  config?: Record<string, any>;
}

export interface ExperimentResults {
  summary: ResultSummary;
  variants: VariantResults[];
  statistical: StatisticalAnalysis;
  recommendations?: string[];
}

export interface ResultSummary {
  totalRuns: number;
  duration: number;
  winnerVariantId?: string;
  confidence?: number;
}

export interface VariantResults {
  variantId: string;
  metrics: Record<string, MetricResult>;
  runs: number;
  errors: number;
}

export interface MetricResult {
  value: number;
  unit: string;
  confidence?: ConfidenceInterval;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number;
}

export interface StatisticalAnalysis {
  significance: boolean;
  pValue: number;
  effectSize?: number;
  method: string;
}

export interface Dataset {
  id: string;
  projectId: string;
  tenantId: string;
  name: string;
  description?: string;
  type: DatasetType;
  status: DatasetStatus;
  config: DatasetConfig;
  metadata: DatasetMetadata;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type DatasetType = 
  | 'training' 
  | 'validation' 
  | 'test' 
  | 'evaluation' 
  | 'reference';

export type DatasetStatus = 
  | 'processing' 
  | 'ready' 
  | 'error' 
  | 'archived';

export interface DatasetConfig {
  format: DataFormat;
  schema?: DataSchema;
  preprocessing?: PreprocessingConfig;
  validation?: ValidationConfig;
}

export type DataFormat = 
  | 'json' 
  | 'jsonl' 
  | 'csv' 
  | 'parquet' 
  | 'text';

export interface DataSchema {
  fields: FieldDefinition[];
  primaryKey?: string;
  indexes?: string[];
}

export interface FieldDefinition {
  name: string;
  type: FieldType;
  required: boolean;
  description?: string;
  constraints?: FieldConstraints;
}

export type FieldType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'date' 
  | 'array' 
  | 'object';

export interface FieldConstraints {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
}

export interface PreprocessingConfig {
  transformations: Transformation[];
  filters?: FilterRule[];
  sampling?: SamplingConfig;
}

export interface Transformation {
  type: TransformationType;
  field: string;
  config: Record<string, any>;
}

export type TransformationType = 
  | 'normalize' 
  | 'tokenize' 
  | 'clean' 
  | 'encode' 
  | 'extract';

export interface FilterRule {
  field: string;
  operator: FilterOperator;
  value: any;
}

export type FilterOperator = 
  | 'equals' 
  | 'contains' 
  | 'gt' 
  | 'lt' 
  | 'in' 
  | 'exists';

export interface SamplingConfig {
  method: SamplingMethod;
  size: number;
  stratify?: string;
  seed?: number;
}

export type SamplingMethod = 
  | 'random' 
  | 'stratified' 
  | 'systematic';

export interface ValidationConfig {
  rules: ValidationRule[];
  onError: ErrorHandling;
}

export interface ValidationRule {
  type: ValidationType;
  config: Record<string, any>;
  severity: ValidationSeverity;
}

export type ValidationType = 
  | 'schema' 
  | 'format' 
  | 'uniqueness' 
  | 'completeness' 
  | 'range';

export type ValidationSeverity = 
  | 'error' 
  | 'warning' 
  | 'info';

export type ErrorHandling = 
  | 'fail' 
  | 'skip' 
  | 'correct';

export interface DatasetMetadata {
  recordCount: number;
  sizeBytes: number;
  version: string;
  checksum: string;
  s3Location: string;
  lastValidated?: string;
  processingLog?: ProcessingLogEntry[];
}

export interface ProcessingLogEntry {
  timestamp: string;
  operation: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: Record<string, any>;
}

// ===== Usage and Billing Types =====

export interface UsageEvent {
  id: string;
  tenantId: string;
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  operation: string;
  timestamp: string;
  duration?: number;
  tokensConsumed?: number;
  costUsd: number;
  metadata: Record<string, any>;
}

export type ResourceType = 
  | 'agent' 
  | 'experiment' 
  | 'dataset' 
  | 'api_call' 
  | 'storage' 
  | 'compute';

export interface TenantLimits {
  maxUsers: number;
  maxProjects: number;
  maxAgents: number;
  maxExperiments: number;
  maxDatasets: number;
  maxStorageGb: number;
  maxRequestsPerMonth: number;
  maxTokensPerMonth: number;
  enabledFeatures: string[];
}

export interface TenantUsage {
  users: number;
  projects: number;
  agents: number;
  experiments: number;
  datasets: number;
  storageGb: number;
  monthlyRequests: number;
  monthlyTokens: number;
  monthlyCostUsd: number;
  lastUpdated: string;
}

export interface BillingInfo {
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export type SubscriptionStatus = 
  | 'trialing' 
  | 'active' 
  | 'past_due' 
  | 'canceled' 
  | 'unpaid';

// ===== API Response Types =====

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
  requestId: string;
}

export interface PaginationInfo {
  nextToken?: string;
  hasMore: boolean;
  totalCount?: number;
  limit: number;
}

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: Record<string, any>;
  requestId: string;
}

export interface SuccessResponse<T = any> {
  data?: T;
  message?: string;
  requestId: string;
}

// ===== Handler Function Types =====

export type ApiHandler = (
  event: APIRequest,
  context: Context
) => Promise<APIResponse>;

export interface HandlerOptions {
  requireAuth?: boolean;
  requiredRole?: UserRole;
  requiredFeatures?: string[];
  rateLimit?: RateLimitConfig;
  caching?: CachingConfig;
}

export interface RateLimitConfig {
  requests: number;
  window: number; // seconds
  key?: string;
}

export interface CachingConfig {
  ttl: number; // seconds
  key?: string;
  vary?: string[];
}

// ===== Database Types =====

export interface DynamoDBItem {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  entityType: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}

export interface QueryOptions {
  limit?: number;
  nextToken?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: FilterExpression;
}

export interface FilterExpression {
  field: string;
  operator: 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge' | 'begins_with' | 'contains';
  value: any;
}

// ===== Monitoring and Observability Types =====

export interface MetricData {
  metricName: string;
  value: number;
  unit: string;
  timestamp: string;
  dimensions: Record<string, string>;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  checks: ComponentHealth[];
  timestamp: string;
  requestId: string;
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}

// ===== Event Types =====

export interface DomainEvent {
  eventType: string;
  entityId: string;
  tenantId: string;
  userId: string;
  timestamp: string;
  data: Record<string, any>;
  metadata?: EventMetadata;
}

export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  version: string;
  source: string;
}
