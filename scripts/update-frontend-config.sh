#!/bin/bash
# AI Nexus Workbench - Update Frontend Configuration
# Updates frontend environment variables with deployed API Gateway URLs

set -euo pipefail

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION=${AWS_REGION:-us-east-2}
AWS_PROFILE=${AWS_PROFILE:-default}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get Terraform outputs
get_terraform_outputs() {
    echo_info "Retrieving Terraform outputs for $ENVIRONMENT environment..."
    
    cd ../infrastructure
    
    # Select workspace
    if ! terraform workspace select "$ENVIRONMENT" 2>/dev/null; then
        echo_error "Terraform workspace '$ENVIRONMENT' not found"
        echo_info "Available workspaces:"
        terraform workspace list
        exit 1
    fi
    
    # Get outputs as JSON
    local outputs_json
    if ! outputs_json=$(terraform output -json 2>/dev/null); then
        echo_error "Failed to retrieve Terraform outputs. Make sure infrastructure is deployed."
        exit 1
    fi
    
    echo "$outputs_json"
    cd - > /dev/null
}

# Update frontend environment file
update_frontend_env() {
    local outputs_json="$1"
    local frontend_dir="../"
    local env_file="$frontend_dir/.env.local"
    
    echo_info "Updating frontend environment configuration..."
    
    # Extract values from outputs
    local api_base_url
    api_base_url=$(echo "$outputs_json" | jq -r '.frontend_config.value.api_base_url // .api_endpoints.value.base_url // "null"')
    
    local cognito_user_pool_id
    cognito_user_pool_id=$(echo "$outputs_json" | jq -r '.frontend_config.value.cognito_user_pool_id // "null"')
    
    local cognito_app_client_id
    cognito_app_client_id=$(echo "$outputs_json" | jq -r '.frontend_config.value.cognito_app_client_id // "null"')
    
    local cognito_identity_pool_id
    cognito_identity_pool_id=$(echo "$outputs_json" | jq -r '.frontend_config.value.cognito_identity_pool_id // "null"')
    
    local s3_bucket
    s3_bucket=$(echo "$outputs_json" | jq -r '.frontend_config.value.s3_bucket // .s3_bucket_info.value.bucket_name // "null"')
    
    # Validate required values
    if [[ "$api_base_url" == "null" ]]; then
        echo_error "API Gateway URL not found in Terraform outputs"
        return 1
    fi
    
    # Create backup of existing env file
    if [[ -f "$env_file" ]]; then
        cp "$env_file" "${env_file}.backup.$(date +%Y%m%d-%H%M%S)"
        echo_info "Backed up existing environment file"
    fi
    
    # Create or update .env.local file
    cat > "$env_file" << EOF
# AI Nexus Workbench - Frontend Configuration
# Auto-generated on $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# Environment: $ENVIRONMENT

# AWS Configuration
VITE_AWS_REGION=$AWS_REGION
VITE_NODE_ENV=$ENVIRONMENT

# API Gateway Configuration
VITE_API_GATEWAY_URL=$api_base_url
VITE_API_BASE_URL=$api_base_url

# AWS Cognito Configuration
VITE_AWS_COGNITO_USER_POOL_ID=$cognito_user_pool_id
VITE_AWS_COGNITO_USER_POOL_CLIENT_ID=$cognito_app_client_id
VITE_AWS_COGNITO_IDENTITY_POOL_ID=$cognito_identity_pool_id

# AWS S3 Configuration
VITE_S3_BUCKET_NAME=$s3_bucket
VITE_S3_REGION=$AWS_REGION

# Application Configuration
VITE_APP_NAME=AI Nexus Workbench
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=$ENVIRONMENT

# Feature Flags
VITE_ENABLE_DEBUG_LOGS=true
VITE_ENABLE_ANALYTICS=true

# Lead Management API
# (Uses the same API Gateway base URL)
# Lead API endpoints are automatically constructed by the frontend
EOF
    
    echo_success "Frontend environment file updated: $env_file"
    
    # Display configuration summary
    echo ""
    echo "================================================"
    echo "  FRONTEND CONFIGURATION SUMMARY"
    echo "================================================"
    echo "Environment: $ENVIRONMENT"
    echo "API Gateway URL: $api_base_url"
    echo "AWS Region: $AWS_REGION"
    echo "Environment File: $env_file"
    echo ""
    echo "📋 Key Endpoints:"
    echo "- Users API: $api_base_url/users"
    echo "- Leads API: $api_base_url/leads"
    echo "- Lead Analytics: $api_base_url/leads/analytics"
    echo ""
}

