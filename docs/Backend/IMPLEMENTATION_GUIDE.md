# Diatonic AI - AI Lab Backend Implementation Guide

## 🚀 Quick Start

This guide provides step-by-step instructions to deploy and configure the comprehensive AI Lab & Toolset Backend for the Diatonic AI platform.

## 📋 Prerequisites

### Development Environment
- Node.js 18+ 
- AWS CLI v2 configured with appropriate credentials
- AWS CDK v2 installed globally: `npm install -g aws-cdk`
- TypeScript compiler: `npm install -g typescript`
- Git for version control

### AWS Account Requirements
- AWS Account with appropriate permissions
- AWS CLI configured with credentials
- CDK Bootstrap completed for target account/region

### Required Permissions
The deploying user/role needs:
- CloudFormation full access
- IAM role/policy creation
- Lambda function management
- DynamoDB table management
- S3 bucket creation and management
- Cognito user pool management
- API Gateway management
- EventBridge management
- Secrets Manager access

## 🏗️ Infrastructure Deployment

### Step 1: Setup Infrastructure Project

```bash
# Navigate to infrastructure directory
cd /home/daclab-ai/dev/AWS-DevOps/apps/diatonic-ai-platform/infra

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Step 2: Configure Environment Variables

Create environment-specific configuration:

```bash
# cdk.json
{
  "app": "npx ts-node lib/ai-lab-app.ts",
  "context": {
    "@aws-cdk/core:enableStackNameDuplicates": "true",
    "aws-cdk:enableDiffNoFail": "true",
    "@aws-cdk/core:stackRelativeExports": "true",
    "@aws-cdk/aws-ecr-assets:dockerIgnoreSupport": true,
    "@aws-cdk/aws-secretsmanager:parseOwnedSecretName": true
  }
}
```

### Step 3: Bootstrap CDK (One-time)

```bash
# Bootstrap CDK for your account/region
cdk bootstrap aws://863584456189/us-east-2 \
  --context environment=dev \
  --context account=863584456189 \
  --context region=us-east-2
```

### Step 4: Deploy Development Environment

```bash
# Synthesize CloudFormation template (optional - for review)
npm run synth:dev

# Deploy to development
npm run deploy:dev

# Expected output:
✨  Synthesis time: 3.45s

AILabCore-dev: deploying...
[0%] start: Publishing 2f8d...
[50%] success: Published 2f8d...
[100%] success: Published all assets
AILabCore-dev: creating CloudFormation changeset...

✅  AILabCore-dev

Outputs:
AILabCore-dev.UserPoolId = us-east-2_abcd1234
AILabCore-dev.UserPoolClientId = 1234567890abcdef
AILabCore-dev.ApiEndpoint = https://abc123.execute-api.us-east-2.amazonaws.com/dev
AILabCore-dev.EntitiesTableName = ainexus-dev-entities
AILabCore-dev.UsageTableName = ainexus-dev-usage
AILabCore-dev.TenantsTableName = ainexus-dev-tenants
AILabCore-dev.ArtifactsBucketName = ainexus-dev-artifacts-863584456189
AILabCore-dev.EventBusName = ainexus-dev-events
```

### Step 5: Configure Secrets

After deployment, configure required secrets in AWS Secrets Manager:

```bash
# Set OpenAI API key
aws secretsmanager put-secret-value \
  --region us-east-2 \
  --secret-id ainexus-dev/openai/key \
  --secret-string '{"api_key":"your-openai-api-key-here"}'

# Set Stripe API secrets (if billing enabled)
aws secretsmanager put-secret-value \
  --region us-east-2 \
  --secret-id ainexus-dev/stripe/secret \
  --secret-string '{"api_key":"sk_test_your_stripe_key","webhook_secret":"whsec_your_webhook_secret"}'
