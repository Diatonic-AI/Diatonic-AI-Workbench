#!/usr/bin/env bash

# ================================================================================
# AI Nexus Workbench - Backend Stack Deployment Script
# ================================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
ENABLE_WAF="false"
ENABLE_DETAILED_LOGGING="false"
ENABLE_REAL_TIME_ANALYTICS="false"
ENABLE_DATA_LAKE="false"
CORS_ORIGINS="http://localhost:3000,http://localhost:8080"
DRY_RUN="false"
STACK_FILTER=""

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$PROJECT_ROOT/infra"
LAMBDA_DIR="$PROJECT_ROOT/lambda"

# ================================================================================
# HELPER FUNCTIONS
# ================================================================================

log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $*${NC}"
}

success() {
  echo -e "${GREEN}[SUCCESS] $*${NC}"
}

warning() {
  echo -e "${YELLOW}[WARNING] $*${NC}"
}

error() {
  echo -e "${RED}[ERROR] $*${NC}"
}

usage() {
  cat << EOF
AI Nexus Workbench Backend Deployment Script

USAGE:
  $0 [OPTIONS]

OPTIONS:
  -e, --environment         Environment (dev|staging|prod) [default: dev]
  -w, --enable-waf         Enable WAF protection [default: false]
  -l, --enable-logging     Enable detailed logging [default: false]
  -a, --enable-analytics   Enable real-time analytics [default: false]
  -d, --enable-datalake    Enable data lake features [default: false]
  -c, --cors-origins       CORS origins (comma-separated) [default: localhost]
  -s, --stack-filter       Deploy specific stack (community|observatory|all) [default: all]
  -n, --dry-run           Show what would be deployed without deploying [default: false]
  -h, --help              Show this help message

EXAMPLES:
  # Deploy dev environment with basic features
  $0 --environment dev

  # Deploy staging with WAF and analytics
  $0 --environment staging --enable-waf --enable-analytics

  # Deploy production with all features
  $0 --environment prod --enable-waf --enable-logging --enable-analytics --enable-datalake

  # Deploy only Community stack to dev
  $0 --environment dev --stack-filter community

  # Dry run to see what would be deployed
  $0 --environment prod --dry-run

EOF
}

# ================================================================================
# ARGUMENT PARSING
# ================================================================================

while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -w|--enable-waf)
      ENABLE_WAF="true"
      shift
      ;;
    -l|--enable-logging)
      ENABLE_DETAILED_LOGGING="true"
      shift
      ;;
    -a|--enable-analytics)
      ENABLE_REAL_TIME_ANALYTICS="true"
      shift
      ;;
    -d|--enable-datalake)
      ENABLE_DATA_LAKE="true"
      shift
      ;;
    -c|--cors-origins)
      CORS_ORIGINS="$2"
      shift 2
      ;;
    -s|--stack-filter)
      STACK_FILTER="$2"
      shift 2
      ;;
    -n|--dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      error "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

# ================================================================================
# VALIDATION
# ================================================================================

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
  error "Environment must be one of: dev, staging, prod"
  exit 1
fi

# Validate stack filter
if [[ -n "$STACK_FILTER" && ! "$STACK_FILTER" =~ ^(community|observatory|all)$ ]]; then
  error "Stack filter must be one of: community, observatory, all"
  exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity > /dev/null 2>&1; then
  error "AWS credentials not configured. Please run 'aws configure' or set AWS environment variables."
  exit 1
fi

# Check required tools
for tool in node npm cdk; do
  if ! command -v $tool > /dev/null 2>&1; then
    error "Required tool '$tool' not found in PATH"
    exit 1
  fi
done

# Check CDK bootstrap
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-2}

log "Checking CDK bootstrap status for account $AWS_ACCOUNT in region $AWS_REGION..."
if ! cdk bootstrap --show-template > /dev/null 2>&1; then
  warning "CDK not bootstrapped. Bootstrapping now..."
  cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION
fi

# ================================================================================
# PRE-DEPLOYMENT SETUP
# ================================================================================

log "🚀 AI Nexus Workbench Backend Deployment"
log "Environment: $ENVIRONMENT"
log "Stack Filter: ${STACK_FILTER:-all}"
log "Features: WAF=$ENABLE_WAF, Logging=$ENABLE_DETAILED_LOGGING, Analytics=$ENABLE_REAL_TIME_ANALYTICS, DataLake=$ENABLE_DATA_LAKE"
log "CORS Origins: $CORS_ORIGINS"
log "Dry Run: $DRY_RUN"
echo

# Change to infrastructure directory
cd "$INFRA_DIR"

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
  log "Installing CDK dependencies..."
  npm install
fi

