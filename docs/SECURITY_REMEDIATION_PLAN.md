# Security Audit Remediation Plan

**Generated:** 2025-09-09T21:58:55.993Z  
**Total Issues Found:** 6,543 (5 Critical, 3,692 High, 2,753 Medium, 93 Low)

## 🚨 CRITICAL ISSUES (Immediate Action Required)

### 1. Hardcoded Passwords in Testing Scripts
**Files:** `infrastructure/deploy-and-test.sh`
- **Issue:** Test password "TestPass123!" hardcoded in deployment scripts
- **Risk:** Passwords in version control, potential security breach
- **Action:** Move to AWS Secrets Manager

### 2. JWT Secret in Test Configuration
**File:** `lambda/tests/setup.ts:13`
- **Issue:** JWT secret key hardcoded: 'test-jwt-secret-key-for-testing-only'
- **Risk:** Token validation compromise
- **Action:** Use AWS Secrets Manager for JWT secrets

### 3. Password References in Auth Context
**File:** `src/contexts/AuthContext.tsx`
- **Issue:** Password handling functions exposed
- **Risk:** Potential security issues in authentication flow
- **Action:** Review and secure password handling

## 🔥 HIGH PRIORITY ISSUES

### 1. Hardcoded AWS API Gateway Endpoints
**Count:** 3,692 instances
**Primary Files:**
- `.env.development` - Live API endpoint exposed
- `.env.example` - Example endpoints should be parameterized
- Multiple documentation files with hardcoded endpoints

**Action Plan:**
1. Replace hardcoded endpoints with environment variable references
2. Use AWS Systems Manager Parameter Store for endpoint discovery
3. Implement runtime endpoint resolution

### 2. AWS Account Information Exposure
**Files:** Multiple Amplify configuration files
- **Issue:** AWS Account ID (313476888312) exposed in ARNs
- **Risk:** Account enumeration, targeted attacks
- **Action:** Move to environment-specific configurations

## 📋 RECOMMENDED REMEDIATION STRATEGY

### Phase 1: Immediate Critical Fixes (Today)

1. **Remove Hardcoded Passwords**
```bash
# Create AWS Secrets Manager entries
aws secretsmanager create-secret \
  --name "diatonic-ai-platform/test-password" \
  --description "Test password for deployment scripts" \
  --secret-string "$(openssl rand -base64 32)"

aws secretsmanager create-secret \
  --name "diatonic-ai-platform/jwt-secret" \
  --description "JWT signing secret" \
  --secret-string "$(openssl rand -base64 64)"
```

2. **Update Environment Files**
```bash
# Replace .env.development
sed -i 's|https://c2n9uk1ovi.execute-api.us-east-2.amazonaws.com/dev|${API_GATEWAY_ENDPOINT}|g' .env.development

# Update deployment scripts to use AWS Secrets Manager
```

### Phase 2: Environment Variable Externalization (This Week)

1. **Create Parameter Store Structure**
```bash
# API Endpoints
aws ssm put-parameter --name "/diatonic-ai-platform/dev/api-gateway-url" \
  --value "https://c2n9uk1ovi.execute-api.us-east-2.amazonaws.com/dev" \
  --type "String"

aws ssm put-parameter --name "/diatonic-ai-platform/dev/cognito-user-pool-id" \
  --value "${VITE_AWS_COGNITO_USER_POOL_ID}" \
  --type "String"

# Stripe Configuration
aws ssm put-parameter --name "/diatonic-ai-platform/dev/stripe-publishable-key" \
  --value "${STRIPE_PUBLISHABLE_KEY}" \
  --type "SecureString"
```

2. **Create Environment Variable Resolution Script**
```bash
#!/bin/bash
# scripts/resolve-environment.sh

# Fetch parameters from AWS SSM
export API_GATEWAY_URL=$(aws ssm get-parameter --name "/diatonic-ai-platform/${ENVIRONMENT}/api-gateway-url" --query "Parameter.Value" --output text)
export COGNITO_USER_POOL_ID=$(aws ssm get-parameter --name "/diatonic-ai-platform/${ENVIRONMENT}/cognito-user-pool-id" --query "Parameter.Value" --output text)

# Fetch secrets from AWS Secrets Manager
export JWT_SECRET=$(aws secretsmanager get-secret-value --secret-id "diatonic-ai-platform/jwt-secret" --query "SecretString" --output text)
export TEST_PASSWORD=$(aws secretsmanager get-secret-value --secret-id "diatonic-ai-platform/test-password" --query "SecretString" --output text)
```

