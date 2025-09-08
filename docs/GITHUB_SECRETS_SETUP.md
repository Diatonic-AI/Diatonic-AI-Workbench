# GitHub Repository Secrets Configuration Guide

This guide outlines all the GitHub repository secrets that need to be configured for the CI/CD pipelines to work correctly with AWS Amplify and CloudFlare DNS.

## Required GitHub Secrets

### AWS Configuration
Navigate to your GitHub repository → Settings → Secrets and variables → Actions → Repository secrets

#### Core AWS Secrets
```bash
# AWS Access Credentials
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx...
AWS_REGION=us-east-2

# AWS Role ARN for GitHub Actions (recommended over access keys)
AWS_DEPLOY_ROLE_ARN=arn:aws:iam::ACCOUNT-ID:role/GitHubActionsRole
```

#### AWS Amplify Configuration
```bash
# Amplify App ID - Found in AWS Amplify Console
AMPLIFY_APP_ID=d1234567890123

# Amplify Domain Configuration
AMPLIFY_DOMAIN_NAME=diatonic.ai
AMPLIFY_STAGING_DOMAIN=staging.diatonic.ai
AMPLIFY_DEV_DOMAIN=dev.diatonic.ai
```

#### AWS Resource IDs
```bash
# CloudFront Distribution ID - Found in CloudFront Console
CF_DISTRIBUTION_ID=E1234567890ABC

# S3 Bucket Name - Used for static assets
S3_BUCKET_NAME=diatonic-ai-static-assets-production

# DynamoDB Table Names (if using direct access)
DYNAMODB_USERS_TABLE=diatonic-ai-users-production
DYNAMODB_PROJECTS_TABLE=diatonic-ai-projects-production
```

### Cloudflare Configuration
```bash
# Cloudflare API Token - Create from Cloudflare Dashboard → My Profile → API Tokens
CLOUDFLARE_API_TOKEN=xxx...

# Cloudflare Zone ID - Found in Cloudflare Dashboard → Domain Overview → Zone ID
CLOUDFLARE_ZONE_ID=xxx...

# Cloudflare Account ID - Found in Cloudflare Dashboard → Right sidebar
CLOUDFLARE_ACCOUNT_ID=xxx...
```

### Application Configuration
```bash
# Environment Variables for Build Process
VITE_NODE_ENV=production
VITE_AWS_REGION=us-east-2
VITE_APP_NAME="Diatonic AI Workbench"
VITE_APP_VERSION="1.0.0"
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG_LOGGING=false
```

### GitHub Personal Access Token (for releases)
```bash
# GitHub Token for creating releases and accessing private repositories
GITHUB_TOKEN=ghp_xxx...  # This is automatically provided by GitHub Actions
```

## How to Set Up Each Secret

### 1. AWS Access Keys (Option 1 - Less Secure)
1. Go to AWS Console → IAM → Users
2. Create or select a user for GitHub Actions
3. Attach policies: `AdministratorAccess` (or more restrictive policies)
4. Go to Security credentials → Create access key → Select "Command Line Interface (CLI)"
5. Copy the Access Key ID and Secret Access Key

### 2. AWS IAM Role (Option 2 - More Secure, Recommended)
1. Go to AWS Console → IAM → Roles → Create role
2. Select "Web identity" → Identity provider: "token.actions.githubusercontent.com"
3. Audience: `sts.amazonaws.com`
4. Add conditions:
   - StringEquals: `token.actions.githubusercontent.com:sub` = `repo:Diatonic-AI/Diatonic-AI-Workbench:ref:refs/heads/main`
   - StringEquals: `token.actions.githubusercontent.com:aud` = `sts.amazonaws.com`
5. Attach necessary policies (AdministratorAccess or custom)
6. Create role and copy the ARN

### 3. AWS Amplify App ID
1. Go to AWS Console → AWS Amplify
2. Find your app or create a new one
3. Copy the App ID from the URL or app settings

### 4. CloudFront Distribution ID
1. Go to AWS Console → CloudFront
2. Find your distribution
3. Copy the Distribution ID

### 5. Cloudflare API Token
1. Go to Cloudflare Dashboard → My Profile → API Tokens
2. Create token with permissions:
   - Zone: Zone Settings:Edit, Zone:Read
   - DNS: DNS:Edit
3. Include the specific zone for your domain

### 6. Cloudflare Zone ID
1. Go to Cloudflare Dashboard
2. Select your domain
3. Copy the Zone ID from the right sidebar under "API"

## Environment-Specific Secrets

### Production Environment
- Use the secrets listed above
- Ensure `VITE_NODE_ENV=production`
- Set `VITE_ENABLE_DEBUG_LOGGING=false`

### Staging Environment
- Use separate AWS resources for staging
- Set `VITE_NODE_ENV=development`
- Set `VITE_ENABLE_DEBUG_LOGGING=true`
- Use staging domain names

### Development Environment
- Use development AWS account/resources
- Set `VITE_NODE_ENV=development`
- Enable debug logging and disable analytics

## Security Best Practices

1. **Use IAM Roles Instead of Access Keys**: When possible, use AWS IAM roles with OIDC for GitHub Actions
2. **Principle of Least Privilege**: Only grant necessary permissions to each secret
3. **Regular Rotation**: Rotate API keys and tokens regularly
4. **Environment Separation**: Use different AWS accounts/resources for different environments
5. **Audit Access**: Regularly review who has access to repository secrets

## Verification

After setting up all secrets, you can verify they work by:

1. **Testing GitHub Actions**: Push to a branch and check if workflows run successfully
2. **AWS CLI Test**: Use the AWS CLI in GitHub Actions to list resources
3. **Amplify Deployment**: Trigger a deployment to verify Amplify integration
4. **Cloudflare API Test**: Use the Cloudflare API to list DNS records

## Troubleshooting

### Common Issues

1. **Invalid AWS Credentials**: Check that access keys are correct and not expired
2. **Permission Denied**: Ensure the IAM user/role has necessary permissions
3. **Cloudflare API Errors**: Verify the API token has correct permissions and zone access
4. **Amplify App Not Found**: Check that the App ID is correct and exists in the right region

### Debugging Steps

1. Check GitHub Actions logs for specific error messages
2. Verify secret names match exactly what's used in workflow files
3. Test API credentials locally using CLI tools
4. Ensure all required secrets are set (not just some of them)

## Next Steps

After configuring all secrets:

1. Test the CI/CD pipeline by creating a pull request
2. Verify deployment to staging environment
3. Test production deployment
4. Set up monitoring and alerts for failed deployments
5. Configure branch protection rules

## Security Notes

- Never commit actual secret values to the repository
- Use environment variables in code, never hardcode sensitive values
- Regularly audit and rotate access tokens
- Monitor AWS CloudTrail for unauthorized API calls
- Set up AWS billing alerts to detect unexpected usage

---

For additional help, refer to:
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Cloudflare API Documentation](https://developers.cloudflare.com/api/)
