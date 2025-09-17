# Environment Variables Configuration

This document maps the environment variables expected by the comprehensive API Lambda handler with those provided by the CDK infrastructure.

## Environment Variable Mapping

### Infrastructure → API Handler Mapping

The `community-api/handler.ts` maps community-specific environment variables to the format expected by the main API handler:

| CDK Stack Output | Community API Env Var | Main API Env Var | Description |
|------------------|------------------------|-------------------|-------------|
| PostsTableName | POSTS_TABLE_NAME | DYNAMODB_TABLE | Main DynamoDB table for posts |
| ContentBucketName | CONTENT_BUCKET_NAME | S3_BUCKET | S3 bucket for file uploads |
| EventBusName | EVENT_BUS_NAME | EVENTBRIDGE_BUS | EventBridge bus for events |
| UserPoolId | USER_POOL_ID | COGNITO_USER_POOL_ID | Cognito User Pool ID |
| StripeSecretArn | STRIPE_SECRET_ARN | - | Stripe API secret ARN in Secrets Manager |
| StripeWebhookSecretArn | STRIPE_WEBHOOK_SECRET_ARN | - | Stripe webhook secret ARN in Secrets Manager |
| - | APP_BASE_URL | - | Base URL for frontend application |
| - | - | API_BASE_URL | Base URL for API (auto-generated) |
| - | - | LOG_LEVEL | Logging level (default: info) |
| - | ENABLE_TAX | - | Enable Stripe tax calculation (true/false) |
| - | ENABLE_PROMOTION_CODES | - | Enable promotion codes in checkout (true/false) |

### Complete Environment Variables List

#### Required by Main API Handler

```typescript
// Core AWS Configuration
AWS_REGION                    // AWS region (default: us-east-2)
NODE_ENV                      // Environment (development/staging/production)

// Database Tables (mapped from CDK outputs)
DYNAMODB_TABLE               // Main table (mapped from POSTS_TABLE_NAME)
ENTITIES_TABLE_NAME          // Entities table (optional)
USAGE_TABLE_NAME             // Usage tracking table (optional)
TENANTS_TABLE_NAME           // Multi-tenant table (optional)

// Storage
S3_BUCKET                    // S3 bucket (mapped from CONTENT_BUCKET_NAME)
S3_BUCKET_NAME               // Alternative S3 bucket reference

// EventBridge
EVENTBRIDGE_BUS              // Event bus (mapped from EVENT_BUS_NAME)
EVENT_BUS_NAME               // Alternative event bus reference

// Authentication
COGNITO_USER_POOL_ID         // Cognito User Pool (mapped from USER_POOL_ID)
USER_POOL_ID                 // Alternative user pool reference

// CORS Configuration
CORS_ORIGINS                 // JSON array of allowed origins

// API Configuration
API_BASE_URL                 // Base URL for API responses
LOG_LEVEL                    // Logging level (info/debug/warn/error)
```

#### Provided by CDK Stack

```typescript
// From CommunityCoreStack outputs:
POSTS_TABLE_NAME             // DynamoDB posts table name
GROUPS_TABLE_NAME            // DynamoDB groups table name  
INTERACTIONS_TABLE_NAME      // DynamoDB interactions table name
MODERATION_TABLE_NAME        // DynamoDB moderation table name
CONTENT_BUCKET_NAME          // S3 content bucket name
EVENT_BUS_NAME               // EventBridge bus name
NOTIFICATION_TOPIC_ARN       // SNS topic ARN
USER_POOL_ID                 // Cognito User Pool ID
CORS_ORIGINS                 // CORS origins JSON array
```

## Environment Variable Setup in CDK

### Current CDK Configuration

The CDK stack (`lib/community-core-stack.ts`) should set these environment variables for the Lambda function:

