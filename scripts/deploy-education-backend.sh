#!/bin/bash
# =============================================================================
# AI Nexus Workbench - Education Backend Deployment Script
# =============================================================================
# This script deploys the Education vertical backend infrastructure
# including DynamoDB tables, Lambda functions, and API Gateway extensions
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$PROJECT_ROOT/infra"
LAMBDA_DIR="$PROJECT_ROOT/lambda"

# Configuration
ENVIRONMENT="${1:-dev}"
PLAN_ONLY="${2:-false}"

echo -e "${BLUE}🚀 AI Nexus Education Backend Deployment${NC}"
echo -e "${BLUE}=========================================${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Project Root: ${YELLOW}$PROJECT_ROOT${NC}"
echo -e "Infrastructure Dir: ${YELLOW}$INFRA_DIR${NC}"
echo ""

# Validation
if [[ ! -d "$INFRA_DIR" ]]; then
    echo -e "${RED}❌ Infrastructure directory not found: $INFRA_DIR${NC}"
    exit 1
fi

if [[ ! -f "$INFRA_DIR/terraform.$ENVIRONMENT.tfvars" ]]; then
    echo -e "${RED}❌ Terraform variables file not found: terraform.$ENVIRONMENT.tfvars${NC}"
    exit 1
fi

# Step 1: Install Lambda dependencies
echo -e "${YELLOW}📦 Step 1: Installing Lambda dependencies...${NC}"
cd "$LAMBDA_DIR/education-api"

if [[ ! -f package.json ]]; then
    echo -e "${RED}❌ package.json not found in Lambda directory${NC}"
    exit 1
fi

# Install npm dependencies
echo -e "Installing npm packages..."
npm install --production

# Create packages directory
mkdir -p "$LAMBDA_DIR/packages"

echo -e "${GREEN}✅ Lambda dependencies installed${NC}"
echo ""

# Step 2: Terraform initialization
echo -e "${YELLOW}🏗️  Step 2: Initializing Terraform...${NC}"
cd "$INFRA_DIR"

terraform init -input=false

echo -e "${GREEN}✅ Terraform initialized${NC}"
echo ""

# Step 3: Terraform validation
echo -e "${YELLOW}🔍 Step 3: Validating Terraform configuration...${NC}"

terraform validate

echo -e "${GREEN}✅ Terraform configuration is valid${NC}"
echo ""

# Step 4: Terraform plan
echo -e "${YELLOW}📋 Step 4: Creating Terraform plan...${NC}"

terraform plan \
    -var-file="terraform.$ENVIRONMENT.tfvars" \
    -out="education-backend-$ENVIRONMENT.tfplan" \
    -input=false

echo -e "${GREEN}✅ Terraform plan created${NC}"
echo ""

# Step 5: Show plan summary
echo -e "${YELLOW}📊 Step 5: Plan Summary${NC}"
echo -e "${BLUE}==================${NC}"

# Extract plan summary
terraform show -no-color "education-backend-$ENVIRONMENT.tfplan" | grep -E "(Plan:|will be)" || echo "Plan details available in tfplan file"

echo ""

# Exit if plan-only mode
if [[ "$PLAN_ONLY" == "true" ]]; then
    echo -e "${YELLOW}📋 Plan-only mode enabled. Stopping before apply.${NC}"
    echo -e "To apply the plan, run:"
    echo -e "${BLUE}terraform apply education-backend-$ENVIRONMENT.tfplan${NC}"
    exit 0
fi

# Step 6: Confirmation prompt
echo -e "${YELLOW}⚠️  Step 6: Deployment Confirmation${NC}"
echo -e "This will create/update the following resources:"
echo -e "  • DynamoDB tables (courses, lessons, enrollments, progress)"
echo -e "  • Lambda function (education-api)"
echo -e "  • API Gateway resources (/education, /education/courses)"
echo -e "  • IAM roles and policies"
echo -e "  • CloudWatch log groups"
echo ""
read -p "$(echo -e ${YELLOW}Continue with deployment? [y/N]:${NC} )" -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}📋 Deployment cancelled by user${NC}"
    exit 0
fi

# Step 7: Apply Terraform plan
echo -e "${YELLOW}🚀 Step 7: Applying Terraform plan...${NC}"

terraform apply \
    -auto-approve \
    "education-backend-$ENVIRONMENT.tfplan"

echo -e "${GREEN}✅ Terraform apply completed${NC}"
echo ""

# Step 8: Extract outputs
echo -e "${YELLOW}📤 Step 8: Extracting deployment outputs...${NC}"

# Get Terraform outputs
API_GATEWAY_URL=$(terraform output -raw integration_info 2>/dev/null | jq -r '.api_gateway_id' || echo "")
LAMBDA_FUNCTION_NAME=$(terraform output -raw education_lambda_info 2>/dev/null | jq -r '.function_name' || echo "")