# Test API connectivity
test_api_connectivity() {
    local outputs_json="$1"
    
    echo_info "Testing API connectivity..."
    
    local api_base_url
    api_base_url=$(echo "$outputs_json" | jq -r '.frontend_config.value.api_base_url // .api_endpoints.value.base_url // "null"')
    
    if [[ "$api_base_url" == "null" ]]; then
        echo_warning "Cannot test connectivity - API URL not available"
        return
    fi
    
    # Test OPTIONS request to leads endpoint (should work without auth)
    local leads_url="${api_base_url}/leads"
    local response_code
    
    echo_info "Testing leads endpoint: $leads_url"
    response_code=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$leads_url" --max-time 10 2>/dev/null || echo "000")
    
    if [[ "$response_code" == "200" ]]; then
        echo_success "✅ Leads API endpoint is accessible"
    elif [[ "$response_code" == "000" ]]; then
        echo_warning "⚠️  Could not reach API endpoint (network/timeout issue)"
    else
        echo_warning "⚠️  API endpoint returned status code: $response_code"
    fi
    
    # Test health endpoint if available
    local health_url="${api_base_url}/health"
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$health_url" --max-time 5 2>/dev/null || echo "000")
    
    if [[ "$response_code" == "200" ]]; then
        echo_success "✅ API health check passed"
    fi
}

# Generate TypeScript configuration helper
generate_ts_config() {
    local outputs_json="$1"
    local frontend_dir="../src/lib"
    local config_file="$frontend_dir/generated-config.ts"
    
    echo_info "Generating TypeScript configuration helper..."
    
    mkdir -p "$frontend_dir"
    
    local api_base_url
    api_base_url=$(echo "$outputs_json" | jq -r '.frontend_config.value.api_base_url // .api_endpoints.value.base_url // "null"')
    
    cat > "$config_file" << EOF
// AI Nexus Workbench - Generated Configuration
// Auto-generated on $(date -u +"%Y-%m-%d %H:%M:%S UTC")
// Environment: $ENVIRONMENT

export const GENERATED_CONFIG = {
  environment: '$ENVIRONMENT' as const,
  apiGateway: {
    baseUrl: '$api_base_url',
    endpoints: {
      users: '$api_base_url/users',
      leads: '$api_base_url/leads',
      analytics: '$api_base_url/leads/analytics',
    }
  },
  aws: {
    region: '$AWS_REGION',
  },
  generatedAt: '$(date -u +"%Y-%m-%dT%H:%M:%SZ")' as const,
} as const;

export type Environment = typeof GENERATED_CONFIG.environment;
export type APIEndpoints = typeof GENERATED_CONFIG.apiGateway.endpoints;

// Helper function to get full endpoint URL
export const getEndpointUrl = (endpoint: keyof APIEndpoints, path?: string): string => {
  const baseUrl = GENERATED_CONFIG.apiGateway.endpoints[endpoint];
  return path ? \`\${baseUrl}\${path.startsWith('/') ? '' : '/'}\${path}\` : baseUrl;
};

// Helper function to check if in development mode
export const isDevelopment = (): boolean => {
  return GENERATED_CONFIG.environment === 'dev';
};

export default GENERATED_CONFIG;
EOF
    
    echo_success "TypeScript configuration generated: $config_file"
}

# Main function
main() {
    echo_info "Starting frontend configuration update for $ENVIRONMENT environment..."
    echo ""
    
    # Get Terraform outputs
    local outputs_json
    outputs_json=$(get_terraform_outputs)
    
    # Update frontend environment file
    update_frontend_env "$outputs_json"
    
    # Generate TypeScript configuration
    generate_ts_config "$outputs_json"
    
    # Test API connectivity
    test_api_connectivity "$outputs_json"
    
    echo ""
    echo_success "🎉 Frontend configuration update completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Restart your development server to pick up new environment variables"
    echo "2. Test lead capture through the UI (onboarding flow and pricing page)"
    echo "3. Verify API calls are working in browser developer tools"
    echo ""
    echo "🔧 Development Commands:"
    echo "   npm run dev    # Start development server"
    echo "   npm run build  # Build for production"
    echo ""
}

# Handle script arguments
case "${1:-update}" in
    "update")
        main
        ;;
    "test")
        echo_info "Testing API connectivity..."
        outputs_json=$(get_terraform_outputs)
        test_api_connectivity "$outputs_json"
        ;;
    "config-only")
        echo_info "Generating TypeScript configuration only..."
        outputs_json=$(get_terraform_outputs)
        generate_ts_config "$outputs_json"
        ;;
    "help")
        echo "Usage: $0 [command] [environment]"
        echo ""
        echo "Commands:"
        echo "  update      - Update frontend configuration (default)"
        echo "  test        - Test API connectivity only"
        echo "  config-only - Generate TypeScript config only"
        echo "  help        - Show this help message"
        echo ""
        echo "Environments:"
        echo "  dev         - Development environment (default)"
        echo "  staging     - Staging environment"
        echo "  prod        - Production environment"
        echo ""
        echo "Examples:"
        echo "  $0 update dev"
        echo "  $0 test prod"
        echo "  $0 config-only staging"
        ;;
    *)
        echo_error "Unknown command: $1"
        echo_info "Run '$0 help' for usage information"
        exit 1
        ;;
esac