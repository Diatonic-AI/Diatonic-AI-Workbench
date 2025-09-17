#!/bin/bash
# Final migration script to replace ai-nexus pools with diatonic-ai branded pools

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

# Create new pool with basic configuration
aws cognito-idp create-user-pool \
    --pool-name "$NEW_POOL_NAME" \
    --policies '{
        "PasswordPolicy": {
            "MinimumLength": 8,
            "RequireUppercase": true,
            "RequireLowercase": true,
            "RequireNumbers": true,
            "RequireSymbols": true
        }
    }' \
    --auto-verified-attributes email \
    --username-attributes email \
    --region $REGION > new-pool-created.json

NEW_POOL_ID=$(jq -r '.UserPool.Id' new-pool-created.json)
echo "✅ New pool created with ID: $NEW_POOL_ID"

# Step 4: Create user pool client for new pool
echo "🔑 Step 4: Creating user pool client..."
aws cognito-idp create-user-pool-client \
    --user-pool-id $NEW_POOL_ID \
    --client-name "diatonic-ai-web-client" \
    --generate-secret false \
    --explicit-auth-flows ADMIN_NO_SRP_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH \
    --region $REGION > new-pool-client.json

NEW_CLIENT_ID=$(jq -r '.UserPoolClient.ClientId' new-pool-client.json)
echo "✅ New client created with ID: $NEW_CLIENT_ID"

# Step 5: Create identity pool
echo "🆔 Step 5: Creating identity pool..."
aws cognito-identity create-identity-pool \
    --identity-pool-name "diatonic_ai_dev_identity_pool" \
    --allow-unauthenticated-identities false \
    --cognito-identity-providers ProviderName="cognito-idp.${REGION}.amazonaws.com/${NEW_POOL_ID}",ClientId="$NEW_CLIENT_ID",ServerSideTokenCheck=false \
    --region $REGION > new-identity-pool.json

NEW_IDENTITY_POOL_ID=$(jq -r '.IdentityPoolId' new-identity-pool.json)
echo "✅ New identity pool created with ID: $NEW_IDENTITY_POOL_ID"

# Step 6: Create IAM roles for the identity pool
echo "🔐 Step 6: Creating IAM roles for identity pool..."

# Create trust policy for authenticated users
cat > auth-role-trust-policy.json << TRUST_EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "cognito-identity.amazonaws.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": "$NEW_IDENTITY_POOL_ID"
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "authenticated"
        }
      }
    }
  ]
}
TRUST_EOF

# Create authenticated role
aws iam create-role \
    --role-name "diatonic-ai-dev-auth-role" \
    --assume-role-policy-document file://auth-role-trust-policy.json \
    > auth-role-created.json

AUTH_ROLE_ARN=$(jq -r '.Role.Arn' auth-role-created.json)
echo "✅ Auth role created: $AUTH_ROLE_ARN"

# Create trust policy for unauthenticated users
cat > unauth-role-trust-policy.json << TRUST_EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "cognito-identity.amazonaws.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": "$NEW_IDENTITY_POOL_ID"
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "unauthenticated"
        }
      }
    }
  ]
}
TRUST_EOF

# Create unauthenticated role
aws iam create-role \
    --role-name "diatonic-ai-dev-unauth-role" \
    --assume-role-policy-document file://unauth-role-trust-policy.json \
    > unauth-role-created.json

UNAUTH_ROLE_ARN=$(jq -r '.Role.Arn' unauth-role-created.json)
echo "✅ Unauth role created: $UNAUTH_ROLE_ARN"

# Set identity pool roles
aws cognito-identity set-identity-pool-roles \
    --identity-pool-id $NEW_IDENTITY_POOL_ID \
    --roles authenticated=$AUTH_ROLE_ARN,unauthenticated=$UNAUTH_ROLE_ARN \
    --region $REGION

echo "✅ Identity pool roles configured"

# Step 7: Output new configuration
echo "📝 Step 7: Generating new environment configuration..."
cat > .env.new-cognito << EOF
# New Diatonic AI Cognito Configuration
VITE_AWS_REGION=$REGION
VITE_AWS_COGNITO_USER_POOL_ID=$NEW_POOL_ID
VITE_AWS_COGNITO_USER_POOL_CLIENT_ID=$NEW_CLIENT_ID
VITE_AWS_COGNITO_IDENTITY_POOL_ID=$NEW_IDENTITY_POOL_ID

# IAM Roles for Cognito Identity
AWS_COGNITO_AUTH_ROLE_ARN=$AUTH_ROLE_ARN
AWS_COGNITO_UNAUTH_ROLE_ARN=$UNAUTH_ROLE_ARN

# Migration completed on: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
