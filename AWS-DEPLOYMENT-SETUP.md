# AWS Deployment Service Accounts & GitHub Secrets Setup

## 🎯 Overview

This document provides a complete guide for the AWS service accounts and GitHub secrets that have been configured for the Diatonic AI Workbench project, enabling secure and environment-specific deployments to AWS Amplify.

## 🔐 Service Accounts Created

### 1. Development Environment
- **Service Account**: `amplify-diatonic-ai-dev`
- **Purpose**: Development environment deployments and testing
- **Access Key**: `AKIAUR7F...` (stored in GitHub secrets)
- **Permissions**: Full Amplify, Cognito, DynamoDB, S3, Lambda, API Gateway access

### 2. Staging Environment
- **Service Account**: `amplify-diatonic-ai-staging`
- **Purpose**: Staging environment for pre-production testing
- **Access Key**: `AKIAUR7F...` (stored in GitHub secrets)
- **Permissions**: Full Amplify, Cognito, DynamoDB, S3, Lambda, API Gateway access

### 3. Production Environment
- **Service Account**: `amplify-diatonic-ai-prod`
- **Purpose**: Production deployments
- **Access Key**: `AKIAUR7F...` (stored in GitHub secrets)
- **Permissions**: Full Amplify, Cognito, DynamoDB, S3, Lambda, API Gateway access

### 4. CI/CD Pipeline
- **Service Account**: `diatonic-ai-cicd`
- **Purpose**: Automated CI/CD pipeline operations
- **Access Key**: `AKIAUR7F...` (stored in GitHub secrets)
- **Permissions**: Limited to deployment operations with PassRole capabilities

## 🔑 GitHub Secrets Configured

The following secrets have been set up in the GitHub repository `Diatonic-AI/Diatonic-AI-Workbench`:

### Repository-Level Secrets
| Secret Name | Description | Value |
|-------------|-------------|-------|
| `AWS_ACCOUNT_ID` | AWS Account ID | `313476888312` |
| `AWS_DEFAULT_REGION` | Default AWS Region | `us-east-2` |
| `AMPLIFY_PROJECT_NAME` | Amplify Project Name | `diatonic-ai-workbench` |
| `AMPLIFY_APP_NAME` | Amplify Application Name | `diatonic-ai-workbench` |

### Environment-Specific Secrets
| Secret Name | Environment | Description |
|-------------|-------------|-------------|
| `AWS_ACCESS_KEY_ID_DEV` | Development | Development service account access key |
| `AWS_SECRET_ACCESS_KEY_DEV` | Development | Development service account secret key |
| `AMPLIFY_SERVICE_ACCOUNT_DEV` | Development | Service account name for development |
| `AWS_ACCESS_KEY_ID_STAGING` | Staging | Staging service account access key |
| `AWS_SECRET_ACCESS_KEY_STAGING` | Staging | Staging service account secret key |
| `AMPLIFY_SERVICE_ACCOUNT_STAGING` | Staging | Service account name for staging |
| `AWS_ACCESS_KEY_ID_PROD` | Production | Production service account access key |
| `AWS_SECRET_ACCESS_KEY_PROD` | Production | Production service account secret key |
| `AMPLIFY_SERVICE_ACCOUNT_PROD` | Production | Service account name for production |
| `AWS_ACCESS_KEY_ID_CICD` | CI/CD | CI/CD pipeline service account access key |
| `AWS_SECRET_ACCESS_KEY_CICD` | CI/CD | CI/CD pipeline service account secret key |
| `CICD_SERVICE_ACCOUNT` | CI/CD | CI/CD service account name |

## 🚀 Deployment Workflows

### GitHub Actions Workflow
The `.github/workflows/amplify-deploy.yml` workflow has been configured to:

1. **Automatically determine environment** based on Git branch:
   - `main` → Production environment
   - `staging` → Staging environment
   - `develop` (or other branches) → Development environment

2. **Use appropriate service account credentials** for each environment

3. **Build and test** the application before deployment

4. **Deploy to AWS Amplify** with environment-specific configurations

### Branch-to-Environment Mapping
```
main branch     → Production  (amplify-diatonic-ai-prod)
staging branch  → Staging     (amplify-diatonic-ai-staging) 
develop branch  → Development (amplify-diatonic-ai-dev)
feature branches → Development (amplify-diatonic-ai-dev)
```

## 📁 Local Development Setup

