# AWS Service Accounts Security Recommendations

## 🔒 Security Best Practices

### 1. Credential Management
- **Never commit credentials to version control**
- Store credentials in environment variables or AWS Parameter Store
- Rotate access keys regularly (every 90 days)
- Use IAM roles instead of access keys when possible

### 2. Environment Separation
- Use different service accounts for dev/staging/prod
- Apply principle of least privilege
- Monitor usage with CloudTrail

### 3. Access Key Security
- Enable MFA for sensitive operations
- Set up CloudWatch alarms for unusual API activity
- Use temporary credentials when possible

## 🔄 Key Rotation Script
```bash
# Rotate access keys (run this every 90 days)
./scripts/rotate-access-keys.sh
```

## 📊 Monitor Usage
```bash
# Check recent API calls
aws logs describe-log-groups --log-group-name-prefix /aws/apigateway
```

## 🚨 Security Incident Response
If credentials are compromised:
1. Immediately disable the access key in AWS Console
2. Create new access keys
3. Update all deployment configurations
4. Review CloudTrail logs for unauthorized activity
