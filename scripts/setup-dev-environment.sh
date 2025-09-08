#!/usr/bin/env bash
# AI Nexus Workbench - Development Environment Setup Script
# This script automates the setup of the AI Lab Backend development environment

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ai-nexus-workbench"
STACK_NAME="AILabCore"
ENVIRONMENT="dev"
REGION="${AWS_DEFAULT_REGION:-us-east-2}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-863584456189}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_tools=()
    
    if ! command -v node &> /dev/null; then
        missing_tools+=("Node.js")
    elif [[ $(node --version | sed 's/v//' | cut -d. -f1) -lt 18 ]]; then
        log_error "Node.js version 18 or higher required. Current: $(node --version)"
        missing_tools+=("Node.js 18+")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi
    
    if ! command -v aws &> /dev/null; then
        missing_tools+=("AWS CLI")
    fi
    
    if ! command -v cdk &> /dev/null; then
        missing_tools+=("AWS CDK")
    fi
    
    if ! command -v tsc &> /dev/null; then
        missing_tools+=("TypeScript compiler")
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Please install the missing tools and run this script again."
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Verify AWS credentials
check_aws_credentials() {
    log_info "Checking AWS credentials..."
    
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        log_info "Please run 'aws configure' to set up your credentials"
        exit 1
    fi
    
    local current_account=$(aws sts get-caller-identity --query Account --output text)
    local current_region=$(aws configure get region)
    
    log_info "AWS Account: $current_account"
    log_info "AWS Region: $current_region"
    
    if [[ "$current_account" != "$ACCOUNT_ID" ]]; then
        log_warning "Current account ($current_account) differs from expected ($ACCOUNT_ID)"
    fi
    
    if [[ "$current_region" != "$REGION" ]]; then
        log_warning "Current region ($current_region) differs from expected ($REGION)"
        REGION="$current_region"
    fi
    
    log_success "AWS credentials verified"
}

# Setup infrastructure project
setup_infrastructure() {
    log_info "Setting up infrastructure project..."
    
    local infra_dir="/home/daclab-ai/dev/AWS-DevOps/apps/ai-nexus-workbench/infra"
    
    if [[ ! -d "$infra_dir" ]]; then
        log_error "Infrastructure directory not found: $infra_dir"
        exit 1
    fi
    
    cd "$infra_dir"
    
    log_info "Installing npm dependencies..."
    npm install --silent
    
    log_info "Building TypeScript..."
    npm run build
    
    log_success "Infrastructure project setup complete"
}

# Bootstrap CDK if needed
bootstrap_cdk() {
    log_info "Checking CDK bootstrap status..."
    
    local bootstrap_needed=false
    
    # Check if bootstrap stack exists
    if ! aws cloudformation describe-stacks \
        --region "$REGION" \
        --stack-name "CDKToolkit" &> /dev/null; then
        bootstrap_needed=true
    else
        log_info "CDK already bootstrapped in $REGION"
    fi
    
    if [[ "$bootstrap_needed" == "true" ]]; then
        log_info "Bootstrapping CDK for account $ACCOUNT_ID in region $REGION..."
        cdk bootstrap "aws://$ACCOUNT_ID/$REGION" \
            --context "environment=$ENVIRONMENT" \
            --context "account=$ACCOUNT_ID" \
            --context "region=$REGION"
        log_success "CDK bootstrap complete"
    fi
}

# Deploy infrastructure
deploy_infrastructure() {
    log_info "Deploying infrastructure to development environment..."
    
    local stack_full_name="${STACK_NAME}-${ENVIRONMENT}"
    
    # Check if stack already exists
    if aws cloudformation describe-stacks \
        --region "$REGION" \
        --stack-name "$stack_full_name" &> /dev/null; then
        log_warning "Stack $stack_full_name already exists. Updating..."
    fi
    
    log_info "Synthesizing CloudFormation template..."
    npm run synth:dev
    
    log_info "Deploying stack..."
    npm run deploy:dev
    
    log_success "Infrastructure deployment complete"
}