```

## 🔐 Authentication Setup

### Step 1: Configure Frontend Environment Variables

Update your React app's environment configuration:

```typescript
// src/lib/aws-config.ts
export const awsConfig = {
  region: 'us-east-2',
  userPoolId: 'us-east-2_abcd1234', // From CDK output
  userPoolClientId: '1234567890abcdef', // From CDK output
  apiEndpoint: 'https://abc123.execute-api.us-east-2.amazonaws.com/dev', // From CDK output
};
```

### Step 2: Test Authentication

```bash
# Test health endpoint (no auth required)
curl https://abc123.execute-api.us-east-2.amazonaws.com/dev/v1/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-07T20:23:00.000Z",
  "environment": "dev",
  "requestId": "abc123-def456-789012",
  "version": "1.0.0"
}
```

## 🏢 Multi-Tenant Setup

### Step 1: Create Default Tenants

Create sample tenants for development and testing:

```bash
# Create migration script to set up initial tenants
cat > setup-tenants.js << 'EOF'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));
const TENANTS_TABLE = 'ainexus-dev-tenants';

const tenants = [
  {
    PK: 'TENANT#demo-org',
    SK: 'CONFIG',
    tenantId: 'demo-org',
    name: 'Demo Organization',
    plan: 'pro',
    limits: {
      max_users: 10,
      max_projects: 50,
      max_requests_per_month: 50000,
      max_tokens_per_month: 2000000,
      max_storage_gb: 10,
      enabled_features: ['agents', 'experiments', 'linting', 'debugging', 'monitoring']
    },
    current_usage: {
      users: 0,
      projects: 0,
      storage_gb: 0,
      monthly_requests: 0,
      monthly_tokens: 0
    },
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    PK: 'TENANT#enterprise-test',
    SK: 'CONFIG',
    tenantId: 'enterprise-test',
    name: 'Enterprise Test Organization',
    plan: 'enterprise',
    limits: {
      max_users: 100,
      max_projects: -1, // unlimited
      max_requests_per_month: -1,
      max_tokens_per_month: -1,
      max_storage_gb: 100,
      enabled_features: ['all']
    },
    current_usage: {
      users: 0,
      projects: 0,
      storage_gb: 0,
      monthly_requests: 0,
      monthly_tokens: 0
    },
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

async function createTenants() {
  for (const tenant of tenants) {
    try {
      await client.send(new PutCommand({
        TableName: TENANTS_TABLE,
        Item: tenant,
        ConditionExpression: 'attribute_not_exists(PK)'
      }));
      console.log(`✅ Created tenant: ${tenant.tenantId}`);
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        console.log(`ℹ️  Tenant already exists: ${tenant.tenantId}`);
      } else {
        console.error(`❌ Error creating tenant ${tenant.tenantId}:`, error.message);
      }
    }
  }
}

createTenants().catch(console.error);
EOF

# Run the setup script
node setup-tenants.js
```

### Step 2: Create Test Users in Cognito

```bash
# Create a test admin user
aws cognito-idp admin-create-user \
  --region us-east-2 \
  --user-pool-id us-east-2_abcd1234 \
  --username admin@demo-org.com \
  --user-attributes Name=email,Value=admin@demo-org.com \
                     Name=given_name,Value=Admin \
                     Name=family_name,Value=User \
                     Name=custom:tenant_id,Value=demo-org \
                     Name=custom:role,Value=tenant_admin \
                     Name=custom:plan,Value=pro \
                     Name=custom:features,Value='["agents","experiments","linting","debugging","monitoring"]' \
  --temporary-password TempPass123! \
  --message-action SUPPRESS

# Create a test developer user  
aws cognito-idp admin-create-user \
  --region us-east-2 \
  --user-pool-id us-east-2_abcd1234 \
  --username dev@demo-org.com \
  --user-attributes Name=email,Value=dev@demo-org.com \
                     Name=given_name,Value=Developer \
                     Name=family_name,Value=User \
                     Name=custom:tenant_id,Value=demo-org \
                     Name=custom:role,Value=developer \
                     Name=custom:plan,Value=pro \
                     Name=custom:features,Value='["agents","experiments"]' \
  --temporary-password TempPass123! \
  --message-action SUPPRESS
```

## 🧪 Testing the Backend

### Step 1: API Testing with Authentication

```bash
# Install AWS CLI plugin for getting JWT tokens (if not already installed)
# Use Cognito CLI or your frontend to get JWT tokens

# Test authenticated endpoint (replace JWT_TOKEN with actual token)
curl -H "Authorization: Bearer JWT_TOKEN_HERE" \
     https://abc123.execute-api.us-east-2.amazonaws.com/dev/v1/tenants/demo-org/projects

# Expected response:
{
  "projects": [],
  "pagination": {
    "nextToken": null,
    "hasMore": false
  },
  "requestId": "abc123-def456-789012"
}
```

### Step 2: Usage Metering Test

```bash
# Create a test agent to generate usage events
curl -X POST \
  -H "Authorization: Bearer JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "description": "A test agent for usage metering",
    "type": "conversational",
    "config": {
      "model": "gpt-4",
      "system_prompt": "You are a helpful assistant."
    }
  }' \
  https://abc123.execute-api.us-east-2.amazonaws.com/dev/v1/tenants/demo-org/agents

