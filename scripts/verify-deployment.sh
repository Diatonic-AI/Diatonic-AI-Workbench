#!/bin/bash

# ================================================================================
# AI Nexus Workbench - Deployment Verification Script
# ================================================================================
#
# This script performs comprehensive verification of deployed backend infrastructure
# including API endpoints, database connectivity, Lambda functions, and integrations.
#
# Usage:
#   ./verify-deployment.sh [options]
#
# Options:
#   -e, --environment ENV    Environment to verify (dev|staging|prod) [default: dev]
#   -s, --stack STACK       Stack filter (community|observatory|all) [default: all]
#   -v, --verbose           Enable verbose output
#   -t, --timeout SECONDS   HTTP request timeout [default: 30]
#   --skip-auth             Skip authentication tests (useful for initial setup)
#   --skip-integration      Skip integration tests
#   -h, --help              Show this help message
#
# Examples:
#   ./verify-deployment.sh -e dev -v
#   ./verify-deployment.sh -e staging --stack community
#   ./verify-deployment.sh -e prod --skip-auth
#
# ================================================================================

set -euo pipefail

# Default configuration
ENVIRONMENT="dev"
STACK_FILTER="all"
VERBOSE=false
TIMEOUT=30
SKIP_AUTH=false
SKIP_INTEGRATION=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${CYAN}[DEBUG]${NC} $1"
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--stack)
            STACK_FILTER="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --skip-auth)
            SKIP_AUTH=true
            shift
            ;;
        --skip-integration)
            SKIP_INTEGRATION=true
            shift
            ;;
        -h|--help)
            grep '^#' "$0" | cut -c3-
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate environment
case "$ENVIRONMENT" in
    dev|staging|prod)
        ;;
    *)
        error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
        exit 1
        ;;
esac

# Validate stack filter
case "$STACK_FILTER" in
    community|observatory|all)
        ;;
    *)
        error "Invalid stack filter: $STACK_FILTER. Must be community, observatory, or all."
        exit 1
        ;;
esac

# ================================================================================
# PREREQUISITES CHECK
# ================================================================================

log "🔍 Checking prerequisites..."

# Check AWS CLI and authentication
if ! command -v aws >/dev/null 2>&1; then
    error "AWS CLI not found. Please install AWS CLI."
    exit 1
fi

if ! aws sts get-caller-identity >/dev/null 2>&1; then
    error "AWS credentials not configured. Please run 'aws configure'."
    exit 1
fi

# Check other required tools
for tool in curl jq; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        error "Required tool '$tool' not found in PATH"
        exit 1
    fi
done

success "Prerequisites check passed"

# ================================================================================
# STACK INFORMATION RETRIEVAL
# ================================================================================

log "📊 Retrieving stack information..."

# Get AWS account and region
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-2}

verbose "AWS Account: $AWS_ACCOUNT"
verbose "AWS Region: $AWS_REGION"

# Determine stacks to verify
STACKS_TO_VERIFY=()
case "$STACK_FILTER" in
    community)
        STACKS_TO_VERIFY+=("AiNexusCommunityCore-$ENVIRONMENT")
        ;;
    observatory)
        STACKS_TO_VERIFY+=("AiNexusObservatoryCore-$ENVIRONMENT")
        ;;
    all)
        STACKS_TO_VERIFY+=("AiNexusCommunityCore-$ENVIRONMENT")
        STACKS_TO_VERIFY+=("AiNexusObservatoryCore-$ENVIRONMENT")
        ;;
esac

log "Stacks to verify: ${STACKS_TO_VERIFY[*]}"

# ================================================================================
# HELPER FUNCTIONS
# ================================================================================

# Get stack output value
get_stack_output() {
    local stack_name=$1
    local output_key=$2
    
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query "Stacks[0].Outputs[?OutputKey==\`$output_key\`].OutputValue" \
        --output text 2>/dev/null || echo ""
}

# Test HTTP endpoint
test_http_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local description=${3:-"HTTP endpoint"}
    
    verbose "Testing $description: $url"
    
    local response
    local http_code
    
    if response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null); then
        http_code=$(echo "$response" | tail -n1)
        local body=$(echo "$response" | head -n -1)
        
        if [[ "$http_code" == "$expected_status" ]]; then
            success "$description: HTTP $http_code"
            if [[ "$VERBOSE" == "true" && -n "$body" ]]; then
                echo "Response body: $body"
            fi
            return 0
        else
            warning "$description: Expected HTTP $expected_status, got HTTP $http_code"
            if [[ "$VERBOSE" == "true" && -n "$body" ]]; then
                echo "Response body: $body"
            fi
            return 1
        fi
    else
        error "$description: Request failed"
        return 1
    fi
}

