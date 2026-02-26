# Lambda Functions Summary

This document provides an overview of all Lambda functions in the Diatonic AI Workbench backend infrastructure.

## Directory Structure

```
lambda/
├── README.md                    # This file
├── api/                         # Main API Gateway handlers
│   ├── handler.ts              # Main API handler with middleware chain
│   ├── router.ts               # Route definitions and middleware
│   └── handlers/
│       └── agents.ts           # Agent CRUD and execution operations
├── cognito/
│   └── pre-token.ts           # JWT token enrichment for Cognito
├── usage/
│   └── aggregator.ts          # Usage metrics aggregation
└── billing/
    └── processor.ts           # Stripe billing webhook processor
```

## Core Lambda Functions

### 1. API Gateway Handler (`api/handler.ts`)

**Purpose**: Main entry point for all API requests through API Gateway
**Trigger**: API Gateway HTTP requests
**Key Features**:
- CORS handling with environment-based configuration
- JWT authentication via Cognito
- Tenant isolation middleware
- Usage tracking and quota enforcement
- Structured logging and error handling
- Request/response transformation

**Environment Variables**:
- `CORS_ORIGINS`: Allowed origins for CORS
- `COGNITO_USER_POOL_ID`: Cognito user pool identifier
- `COGNITO_REGION`: AWS region for Cognito
- `TENANTS_TABLE_NAME`: DynamoDB table for tenant data

### 2. API Router (`api/router.ts`)

**Purpose**: Route configuration and middleware chain definition
**Key Features**:
- Route-based handlers (agents, datasets, experiments, etc.)
- Authentication and authorization middleware
- Tenant context resolution
- Usage recording middleware
- Error handling and logging

### 3. Agents Handler (`api/handlers/agents.ts`)

**Purpose**: Handle all agent-related operations
**Supported Operations**:
- `GET /agents` - List agents for tenant
- `POST /agents` - Create new agent
- `GET /agents/{id}` - Get agent details
- `PUT /agents/{id}` - Update agent
- `DELETE /agents/{id}` - Delete agent
- `POST /agents/{id}/execute` - Execute agent

**Key Features**:
- Tenant access control
- Input validation with Zod schemas
- PII detection and sanitization
- Usage cost calculation
- Simulated LLM execution
- Comprehensive error handling

### 4. Pre-Token Generation Lambda (`cognito/pre-token.ts`)

**Purpose**: Enrich JWT tokens during Cognito authentication flow
**Trigger**: Cognito Pre Token Generation trigger
**Key Features**:
- Fetch tenant information from DynamoDB
- Add tenant metadata to JWT claims
- Merge user permissions and roles
- Handle tenant suspension and onboarding states
- Support for enhanced user profiles

**Token Claims Added**:
- `tenant_id`: Tenant identifier
- `tenant_name`: Display name for tenant
- `user_role`: User role within tenant
- `permissions`: Array of user permissions
- `tenant_status`: Current tenant status
- `user_profile`: Enhanced user profile data

### 5. Usage Aggregator Lambda (`usage/aggregator.ts`)

**Purpose**: Process usage events and maintain aggregated metrics
**Trigger**: EventBridge events with source `diatonic-ai.usage`
**Key Features**:
- Hourly, daily, and monthly usage aggregation
- Resource-specific metrics (agents, requests, tokens, etc.)
- Quota checking and threshold alerts
- Tenant isolation for metrics
- Efficient batch processing

**Metrics Tracked**:
- API requests and response times
- Token usage and costs
- Agent executions
- Storage usage
- Error rates and types

### 6. Billing Processor Lambda (`billing/processor.ts`)

**Purpose**: Handle Stripe webhook events for subscription management
**Trigger**: EventBridge events from Stripe webhooks
**Key Features**:
- Secure Stripe API integration via Secrets Manager
- Subscription lifecycle management
- Payment processing and failure handling
- Plan upgrades/downgrades
- Trial period management
- Quota and feature updates based on plan changes

**Supported Stripe Events**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.trial_will_end`
- `customer.created`

## Data Models and Interfaces

### Authentication Context
```typescript
interface AuthContext {
  userId: string;
  tenantId: string;
  userRole: string;
  permissions: string[];
  tokenClaims: Record<string, unknown>;
}
```

### Agent Model
```typescript
interface Agent {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  configuration: AgentConfig;
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
}
```

### Usage Event Model
```typescript
interface UsageEvent {
  tenantId: string;
  userId: string;
  resourceType: string;
  action: string;
  quantity: number;
  cost?: number;
  metadata: Record<string, unknown>;
  timestamp: string;
}
```

### Billing Event Model
```typescript
interface BillingEvent {
  type: string;
  tenantId?: string;
  customerId?: string;
  subscriptionId?: string;
  planId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  eventTimestamp: string;
  metadata?: Record<string, unknown>;
}
```

## Error Handling

All Lambda functions implement consistent error handling:

1. **Validation Errors**: Return 400 with detailed validation messages
2. **Authentication Errors**: Return 401 with clear authentication requirements
3. **Authorization Errors**: Return 403 with permission information
4. **Not Found Errors**: Return 404 for missing resources
5. **Rate Limit Errors**: Return 429 with quota information
6. **Server Errors**: Return 500 with sanitized error messages
7. **Structured Logging**: All errors logged with context and request IDs

## Security Features

### Authentication & Authorization
- JWT token validation via Cognito JWKS
- Role-based access control (RBAC)
- Tenant isolation enforced at all levels
- Permission-based API access control

### Data Protection
- PII detection and sanitization
- Secure secrets management via AWS Secrets Manager
- Input validation and sanitization
- SQL injection and XSS prevention

### Rate Limiting & Quotas
- Per-tenant usage quotas
- Request rate limiting
- Cost-based usage controls
- Fair usage policies

## Monitoring & Observability

### Logging
- Structured JSON logging throughout
- Request correlation IDs
- Performance metrics
- Error tracking with stack traces

### Metrics
- Custom CloudWatch metrics
- Usage analytics
- Performance monitoring
- Error rate tracking

### Alerting
- Quota threshold alerts
- Error rate monitoring
- Performance degradation alerts
- Security incident notifications

## Deployment Notes

### Environment Variables
Each Lambda requires specific environment variables for:
- AWS service configuration
- Database table names
- External service credentials
- Feature flags and settings

### IAM Permissions
Lambda functions require specific IAM permissions for:
- DynamoDB read/write access
- EventBridge publish permissions
- Secrets Manager access
- CloudWatch logging
- S3 access for file operations

### Cold Start Optimization
- Connection reuse for DynamoDB and external APIs
- Lazy initialization of heavy resources
- Minimal runtime dependencies
- Efficient bundling and tree-shaking

## Development Guidelines

### Testing
- Unit tests for business logic
- Integration tests for AWS service interactions
- Mock external dependencies appropriately
- Test error scenarios and edge cases

### Code Quality
- TypeScript strict mode enabled
- ESLint configuration with security rules
- Consistent error handling patterns
- Comprehensive input validation

### Performance
- Optimize for cold start performance
- Use connection pooling for databases
- Implement appropriate caching strategies
- Monitor and optimize memory usage

## Future Enhancements

### Planned Features
- Enhanced analytics and reporting
- Real-time notifications
- Advanced agent orchestration
- Multi-region deployment support
- Enhanced security monitoring

### Scalability Improvements
- Auto-scaling configuration
- Database sharding strategies
- Caching layer optimization
- Event sourcing for audit trails