# Execute a test run to generate usage
curl -X POST \
  -H "Authorization: Bearer JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "AGENT_ID_FROM_ABOVE",
    "inputs": {
      "message": "Hello, world! This is a test."
    }
  }' \
  https://abc123.execute-api.us-east-2.amazonaws.com/dev/v1/tenants/demo-org/runs
```

### Step 3: Verify Usage Tracking

Check CloudWatch logs and DynamoDB tables:

```bash
# Check usage events in DynamoDB
aws dynamodb scan \
  --region us-east-2 \
  --table-name ainexus-dev-usage \
  --filter-expression "tenantId = :tid" \
  --expression-attribute-values '{":tid":{"S":"demo-org"}}' \
  --max-items 10

# Check API Gateway logs
aws logs describe-log-groups \
  --region us-east-2 \
  --log-group-name-prefix "/aws/apigateway/ainexus-dev-api"
```

## 📊 Monitoring Setup

### Step 1: CloudWatch Dashboards

The infrastructure automatically creates CloudWatch dashboards. Access them at:
- AWS Console > CloudWatch > Dashboards > `ainexus-dev-operations`
- AWS Console > CloudWatch > Dashboards > `ainexus-dev-business`

### Step 2: Set Up Alerts

```bash
# Create SNS topic for alerts (optional - already created by CDK)
aws sns create-subscription \
  --region us-east-2 \
  --topic-arn arn:aws:sns:us-east-2:863584456189:AILabCore-dev-AlertsTopic \
  --protocol email \
  --notification-endpoint your-email@example.com

# Confirm subscription via email
```

### Step 3: Test Error Handling

```bash
# Test error handling with invalid request
curl -X POST \
  -H "Authorization: Bearer INVALID_TOKEN" \
  -H "Content-Type: application/json" \
  https://abc123.execute-api.us-east-2.amazonaws.com/dev/v1/tenants/demo-org/agents

# Expected error response:
{
  "error": "Unauthorized",
  "message": "Invalid authentication token",
  "requestId": "abc123-def456-789012"
}
```

## 🔧 Local Development Setup

### Step 1: Set Up LocalStack (Optional)

For local development with mock AWS services:

```bash
# Install LocalStack
pip install localstack awscli-local

# Start LocalStack
localstack start

# Create local environment variables
cat > .env.local << 'EOF'
NODE_ENV=development
AWS_ENDPOINT_URL=http://localhost:4566
ENTITIES_TABLE_NAME=ainexus-dev-entities
USAGE_TABLE_NAME=ainexus-dev-usage
TENANTS_TABLE_NAME=ainexus-dev-tenants
ARTIFACTS_BUCKET_NAME=ainexus-dev-artifacts-local
EVENT_BUS_NAME=ainexus-dev-events
USER_POOL_ID=us-east-2_local123
CORS_ORIGINS=["http://localhost:3000","http://localhost:8080"]
EOF
```

### Step 2: Local Lambda Development

```bash
# Install SAM CLI for local Lambda testing
pip install aws-sam-cli

