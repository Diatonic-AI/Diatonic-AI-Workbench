# AI Nexus Workbench - Deployment Guide

This comprehensive guide walks you through deploying the AI Nexus Workbench backend infrastructure on AWS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Environment Configuration](#environment-configuration)
4. [Deployment Process](#deployment-process)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Troubleshooting](#troubleshooting)
7. [Rollback Procedures](#rollback-procedures)

## Prerequisites

### Required Tools

Ensure you have the following tools installed:

```bash
# Check prerequisites
node --version    # >= 18.x
npm --version     # >= 8.x
aws --version     # >= 2.x
cdk --version     # >= 2.x
curl --version    # For verification
jq --version      # For JSON processing
```

### AWS Account Setup

1. **AWS Account**: Active AWS account with appropriate permissions
2. **AWS CLI Configuration**: 
   ```bash
   aws configure
   # Or use environment variables:
   # export AWS_ACCESS_KEY_ID=your-access-key
   # export AWS_SECRET_ACCESS_KEY=your-secret-key
   # export AWS_DEFAULT_REGION=us-east-2
   ```
3. **Permissions**: Your AWS user/role should have permissions for:
   - CloudFormation (full access)
   - Lambda (full access)
   - API Gateway (full access)
   - DynamoDB (full access)
   - S3 (full access)
   - Cognito (full access)
   - EventBridge (full access)
   - IAM (create/manage roles)

## Pre-Deployment Checklist

### ✅ Environment Setup

- [ ] AWS CLI configured with correct credentials
- [ ] AWS CDK bootstrapped in target region
- [ ] Required tools installed (Node.js, NPM, CDK CLI)
- [ ] Environment variables configured
- [ ] CORS origins defined for your frontend
- [ ] Domain/certificate ready (if using custom domain)

### ✅ Code Preparation

- [ ] Lambda function code is in `lambda/community-api/` directory
- [ ] `community-api/handler.ts` properly delegates to main API handler
- [ ] All required dependencies are listed in `package.json` files
- [ ] Environment variable mapping is correct in handler

### ✅ Configuration Review

- [ ] CDK context settings reviewed in deployment script
- [ ] Stack names follow expected pattern: `AiNexusCommunityCore-{environment}`
- [ ] Environment-specific settings configured
- [ ] Feature flags (WAF, logging, analytics) set appropriately

### ✅ Stripe Integration Setup

- [ ] Stripe account created and configured
- [ ] Stripe API keys obtained (secret key and webhook signing secret)
- [ ] AWS Secrets Manager secrets configured with Stripe keys
- [ ] Stripe products and pricing configured in Stripe Dashboard
- [ ] Webhook endpoint URL configured in Stripe Dashboard

## Environment Configuration

### Environment Variables

The deployment script supports the following environment variables:

```bash
# Core Configuration
export AWS_REGION=us-east-2
export ENVIRONMENT=dev  # dev, staging, or prod

# Feature Toggles
export ENABLE_WAF=false
export ENABLE_DETAILED_LOGGING=true
export ENABLE_REAL_TIME_ANALYTICS=false
export ENABLE_DATA_LAKE=false

# CORS Configuration
export CORS_ORIGINS='["https://app.ainexus.dev","https://localhost:3000"]'
```

### CDK Bootstrap

Ensure CDK is bootstrapped in your target AWS account and region:

```bash
# Bootstrap CDK (run once per account/region)
cdk bootstrap aws://ACCOUNT-NUMBER/us-east-2

# Verify bootstrap
cdk doctor
```

### Stripe Configuration

The backend includes comprehensive Stripe billing integration. Before deployment, configure your Stripe secrets:

```bash
# Set your Stripe API secret key in AWS Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id "/ai-nexus/diatonicvisuals/stripe/secret_key" \
  --secret-string "sk_test_your_stripe_secret_key_here"

# Set your Stripe webhook signing secret
aws secretsmanager put-secret-value \
  --secret-id "/ai-nexus/diatonicvisuals/stripe/webhook_signing_secret" \
  --secret-string "whsec_your_webhook_signing_secret_here"
```

**Note**: These secrets will be created automatically by the deployment, but you'll need to update them with your actual Stripe keys after the first deployment.

## Deployment Process

### Option 1: Standard Deployment

Deploy all stacks with default configuration:

```bash
cd /home/daclab-ai/dev/AWS-DevOps/apps/ai-nexus-workbench
./scripts/deploy-backend.sh -e dev
```

### Option 2: Feature-Enabled Deployment

Deploy with specific features enabled:

```bash
./scripts/deploy-backend.sh \
  --environment staging \
  --enable-waf \
  --enable-logging \
  --enable-analytics \
  --cors-origins '["https://staging.ainexus.dev"]'
```

### Option 3: Stack-Specific Deployment

Deploy only specific stacks:

```bash
# Deploy only community stack
./scripts/deploy-backend.sh -e prod --stack community

# Deploy only observatory stack
./scripts/deploy-backend.sh -e prod --stack observatory
```

### Option 4: Dry Run

Preview changes without deploying:

```bash
./scripts/deploy-backend.sh -e dev --dry-run
```

### Full Command Reference

```bash
./scripts/deploy-backend.sh [OPTIONS]

Options:
  -e, --environment ENV    Target environment (dev|staging|prod) [default: dev]
  -s, --stack STACK       Stack filter (community|observatory|all) [default: all]
  --enable-waf            Enable AWS WAF protection
  --enable-logging        Enable detailed CloudWatch logging
  --enable-analytics      Enable real-time analytics
  --enable-data-lake      Enable data lake features
  --cors-origins ORIGINS  CORS origins JSON array [default: ["*"]]
  --dry-run               Show changes without deploying
  -h, --help              Show help message
```

## Post-Deployment Verification

### Automated Verification

Run the comprehensive verification script:

```bash
# Basic verification
./scripts/verify-deployment.sh -e dev

# Verbose verification with authentication tests
./scripts/verify-deployment.sh -e dev -v

# Skip auth tests for initial setup
./scripts/verify-deployment.sh -e dev --skip-auth

# Verify specific stack only
./scripts/verify-deployment.sh -e dev --stack community
```

### Manual Verification

#### 1. Check CloudFormation Stacks

```bash
# List all stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Get stack outputs
aws cloudformation describe-stacks --stack-name AiNexusCommunityCore-dev
```

#### 2. Test API Endpoints

```bash
# Get API endpoint from stack output
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name AiNexusCommunityCore-dev \
  --query "Stacks[0].Outputs[?OutputKey=='CommunityApiEndpoint'].OutputValue" \
  --output text)

# Test health endpoint
curl $API_ENDPOINT/v1/health

# Test other endpoints
curl $API_ENDPOINT/v1/experiments
curl $API_ENDPOINT/v1/datasets
curl $API_ENDPOINT/v1/analytics/summary

# Test billing endpoints
curl $API_ENDPOINT/v1/billing/plans
```

#### 3. Verify Database Tables

```bash
# List DynamoDB tables
aws dynamodb list-tables

# Check table status
aws dynamodb describe-table --table-name AiNexusWorkbench-dev-posts
```

#### 4. Check Lambda Functions

```bash
# List Lambda functions
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `AiNexusWorkbench`)].FunctionName'

# Test function directly
aws lambda invoke \
  --function-name AiNexusWorkbench-dev-community-api \
  --payload '{"httpMethod":"GET","path":"/v1/health"}' \
  /tmp/lambda-response.json
```

### Expected Outputs

After successful deployment, you should see:

1. **CloudFormation Stacks**: 
   - `AiNexusCommunityCore-dev` (CREATE_COMPLETE)
   - `AiNexusObservatoryCore-dev` (CREATE_COMPLETE)

2. **API Endpoints**:
   - Community API: `https://xxxxxx.execute-api.us-east-2.amazonaws.com/v1`
   - Observatory API: `https://yyyyyy.execute-api.us-east-2.amazonaws.com/v1`

3. **DynamoDB Tables**:
   - `AiNexusWorkbench-dev-posts`
   - `AiNexusWorkbench-dev-groups`
   - `AiNexusWorkbench-dev-interactions`
   - `AiNexusWorkbench-dev-moderation`

4. **Lambda Functions**:
   - `AiNexusWorkbench-dev-community-api`
   - `AiNexusWorkbench-dev-moderation`
   - `AiNexusWorkbench-dev-engagement`
   - `AiNexusWorkbench-dev-observatory-api`

5. **S3 Buckets**:
   - Content bucket for file uploads

6. **Cognito Resources**:
   - User Pool for authentication
   - Identity Pool for AWS access

## Troubleshooting

### Common Issues

#### 1. CDK Bootstrap Issues

**Error**: `Policy contains invalid action`

**Solution**: 
```bash
# Update CDK to latest version
npm install -g aws-cdk

# Re-bootstrap with updated permissions
cdk bootstrap --force
```

#### 2. Lambda Deployment Issues

**Error**: `Function code size exceeds maximum`

**Solution**:
```bash
# Clean and reinstall dependencies
cd lambda/community-api
rm -rf node_modules
npm install --production

# Check bundle size
du -sh node_modules
```

#### 3. Permission Issues

**Error**: `User is not authorized to perform action`

**Solution**: Ensure your AWS user has the required permissions listed in Prerequisites.

#### 4. Stack Already Exists

**Error**: `Stack already exists`

**Solution**:
```bash
# Check stack status
aws cloudformation describe-stacks --stack-name AiNexusCommunityCore-dev

# If in failed state, delete and retry
aws cloudformation delete-stack --stack-name AiNexusCommunityCore-dev
```

#### 5. API Gateway CORS Issues

**Error**: CORS preflight failures

**Solution**: Check CORS configuration in the deployment script and ensure all origins are properly formatted.

### Debug Commands

```bash
# Check CDK context
cdk context --clear
cdk ls

# Validate CloudFormation template
cdk synth --app "npx ts-node bin/backend-stacks.ts"

# View detailed CloudFormation events
aws cloudformation describe-stack-events --stack-name AiNexusCommunityCore-dev

# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/AiNexusWorkbench"
aws logs tail /aws/lambda/AiNexusWorkbench-dev-community-api --follow
```

## Rollback Procedures

### Option 1: Stack-Level Rollback

```bash
# Rollback to previous stack version
aws cloudformation cancel-update-stack --stack-name AiNexusCommunityCore-dev

# Or delete and redeploy previous version
aws cloudformation delete-stack --stack-name AiNexusCommunityCore-dev
# Then redeploy with previous code version
```

### Option 2: Application-Level Rollback

```bash
# Update Lambda function code to previous version
aws lambda update-function-code \
  --function-name AiNexusWorkbench-dev-community-api \
  --zip-file fileb://previous-version.zip
```

### Option 3: Database Rollback

**⚠️ Warning**: Database rollbacks can cause data loss. Use with caution.

```bash
# Restore DynamoDB table from point-in-time backup
aws dynamodb restore-table-from-backup \
  --target-table-name AiNexusWorkbench-dev-posts-restored \
  --backup-arn arn:aws:dynamodb:region:account:table/source-table/backup/backup-id
```

## Environment-Specific Considerations

### Development Environment

- Use minimal resources to reduce costs
- Enable detailed logging for debugging
- Allow permissive CORS for local development
- Skip WAF to reduce complexity

### Staging Environment

- Mirror production configuration
- Enable all monitoring and logging
- Use realistic data volumes for testing
- Test authentication flows thoroughly

### Production Environment

- Enable WAF for security
- Configure monitoring and alerting
- Set up backup procedures
- Use restrictive CORS settings
- Enable data lake for analytics

## Next Steps

After successful deployment:

1. **Update Frontend Configuration**: Update your frontend app with the new API endpoints
2. **Set Up Monitoring**: Configure CloudWatch dashboards and alerts
3. **Configure CI/CD**: Set up automated deployments
4. **Load Testing**: Perform load testing to ensure performance
5. **Security Review**: Conduct security assessment
6. **Documentation**: Update API documentation with actual endpoints
7. **User Testing**: Conduct user acceptance testing

## Support

For deployment issues:

1. Check the troubleshooting section above
2. Review CloudFormation events and Lambda logs
3. Run the verification script with verbose output
4. Verify all prerequisites are met
5. Check AWS service limits and quotas

For application issues:
1. Review Lambda function logs
2. Test API endpoints individually
3. Verify database connectivity and data
4. Check authentication configuration

Remember to always test deployments in a development environment before deploying to production!