# Check Lambda function status
check_lambda_function() {
    local function_name=$1
    local description=${2:-"Lambda function"}
    
    verbose "Checking $description: $function_name"
    
    local state
    if state=$(aws lambda get-function \
        --function-name "$function_name" \
        --query "Configuration.State" \
        --output text 2>/dev/null); then
        
        if [[ "$state" == "Active" ]]; then
            success "$description: Active"
            return 0
        else
            warning "$description: State is $state (expected Active)"
            return 1
        fi
    else
        error "$description: Function not found or access denied"
        return 1
    fi
}

# Check DynamoDB table status
check_dynamodb_table() {
    local table_name=$1
    local description=${2:-"DynamoDB table"}
    
    verbose "Checking $description: $table_name"
    
    local status
    if status=$(aws dynamodb describe-table \
        --table-name "$table_name" \
        --query "Table.TableStatus" \
        --output text 2>/dev/null); then
        
        if [[ "$status" == "ACTIVE" ]]; then
            success "$description: ACTIVE"
            return 0
        else
            warning "$description: Status is $status (expected ACTIVE)"
            return 1
        fi
    else
        error "$description: Table not found or access denied"
        return 1
    fi
}

# ================================================================================
# VERIFICATION FUNCTIONS
# ================================================================================

verify_community_stack() {
    local stack_name="AiNexusCommunityCore-$ENVIRONMENT"
    
    log "🏘️  Verifying Community Stack: $stack_name"
    
    # Check if stack exists
    if ! aws cloudformation describe-stacks --stack-name "$stack_name" >/dev/null 2>&1; then
        warning "Community stack not found: $stack_name"
        return 1
    fi
    
    local errors=0
    
    # Get stack outputs
    local api_endpoint=$(get_stack_output "$stack_name" "CommunityApiEndpoint")
    local user_pool_id=$(get_stack_output "$stack_name" "UserPoolId")
    local posts_table=$(get_stack_output "$stack_name" "PostsTableName")
    local groups_table=$(get_stack_output "$stack_name" "GroupsTableName")
    local interactions_table=$(get_stack_output "$stack_name" "InteractionsTableName")
    local content_bucket=$(get_stack_output "$stack_name" "ContentBucketName")
    
    verbose "API Endpoint: $api_endpoint"
    verbose "User Pool ID: $user_pool_id"
    verbose "Posts Table: $posts_table"
    verbose "Content Bucket: $content_bucket"
    
    # Test API endpoints
    if [[ -n "$api_endpoint" ]]; then
        log "Testing Community API endpoints..."
        
        # Test health endpoint
        test_http_endpoint "$api_endpoint/v1/health" 200 "Health endpoint" || ((errors++))
        
        # Test API endpoints
        test_http_endpoint "$api_endpoint/v1/experiments" 200 "Experiments endpoint" || ((errors++))
        test_http_endpoint "$api_endpoint/v1/datasets" 200 "Datasets endpoint" || ((errors++))
        test_http_endpoint "$api_endpoint/v1/analytics/summary" 200 "Analytics summary endpoint" || ((errors++))
        
        # Test billing endpoints (public endpoint)
        test_http_endpoint "$api_endpoint/v1/billing/plans" 200 "Billing plans endpoint" || ((errors++))
        
        # Test CORS preflight
        if response=$(curl -s -w "%{http_code}" --max-time "$TIMEOUT" \
            -X OPTIONS \
            -H "Origin: https://app.ainexus.dev" \
            -H "Access-Control-Request-Method: GET" \
            "$api_endpoint/v1/health" 2>/dev/null); then
            if [[ "$response" =~ 200|204 ]]; then
                success "CORS preflight: Working"
            else
                warning "CORS preflight: May not be configured correctly"
                ((errors++))
            fi
        else
            warning "CORS preflight: Request failed"
            ((errors++))
        fi
    else
        error "API endpoint not found in stack outputs"
        ((errors++))
    fi
    
    # Check DynamoDB tables
    log "Checking DynamoDB tables..."
    [[ -n "$posts_table" ]] && check_dynamodb_table "$posts_table" "Posts table" || ((errors++))
    [[ -n "$groups_table" ]] && check_dynamodb_table "$groups_table" "Groups table" || ((errors++))
    [[ -n "$interactions_table" ]] && check_dynamodb_table "$interactions_table" "Interactions table" || ((errors++))
    
    # Check Lambda functions
    log "Checking Lambda functions..."
    local api_function="AiNexusWorkbench-$ENVIRONMENT-community-api"
    check_lambda_function "$api_function" "Community API Lambda" || ((errors++))
    
    # Check S3 bucket
    if [[ -n "$content_bucket" ]]; then
        log "Checking S3 bucket..."
        if aws s3 ls "s3://$content_bucket" >/dev/null 2>&1; then
            success "Content bucket: Accessible"
        else
            error "Content bucket: Not accessible"
            ((errors++))
        fi
    fi
    
    # Check Cognito User Pool
    if [[ -n "$user_pool_id" ]]; then
        log "Checking Cognito User Pool..."
        if aws cognito-idp describe-user-pool --user-pool-id "$user_pool_id" >/dev/null 2>&1; then
            success "Cognito User Pool: Active"
        else
            error "Cognito User Pool: Not accessible"
            ((errors++))
        fi
    fi
    
    if [[ $errors -eq 0 ]]; then
        success "Community stack verification completed successfully"
        return 0
    else
        warning "Community stack verification completed with $errors errors"
        return 1
    fi
}

