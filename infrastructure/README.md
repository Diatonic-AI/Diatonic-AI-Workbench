# Diatonic AI - AWS Infrastructure

This directory contains the advanced Diatonic AI infrastructure that seamlessly integrates with the existing AWS DevOps infrastructure while replacing legacy AI Nexus components with a production-ready authentication and user management system.

## 🏗️ Infrastructure Overview

### What This Replaces

This advanced system **replaces** the legacy AI Nexus components in `/home/daclab-ai/dev/AWS-DevOps/infrastructure/terraform/core/`:

- **cognito-ainexus.tf** → Advanced Cognito with user groups
- **dynamodb-ainexus.tf** → Comprehensive 6-table schema  
- **lambda-ainexus.tf** → Production-ready Lambda functions
- **api-gateway-ainexus.tf** → Advanced API Gateway with CORS, throttling, WAF
- **s3-ainexus-uploads.tf** → Enhanced S3 with lifecycle policies

### What This Uses From Existing Infrastructure

- **VPC Infrastructure**: Uses existing multi-tier VPC with public/private subnets
- **S3 Ecosystem**: Integrates with existing backup, logs, and static asset buckets
- **CloudWatch**: Leverages existing monitoring and alerting infrastructure
- **Security**: Follows existing security group and IAM patterns
- **DNS & SSL**: Uses existing Route53 and ACM certificate infrastructure

## 🚀 Quick Start

### Prerequisites

```bash
# Check required tools
aws --version      # AWS CLI v2+
terraform --version # Terraform >= 1.5.0
jq --version       # JSON processing
node --version     # Node.js 18+ (for Lambda functions)
```

### 1. Environment Setup

```bash
# Navigate to infrastructure directory
cd /home/daclab-ai/dev/AWS-DevOps/apps/diatonic-ai-platform/infrastructure

# Verify AWS credentials
aws sts get-caller-identity

# Check existing infrastructure
aws ec2 describe-vpcs --filters "Name=tag:Project,Values=aws-devops"
```

### 2. Quick Deployment

```bash
# Validate configuration
./deploy-integrated.sh validate dev

# Plan deployment (see what will be created)
./deploy-integrated.sh plan dev

# Deploy to development environment
./deploy-integrated.sh deploy dev

# Run integration tests
./deploy-integrated.sh test dev
```

## 📋 Migration from Legacy System

If you have existing legacy AI Nexus components:

### Step 1: Backup Existing Resources

```bash
# Backup current state
./deploy-integrated.sh backup dev

# This creates: infrastructure/backups/YYYYMMDD_HHMMSS_dev/
# - existing_resources.txt  (list of resources to migrate)
# - terraform_state.json    (current state backup)
# - *.txt files             (individual resource configs)
```

### Step 2: Remove Legacy Resources

```bash
# Review what will be migrated
./deploy-integrated.sh migrate dev

# This removes from terraform state:
# - aws_cognito_user_pool.ai_nexus_user_pool
# - aws_dynamodb_table.ai_nexus_*
# - aws_lambda_function.ai_nexus_*
# - aws_api_gateway_rest_api.ai_nexus_api
# - aws_s3_bucket.ai_nexus_uploads
```

### Step 3: Deploy Advanced System

```bash
# Deploy the new advanced system
./deploy-integrated.sh deploy dev

# Verify everything works
./deploy-integrated.sh test dev
```

## 🔧 Configuration

### Environment Files

**Development (`terraform.dev.tfvars`):**
```hcl
# Basic Configuration
environment = "dev"
aws_region = "us-east-2"

# Integration Settings
use_existing_vpc = true
use_existing_infrastructure = true

# Security Settings (relaxed for dev)
mfa_configuration = "OPTIONAL"
enable_waf = false
log_retention_days = 7

# CORS for local development
allowed_cors_origins = [
  "http://localhost:3000",
  "https://localhost:3000"
]
```

**Production (`terraform.prod.tfvars`):**
```hcl
# Basic Configuration
environment = "prod"
aws_region = "us-east-2"

# Integration Settings
use_existing_vpc = true
use_existing_infrastructure = true

# Security Settings (strict for prod)
mfa_configuration = "ON"
enable_waf = true
log_retention_days = 90

# Production domains
allowed_cors_origins = [
  "https://your-production-domain.com",
  "https://app.your-production-domain.com"
]

# Notifications
notification_email = "admin@your-domain.com"
```

### Key Variables

| Variable | Description | Dev Default | Prod Default |
|----------|-------------|-------------|--------------|
| `use_existing_vpc` | Use existing VPC | `true` | `true` |
| `mfa_configuration` | MFA requirement | `OPTIONAL` | `ON` |
| `enable_waf` | Enable Web Application Firewall | `false` | `true` |
| `log_retention_days` | CloudWatch log retention | `7` | `90` |
| `api_throttle_rate_limit` | API rate limit (req/sec) | `250` | `1000` |
| `lambda_memory_size` | Lambda memory (MB) | `256` | `512` |

