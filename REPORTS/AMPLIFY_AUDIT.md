# Amplify + GitHub Audit Report

**Generated:** 2025-09-17 03:51:05 UTC  
**Repository:** iamdrewfortini/ai-nexus-workbench  
**AWS Region:** us-east-2  

## Executive Summary

- **Repository Status:** ✅ GitHub repository connected and accessible
- **App Framework:** Vite (React application)
- **Amplify App Status:** ⚠️ Existing app found but not connected to repository
- **BuildSpec Status:** ⚠️ Update needed

---

## Repository Analysis

### Project Structure
- **Repository Root:** https://github.com/iamdrewfortini/ai-nexus-workbench.git
- **App Root Directory:** `.`
- **Default Branch:** main
- **Framework:** Vite
- **Node.js Version:** 18
- **Package Manager:** npm
- **Build Command:** `npm run update-browserslist && vite build`
- **Artifacts Directory:** `dist`

### Environment Variables Discovered

The following environment variables were found in the source code:

- `VITE_API_BASE_URL`
- `VITE_API_GATEWAY_URL`
- `VITE_AUTH_DOMAIN`
- `VITE_AWS_API_GATEWAY_ENDPOINT`
- `VITE_AWS_COGNITO_IDENTITY_POOL_ID`
- `VITE_AWS_COGNITO_USER_POOL_CLIENT_ID`
- `VITE_AWS_COGNITO_USER_POOL_ID`
- `VITE_AWS_REGION`
- `VITE_AWS_S3_BUCKET`
- `VITE_BILLING_API_URL`
- `VITE_DYNAMODB_ENDPOINT`
- `VITE_ENABLE_SUBDOMAIN_ROUTING`
- `VITE_NODE_ENV`
- `VITE_PRICE_ENTERPRISE_ANNUAL`
- `VITE_PRICE_ENTERPRISE_MONTHLY`
- `VITE_PRICE_PREMIUM_ANNUAL`
- `VITE_PRICE_PREMIUM_MONTHLY`
- `VITE_PRICE_STARTER_ANNUAL`
- `VITE_PRICE_STARTER_MONTHLY`
- `VITE_S3_BUCKET_NAME`
- `VITE_S3_REGION`
- `VITE_STRIPE_PUBLIC_KEY`
- `VITE_USE_MOCK_API`

### API Endpoints Discovered

The following API endpoints were found in source code:

- `https://api.dev.diatonic.ai`
- `https://api.diatonic.ai`
- `https://api.diatonic.ai/api`
- `https://api.workbbench.ai/v1`
- `https://api.workbbench.ai/v1/api/auth/me`
- `https://api.workbbench.ai/v1/api/projects`
- `https://staging-api.diatonic.ai`
- `https://your-api-id.execute-api.us-east-2.amazonaws.com/prod`

### AWS API Gateway Resources

**HTTP APIs (v2):** 1 found
- **ai-nexus-dev-stripe-api** (`y8t99woj1d`) - `https://y8t99woj1d.execute-api.us-east-2.amazonaws.com`

**REST APIs (v1):** 3 found
- **diatonic-prod-api** (`5kjhx136nd`) - AI Nexus Workbench API Gateway
- **aws-devops-dev-api** (`c2n9uk1ovi`) - AI Nexus Workbench API for user management and authentication
- **aws-devops-dev-main-api** (`guwdd7u9v9`) - AI Nexus Workbench Main API - handles all core functionality including webhooks

---

## Amplify App Analysis

### Current Status
⚠️ **Existing unconnected app found:**

- **App ID:** `d3ddhluaptuu35`
- **Name:** diatonic-ai-workbench
- **Platform:** WEB  
- **Default Domain:** `d3ddhluaptuu35.amplifyapp.com`
- **Repository Connection:** Not connected

### Branches Configured
- **backup-before-rename-20250916** (stage: NONE)
- **backup-pre-rename** (stage: NONE)
- **main** (stage: NONE)

---

## Environment Variables Configuration

### Required Environment Variables
Based on the source code scan, the following environment variables should be configured in Amplify:

- **`VITE_API_BASE_URL`**: `https://y8t99woj1d.execute-api.us-east-2.amazonaws.com/prod` (suggested from discovered APIs)
- **`VITE_API_GATEWAY_URL`**: `<configure based on your requirements>`
- **`VITE_AUTH_DOMAIN`**: `<configure based on your requirements>`
- **`VITE_AWS_API_GATEWAY_ENDPOINT`**: `https://y8t99woj1d.execute-api.us-east-2.amazonaws.com/prod` (suggested from discovered APIs)
- **`VITE_AWS_COGNITO_IDENTITY_POOL_ID`**: `us-east-2:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (from Cognito Identity Pool)
- **`VITE_AWS_COGNITO_USER_POOL_CLIENT_ID`**: `xxxxxxxxxxxxxxxxxxxxxxxxxx` (from Cognito User Pool Client)
- **`VITE_AWS_COGNITO_USER_POOL_ID`**: `us-east-2\_xxxxxxxxx` (from Cognito User Pool)
- **`VITE_AWS_REGION`**: `us-east-2` (current AWS region)
- **`VITE_AWS_S3_BUCKET`**: `your-app-bucket-name`
- **`VITE_BILLING_API_URL`**: `<configure based on your requirements>`
- **`VITE_DYNAMODB_ENDPOINT`**: `<configure based on your requirements>`
- **`VITE_ENABLE_SUBDOMAIN_ROUTING`**: `true` or `false` (feature flag)
- **`VITE_NODE_ENV`**: `production` (for production branch)
- **`VITE_PRICE_ENTERPRISE_ANNUAL`**: `<configure based on your requirements>`
- **`VITE_PRICE_ENTERPRISE_MONTHLY`**: `<configure based on your requirements>`
- **`VITE_PRICE_PREMIUM_ANNUAL`**: `<configure based on your requirements>`
- **`VITE_PRICE_PREMIUM_MONTHLY`**: `<configure based on your requirements>`
- **`VITE_PRICE_STARTER_ANNUAL`**: `<configure based on your requirements>`
- **`VITE_PRICE_STARTER_MONTHLY`**: `<configure based on your requirements>`
- **`VITE_S3_BUCKET_NAME`**: `your-app-bucket-name`
- **`VITE_S3_REGION`**: `<configure based on your requirements>`
- **`VITE_STRIPE_PUBLIC_KEY`**: `pk_live_xxx` or `pk_test_xxx` (Stripe publishable key)
- **`VITE_USE_MOCK_API`**: `<configure based on your requirements>`

---

## Proposed Changes

### 1. BuildSpec Configuration (amplify.yml)
⚠️ **Status**: amplify.yml needs updates

**Action**: Replace existing amplify.yml with the optimized version:
- Simplified build configuration focused on Vite
- Proper Node.js version handling
- Efficient dependency installation with `npm ci`
- Correct artifacts directory (`dist`)

**Generated File**: `ops/examples/amplify.yml.generated`

### 2. Amplify App & Repository Connection

🔧 **Action Required**: Connect existing Amplify app to GitHub repository

**Steps via AWS Console**:
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Select app: `diatonic-ai-workbench` (`d3ddhluaptuu35`)
3. Go to App settings > General > Repository details
4. Click "Connect repository"
5. Choose GitHub as the source
6. Select repository: `iamdrewfortini/ai-nexus-workbench`
7. Select branch: `main`
8. Configure build settings with the generated amplify.yml

**Alternative CLI Method** (may require GitHub App setup):
```bash
aws amplify update-app --app-id d3ddhluaptuu35 --repository "https://github.com/iamdrewfortini/ai-nexus-workbench.git"
```

### 3. Branch Configuration & PR Previews

**Recommended Settings**:
- ✅ Enable automatic builds for `main` branch
- ✅ Enable pull request previews for all branches
- 🔒 Optional: Enable password protection for non-production branches
- 📊 Enable performance monitoring

**CLI Configuration** (after repository connection):
```bash
# Enable auto build for main branch
aws amplify update-branch --app-id d3ddhluaptuu35 --branch-name main --enable-auto-build

# Enable PR previews at app level
aws amplify update-app --app-id d3ddhluaptuu35 --enable-pull-request-preview
```

### 4. SPA Routing & Security Headers

**Custom Headers Configuration** (add to Amplify Console):
```
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

**Rewrites and Redirects**:
```
Source: </^[^.]+$|\.(?!(css|js|map|json|png|jpg|svg|txt|ico)$)([^.]+$)/>
Target: /index.html
Type: 200 (Rewrite)
```

### 5. CORS Configuration (if needed)

Based on the discovered API Gateway endpoints, ensure CORS allows requests from:
- `https://d3ddhluaptuu35.amplifyapp.com` (default domain)
- Any custom domains you plan to add

For API Gateway v2 (HTTP API), update CORS configuration:
```bash
aws apigatewayv2 update-api --api-id y8t99woj1d --cors-configuration '{
  "AllowOrigins": ["https://d3ddhluaptuu35.amplifyapp.com", "https://your-custom-domain.com"],
  "AllowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "AllowHeaders": ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key"]
}'
```

---

## Apply Plan

**⚠️ IMPORTANT**: Review all changes before applying. This plan will:
1. Update or create amplify.yml
2. Provide instructions for connecting GitHub to Amplify
3. Configure environment variables
4. Set up proper routing and security headers

**To execute these changes:**
1. First, manually connect the repository in Amplify Console as described above
2. Copy the generated amplify.yml to repository root
3. Configure environment variables in Amplify Console
4. Set up custom headers and rewrites
5. Test deployment

**Files Created/Modified:**
- `ops/examples/amplify.yml.generated` - ✅ Generated
- `amplify.yml` - 📝 Needs creation/update
- Environment variables - 🔧 Configure in Amplify Console

---

## Next Steps

1. **Immediate**: Connect repository to Amplify app via AWS Console
2. **Configuration**: Apply amplify.yml and environment variables  
3. **Testing**: Deploy and test the application
4. **Security**: Configure custom headers and CORS as needed
5. **Monitoring**: Enable performance monitoring and review logs

**Rollback Plan**: If deployment fails, the existing Amplify app configuration is preserved and can be restored.

---

*Report generated by Amplify + GitHub Audit Script*
*For questions or issues, refer to AWS Amplify documentation*
