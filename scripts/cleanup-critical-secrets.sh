#!/bin/bash
set -euo pipefail

# Critical Security Cleanup Script
# This script addresses the most critical security issues found in the audit

echo "🔒 Starting critical security cleanup..."
echo "⚠️  This script will modify files containing hardcoded secrets"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display progress
log_step() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if AWS CLI is installed and configured
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed or not in PATH"
    exit 1
fi

# Check AWS configuration
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS CLI is not configured properly. Please run 'aws configure'"
    exit 1
fi

log_step "AWS CLI configuration verified"

# 1. Create AWS Secrets Manager entries for critical secrets
echo ""
echo "📁 Creating AWS Secrets Manager entries..."

# Generate secure JWT secret
JWT_SECRET=$(openssl rand -base64 64)
TEST_PASSWORD=$(openssl rand -base64 32)

# Create JWT secret
if aws secretsmanager describe-secret --secret-id "ai-nexus-workbench/jwt-secret" &> /dev/null; then
    log_warning "JWT secret already exists, updating..."
    aws secretsmanager update-secret \
        --secret-id "ai-nexus-workbench/jwt-secret" \
        --secret-string "$JWT_SECRET"
else
    aws secretsmanager create-secret \
        --name "ai-nexus-workbench/jwt-secret" \
        --description "JWT signing secret for AI Nexus Workbench" \
        --secret-string "$JWT_SECRET"
fi
log_step "JWT secret created/updated in AWS Secrets Manager"

# Create test password
if aws secretsmanager describe-secret --secret-id "ai-nexus-workbench/test-password" &> /dev/null; then
    log_warning "Test password already exists, updating..."
    aws secretsmanager update-secret \
        --secret-id "ai-nexus-workbench/test-password" \
        --secret-string "$TEST_PASSWORD"
else
    aws secretsmanager create-secret \
        --name "ai-nexus-workbench/test-password" \
        --description "Test password for deployment scripts" \
        --secret-string "$TEST_PASSWORD"
fi
log_step "Test password created/updated in AWS Secrets Manager"

# 2. Replace hardcoded passwords in deployment scripts
echo ""
echo "🔧 Updating deployment scripts..."

# Backup original file
if [[ -f "infrastructure/deploy-and-test.sh" ]]; then
    cp "infrastructure/deploy-and-test.sh" "infrastructure/deploy-and-test.sh.backup"
    log_step "Created backup of deploy-and-test.sh"
    
    # Replace hardcoded password with AWS Secrets Manager call
    sed -i 's/local test_password="TestPass123!"/local test_password="$(aws secretsmanager get-secret-value --secret-id "ai-nexus-workbench\/test-password" --query "SecretString" --output text)"/g' infrastructure/deploy-and-test.sh
    
    # Also replace any direct usage
    sed -i 's/TestPass123!/$(aws secretsmanager get-secret-value --secret-id "ai-nexus-workbench\/test-password" --query "SecretString" --output text)/g' infrastructure/deploy-and-test.sh
    
    log_step "Updated deploy-and-test.sh to use AWS Secrets Manager"
else
    log_warning "infrastructure/deploy-and-test.sh not found"
fi

# 3. Update JWT secret in test configuration
echo ""
echo "🔧 Updating test configurations..."

if [[ -f "lambda/tests/setup.ts" ]]; then
    cp "lambda/tests/setup.ts" "lambda/tests/setup.ts.backup"
    log_step "Created backup of lambda/tests/setup.ts"
    
    # Replace hardcoded JWT secret with environment variable
    sed -i "s/'test-jwt-secret-key-for-testing-only'/process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET environment variable is required'); })()/g" lambda/tests/setup.ts
    
    log_step "Updated lambda/tests/setup.ts to use environment variable"
else
    log_warning "lambda/tests/setup.ts not found"
fi

# 4. Create secure environment template
echo ""
echo "📄 Creating secure environment templates..."

cat > .env.template << EOF
# AI Nexus Workbench Environment Configuration Template
# Copy this file to .env.local and fill in the values
# DO NOT commit .env.local to version control

# API Configuration
VITE_API_GATEWAY_URL=\${API_GATEWAY_ENDPOINT}
VITE_AWS_REGION=\${AWS_REGION:-us-east-2}

# Cognito Configuration  
VITE_AWS_COGNITO_USER_POOL_ID=\${COGNITO_USER_POOL_ID}
VITE_AWS_COGNITO_USER_POOL_CLIENT_ID=\${COGNITO_CLIENT_ID}
VITE_AWS_COGNITO_IDENTITY_POOL_ID=\${COGNITO_IDENTITY_POOL_ID}

# Stripe Configuration (Use test keys for development)
VITE_STRIPE_PUBLISHABLE_KEY=\${STRIPE_PUBLISHABLE_KEY}
VITE_STRIPE_MODE=\${STRIPE_MODE:-test}