## 🌐 API Endpoints

After deployment, access your API endpoints:

```bash
# Get the API Gateway URL
export API_BASE_URL=$(terraform output -raw api_gateway_invoke_url)

# Test endpoints
curl "$API_BASE_URL/health"                    # Health check
curl -H "Authorization: Bearer $JWT" "$API_BASE_URL/profile"  # User profile
```

### Available Endpoints

| Endpoint | Methods | Description | Auth Required |
|----------|---------|-------------|---------------|
| `/health` | GET | Health check | No |
| `/users` | GET, POST | User management | Yes |
| `/profile` | GET, PUT | User profile operations | Yes |
| `/organizations` | GET, POST, PUT | Organization management | Yes |
| `/settings` | GET, PUT | Application settings | Yes |
| `/content` | GET, POST, DELETE | Content management | Yes |

## 🔐 Authentication Integration

### Frontend Configuration

After deployment, use these outputs in your frontend:

```bash
# Get Cognito configuration
terraform output frontend_config
```

```javascript
// React/Next.js example
const cognitoConfig = {
  region: 'us-east-2',
  userPoolId: 'us-east-2_xxxxxxxxx',      // from terraform output
  userPoolWebClientId: 'xxxxxxxxx',       // from terraform output  
  identityPoolId: 'us-east-2:xxxx-xxxx',  // from terraform output
  apiGateway: {
    baseUrl: 'https://api.execute-api.us-east-2.amazonaws.com/dev'
  }
};

// Configure AWS Amplify
import { Amplify } from 'aws-amplify';
Amplify.configure({
  Auth: {
    region: cognitoConfig.region,
    userPoolId: cognitoConfig.userPoolId,
    userPoolWebClientId: cognitoConfig.userPoolWebClientId,
    identityPoolId: cognitoConfig.identityPoolId,
  },
  API: {
    REST: {
      'ai-nexus-api': {
        endpoint: cognitoConfig.apiGateway.baseUrl,
        region: cognitoConfig.region
      }
    }
  }
});
```

### User Groups

The system includes 4 user groups with different access levels:

1. **admin**: Full system access
   - User management
   - Organization administration
   - System configuration

2. **premium_user**: Enhanced features
   - Increased API quotas
   - Advanced features access
   - Organization member management

3. **standard_user**: Basic features
   - Standard API quotas
   - Basic feature set
   - Personal profile management

4. **read_only**: View-only access
   - Read-only API access
   - No modification permissions
   - Basic profile viewing

## 📊 Monitoring & Observability

### CloudWatch Integration

The infrastructure automatically creates:

```bash
# View log groups
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/aws-devops"
aws logs describe-log-groups --log-group-name-prefix "/aws/apigateway"

# Monitor in real-time
aws logs tail /aws/lambda/aws-devops-dev-ai-nexus-user-management --follow
```

### Key Metrics to Monitor

- **Authentication Rates**: User logins, registrations, failures
- **API Performance**: Request volume, latency, error rates  
- **Database Health**: DynamoDB read/write capacity, throttling
- **S3 Usage**: Storage consumption, request patterns
- **Lambda Performance**: Duration, memory usage, error rates

### Alarms and Alerts

Production deployments include:

- High error rate alerts
- API Gateway 4xx/5xx errors
- Lambda function failures
- DynamoDB throttling alerts
- S3 access failures

## 🧪 Testing

### Automated Testing

```bash
# Run comprehensive test suite
./deploy-and-test.sh

# This tests:
# - Authentication flows (register, login, MFA)
# - API endpoints (all CRUD operations)
# - User group permissions
# - S3 file operations
# - Database integrity
# - CORS functionality
```

### Manual Testing

```bash
# Test health endpoint
curl "$API_BASE_URL/health"

# Test authenticated endpoint (need JWT token)
export JWT_TOKEN="your-jwt-token-here"
curl -H "Authorization: Bearer $JWT_TOKEN" "$API_BASE_URL/profile"

# Test CORS
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Authorization" \
     -X OPTIONS "$API_BASE_URL/profile"
```

### Load Testing

```bash
# Basic load test
ab -n 100 -c 10 "$API_BASE_URL/health"

# Authenticated load test  
ab -n 100 -c 10 -H "Authorization: Bearer $JWT_TOKEN" "$API_BASE_URL/profile"
```

## 🚨 Troubleshooting

### Common Issues

#### 1. VPC Integration Issues

```bash
# Verify VPC exists
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=aws-devops-dev-vpc"

# Check subnets
aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-xxxxxxxxx"

# Fix: Update terraform.dev.tfvars
use_existing_vpc = true
```

#### 2. Cognito Configuration Issues