### File Structure Created
```
aws-service-accounts/
├── amplify-dev-policy.json                    # IAM policy for Amplify development
├── cicd-policy.json                           # IAM policy for CI/CD operations
├── amplify-diatonic-ai-dev-credentials.txt    # Dev environment credentials (NOT in git)
├── amplify-diatonic-ai-staging-credentials.txt # Staging credentials (NOT in git)  
├── amplify-diatonic-ai-prod-credentials.txt   # Production credentials (NOT in git)
├── diatonic-ai-cicd-credentials.txt           # CI/CD credentials (NOT in git)
├── dev-env.sh                                 # Script to load dev environment
├── staging-env.sh                             # Script to load staging environment
├── prod-env.sh                                # Script to load production environment
└── SECURITY-RECOMMENDATIONS.md               # Security best practices
```

### Environment Scripts
To work with different environments locally:

```bash
# Development environment
source aws-service-accounts/dev-env.sh
aws sts get-caller-identity

# Staging environment  
source aws-service-accounts/staging-env.sh
aws sts get-caller-identity

# Production environment
source aws-service-accounts/prod-env.sh
aws sts get-caller-identity
```

## 🛠️ Available Scripts

### 1. Service Account Setup
```bash
./scripts/setup-aws-service-accounts.sh
```
Creates all AWS IAM service accounts with appropriate policies and access keys.

### 2. GitHub Secrets Update
```bash
./scripts/update-github-secrets.sh
```
Updates GitHub repository secrets with AWS credentials from service accounts.

### 3. Local Amplify Initialization
```bash
./scripts/init-amplify-local.sh
```
Initializes AWS Amplify locally for development with full backend services.

### 4. Development with Amplify
```bash
./scripts/dev-with-amplify.sh
```
Starts the development server with Amplify backend services.

## 🔒 Security Best Practices

### 1. Credential Protection
- ✅ Credentials are **never committed to git** (added to `.gitignore`)
- ✅ Secrets are stored securely in **GitHub Actions secrets**
- ✅ Local credential files are **excluded from version control**
- ✅ Each environment uses **separate service accounts**

### 2. Access Control
- ✅ **Principle of least privilege** applied to each service account
- ✅ **Environment separation** enforced at the IAM level
- ✅ **Production access** restricted to production-specific service account
- ✅ **Audit trail** maintained through AWS CloudTrail

### 3. Key Rotation
- 🔄 **Regular rotation** recommended (every 90 days)
- 🔧 **Automated rotation** can be implemented with AWS Systems Manager
- 📊 **Usage monitoring** through CloudWatch metrics

## 🌐 AWS Console Access

### Amplify Console
- **URL**: https://console.aws.amazon.com/amplify/home?region=us-east-2#/
- **Account**: 313476888312
- **Region**: us-east-2 (Ohio)

### IAM Console (Service Accounts)
- **URL**: https://console.aws.amazon.com/iam/home?region=us-east-2#/users
- **Users Created**:
  - amplify-diatonic-ai-dev
  - amplify-diatonic-ai-staging  
  - amplify-diatonic-ai-prod
  - diatonic-ai-cicd

## 📋 Next Steps

### 1. Initialize Amplify Locally
```bash
# Use development environment
source aws-service-accounts/dev-env.sh
./scripts/init-amplify-local.sh
```

### 2. Configure Application
- Review generated GraphQL schema
- Customize authentication settings
- Configure storage permissions
- Set up hosting distribution

### 3. Deploy to Environments
```bash
# Push changes to trigger deployments
git push origin develop   # → Development
git push origin staging   # → Staging  
git push origin main      # → Production
```

### 4. Monitor Deployments
- GitHub Actions: https://github.com/Diatonic-AI/Diatonic-AI-Workbench/actions
- Amplify Console: https://console.aws.amazon.com/amplify/home?region=us-east-2

## 🚨 Emergency Procedures

### If Credentials Are Compromised
1. **Immediately disable** access keys in AWS Console
2. **Generate new access keys** using the setup script
3. **Update GitHub secrets** using the update script
4. **Review CloudTrail logs** for unauthorized activity
5. **Rotate all related secrets** (database passwords, API keys, etc.)

### Recovery Commands
```bash
# Disable compromised keys (replace ACCESS_KEY_ID)
aws iam update-access-key --user-name amplify-diatonic-ai-dev --access-key-id ACCESS_KEY_ID --status Inactive

# Recreate service accounts
./scripts/setup-aws-service-accounts.sh

# Update GitHub secrets
./scripts/update-github-secrets.sh
```

## 📞 Support

For issues with AWS deployment setup:
1. Check AWS CloudTrail logs
2. Review GitHub Actions workflow logs  
3. Verify service account permissions
4. Test AWS CLI connectivity locally

## 📚 Additional Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/javascript/)
- [GitHub Actions AWS Integration](https://github.com/aws-actions)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
