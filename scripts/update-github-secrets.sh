#!/bin/bash
# Update GitHub repository secrets with AWS service account credentials
set -euo pipefail

echo "🔐 Updating GitHub repository secrets with AWS credentials..."

# Check if we're in a Git repository with remote
if ! git remote get-url origin >/dev/null 2>&1; then
    echo "❌ Not in a Git repository with remote origin"
    exit 1
fi

# Extract repository info
REPO_URL=$(git remote get-url origin)
REPO_NAME=$(echo "$REPO_URL" | sed -E 's|.*github\.com[/:]([^/]+/[^/]+)\.git.*|\1|' | sed 's|\.git$||')

echo "📁 Repository: $REPO_NAME"

# Function to extract credentials from file
extract_credential() {
    local file=$1
    local key=$2
    grep "$key" "$file" | cut -d'=' -f2 | tr -d ' '
}

# Function to set GitHub secret
set_github_secret() {
    local secret_name=$1
    local secret_value=$2
    local environment=${3:-""}
    
    if [[ -n "$environment" ]]; then
        echo "🔑 Setting $environment secret: $secret_name"
        gh secret set "$secret_name" --body "$secret_value" --env "$environment"
    else
        echo "🔑 Setting repository secret: $secret_name"
        gh secret set "$secret_name" --body "$secret_value"
    fi
}

# AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-2"

echo "☁️  AWS Account: $AWS_ACCOUNT_ID"
echo "🌍 AWS Region: $AWS_REGION"

# Set repository-level secrets (shared across all environments)
echo "📦 Setting repository-level secrets..."
set_github_secret "AWS_ACCOUNT_ID" "$AWS_ACCOUNT_ID"
set_github_secret "AWS_DEFAULT_REGION" "$AWS_REGION"

# Development environment secrets
if [[ -f "aws-service-accounts/amplify-diatonic-ai-dev-credentials.txt" ]]; then
    echo "🔧 Setting development environment secrets..."
    
    DEV_ACCESS_KEY=$(extract_credential "aws-service-accounts/amplify-diatonic-ai-dev-credentials.txt" "AWS_ACCESS_KEY_ID")
    DEV_SECRET_KEY=$(extract_credential "aws-service-accounts/amplify-diatonic-ai-dev-credentials.txt" "AWS_SECRET_ACCESS_KEY")
    
    # Repository secrets for development (default branch)
    set_github_secret "AWS_ACCESS_KEY_ID_DEV" "$DEV_ACCESS_KEY"
    set_github_secret "AWS_SECRET_ACCESS_KEY_DEV" "$DEV_SECRET_KEY"
    set_github_secret "AMPLIFY_SERVICE_ACCOUNT_DEV" "amplify-diatonic-ai-dev"
    
    echo "  ✅ Development secrets updated"
    echo "  📝 Access Key: ${DEV_ACCESS_KEY:0:8}..."
else
    echo "⚠️  Development credentials file not found"
fi

# Staging environment secrets  
if [[ -f "aws-service-accounts/amplify-diatonic-ai-staging-credentials.txt" ]]; then
    echo "🔄 Setting staging environment secrets..."
    
    STAGING_ACCESS_KEY=$(extract_credential "aws-service-accounts/amplify-diatonic-ai-staging-credentials.txt" "AWS_ACCESS_KEY_ID")
    STAGING_SECRET_KEY=$(extract_credential "aws-service-accounts/amplify-diatonic-ai-staging-credentials.txt" "AWS_SECRET_ACCESS_KEY")
    
    set_github_secret "AWS_ACCESS_KEY_ID_STAGING" "$STAGING_ACCESS_KEY"
    set_github_secret "AWS_SECRET_ACCESS_KEY_STAGING" "$STAGING_SECRET_KEY"
    set_github_secret "AMPLIFY_SERVICE_ACCOUNT_STAGING" "amplify-diatonic-ai-staging"
    
    echo "  ✅ Staging secrets updated"
    echo "  📝 Access Key: ${STAGING_ACCESS_KEY:0:8}..."
