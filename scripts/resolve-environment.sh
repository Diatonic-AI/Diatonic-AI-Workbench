#!/bin/bash
set -euo pipefail

# Environment Variable Resolution Script
# This script fetches configuration from AWS Parameter Store and Secrets Manager

ENVIRONMENT="${1:-dev}"
echo "🌍 Resolving environment variables for: $ENVIRONMENT"

# Check AWS CLI access
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured properly"
    exit 1
fi

# Fetch parameters from AWS Systems Manager Parameter Store
echo "📋 Fetching parameters from Parameter Store..."

# Function to safely get parameter
get_parameter() {
    local param_name="$1"
    local default_value="${2:-}"
    
    if aws ssm get-parameter --name "$param_name" --query "Parameter.Value" --output text 2>/dev/null; then
        return 0
    elif [[ -n "$default_value" ]]; then
        echo "$default_value"
    else
        echo "WARNING: Parameter $param_name not found and no default provided" >&2
        return 1
    fi
}

# Function to safely get secret
get_secret() {
    local secret_name="$1"
    
    if aws secretsmanager get-secret-value --secret-id "$secret_name" --query "SecretString" --output text 2>/dev/null; then
        return 0
    else
        echo "WARNING: Secret $secret_name not found" >&2
        return 1
    fi
}

# Export environment variables
export AWS_REGION="${AWS_REGION:-us-east-2}"
export ENVIRONMENT="$ENVIRONMENT"

# API Configuration
export API_GATEWAY_ENDPOINT=$(get_parameter "/ai-nexus-workbench/$ENVIRONMENT/api-gateway-url" "")
export COGNITO_USER_POOL_ID=$(get_parameter "/ai-nexus-workbench/$ENVIRONMENT/cognito-user-pool-id" "")
export COGNITO_CLIENT_ID=$(get_parameter "/ai-nexus-workbench/$ENVIRONMENT/cognito-client-id" "")

# Secrets from AWS Secrets Manager
export JWT_SECRET=$(get_secret "ai-nexus-workbench/jwt-secret")
export TEST_PASSWORD=$(get_secret "ai-nexus-workbench/test-password")

# App Configuration
export APP_NAME="AI Nexus Workbench"
export APP_VERSION="1.0.0"
export APP_DOMAIN="$ENVIRONMENT.ainexus.dev"
export APP_URL="https://$APP_DOMAIN"

echo "✅ Environment variables resolved for: $ENVIRONMENT"
echo "🔧 You can now run your application with these variables"

# Generate .env file for local development
cat > .env.local << ENVEOF
# Generated environment file - $(date)
# Environment: $ENVIRONMENT

# API Configuration
VITE_API_GATEWAY_URL=$API_GATEWAY_ENDPOINT
VITE_AWS_REGION=$AWS_REGION

# Cognito Configuration
VITE_AWS_COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID
VITE_AWS_COGNITO_USER_POOL_CLIENT_ID=$COGNITO_CLIENT_ID

# App Configuration
VITE_APP_NAME=$APP_NAME
VITE_APP_VERSION=$APP_VERSION
VITE_APP_DOMAIN=$APP_DOMAIN
VITE_APP_URL=$APP_URL

# Development Configuration
VITE_ENABLE_DEBUG_LOGS=true
VITE_ENABLE_ANALYTICS=false
ENVEOF

echo "📄 Created .env.local with resolved values"