```typescript
// In the Lambda function definition
const communityApiFunction = new NodejsFunction(this, 'CommunityApiFunction', {
  entry: path.join(__dirname, '..', 'lambda', 'community-api', 'handler.ts'),
  environment: {
    // Core AWS
    NODE_ENV: environment,
    AWS_REGION: this.region,
    
    // Database tables
    POSTS_TABLE_NAME: postsTable.tableName,
    GROUPS_TABLE_NAME: groupsTable.tableName,
    INTERACTIONS_TABLE_NAME: interactionsTable.tableName,
    MODERATION_TABLE_NAME: moderationTable.tableName,
    
    // Storage
    CONTENT_BUCKET_NAME: contentBucket.bucketName,
    
    // EventBridge
    EVENT_BUS_NAME: eventBus.eventBusName,
    
    // SNS
    NOTIFICATION_TOPIC_ARN: notificationTopic.topicArn,
    
    // Cognito
    USER_POOL_ID: userPool.userPoolId,
    
    // CORS
    CORS_ORIGINS: JSON.stringify(corsOrigins),
    
    // API Configuration (optional)
    API_BASE_URL: `https://${restApi.restApiId}.execute-api.${this.region}.amazonaws.com/v1`,
    LOG_LEVEL: enableDetailedLogging ? 'debug' : 'info',
  },
  // ... other configuration
});
```

## Environment-Specific Configuration

### Development Environment

```bash
export NODE_ENV=development
export LOG_LEVEL=debug
export CORS_ORIGINS='["http://localhost:3000","https://dev.ainexus.dev"]'
```

### Staging Environment

```bash
export NODE_ENV=staging
export LOG_LEVEL=info
export CORS_ORIGINS='["https://staging.ainexus.dev"]'
```

### Production Environment

```bash
export NODE_ENV=production
export LOG_LEVEL=warn
export CORS_ORIGINS='["https://app.ainexus.dev"]'
```

## Verification

### Check Environment Variables in Lambda

After deployment, verify the environment variables are set correctly:

```bash
# Get Lambda function configuration
aws lambda get-function-configuration \
  --function-name AiNexusWorkbench-dev-community-api \
  --query 'Environment.Variables'

# Expected output should include all mapped variables
```

### Test Environment Variable Mapping

The `community-api/handler.ts` includes environment variable mapping logic:

```typescript
// This function maps community-specific env vars to main API format
const mapEnvironmentVariables = () => {
  if (process.env.POSTS_TABLE_NAME) {
    process.env.DYNAMODB_TABLE = process.env.POSTS_TABLE_NAME;
  }
  
  if (process.env.CONTENT_BUCKET_NAME) {
    process.env.S3_BUCKET = process.env.CONTENT_BUCKET_NAME;
  }
  
  // ... more mappings
};
```

## Common Issues

### 1. Missing Environment Variables

**Error**: `Table name is required`
**Solution**: Ensure CDK stack sets `POSTS_TABLE_NAME` and handler maps to `DYNAMODB_TABLE`

### 2. CORS Configuration

**Error**: CORS preflight failures
**Solution**: Ensure `CORS_ORIGINS` is a valid JSON array string

### 3. Authentication Issues

**Error**: `Invalid user pool ID`
**Solution**: Verify `USER_POOL_ID` environment variable is set correctly

### 4. EventBridge Events Not Working

**Error**: Events not being published
**Solution**: Check `EVENT_BUS_NAME` is set and Lambda has permissions

## Testing Environment Variables

### Local Testing

Create a `.env` file for local testing (DO NOT commit to git):

```bash
# .env (for local testing only)
NODE_ENV=development
AWS_REGION=us-east-2
POSTS_TABLE_NAME=AiNexusWorkbench-dev-posts
GROUPS_TABLE_NAME=AiNexusWorkbench-dev-groups
INTERACTIONS_TABLE_NAME=AiNexusWorkbench-dev-interactions
CONTENT_BUCKET_NAME=ainexusworkbench-dev-content-bucket
EVENT_BUS_NAME=AiNexusWorkbench-dev-events
USER_POOL_ID=us-east-2_XXXXXXXXX
CORS_ORIGINS='["http://localhost:3000"]'
API_BASE_URL=http://localhost:3000
LOG_LEVEL=debug
```

### Lambda Test Payload

Test the Lambda function with a sample payload:

```json
{
  "httpMethod": "GET",
  "path": "/v1/health",
  "headers": {
    "Content-Type": "application/json",
    "Origin": "https://app.ainexus.dev"
  },
  "requestContext": {
    "requestId": "test-request-id",
    "identity": {
      "sourceIp": "127.0.0.1"
    }
  },
  "body": null
}
```

This should return a health check response confirming the environment variables are working correctly.

## Summary

The environment variable configuration is handled by:

1. **CDK Stack**: Sets community-specific environment variables
2. **Community API Handler**: Maps community variables to main API format  
3. **Main API Handler**: Uses standardized environment variables

This approach allows the comprehensive API handler to work with the existing CDK infrastructure without requiring changes to the stack definition.