# Create SAM template for local development
cat > template.yaml << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Timeout: 30
    Runtime: nodejs18.x
    Environment:
      Variables:
        NODE_ENV: development

Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/api/
      Handler: handler.handler
      Events:
        Api:
          Type: Api
          Properties:
            Path: /{proxy+}
            Method: ANY
EOF

# Start local API
sam local start-api --port 3001
```

## 🚀 Production Deployment

### Step 1: Production Configuration

```bash
# Deploy to production (after testing in staging)
npm run deploy:prod

# Configure production secrets
aws secretsmanager put-secret-value \
  --region us-east-2 \
  --secret-id ainexus-prod/openai/key \
  --secret-string '{"api_key":"your-production-openai-key"}'

aws secretsmanager put-secret-value \
  --region us-east-2 \
  --secret-id ainexus-prod/stripe/secret \
  --secret-string '{"api_key":"sk_live_your_production_stripe_key","webhook_secret":"whsec_your_production_webhook_secret"}'
```

### Step 2: Production Validation

```bash
# Run production health checks
curl https://prod-api.diatonic.ai/v1/health

# Monitor key metrics
aws cloudwatch get-metric-statistics \
  --region us-east-2 \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=ainexus-prod-api \
  --start-time 2025-01-07T00:00:00Z \
  --end-time 2025-01-07T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

### Step 3: Configure Production Monitoring

```bash
# Set up production alerts with appropriate thresholds
# (This would typically be done through CDK for consistency)

# Enable detailed monitoring if not already enabled
aws apigateway update-stage \
  --region us-east-2 \
  --rest-api-id YOUR_API_ID \
  --stage-name prod \
  --patch-ops op=replace,path=/throttle/burstLimit,value=5000 \
              op=replace,path=/throttle/rateLimit,value=2000
```

## 🎯 Next Steps

After successful deployment:

1. **Frontend Integration**: Update frontend environment variables with deployed endpoints
2. **Provider Adapters**: Implement additional LLM provider adapters (Anthropic, Bedrock)
3. **AI Toolset Features**: Implement linting, rule generation, debugging, and monitoring services
4. **Billing Integration**: Complete Stripe webhook setup and billing workflows
5. **Monitoring**: Set up comprehensive dashboards and alerts
6. **Documentation**: Create API documentation using OpenAPI specification
7. **Testing**: Implement comprehensive test suites (unit, integration, load)

## 🔍 Troubleshooting

### Common Issues

**CDK Deployment Fails:**
```bash
# Check CDK version compatibility
cdk --version

# Bootstrap if needed
cdk bootstrap

# Check AWS credentials
aws sts get-caller-identity
```

**Lambda Cold Start Issues:**
- Consider provisioned concurrency for production
- Optimize bundle size by excluding unnecessary dependencies

**DynamoDB Access Issues:**
- Verify IAM permissions include condition keys for tenant isolation
- Check table names match environment variables

**API Gateway CORS Issues:**
- Verify CORS configuration includes all required headers
- Check that preflight OPTIONS requests are handled correctly

### Logs and Debugging

```bash
# View Lambda logs
aws logs tail /aws/lambda/ainexus-dev-api --follow

# View API Gateway access logs  
aws logs tail /aws/apigateway/ainexus-dev-api --follow

# Check DynamoDB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=ainexus-dev-entities
```

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [API Gateway Best Practices](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-basic-concept.html)
- [Cognito User Pool Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)

---

**Status:** Ready for implementation and deployment  
**Architecture Version:** 1.0.0  
**Last Updated:** 2025-01-07 20:23:00 UTC