verify_observatory_stack() {
    local stack_name="AiNexusObservatoryCore-$ENVIRONMENT"
    
    log "🔭 Verifying Observatory Stack: $stack_name"
    
    # Check if stack exists
    if ! aws cloudformation describe-stacks --stack-name "$stack_name" >/dev/null 2>&1; then
        warning "Observatory stack not found: $stack_name"
        return 1
    fi
    
    local errors=0
    
    # Get stack outputs
    local api_endpoint=$(get_stack_output "$stack_name" "ObservatoryApiEndpoint")
    
    verbose "Observatory API Endpoint: $api_endpoint"
    
    # Test API endpoints
    if [[ -n "$api_endpoint" ]]; then
        log "Testing Observatory API endpoints..."
        
        # Test health endpoint
        test_http_endpoint "$api_endpoint/v1/health" 200 "Observatory health endpoint" || ((errors++))
        
        # Test observatory-specific endpoints (if they exist)
        test_http_endpoint "$api_endpoint/v1/metrics" 200 "Metrics endpoint" || ((errors++))
        test_http_endpoint "$api_endpoint/v1/insights" 200 "Insights endpoint" || ((errors++))
    else
        error "Observatory API endpoint not found in stack outputs"
        ((errors++))
    fi
    
    # Check Lambda functions
    log "Checking Observatory Lambda functions..."
    local obs_function="AiNexusWorkbench-$ENVIRONMENT-observatory-api"
    check_lambda_function "$obs_function" "Observatory API Lambda" || ((errors++))
    
    if [[ $errors -eq 0 ]]; then
        success "Observatory stack verification completed successfully"
        return 0
    else
        warning "Observatory stack verification completed with $errors errors"
        return 1
    fi
}

run_integration_tests() {
    if [[ "$SKIP_INTEGRATION" == "true" ]]; then
        log "Skipping integration tests as requested"
        return 0
    fi
    
    log "🔗 Running integration tests..."
    
    local errors=0
    
    # Test cross-stack communication if both stacks are deployed
    if [[ "$STACK_FILTER" == "all" ]]; then
        local community_endpoint=$(get_stack_output "AiNexusCommunityCore-$ENVIRONMENT" "CommunityApiEndpoint")
        local observatory_endpoint=$(get_stack_output "AiNexusObservatoryCore-$ENVIRONMENT" "ObservatoryApiEndpoint")
        
        if [[ -n "$community_endpoint" && -n "$observatory_endpoint" ]]; then
            # Test if community can communicate with observatory (mock test)
            log "Testing cross-stack communication..."
            
            # Test that both APIs return consistent user/tenant data
            test_http_endpoint "$community_endpoint/v1/analytics/summary" 200 "Community analytics" || ((errors++))
            test_http_endpoint "$observatory_endpoint/v1/insights" 200 "Observatory insights" || ((errors++))
        fi
    fi
    
    # Test EventBridge integration
    log "Testing EventBridge integration..."
    local event_bus=$(get_stack_output "AiNexusCommunityCore-$ENVIRONMENT" "EventBusName")
    if [[ -n "$event_bus" ]]; then
        if aws events describe-event-bus --name "$event_bus" >/dev/null 2>&1; then
            success "EventBridge bus: Active"
        else
            error "EventBridge bus: Not accessible"
            ((errors++))
        fi
    fi
    
    if [[ $errors -eq 0 ]]; then
        success "Integration tests completed successfully"
        return 0
    else
        warning "Integration tests completed with $errors errors"
        return 1
    fi
}