else
    echo "⚠️  Staging credentials file not found"
fi

# Production environment secrets
if [[ -f "aws-service-accounts/amplify-diatonic-ai-prod-credentials.txt" ]]; then
    echo "🚀 Setting production environment secrets..."
    
    PROD_ACCESS_KEY=$(extract_credential "aws-service-accounts/amplify-diatonic-ai-prod-credentials.txt" "AWS_ACCESS_KEY_ID")
    PROD_SECRET_KEY=$(extract_credential "aws-service-accounts/amplify-diatonic-ai-prod-credentials.txt" "AWS_SECRET_ACCESS_KEY")
    
    set_github_secret "AWS_ACCESS_KEY_ID_PROD" "$PROD_ACCESS_KEY"
    set_github_secret "AWS_SECRET_ACCESS_KEY_PROD" "$PROD_SECRET_KEY"
    set_github_secret "AMPLIFY_SERVICE_ACCOUNT_PROD" "amplify-diatonic-ai-prod"
    
    echo "  ✅ Production secrets updated"
    echo "  📝 Access Key: ${PROD_ACCESS_KEY:0:8}..."
else
    echo "⚠️  Production credentials file not found"
fi

# CI/CD pipeline secrets
if [[ -f "aws-service-accounts/diatonic-ai-cicd-credentials.txt" ]]; then
    echo "🔄 Setting CI/CD pipeline secrets..."
    
    CICD_ACCESS_KEY=$(extract_credential "aws-service-accounts/diatonic-ai-cicd-credentials.txt" "AWS_ACCESS_KEY_ID")
    CICD_SECRET_KEY=$(extract_credential "aws-service-accounts/diatonic-ai-cicd-credentials.txt" "AWS_SECRET_ACCESS_KEY")
    
    set_github_secret "AWS_ACCESS_KEY_ID_CICD" "$CICD_ACCESS_KEY"
    set_github_secret "AWS_SECRET_ACCESS_KEY_CICD" "$CICD_SECRET_KEY"
    set_github_secret "CICD_SERVICE_ACCOUNT" "diatonic-ai-cicd"
    
    echo "  ✅ CI/CD secrets updated"
    echo "  📝 Access Key: ${CICD_ACCESS_KEY:0:8}..."
else
    echo "⚠️  CI/CD credentials file not found"
fi

# Additional Amplify-specific secrets
echo "📱 Setting Amplify-specific configuration..."
set_github_secret "AMPLIFY_PROJECT_NAME" "diatonic-ai-workbench"
set_github_secret "AMPLIFY_APP_NAME" "diatonic-ai-workbench"

# List all secrets for verification
echo ""
echo "🔍 Current repository secrets:"
gh secret list

echo ""
echo "✅ GitHub secrets update completed!"
echo ""
echo "📋 Summary of secrets set:"
echo "  - AWS_ACCOUNT_ID: $AWS_ACCOUNT_ID"
echo "  - AWS_DEFAULT_REGION: $AWS_REGION"
echo "  - AWS_ACCESS_KEY_ID_DEV: ${DEV_ACCESS_KEY:0:8}... (Development)"
echo "  - AWS_ACCESS_KEY_ID_STAGING: ${STAGING_ACCESS_KEY:0:8}... (Staging)"
echo "  - AWS_ACCESS_KEY_ID_PROD: ${PROD_ACCESS_KEY:0:8}... (Production)"
echo "  - AWS_ACCESS_KEY_ID_CICD: ${CICD_ACCESS_KEY:0:8}... (CI/CD)"
echo "  - AMPLIFY_PROJECT_NAME: diatonic-ai-workbench"
echo ""
echo "🔧 Next Steps:"
echo "  1. Update GitHub Actions workflows to use these secrets"
echo "  2. Configure Amplify CLI with: amplify init --yes"
echo "  3. Set up environment-specific deployments"
echo ""
echo "⚠️  Security Reminder: These secrets are now stored securely in GitHub"