```bash
# Verify user pool exists
aws cognito-idp list-user-pools --max-results 10

# Check user pool configuration
aws cognito-idp describe-user-pool --user-pool-id us-east-2_xxxxxxxxx

# Common fix: Update CORS origins
allowed_cors_origins = [
  "http://localhost:3000",
  "https://your-domain.com"
]
```

#### 3. API Gateway CORS Issues

```bash
# Test CORS headers
curl -H "Origin: http://localhost:3000" \
     -I "$API_BASE_URL/health"

# Should see:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Headers: Content-Type,Authorization
```

#### 4. Lambda Permission Issues

```bash
# Check Lambda execution role
aws iam get-role --role-name aws-devops-dev-ai-nexus-lambda-execution-role

# Check attached policies
aws iam list-attached-role-policies --role-name aws-devops-dev-ai-nexus-lambda-execution-role
```

### Debugging Commands

```bash
# Enable Terraform debug logging
export TF_LOG=DEBUG
export TF_LOG_PATH=./terraform-debug.log

# Check AWS credentials and permissions
aws sts get-caller-identity
aws iam get-user

# Validate Terraform configuration
terraform validate
terraform plan -var-file="terraform.dev.tfvars"
```

## 💰 Cost Optimization

### Free Tier Usage

The infrastructure maximizes AWS Free Tier benefits:

- **Cognito**: 50,000 MAU free (Monthly Active Users)
- **DynamoDB**: 25 GB storage + 25 WCU/RCU free
- **Lambda**: 1M requests + 400,000 GB-seconds free
- **API Gateway**: 1M API calls free
- **S3**: 5 GB storage + 20,000 GET/2,000 PUT requests free
- **CloudWatch**: 10 custom metrics + 5 GB log ingestion free

### Cost Monitoring

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE

# Set up cost alerts (one-time setup)
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{
    "BudgetName": "AI-Nexus-Monthly-Budget",
    "BudgetLimit": {
      "Amount": "10.00",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }'
```

### Cost Optimization Settings

Production configurations include:

```hcl
# DynamoDB optimization
dynamodb_billing_mode = "PAY_PER_REQUEST"  # vs PROVISIONED

# Lambda optimization  
lambda_architecture = "arm64"              # vs x86_64 (20% cost reduction)
lambda_memory_size = 256                   # vs 512 (cost optimization)

# S3 optimization
s3_lifecycle_enabled = true                # Automatic archival
s3_intelligent_tiering = true             # Cost-based storage classes
```

## 🔄 Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor CloudWatch alarms
- Check error rates in dashboards
- Review API Gateway metrics

#### Weekly  
- Review cost reports
- Check backup integrity
- Update security patches

#### Monthly
- Terraform provider updates
- Review and rotate secrets
- Capacity planning review

### Updates and Upgrades

```bash
# Update Terraform providers
terraform init -upgrade

# Plan updates
terraform plan -var-file="terraform.prod.tfvars"

# Apply updates (with approval for production)
terraform apply -var-file="terraform.prod.tfvars"
```

### Backup and Recovery

```bash
# Manual backup
./deploy-integrated.sh backup prod

# Disaster recovery (restore from backup)
# 1. Restore Terraform state
# 2. Import existing resources  
# 3. Apply configuration
terraform import aws_cognito_user_pool.ai_nexus_pool us-east-2_xxxxxxxxx
```

## 📚 Additional Documentation

- **[INTEGRATION_STRATEGY.md](INTEGRATION_STRATEGY.md)**: Detailed integration approach
- **[Frontend-Integration-Guide.md](../docs/Frontend-Integration-Guide.md)**: Complete frontend setup
- **[deploy-and-test.sh](deploy-and-test.sh)**: Comprehensive testing script
- **[AWS DevOps Infrastructure](../../infrastructure/README.md)**: Existing infrastructure docs

## 🎯 Next Steps

After successful deployment:

1. **Frontend Integration**: Connect your React/Vue/Angular applications
2. **User Management**: Create initial admin users and configure groups  
3. **Monitoring Setup**: Configure additional alarms and dashboards
4. **Production Deployment**: Deploy to staging and production environments
5. **Performance Testing**: Conduct load testing and optimization

## 🤝 Integration Benefits

By integrating with the existing AWS DevOps infrastructure, you get:

- **Cost Efficiency**: No duplicate VPC, monitoring, or security infrastructure
- **Operational Consistency**: Single pane of glass for monitoring and management  
- **Security Compliance**: Leverages existing security patterns and compliance
- **Maintenance Simplification**: Unified backup, monitoring, and alerting strategies
- **Network Optimization**: Uses existing VPC endpoints and security groups

The Diatonic AI now provides enterprise-grade authentication while seamlessly integrating with your existing AWS infrastructure!

---

**Need Help?** 
- Check the troubleshooting section above
- Review logs: `aws logs tail /aws/lambda/your-function-name --follow`
- Run tests: `./deploy-integrated.sh test dev`
- Validate config: `./deploy-integrated.sh validate dev`
