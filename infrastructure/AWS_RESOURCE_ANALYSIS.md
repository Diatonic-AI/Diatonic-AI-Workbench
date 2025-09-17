# AWS Resource Analysis and Import Plan

## Current Terraform State vs. AWS Reality

### ✅ Resources Currently in Terraform State
- **Lambda Functions**: 4 (main-api, user-registration, user-profile-management, auth-post-authentication)
- **DynamoDB Tables**: 25 tables
- **API Gateways**: 2 (main, main-api)
- **Cognito**: User Pool, Identity Pool, Groups
- **S3 Buckets**: 1 (user-content)
- **CloudFlare**: DNS records (8 records)

### ❌ Missing AWS Resources (Need Import)

#### Lambda Functions (15 missing)
- `aws-devops-dev-education-api`
- `ai-nexus-dev-stripe-get-subscription-status`
- `amplify-login-create-auth-challenge-270079a5`
- `diatonic-prod-cognito-triggers`
- `ai-nexus-dev-stripe-update-subscription`
- `ai-nexus-dev-stripe-list-invoices`
- `amplify-login-verify-auth-challenge-270079a5`
- `amplify-login-define-auth-challenge-270079a5`
- `ai-nexus-dev-stripe-cancel-subscription`
- `ai-nexus-dev-stripe-stripe-webhook-handler`
- `ai-nexus-dev-stripe-create-checkout-session`
- `diatonic-prod-api-handler`
- `ai-nexus-dev-stripe-create-setup-intent`
- `amplify-login-custom-message-270079a5`
- `ai-nexus-dev-stripe-create-portal-session`

#### DynamoDB Tables (38 missing)
- **Stripe Tables (4)**:
  - `ai-nexus-dev-stripe-customers`
  - `ai-nexus-dev-stripe-idempotency`
  - `ai-nexus-dev-stripe-invoices`
  - `ai-nexus-dev-stripe-subscriptions`

- **AI Nexus Tables (34)**:
  - `aws-devops-dev-activity-feed`
  - `aws-devops-dev-agent-execution-history`
  - `aws-devops-dev-agent-flows`
  - `aws-devops-dev-agents`
  - `aws-devops-dev-aggregated-analytics`
  - `aws-devops-dev-community-comments`
  - `aws-devops-dev-courses`
  - `aws-devops-dev-datasets`
  - `aws-devops-dev-enrollments`
  - `aws-devops-dev-experiments`
  - `aws-devops-dev-experiment-runs`
  - `aws-devops-dev-flow-templates`
  - `aws-devops-dev-group-memberships`
  - `aws-devops-dev-groups`
  - `aws-devops-dev-lesson-progress`
  - `aws-devops-dev-lessons`
  - `aws-devops-dev-metrics-timeseries`
  - `aws-devops-dev-models`
  - `aws-devops-dev-notification-subscriptions`
  - `aws-devops-dev-notifications`
  - `aws-devops-dev-organization-memberships`
  - `aws-devops-dev-project-memberships`
  - `aws-devops-dev-projects`
  - `aws-devops-dev-prompts-library`
  - `aws-devops-dev-quiz-results`
  - `aws-devops-dev-quizzes`
  - `aws-devops-dev-reactions`
  - `aws-devops-dev-workspace-memberships`
  - `aws-devops-dev-workspaces`
  - `aws-devops-terraform-state-lock`
  - `diatonic-ai-workbench-dev`

- **Production Tables (6)**:
  - `diatonic-prod-ai-conversations`
  - `diatonic-prod-ai-models`
  - `diatonic-prod-ai-sessions`
  - `diatonic-prod-projects`
  - `diatonic-prod-user-files`
  - `diatonic-prod-users`

#### ACM Certificates in us-east-1 (4 missing)
- `arn:aws:acm:us-east-1:313476888312:certificate/cb8c2da5-bc07-47d5-87fd-17d9a33df5c2` (dev.diatonic.ai)
- `arn:aws:acm:us-east-1:313476888312:certificate/dc9c6366-ed4c-47d1-a39f-aaaf721f3f47` (diatonic.ai)
- `arn:aws:acm:us-east-1:313476888312:certificate/108aeeb9-35ed-4407-85ce-36543c6b8e15` (diatonic.ai) **CURRENT**
- `arn:aws:acm:us-east-1:313476888312:certificate/8084809d-c4a9-469d-9cdf-034aeeb19a55` (workbench.diatonic.ai)

#### S3 Buckets (19 missing)
- **Amplify**: `amplify-ainexusworkbench-dev-7627f-deployment`
- **AWS DevOps (5)**: `aws-devops-dev-application-development-dzfngw8v`, `aws-devops-dev-backup-development-dzfngw8v`, `aws-devops-dev-compliance-development-dzfngw8v`, `aws-devops-dev-logs-development-dzfngw8v`, `aws-devops-terraform-state-unified-xewhyolb`
- **Legacy (1)**: `aws-devops-dev-static-assets-development-gwenbxgb`
- **Production (6)**: `diatonic-prod-*` buckets
- **MinIO (4)**: `minio-standalone-dev-*` buckets

#### SSM Parameters (13 missing)
- All `/diatonic-ai-platform/dev/*` parameters (12)
- `/apps/aws-devops/dev/ai-nexus/config` (1) **CURRENT**

#### API Gateways (1 missing)
- `diatonic-prod-api` (5kjhx136nd)

#### Cognito User Pools (2 missing)
- `amplify_backend_manager_d3ddhluaptuu35` (us-east-2_0jcHVQUx7)
- `diatonic-prod-users` (us-east-2_hnlgmxl8t)

## Import Strategy

### Phase 1: Core Infrastructure (Priority 1)
1. Import existing ACM certificates
2. Import core DynamoDB tables  
3. Import missing S3 buckets

### Phase 2: Lambda Functions (Priority 2)  
1. Import Stripe-related Lambda functions
2. Import AI Nexus Lambda functions
3. Import Amplify auth Lambda functions
4. Import production Lambda functions

### Phase 3: Additional Services (Priority 3)
1. Import missing Cognito User Pools
2. Import missing API Gateways
3. Import SSM parameters

### Phase 4: Organization (Priority 4)
1. Organize resources into modules
2. Update variable files
3. Clean up and optimize

## Execution Plan

1. **First**: Apply current plan to fix immediate issues
2. **Then**: Systematically import missing resources in phases
3. **Finally**: Refactor into proper modules and organization