if [[ -n "$API_GATEWAY_URL" ]]; then
    echo -e "${GREEN}✅ API Gateway ID: $API_GATEWAY_URL${NC}"
fi

if [[ -n "$LAMBDA_FUNCTION_NAME" ]]; then
    echo -e "${GREEN}✅ Lambda Function: $LAMBDA_FUNCTION_NAME${NC}"
fi

# Step 9: Test deployment
echo -e "${YELLOW}🧪 Step 9: Testing deployment...${NC}"

# Test Lambda function
if [[ -n "$LAMBDA_FUNCTION_NAME" ]]; then
    echo -e "Testing Lambda function..."
    
    aws lambda invoke \
        --function-name "$LAMBDA_FUNCTION_NAME" \
        --payload '{"httpMethod":"GET","path":"/education","requestContext":{"authorizer":{"claims":{"custom:organization_id":"dev-org","sub":"test-user","custom:role":"instructor"}}}}' \
        /tmp/lambda-test-response.json \
        --output text --query 'StatusCode'
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Lambda function test passed${NC}"
        echo -e "Response:"
        cat /tmp/lambda-test-response.json | jq . || cat /tmp/lambda-test-response.json
        rm -f /tmp/lambda-test-response.json
    else
        echo -e "${RED}❌ Lambda function test failed${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping Lambda test (function name not found)${NC}"
fi

echo ""

# Step 10: Generate environment configuration
echo -e "${YELLOW}⚙️  Step 10: Generating environment configuration...${NC}"

# Create .env.local for frontend
ENV_FILE="$PROJECT_ROOT/.env.local"

cat > "$ENV_FILE" << EOF
# AI Nexus Workbench - Generated Environment Configuration
# Generated by: deploy-education-backend.sh
# Generated at: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# Environment: $ENVIRONMENT

# Core Configuration
VITE_ENVIRONMENT=$ENVIRONMENT
VITE_AWS_REGION=us-east-2

# API Configuration  
VITE_AWS_API_GATEWAY_ENDPOINT=https://\${API_GATEWAY_ID}.execute-api.us-east-2.amazonaws.com/$ENVIRONMENT
VITE_API_VERSION=v1

# Cognito Configuration (from existing infrastructure)
VITE_AWS_COGNITO_USER_POOL_ID=us-east-2_EXISTING
VITE_AWS_COGNITO_USER_POOL_CLIENT_ID=EXISTING_CLIENT_ID

# S3 Configuration (from existing infrastructure)
VITE_AWS_S3_BUCKET=aws-devops-dev-static-assets-development-dzfngw8v

# Feature Flags
VITE_ENABLE_EDUCATION_API=true
VITE_ENABLE_PROJECTS_API=false
VITE_ENABLE_AGENTS_API=false
VITE_ENABLE_LAB_API=false
VITE_ENABLE_COMMUNITY_API=false
VITE_ENABLE_NOTIFICATIONS_API=false

# Debug Configuration
VITE_ENABLE_DEBUG_LOGS=true
VITE_LOG_LEVEL=debug

# Multi-Tenant Configuration
VITE_DEFAULT_ORGANIZATION_ID=dev-org
VITE_ENABLE_TENANT_ISOLATION=true
EOF

echo -e "${GREEN}✅ Environment configuration generated: $ENV_FILE${NC}"
echo ""

# Step 11: Deployment summary
echo -e "${BLUE}🎉 Deployment Summary${NC}"
echo -e "${BLUE}==================${NC}"
echo -e "${GREEN}✅ Education Backend Deployed Successfully${NC}"
echo ""
echo -e "📋 Resources Created/Updated:"
echo -e "  • DynamoDB Tables: courses, lessons, enrollments, progress"
echo -e "  • Lambda Function: $LAMBDA_FUNCTION_NAME"
echo -e "  • API Gateway Endpoints: /education, /education/courses"
echo -e "  • CloudWatch Log Groups"
echo -e "  • IAM Roles and Policies"
echo ""
echo -e "🔗 API Endpoints:"
echo -e "  • Education Root: GET /education"
echo -e "  • List Courses: GET /education/courses"
echo -e "  • Create Course: POST /education/courses"
echo -e "  • Get Course: GET /education/courses/{id}"
echo -e "  • Update Course: PUT /education/courses/{id}"
echo -e "  • Delete Course: DELETE /education/courses/{id}"
echo ""
echo -e "📱 Frontend Integration:"
echo -e "  • Environment file: $ENV_FILE"
echo -e "  • Update your frontend API client to use the new endpoints"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "1. Update frontend to use new API endpoints"
echo -e "2. Test end-to-end functionality"
echo -e "3. Deploy additional verticals (Projects, Agents, etc.)"
echo ""
echo -e "${GREEN}🚀 Education Backend is ready for use!${NC}"
