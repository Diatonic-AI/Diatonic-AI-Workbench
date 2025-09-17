#!/bin/bash
set -euo pipefail

# Update Deployment Parameters Script
# This script updates Parameter Store values after deployment

ENVIRONMENT="${1:-dev}"
API_GATEWAY_URL="${2:-}"
COGNITO_USER_POOL_ID="${3:-}"
COGNITO_CLIENT_ID="${4:-}"
COGNITO_IDENTITY_POOL_ID="${5:-}"

echo "🔄 Updating deployment parameters for environment: $ENVIRONMENT"

if [[ -n "$API_GATEWAY_URL" ]]; then
    aws ssm put-parameter \
        --name "/ai-nexus-workbench/$ENVIRONMENT/api-gateway-url" \
        --value "$API_GATEWAY_URL" \
        --type "String" \
        --overwrite
    echo "✅ Updated API Gateway URL: $API_GATEWAY_URL"
fi

if [[ -n "$COGNITO_USER_POOL_ID" ]]; then
    aws ssm put-parameter \
        --name "/ai-nexus-workbench/$ENVIRONMENT/cognito-user-pool-id" \
        --value "$COGNITO_USER_POOL_ID" \
        --type "String" \
        --overwrite
    echo "✅ Updated Cognito User Pool ID: $COGNITO_USER_POOL_ID"
fi

if [[ -n "$COGNITO_CLIENT_ID" ]]; then
    aws ssm put-parameter \
        --name "/ai-nexus-workbench/$ENVIRONMENT/cognito-client-id" \
        --value "$COGNITO_CLIENT_ID" \
        --type "String" \
        --overwrite
    echo "✅ Updated Cognito Client ID: $COGNITO_CLIENT_ID"
fi

if [[ -n "$COGNITO_IDENTITY_POOL_ID" ]]; then
    aws ssm put-parameter \
        --name "/ai-nexus-workbench/$ENVIRONMENT/cognito-identity-pool-id" \
        --value "$COGNITO_IDENTITY_POOL_ID" \
        --type "String" \
        --overwrite
    echo "✅ Updated Cognito Identity Pool ID: $COGNITO_IDENTITY_POOL_ID"
fi

echo "🎉 Deployment parameters updated successfully!"