### Phase 3: Comprehensive Security Hardening (Next Week)

1. **AWS Account ID Protection**
   - Move Amplify configurations to environment-specific files
   - Use IAM roles instead of hardcoded ARNs where possible
   - Implement cross-account role assumptions

2. **Documentation Cleanup**
   - Replace all hardcoded examples with placeholder variables
   - Create secure documentation templates
   - Remove sensitive information from README files

3. **Testing Framework Security**
   - Remove all hardcoded test credentials
   - Implement secure test data generation
   - Use temporary credentials for testing

## 🔧 IMPLEMENTATION SCRIPTS

### 1. Critical Secret Cleanup
```bash
#!/bin/bash
# scripts/cleanup-critical-secrets.sh

echo "🔒 Cleaning up critical security issues..."

# 1. Replace hardcoded passwords in deploy-and-test.sh
sed -i 's/TestPass123!/$(aws secretsmanager get-secret-value --secret-id "diatonic-ai-platform\/test-password" --query "SecretString" --output text)/g' infrastructure/deploy-and-test.sh

# 2. Update JWT secret in test setup
sed -i "s/'test-jwt-secret-key-for-testing-only'/process.env.JWT_SECRET || 'fallback-secret'/g" lambda/tests/setup.ts

# 3. Create .env template
cat > .env.template << EOF
# API Configuration
VITE_API_GATEWAY_URL=\${API_GATEWAY_ENDPOINT}
VITE_AWS_REGION=\${AWS_REGION}

# Cognito Configuration  
VITE_AWS_COGNITO_USER_POOL_ID=\${COGNITO_USER_POOL_ID}
VITE_AWS_COGNITO_USER_POOL_CLIENT_ID=\${COGNITO_CLIENT_ID}

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=\${STRIPE_PUBLISHABLE_KEY}
VITE_STRIPE_MODE=\${STRIPE_MODE}

# App Configuration
VITE_APP_NAME=\${APP_NAME}
VITE_APP_VERSION=\${APP_VERSION}
EOF

echo "✅ Critical secrets cleanup complete"
```

### 2. Environment Resolution Script
```bash
#!/bin/bash
# scripts/setup-aws-environment.sh

ENVIRONMENT=${1:-dev}
echo "🌍 Setting up AWS environment: $ENVIRONMENT"

# Create SSM parameters
echo "Creating SSM parameters..."
aws ssm put-parameter --name "/diatonic-ai-platform/$ENVIRONMENT/api-gateway-url" \
  --value "https://api-$ENVIRONMENT.ainexus.dev" \
  --type "String" --overwrite

aws ssm put-parameter --name "/diatonic-ai-platform/$ENVIRONMENT/app-domain" \
  --value "$ENVIRONMENT.ainexus.dev" \
  --type "String" --overwrite

# Create secrets in AWS Secrets Manager
echo "Creating secrets..."
aws secretsmanager create-secret \
  --name "diatonic-ai-platform/$ENVIRONMENT/jwt-secret" \
  --description "JWT signing secret for $ENVIRONMENT" \
  --secret-string "$(openssl rand -base64 64)"

aws secretsmanager create-secret \
  --name "diatonic-ai-platform/$ENVIRONMENT/database-credentials" \
  --description "Database credentials for $ENVIRONMENT" \
  --secret-string "{\"username\":\"dbuser\",\"password\":\"$(openssl rand -base64 32)\"}"

echo "✅ AWS environment setup complete for: $ENVIRONMENT"
```

## 🎯 NEXT STEPS

1. **Immediate (Today)**:
   - Run `scripts/cleanup-critical-secrets.sh`
   - Create AWS Secrets Manager entries for critical secrets
   - Update CI/CD pipeline to use secrets resolution

2. **This Week**:
   - Implement Parameter Store integration
   - Update all environment files to use variables
   - Deploy environment resolution scripts

3. **Next Week**:
   - Complete documentation security cleanup
   - Implement automated security scanning in CI/CD
   - Conduct penetration testing on hardened environment

## 📊 MONITORING & COMPLIANCE

- **AWS Config** - Monitor parameter and secret changes
- **CloudTrail** - Track secret access and modifications
- **Security Hub** - Automated security compliance monitoring
- **GuardDuty** - Runtime threat detection

## 🔗 RELATED DOCUMENTATION

- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [Parameter Store Security](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [Amplify Environment Variables](https://docs.amplify.aws/cli/teams/overview/)

---
**Status**: Ready for Implementation  
**Priority**: CRITICAL - Immediate Action Required  
**Impact**: High - Security vulnerabilities exposed