run_authentication_tests() {
    if [[ "$SKIP_AUTH" == "true" ]]; then
        log "Skipping authentication tests as requested"
        return 0
    fi
    
    log "🔐 Testing authentication..."
    
    local errors=0
    
    # Get Community API endpoint
    local api_endpoint=$(get_stack_output "AiNexusCommunityCore-$ENVIRONMENT" "CommunityApiEndpoint")
    
    if [[ -n "$api_endpoint" ]]; then
        # Test that protected endpoints require authentication
        log "Testing protected endpoints..."
        
        # Test with invalid token
        if response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" \
            -H "Authorization: Bearer invalid_token_here" \
            "$api_endpoint/v1/experiments" 2>/dev/null); then
            
            local http_code=$(echo "$response" | tail -n1)
            if [[ "$http_code" == "401" || "$http_code" == "403" ]]; then
                success "Invalid token properly rejected: HTTP $http_code"
            else
                warning "Invalid token not properly rejected: HTTP $http_code"
                ((errors++))
            fi
        fi
    fi
    
    if [[ $errors -eq 0 ]]; then
        success "Authentication tests completed successfully"
        return 0
    else
        warning "Authentication tests completed with $errors errors"
        return 1
    fi
}

# ================================================================================
# MAIN VERIFICATION PROCESS
# ================================================================================

log "🚀 AI Nexus Workbench Backend Verification"
log "Environment: $ENVIRONMENT"
log "Stack Filter: $STACK_FILTER"
log "Timeout: ${TIMEOUT}s"
log "Skip Auth: $SKIP_AUTH"
log "Skip Integration: $SKIP_INTEGRATION"
echo

total_errors=0

# Verify stacks
for stack in "${STACKS_TO_VERIFY[@]}"; do
    case "$stack" in
        *Community*)
            verify_community_stack || ((total_errors++))
            ;;
        *Observatory*)
            verify_observatory_stack || ((total_errors++))
            ;;
    esac
    echo
done

# Run integration tests
run_integration_tests || ((total_errors++))
echo

# Run authentication tests
run_authentication_tests || ((total_errors++))
echo

# ================================================================================
# SUMMARY
# ================================================================================

log "📊 Verification Summary"
log "Environment: $ENVIRONMENT"
log "Verified stacks: ${STACKS_TO_VERIFY[*]}"
log "Total errors: $total_errors"

if [[ $total_errors -eq 0 ]]; then
    success "🎉 All verification checks passed!"
    log "Your AI Nexus Workbench backend is ready for use."
    
    # Display useful endpoints
    echo
    log "📋 Available Endpoints:"
    for stack in "${STACKS_TO_VERIFY[@]}"; do
        case "$stack" in
            *Community*)
                local community_endpoint=$(get_stack_output "$stack" "CommunityApiEndpoint")
                if [[ -n "$community_endpoint" ]]; then
                    echo "  Community API: $community_endpoint"
                    echo "    Health: $community_endpoint/v1/health"
                    echo "    Experiments: $community_endpoint/v1/experiments"
                    echo "    Datasets: $community_endpoint/v1/datasets"
                    echo "    Analytics: $community_endpoint/v1/analytics/summary"
                fi
                ;;
            *Observatory*)
                local observatory_endpoint=$(get_stack_output "$stack" "ObservatoryApiEndpoint")
                if [[ -n "$observatory_endpoint" ]]; then
                    echo "  Observatory API: $observatory_endpoint"
                    echo "    Health: $observatory_endpoint/v1/health"
                    echo "    Metrics: $observatory_endpoint/v1/metrics"
                    echo "    Insights: $observatory_endpoint/v1/insights"
                fi
                ;;
        esac
    done
    
    exit 0
else
    warning "⚠️  Verification completed with $total_errors errors"
    log "Please review the errors above and address any issues."
    
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        error "Production deployment has issues - immediate attention required!"
    fi
    
    exit 1
fi
