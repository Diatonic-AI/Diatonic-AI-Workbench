#!/bin/bash
# AWS Service Account Setup for Diatonic AI Workbench Amplify Development
set -euo pipefail

echo "🔧 Setting up AWS service accounts for Amplify development..."

# Create service account directory
mkdir -p aws-service-accounts

# Service account names
AMPLIFY_DEV_USER="amplify-diatonic-ai-dev"
AMPLIFY_STAGING_USER="amplify-diatonic-ai-staging"
AMPLIFY_PROD_USER="amplify-diatonic-ai-prod"
CI_CD_USER="diatonic-ai-cicd"

# IAM policy for Amplify development
cat > aws-service-accounts/amplify-dev-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "amplify:*",
                "cloudformation:*",
                "cognito-idp:*",
                "cognito-identity:*",
                "iam:*",
                "lambda:*",
                "apigateway:*",
                "s3:*",
                "dynamodb:*",
                "cloudwatch:*",
                "logs:*",
                "route53:*",
                "acm:*",
                "cloudfront:*"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# IAM policy for CI/CD pipeline
cat > aws-service-accounts/cicd-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "amplify:*",
                "cloudformation:*",
                "iam:PassRole",
                "iam:GetRole",
                "iam:CreateRole",
                "iam:UpdateAssumeRolePolicy",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy",
                "iam:PutRolePolicy",
                "iam:DeleteRolePolicy",
                "s3:*",
                "lambda:*",
                "apigateway:*",
                "dynamodb:*",
                "cognito-idp:*",
                "cognito-identity:*",
                "logs:*"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# Function to create IAM user with policy
create_iam_user() {
    local username=$1
    local policy_file=$2
    local description=$3
    
    echo "👤 Creating IAM user: $username"
    
    # Create IAM user
    if aws iam get-user --user-name "$username" >/dev/null 2>&1; then
        echo "  ⚠️  User $username already exists"
    else
        aws iam create-user --user-name "$username" --tags "Key=Project,Value=DiatomicAIWorkbench" "Key=Environment,Value=Development" "Key=Purpose,Value=$description"
        echo "  ✅ Created user: $username"
    fi
    
    # Create custom policy name
    local policy_name="${username}-policy"
    
    # Create IAM policy
    echo "  📋 Creating policy: $policy_name"
    local policy_arn
    if aws iam get-policy --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/$policy_name" >/dev/null 2>&1; then
        echo "  ⚠️  Policy $policy_name already exists"
        policy_arn="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/$policy_name"
    else
        policy_arn=$(aws iam create-policy --policy-name "$policy_name" --policy-document "file://$policy_file" --query 'Policy.Arn' --output text)
        echo "  ✅ Created policy: $policy_name"
    fi
    
    # Attach policy to user
    echo "  🔗 Attaching policy to user..."
    aws iam attach-user-policy --user-name "$username" --policy-arn "$policy_arn"
    echo "  ✅ Policy attached successfully"
    
    # Create access key
    echo "  🔑 Creating access key for $username..."
    local access_key_output
    if access_key_output=$(aws iam create-access-key --user-name "$username" 2>/dev/null); then
        local access_key_id=$(echo "$access_key_output" | jq -r '.AccessKey.AccessKeyId')
        local secret_access_key=$(echo "$access_key_output" | jq -r '.AccessKey.SecretAccessKey')
        
        # Save credentials to file
        cat > "aws-service-accounts/${username}-credentials.txt" << EOF
# AWS Credentials for $username
# Created: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# Account: $(aws sts get-caller-identity --query Account --output text)
# Purpose: $description

AWS_ACCESS_KEY_ID=$access_key_id
AWS_SECRET_ACCESS_KEY=$secret_access_key
AWS_DEFAULT_REGION=us-east-2

# For AWS CLI profile
[profile $username]
aws_access_key_id = $access_key_id
aws_secret_access_key = $secret_access_key
region = us-east-2
EOF
        
        echo "  ✅ Access key created and saved to aws-service-accounts/${username}-credentials.txt"
        echo "  📝 Access Key ID: $access_key_id"
    else
        echo "  ⚠️  Access key might already exist for $username"
    fi
    
    echo ""
}

# Create service accounts
echo "🚀 Creating Amplify development service accounts..."

create_iam_user "$AMPLIFY_DEV_USER" "aws-service-accounts/amplify-dev-policy.json" "Amplify Development Environment"
create_iam_user "$AMPLIFY_STAGING_USER" "aws-service-accounts/amplify-dev-policy.json" "Amplify Staging Environment"
create_iam_user "$AMPLIFY_PROD_USER" "aws-service-accounts/amplify-dev-policy.json" "Amplify Production Environment"
create_iam_user "$CI_CD_USER" "aws-service-accounts/cicd-policy.json" "CI/CD Pipeline Automation"