# App Configuration
VITE_APP_NAME=\${APP_NAME:-AI Nexus Workbench}
VITE_APP_VERSION=\${APP_VERSION:-1.0.0}
VITE_APP_DOMAIN=\${APP_DOMAIN:-localhost:8080}
VITE_APP_URL=\${APP_URL:-http://localhost:8080}

# Development Configuration
VITE_ENABLE_DEBUG_LOGS=\${ENABLE_DEBUG_LOGS:-true}
VITE_ENABLE_ANALYTICS=\${ENABLE_ANALYTICS:-false}

# Test Configuration (for CI/CD)
JWT_SECRET=\${JWT_SECRET}
TEST_PASSWORD=\${TEST_PASSWORD}
EOF

log_step "Created .env.template with secure variable references"

# 5. Update .env.development to use variables
if [[ -f ".env.development" ]]; then
    cp ".env.development" ".env.development.backup"
    log_step "Created backup of .env.development"
    
    # Replace hardcoded API endpoint
    sed -i 's|VITE_API_GATEWAY_URL=https://c2n9uk1ovi.execute-api.us-east-2.amazonaws.com/dev|VITE_API_GATEWAY_URL=${API_GATEWAY_ENDPOINT:-https://c2n9uk1ovi.execute-api.us-east-2.amazonaws.com/dev}|g' .env.development
    
    log_step "Updated .env.development to use environment variables"
fi

# 6. Create environment variable resolution script
cat > scripts/resolve-environment.sh << 'EOF'
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
EOF

chmod +x scripts/resolve-environment.sh
log_step "Created environment variable resolution script"

# 7. Update .gitignore to ensure secrets aren't committed
echo ""
echo "🔒 Updating .gitignore for security..."

# Add security-related entries to .gitignore
cat >> .gitignore << EOF

# Security - Do not commit these files
.env.local
.env.*.local
*.backup
security-audit-report-*.json
secrets/
credentials/
*.pem
*.key
*.p12
*.pfx
EOF

log_step "Updated .gitignore with security exclusions"

# 8. Create README for security procedures
cat > SECURITY_README.md << 'EOF'
# Security Configuration Guide

## Overview
This project uses AWS Secrets Manager and Parameter Store for secure credential and configuration management.

## Setup Instructions

### 1. Initial AWS Setup
```bash
# Configure AWS CLI (if not already done)
aws configure

# Run the setup script for your environment
./scripts/setup-aws-environment.sh dev
```

### 2. Resolve Environment Variables
```bash
# Generate .env.local with resolved values
./scripts/resolve-environment.sh dev
```

### 3. Development Workflow
```bash
# Start development server
npm run dev
```

## Security Best Practices

### ✅ DO
- Use AWS Secrets Manager for sensitive data (passwords, API keys, tokens)
- Use AWS Parameter Store for configuration values
- Use environment variables for all configuration
- Keep .env.local in .gitignore
- Regularly rotate secrets

### ❌ DON'T
- Hardcode secrets in source code
- Commit .env files with real credentials
- Share secrets via insecure channels
- Use production secrets in development

## Secret Management

### Creating Secrets
```bash
# Create a new secret
aws secretsmanager create-secret \
  --name "ai-nexus-workbench/my-secret" \
  --description "Description of the secret" \
  --secret-string "secret-value"
```

### Retrieving Secrets
```bash
# Get secret value
aws secretsmanager get-secret-value \
  --secret-id "ai-nexus-workbench/my-secret" \
  --query "SecretString" --output text
```

## Parameter Management

### Creating Parameters
```bash
# Create a parameter
aws ssm put-parameter \
  --name "/ai-nexus-workbench/dev/my-param" \
  --value "parameter-value" \
  --type "String"

# Create a secure parameter
aws ssm put-parameter \
  --name "/ai-nexus-workbench/dev/secure-param" \
  --value "secure-value" \
  --type "SecureString"
```

## Emergency Procedures

If credentials are compromised:
1. Rotate the affected secrets immediately
2. Update Parameter Store values
3. Redeploy affected services
4. Review access logs in CloudTrail

## Monitoring
- Enable AWS CloudTrail for audit logging
- Monitor AWS Config for configuration changes
- Set up GuardDuty for threat detection
- Use Security Hub for compliance monitoring
EOF

log_step "Created SECURITY_README.md with procedures"

# Summary
echo ""
echo "🎉 Critical security cleanup completed!"
echo ""
echo "📊 Summary of changes:"
echo "  ✅ Created AWS Secrets Manager entries for JWT and test passwords"
echo "  ✅ Updated deployment scripts to use Secrets Manager"
echo "  ✅ Updated test configurations to use environment variables"
echo "  ✅ Created secure environment templates"
echo "  ✅ Created environment variable resolution script"
echo "  ✅ Updated .gitignore for security"
echo "  ✅ Created security documentation"
echo ""
echo "🔧 Next steps:"
echo "  1. Run: ./scripts/resolve-environment.sh dev"
echo "  2. Review generated .env.local file" 
echo "  3. Test application with new configuration"
echo "  4. Set up Parameter Store values for your environment"
echo ""
echo "⚠️  IMPORTANT: Backup files were created with .backup extension"
echo "    Review changes and delete backups when satisfied"
echo ""
log_step "Critical security cleanup completed successfully!"
