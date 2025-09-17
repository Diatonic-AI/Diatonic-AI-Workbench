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
  --name "diatonic-ai-platform/my-secret" \
  --description "Description of the secret" \
  --secret-string "secret-value"
```

### Retrieving Secrets
```bash
# Get secret value
aws secretsmanager get-secret-value \
  --secret-id "diatonic-ai-platform/my-secret" \
  --query "SecretString" --output text
```

## Parameter Management

### Creating Parameters
```bash
# Create a parameter
aws ssm put-parameter \
  --name "/diatonic-ai-platform/dev/my-param" \
  --value "parameter-value" \
  --type "String"

# Create a secure parameter
aws ssm put-parameter \
  --name "/diatonic-ai-platform/dev/secure-param" \
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