# Create environment-specific credential files
echo "📁 Creating environment-specific credential files..."

# Development environment
cat > aws-service-accounts/dev-env.sh << EOF
#!/bin/bash
# Development environment AWS credentials
export AWS_ACCESS_KEY_ID=\$(grep "AWS_ACCESS_KEY_ID" aws-service-accounts/${AMPLIFY_DEV_USER}-credentials.txt | cut -d'=' -f2)
export AWS_SECRET_ACCESS_KEY=\$(grep "AWS_SECRET_ACCESS_KEY" aws-service-accounts/${AMPLIFY_DEV_USER}-credentials.txt | cut -d'=' -f2)
export AWS_DEFAULT_REGION=us-east-2
export AWS_PROFILE=$AMPLIFY_DEV_USER

echo "🔧 Development environment AWS credentials loaded"
echo "👤 Using service account: $AMPLIFY_DEV_USER"
EOF

# Staging environment
cat > aws-service-accounts/staging-env.sh << EOF
#!/bin/bash
# Staging environment AWS credentials
export AWS_ACCESS_KEY_ID=\$(grep "AWS_ACCESS_KEY_ID" aws-service-accounts/${AMPLIFY_STAGING_USER}-credentials.txt | cut -d'=' -f2)
export AWS_SECRET_ACCESS_KEY=\$(grep "AWS_SECRET_ACCESS_KEY" aws-service-accounts/${AMPLIFY_STAGING_USER}-credentials.txt | cut -d'=' -f2)
export AWS_DEFAULT_REGION=us-east-2
export AWS_PROFILE=$AMPLIFY_STAGING_USER

echo "🔧 Staging environment AWS credentials loaded"
echo "👤 Using service account: $AMPLIFY_STAGING_USER"
EOF

# Production environment
cat > aws-service-accounts/prod-env.sh << EOF
#!/bin/bash
# Production environment AWS credentials
export AWS_ACCESS_KEY_ID=\$(grep "AWS_ACCESS_KEY_ID" aws-service-accounts/${AMPLIFY_PROD_USER}-credentials.txt | cut -d'=' -f2)
export AWS_SECRET_ACCESS_KEY=\$(grep "AWS_SECRET_ACCESS_KEY" aws-service-accounts/${AMPLIFY_PROD_USER}-credentials.txt | cut -d'=' -f2)
export AWS_DEFAULT_REGION=us-east-2
export AWS_PROFILE=$AMPLIFY_PROD_USER

echo "🔧 Production environment AWS credentials loaded"
echo "👤 Using service account: $AMPLIFY_PROD_USER"
EOF

# Make scripts executable
chmod +x aws-service-accounts/*.sh

# Create AWS profiles
echo "⚙️  Creating AWS CLI profiles..."

# Add profiles to AWS config
for user in "$AMPLIFY_DEV_USER" "$AMPLIFY_STAGING_USER" "$AMPLIFY_PROD_USER" "$CI_CD_USER"; do
    if [[ -f "aws-service-accounts/${user}-credentials.txt" ]]; then
        access_key=$(grep "AWS_ACCESS_KEY_ID" "aws-service-accounts/${user}-credentials.txt" | cut -d'=' -f2)
        secret_key=$(grep "AWS_SECRET_ACCESS_KEY" "aws-service-accounts/${user}-credentials.txt" | cut -d'=' -f2)
        
        aws configure set profile."$user".aws_access_key_id "$access_key" || true
        aws configure set profile."$user".aws_secret_access_key "$secret_key" || true
        aws configure set profile."$user".region us-east-2 || true
        
        echo "  ✅ Profile created: $user"
    fi
done

# Create security recommendations
cat > aws-service-accounts/SECURITY-RECOMMENDATIONS.md << 'EOF'
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
EOF

# Create .gitignore for sensitive files
cat >> .gitignore << 'EOF'

# AWS service account credentials
aws-service-accounts/*-credentials.txt
aws-service-accounts/*.key
aws-service-accounts/*.pem
EOF

echo "✅ AWS service account setup completed!"
echo ""
echo "📋 Summary:"
echo "  - Created 4 IAM users with appropriate policies"
echo "  - Generated access keys for each service account"
echo "  - Created AWS CLI profiles for easy switching"
echo "  - Set up environment-specific credential files"
echo ""
echo "🔧 Next Steps:"
echo "  1. Review the generated credential files in aws-service-accounts/"
echo "  2. Source the appropriate environment: source aws-service-accounts/dev-env.sh"
echo "  3. Test AWS connectivity: aws sts get-caller-identity"
echo "  4. Initialize Amplify: amplify init"
echo ""
echo "⚠️  IMPORTANT: Keep credential files secure and never commit them to git!"