# Install Lambda dependencies
log "Installing Lambda dependencies..."
for lambda_dir in "$LAMBDA_DIR"/*; do
  if [[ -d "$lambda_dir" && -f "$lambda_dir/package.json" ]]; then
    log "Installing dependencies for $(basename "$lambda_dir")..."
    (cd "$lambda_dir" && npm install)
  fi
done

# ================================================================================
# DEPLOYMENT PREPARATION
# ================================================================================

# Prepare CDK context
CDK_CONTEXT_ARGS=(
  --context "environment=$ENVIRONMENT"
  --context "enableWaf=$ENABLE_WAF"
  --context "enableDetailedLogging=$ENABLE_DETAILED_LOGGING"
  --context "enableRealTimeAnalytics=$ENABLE_REAL_TIME_ANALYTICS"
  --context "enableDataLake=$ENABLE_DATA_LAKE"
  --context "corsOrigins=$CORS_ORIGINS"
)

# Set AWS environment variables
export CDK_DEFAULT_ACCOUNT="$AWS_ACCOUNT"
export CDK_DEFAULT_REGION="$AWS_REGION"

# Determine which stacks to deploy
STACKS_TO_DEPLOY=()

case "${STACK_FILTER:-all}" in
  "community")
    STACKS_TO_DEPLOY+=("AiNexusCommunityCore-$ENVIRONMENT")
    ;;
  "observatory")
    STACKS_TO_DEPLOY+=("AiNexusObservatoryCore-$ENVIRONMENT")
    ;;
  "all"|"")
    STACKS_TO_DEPLOY+=("AiNexusCommunityCore-$ENVIRONMENT")
    STACKS_TO_DEPLOY+=("AiNexusObservatoryCore-$ENVIRONMENT")
    ;;
esac

log "Stacks to deploy: ${STACKS_TO_DEPLOY[*]}"

# ================================================================================
# DRY RUN OR DEPLOYMENT
# ================================================================================

if [[ "$DRY_RUN" == "true" ]]; then
  log "🔍 DRY RUN: Showing what would be deployed..."
  echo
  
  log "CDK Diff for stacks:"
  for stack in "${STACKS_TO_DEPLOY[@]}"; do
    log "Checking diff for stack: $stack"
    cdk diff "$stack" "${CDK_CONTEXT_ARGS[@]}" --app "npx ts-node bin/backend-stacks.ts" || true
    echo "----------------------------------------"
  done
  
  warning "This was a dry run. No resources were actually deployed."
  exit 0
fi

# ================================================================================
# ACTUAL DEPLOYMENT
# ================================================================================

log "🚀 Starting deployment..."

# Synth first to validate
log "Synthesizing CDK stacks..."
cdk synth "${CDK_CONTEXT_ARGS[@]}" --app "npx ts-node bin/backend-stacks.ts"

# Deploy stacks
for stack in "${STACKS_TO_DEPLOY[@]}"; do
  log "Deploying stack: $stack"
  
  if cdk deploy "$stack" \
    "${CDK_CONTEXT_ARGS[@]}" \
    --app "npx ts-node bin/backend-stacks.ts" \
    --require-approval never \
    --progress events; then
    success "Successfully deployed: $stack"
  else
    error "Failed to deploy: $stack"
    exit 1
  fi
done

# ================================================================================
# POST-DEPLOYMENT VERIFICATION
# ================================================================================

log "🔍 Post-deployment verification..."

# Get stack outputs
for stack in "${STACKS_TO_DEPLOY[@]}"; do
  log "Retrieving outputs for stack: $stack"
  aws cloudformation describe-stacks \
    --stack-name "$stack" \
    --query 'Stacks[0].Outputs[?OutputKey==`BackendStacksInfo` || OutputKey==`CommunityApiEndpoint` || OutputKey==`ObservatoryApiEndpoint`].[OutputKey,OutputValue]' \
    --output table || warning "Could not retrieve outputs for $stack"
done

# Test health endpoints
log "🏥 Testing health endpoints..."

# Function to test endpoint
test_endpoint() {
  local stack_name=$1
  local output_key=$2
  local endpoint_path=$3
  
  local endpoint=$(aws cloudformation describe-stacks \
    --stack-name "$stack_name" \
    --query "Stacks[0].Outputs[?OutputKey==\`$output_key\`].OutputValue" \
    --output text 2>/dev/null || echo "")
  
  if [[ -n "$endpoint" ]]; then
    log "Testing endpoint: ${endpoint}${endpoint_path}"
    if curl -s -o /dev/null -w "%{http_code}" "${endpoint}${endpoint_path}" | grep -q "200"; then
      success "Health check passed: ${endpoint}${endpoint_path}"
    else
      warning "Health check failed: ${endpoint}${endpoint_path}"
    fi
  else
    warning "Could not retrieve endpoint for $stack_name"
  fi
}

# Test Community API if deployed
if [[ " ${STACKS_TO_DEPLOY[*]} " =~ " AiNexusCommunityCore-$ENVIRONMENT " ]]; then
  test_endpoint "AiNexusCommunityCore-$ENVIRONMENT" "CommunityApiEndpoint" "/v1/health"
fi

# Test Observatory API if deployed
if [[ " ${STACKS_TO_DEPLOY[*]} " =~ " AiNexusObservatoryCore-$ENVIRONMENT " ]]; then
  test_endpoint "AiNexusObservatoryCore-$ENVIRONMENT" "ObservatoryApiEndpoint" "/v1/health"
fi

# ================================================================================
# COMPLETION
# ================================================================================

success "🎉 Backend deployment completed successfully!"
log "Environment: $ENVIRONMENT"
log "Deployed stacks: ${STACKS_TO_DEPLOY[*]}"
log "Deployment time: $(date)"

if [[ "$ENVIRONMENT" == "prod" ]]; then
  warning "Production deployment completed. Monitor CloudWatch logs and metrics."
fi

log "Next steps:"
log "1. Update frontend configuration with new API endpoints"
log "2. Run integration tests if available"
log "3. Monitor CloudWatch dashboards for metrics"
log "4. Check EventBridge rules are triggering correctly"

exit 0