# Extract deployment outputs
extract_outputs() {
    log_info "Extracting deployment outputs..."
    
    local stack_full_name="${STACK_NAME}-${ENVIRONMENT}"
    local outputs_file="/tmp/stack-outputs.json"
    
    aws cloudformation describe-stacks \
        --region "$REGION" \
        --stack-name "$stack_full_name" \
        --query "Stacks[0].Outputs" \
        > "$outputs_file"
    
    # Extract key values
    local user_pool_id=$(jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue' "$outputs_file")
    local user_pool_client_id=$(jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue' "$outputs_file")
    local api_endpoint=$(jq -r '.[] | select(.OutputKey=="ApiEndpoint") | .OutputValue' "$outputs_file")
    local entities_table=$(jq -r '.[] | select(.OutputKey=="EntitiesTableName") | .OutputValue' "$outputs_file")
    local usage_table=$(jq -r '.[] | select(.OutputKey=="UsageTableName") | .OutputValue' "$outputs_file")
    local tenants_table=$(jq -r '.[] | select(.OutputKey=="TenantsTableName") | .OutputValue' "$outputs_file")
    local artifacts_bucket=$(jq -r '.[] | select(.OutputKey=="ArtifactsBucketName") | .OutputValue' "$outputs_file")
    local event_bus=$(jq -r '.[] | select(.OutputKey=="EventBusName") | .OutputValue' "$outputs_file")
    
    # Create environment file
    local env_file="/home/daclab-ai/dev/AWS-DevOps/apps/ai-nexus-workbench/.env.development"
    cat > "$env_file" << EOF
# AI Nexus Workbench - Development Environment Configuration
# Generated on $(date -u +"%Y-%m-%d %H:%M:%S UTC")

# AWS Configuration
VITE_AWS_REGION=$REGION
VITE_AWS_ACCOUNT_ID=$ACCOUNT_ID

# Cognito Configuration
VITE_AWS_COGNITO_USER_POOL_ID=$user_pool_id
VITE_AWS_COGNITO_USER_POOL_CLIENT_ID=$user_pool_client_id
VITE_AWS_COGNITO_IDENTITY_POOL_ID=

# API Configuration
VITE_AWS_API_GATEWAY_ENDPOINT=$api_endpoint

# Storage Configuration
VITE_AWS_S3_BUCKET=$artifacts_bucket

# DynamoDB Tables
ENTITIES_TABLE_NAME=$entities_table
USAGE_TABLE_NAME=$usage_table
TENANTS_TABLE_NAME=$tenants_table

# EventBridge
EVENT_BUS_NAME=$event_bus

# Application Configuration
VITE_APP_NAME=AI Nexus Workbench
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=$ENVIRONMENT

# Debug Configuration
VITE_ENABLE_DEBUG_LOGS=true
VITE_ENABLE_ANALYTICS=false

# Local Development
NODE_ENV=development
EOF
    
    log_success "Environment configuration created: $env_file"
    
    # Display summary
    echo -e "\n${GREEN}=== Deployment Summary ===${NC}"
    echo -e "Stack Name: ${BLUE}$stack_full_name${NC}"
    echo -e "Region: ${BLUE}$REGION${NC}"
    echo -e "User Pool ID: ${BLUE}$user_pool_id${NC}"
    echo -e "API Endpoint: ${BLUE}$api_endpoint${NC}"
    echo -e "Environment File: ${BLUE}$env_file${NC}"
    echo -e "${GREEN}=========================${NC}\n"
    
    # Store outputs for later use
    export USER_POOL_ID="$user_pool_id"
    export USER_POOL_CLIENT_ID="$user_pool_client_id"
    export API_ENDPOINT="$api_endpoint"
    export TENANTS_TABLE="$tenants_table"
}

# Configure secrets
configure_secrets() {
    log_info "Configuring AWS Secrets Manager..."
    
    local openai_secret="${PROJECT_NAME}-${ENVIRONMENT}/openai/key"
    local stripe_secret="${PROJECT_NAME}-${ENVIRONMENT}/stripe/secret"
    
    # Check if OpenAI secret exists
    if aws secretsmanager describe-secret \
        --region "$REGION" \
        --secret-id "$openai_secret" &> /dev/null; then
        log_info "OpenAI secret already exists"
    else
        log_warning "OpenAI secret not found. Creating placeholder..."
        aws secretsmanager create-secret \
            --region "$REGION" \
            --name "$openai_secret" \
            --description "OpenAI API key for $ENVIRONMENT environment" \
            --secret-string '{"api_key":"REPLACE_WITH_ACTUAL_OPENAI_API_KEY"}'
    fi
    
    # Check if Stripe secret exists
    if aws secretsmanager describe-secret \
        --region "$REGION" \
        --secret-id "$stripe_secret" &> /dev/null; then
        log_info "Stripe secret already exists"
    else
        log_warning "Stripe secret not found. Creating placeholder..."
        aws secretsmanager create-secret \
            --region "$REGION" \
            --name "$stripe_secret" \
            --description "Stripe API secrets for $ENVIRONMENT environment" \
            --secret-string '{"api_key":"REPLACE_WITH_ACTUAL_STRIPE_KEY","webhook_secret":"REPLACE_WITH_WEBHOOK_SECRET"}'
    fi
    
    log_warning "Please update the secrets with actual API keys:"
    log_info "AWS Console > Secrets Manager > $openai_secret"
    log_info "AWS Console > Secrets Manager > $stripe_secret"
}

# Create sample tenants
create_sample_tenants() {
    log_info "Creating sample tenants..."
    
    local setup_script="/tmp/setup-tenants.mjs"
    cat > "$setup_script" << 'EOF'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const region = process.env.AWS_REGION || 'us-east-2';
const tenantsTable = process.env.TENANTS_TABLE;

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

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
    billing: {
      stripe_customer_id: null,
      subscription_id: null,
      subscription_status: 'trial'
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
      max_projects: -1,
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
    billing: {
      stripe_customer_id: null,
      subscription_id: null,
      subscription_status: 'enterprise'
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
        TableName: tenantsTable,
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
    
    AWS_REGION="$REGION" TENANTS_TABLE="$TENANTS_TABLE" node "$setup_script"
    log_success "Sample tenants created"
}

# Create test users
create_test_users() {
    log_info "Creating test users in Cognito..."
    
    # Create admin user
    if aws cognito-idp admin-get-user \
        --region "$REGION" \
        --user-pool-id "$USER_POOL_ID" \
        --username "admin@demo-org.com" &> /dev/null; then
        log_info "Admin user already exists"
    else
        aws cognito-idp admin-create-user \
            --region "$REGION" \
            --user-pool-id "$USER_POOL_ID" \
            --username "admin@demo-org.com" \
            --user-attributes \
                Name=email,Value=admin@demo-org.com \
                Name=given_name,Value=Admin \
                Name=family_name,Value=User \
                Name=custom:tenant_id,Value=demo-org \
                Name=custom:role,Value=tenant_admin \
                Name=custom:plan,Value=pro \
                Name=custom:features,Value='["agents","experiments","linting","debugging","monitoring"]' \
            --temporary-password "TempPass123!" \
            --message-action SUPPRESS
        log_success "Created admin user: admin@demo-org.com"
    fi
    
    # Create developer user
    if aws cognito-idp admin-get-user \
        --region "$REGION" \
        --user-pool-id "$USER_POOL_ID" \
        --username "dev@demo-org.com" &> /dev/null; then
        log_info "Developer user already exists"
    else
        aws cognito-idp admin-create-user \
            --region "$REGION" \
            --user-pool-id "$USER_POOL_ID" \
            --username "dev@demo-org.com" \
            --user-attributes \
                Name=email,Value=dev@demo-org.com \
                Name=given_name,Value=Developer \
                Name=family_name,Value=User \
                Name=custom:tenant_id,Value=demo-org \
                Name=custom:role,Value=developer \
                Name=custom:plan,Value=pro \
                Name=custom:features,Value='["agents","experiments"]' \
            --temporary-password "TempPass123!" \
            --message-action SUPPRESS
        log_success "Created developer user: dev@demo-org.com"
    fi
    
    log_warning "Test user credentials:"
    log_info "Admin: admin@demo-org.com / TempPass123!"
    log_info "Developer: dev@demo-org.com / TempPass123!"
    log_info "Users will be prompted to change password on first login"
}

# Test deployment
test_deployment() {
    log_info "Testing deployment..."
    
    # Test health endpoint
    local health_response=$(curl -s "$API_ENDPOINT/v1/health" || echo "")
    
    if [[ -n "$health_response" ]] && echo "$health_response" | jq -e '.status == "healthy"' &> /dev/null; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        log_error "Response: $health_response"
        return 1
    fi
    
    # Test CORS
    local cors_response=$(curl -s -I \
        -H "Origin: http://localhost:3000" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        "$API_ENDPOINT/v1/health" || echo "")
    
    if echo "$cors_response" | grep -q "Access-Control-Allow-Origin"; then
        log_success "CORS configuration working"
    else
        log_warning "CORS may not be properly configured"
    fi
    
    log_success "Deployment testing complete"
}

# Create development documentation
create_dev_docs() {
    log_info "Creating development documentation..."
    
    local dev_readme="/home/daclab-ai/dev/AWS-DevOps/apps/ai-nexus-workbench/DEV_README.md"
    cat > "$dev_readme" << EOF
# AI Nexus Workbench - Development Environment

## 🚀 Quick Start

The development environment has been automatically configured. Here are the key details:

### Environment Configuration
- **Environment**: $ENVIRONMENT
- **Region**: $REGION
- **API Endpoint**: $API_ENDPOINT
- **User Pool ID**: $USER_POOL_ID

### Test Users
| Email | Password | Role | Tenant |
|-------|----------|------|--------|
| admin@demo-org.com | TempPass123! | tenant_admin | demo-org |
| dev@demo-org.com | TempPass123! | developer | demo-org |

### Environment File
Configuration has been saved to: \`.env.development\`

## 🧪 Testing

### Health Check
\`\`\`bash
curl $API_ENDPOINT/v1/health
\`\`\`

### Authenticate User (Frontend)
Use the Cognito configuration in \`.env.development\` to authenticate users in your React app.

## 📊 Monitoring

### CloudWatch Dashboards
- Operations Dashboard: [ainexus-dev-operations](https://console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=ainexus-dev-operations)
- Business Dashboard: [ainexus-dev-business](https://console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=ainexus-dev-business)

### DynamoDB Tables
- Entities: \`$TENANTS_TABLE\`
- Usage: \`$TENANTS_TABLE\`
- Tenants: \`$TENANTS_TABLE\`

## 🔧 Development Commands

### Infrastructure
\`\`\`bash
cd infra
npm run build        # Build TypeScript
npm run synth:dev    # Synthesize CloudFormation
npm run deploy:dev   # Deploy to development
npm run destroy:dev  # Destroy development stack
\`\`\`

### Frontend
\`\`\`bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
\`\`\`

## 🔑 Next Steps

1. Update API secrets in AWS Secrets Manager:
   - OpenAI API Key: [\`ainexus-dev/openai/key\`](https://console.aws.amazon.com/secretsmanager/home?region=$REGION#!/secret?name=ainexus-dev%2Fopenai%2Fkey)
   - Stripe API Key: [\`ainexus-dev/stripe/secret\`](https://console.aws.amazon.com/secretsmanager/home?region=$REGION#!/secret?name=ainexus-dev%2Fstripe%2Fsecret)

2. Start developing:
   - Implement API handlers in \`lambda/api/\`
   - Add provider adapters for LLM services
   - Build AI toolset features

3. Test with the frontend:
   - Update \`src/lib/aws-config.ts\` with values from \`.env.development\`
   - Test authentication with the created users

---

**Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Setup Script**: \`scripts/setup-dev-environment.sh\`
EOF

    log_success "Development documentation created: $dev_readme"
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "============================================="
    echo "   AI Nexus Workbench Development Setup    "
    echo "============================================="
    echo -e "${NC}"
    
    check_prerequisites
    check_aws_credentials
    setup_infrastructure
    bootstrap_cdk
    deploy_infrastructure
    extract_outputs
    configure_secrets
    create_sample_tenants
    create_test_users
    test_deployment
    create_dev_docs
    
    echo -e "\n${GREEN}✅ Development environment setup complete!${NC}\n"
    
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Update API secrets in AWS Secrets Manager"
    echo "2. Review the generated .env.development file"
    echo "3. Start developing your AI Lab features"
    echo "4. Test with the created users and sample tenants"
    echo -e "\n${BLUE}Documentation:${NC} DEV_README.md"
    echo -e "${BLUE}Implementation Guide:${NC} docs/Backend/IMPLEMENTATION_GUIDE.md"
    
    log_success "Happy coding! 🚀"
}

# Handle script interruption
trap 'log_error "Script interrupted. Cleanup may be required."; exit 1' INT TERM

# Execute main function
main "$@"
