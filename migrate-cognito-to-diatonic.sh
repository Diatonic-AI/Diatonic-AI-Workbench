#!/bin/bash
# Migration script to replace ai-nexus pools with diatonic-ai branded pools

set -euo pipefail

echo "🚀 Starting Cognito User Pool Migration to Diatonic AI Branding"

# Configuration
REGION="us-east-2"
OLD_POOL_ID="us-east-2_xkNeOGMu1"  # ai-nexus-workbench-dev-user-pool
NEW_POOL_NAME="diatonic-ai-dev-user-pool"

# Step 1: Export existing pool configuration
echo "📋 Step 1: Exporting existing pool configuration..."
aws cognito-idp describe-user-pool --user-pool-id $OLD_POOL_ID --region $REGION > old-pool-config.json

echo "📊 Current pool details:"
echo "Pool ID: $OLD_POOL_ID"
echo "Pool Name: $(jq -r '.UserPool.Name' old-pool-config.json)"
echo "Created: $(jq -r '.UserPool.CreationDate' old-pool-config.json)"
echo "Estimated Users: $(jq -r '.UserPool.EstimatedNumberOfUsers' old-pool-config.json)"

# Step 2: List users in old pool (for migration)
echo "👥 Step 2: Checking users in old pool..."
aws cognito-idp list-users --user-pool-id $OLD_POOL_ID --region $REGION > old-pool-users.json
USER_COUNT=$(jq '.Users | length' old-pool-users.json)
echo "Found $USER_COUNT users to migrate"

# Step 3: Create new pool with diatonic-ai branding
echo "🏗️  Step 3: Creating new diatonic-ai user pool..."

# Extract key configuration from old pool
PASSWORD_POLICY=$(jq '.UserPool.Policies.PasswordPolicy' old-pool-config.json)
SCHEMA_ATTRIBUTES=$(jq '.UserPool.SchemaAttributes' old-pool-config.json)
AUTO_VERIFIED_ATTRIBUTES=$(jq -r '.UserPool.AutoVerifiedAttributes[]?' old-pool-config.json | tr '\n' ',' | sed 's/,$//')

# Create new pool
aws cognito-idp create-user-pool \
    --pool-name "$NEW_POOL_NAME" \
    --policies "{\"PasswordPolicy\":$PASSWORD_POLICY}" \
    --auto-verified-attributes ${AUTO_VERIFIED_ATTRIBUTES:-email} \
    --username-attributes email \
    --schema "$SCHEMA_ATTRIBUTES" \
    --region $REGION > new-pool-created.json

NEW_POOL_ID=$(jq -r '.UserPool.Id' new-pool-created.json)
echo "✅ New pool created with ID: $NEW_POOL_ID"

# Step 4: Create user pool client for new pool
echo "🔑 Step 4: Creating user pool client..."
aws cognito-idp create-user-pool-client \
    --user-pool-id $NEW_POOL_ID \
    --client-name "diatonic-ai-web-client" \
    --generate-secret false \
    --region $REGION > new-pool-client.json

NEW_CLIENT_ID=$(jq -r '.UserPoolClient.ClientId' new-pool-client.json)
echo "✅ New client created with ID: $NEW_CLIENT_ID"

# Step 5: Create identity pool if needed
echo "🆔 Step 5: Creating identity pool..."
aws cognito-identity create-identity-pool \
    --identity-pool-name "diatonic_ai_dev_identity_pool" \
    --allow-unauthenticated-identities false \
    --cognito-identity-providers ProviderName="cognito-idp.${REGION}.amazonaws.com/${NEW_POOL_ID}",ClientId="$NEW_CLIENT_ID",ServerSideTokenCheck=false \
    --region $REGION > new-identity-pool.json

NEW_IDENTITY_POOL_ID=$(jq -r '.IdentityPoolId' new-identity-pool.json)
echo "✅ New identity pool created with ID: $NEW_IDENTITY_POOL_ID"

# Step 6: Output new configuration
echo "📝 Step 6: Generating new environment configuration..."
cat > .env.new-cognito << EOF
# New Diatonic AI Cognito Configuration
VITE_AWS_REGION=$REGION
VITE_AWS_COGNITO_USER_POOL_ID=$NEW_POOL_ID
VITE_AWS_COGNITO_USER_POOL_CLIENT_ID=$NEW_CLIENT_ID
VITE_AWS_COGNITO_IDENTITY_POOL_ID=$NEW_IDENTITY_POOL_ID

# Migration completed on: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
