#!/bin/bash
set -euo pipefail

# AWS Environment Setup Script
# This script creates the necessary AWS infrastructure for secure configuration management

echo "☁️  Setting up AWS environment for AI Nexus Workbench..."
echo ""

ENVIRONMENT="${1:-dev}"
AWS_REGION="${AWS_REGION:-us-east-2}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_step() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verify AWS CLI and credentials
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS CLI is not configured. Please run 'aws configure'"
    exit 1
fi

echo "🌍 Setting up environment: $ENVIRONMENT"
echo "📍 AWS Region: $AWS_REGION"
echo ""

# Get current account and user info
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
CALLER_ARN=$(aws sts get-caller-identity --query Arn --output text)

echo "🔑 Current AWS Context:"
echo "  Account ID: $ACCOUNT_ID"
echo "  Caller: $CALLER_ARN"
echo ""

# 1. Create Parameter Store parameters
echo "📋 Creating Parameter Store parameters..."

# Function to create or update parameter
create_or_update_parameter() {
    local param_name="$1"
    local param_value="$2"
    local param_type="${3:-String}"
    local description="$4"
    
    if aws ssm get-parameter --name "$param_name" &> /dev/null; then
        log_warning "Parameter $param_name already exists, updating..."
        aws ssm put-parameter \
            --name "$param_name" \
            --value "$param_value" \
            --type "$param_type" \
            --overwrite
    else
        aws ssm put-parameter \
            --name "$param_name" \
            --value "$param_value" \
            --type "$param_type" \
            --description "$description"
    fi
    log_step "Parameter created/updated: $param_name"
}

# Environment-specific parameters
create_or_update_parameter \
    "/ai-nexus-workbench/$ENVIRONMENT/aws-region" \
    "$AWS_REGION" \
    "String" \
    "AWS region for $ENVIRONMENT environment"

create_or_update_parameter \
    "/ai-nexus-workbench/$ENVIRONMENT/app-name" \
    "AI Nexus Workbench" \
    "String" \
    "Application name for $ENVIRONMENT environment"

create_or_update_parameter \
    "/ai-nexus-workbench/$ENVIRONMENT/app-version" \
    "1.0.0" \
    "String" \
    "Application version for $ENVIRONMENT environment"

create_or_update_parameter \
    "/ai-nexus-workbench/$ENVIRONMENT/enable-debug-logs" \
    "true" \
    "String" \
    "Enable debug logging for $ENVIRONMENT environment"

create_or_update_parameter \
    "/ai-nexus-workbench/$ENVIRONMENT/enable-analytics" \
    "false" \
    "String" \
    "Enable analytics for $ENVIRONMENT environment"

# Environment-specific domain configuration
case "$ENVIRONMENT" in
    "prod"|"production")
        DOMAIN="ainexus.dev"
        ENABLE_ANALYTICS="true"
        DEBUG_LOGS="false"
        ;;
    "staging")
        DOMAIN="staging.ainexus.dev"
        ENABLE_ANALYTICS="false"
        DEBUG_LOGS="true"
        ;;
    *)
        DOMAIN="dev.ainexus.dev"
        ENABLE_ANALYTICS="false"
        DEBUG_LOGS="true"
        ;;
esac

create_or_update_parameter \
    "/ai-nexus-workbench/$ENVIRONMENT/app-domain" \
    "$DOMAIN" \
    "String" \
    "Application domain for $ENVIRONMENT environment"

create_or_update_parameter \
    "/ai-nexus-workbench/$ENVIRONMENT/app-url" \
    "https://$DOMAIN" \
    "String" \
    "Application URL for $ENVIRONMENT environment"

# 2. Create placeholder parameters for AWS services (to be filled later)
echo ""
echo "🔧 Creating placeholder parameters for AWS services..."

# Placeholder for API Gateway URL (will be populated by CDK/CloudFormation)
create_or_update_parameter \
    "/ai-nexus-workbench/$ENVIRONMENT/api-gateway-url" \
    "PLACEHOLDER_UPDATE_AFTER_DEPLOYMENT" \
    "String" \
    "API Gateway endpoint URL for $ENVIRONMENT environment"

# Placeholder for Cognito User Pool ID
create_or_update_parameter \
    "/ai-nexus-workbench/$ENVIRONMENT/cognito-user-pool-id" \
    "PLACEHOLDER_UPDATE_AFTER_DEPLOYMENT" \
    "String" \
    "Cognito User Pool ID for $ENVIRONMENT environment"

# Placeholder for Cognito Client ID
create_or_update_parameter \
    "/ai-nexus-workbench/$ENVIRONMENT/cognito-client-id" \
    "PLACEHOLDER_UPDATE_AFTER_DEPLOYMENT" \
    "String" \
    "Cognito Client ID for $ENVIRONMENT environment"

# Placeholder for Cognito Identity Pool ID
create_or_update_parameter \
    "/ai-nexus-workbench/$ENVIRONMENT/cognito-identity-pool-id" \
    "PLACEHOLDER_UPDATE_AFTER_DEPLOYMENT" \
    "String" \
    "Cognito Identity Pool ID for $ENVIRONMENT environment"

# 3. Create secure parameters for sensitive configuration
echo ""
echo "🔐 Creating secure parameters..."

# Stripe configuration (using test keys for dev/staging)
if [[ "$ENVIRONMENT" == "prod" || "$ENVIRONMENT" == "production" ]]; then
    STRIPE_MODE="live"
    STRIPE_PUBLISHABLE_KEY="PLACEHOLDER_ADD_PRODUCTION_STRIPE_KEY"
else
    STRIPE_MODE="test"
    STRIPE_PUBLISHABLE_KEY="pk_test_PLACEHOLDER_ADD_TEST_STRIPE_KEY"
fi

create_or_update_parameter \
    "/ai-nexus-workbench/$ENVIRONMENT/stripe-mode" \
    "$STRIPE_MODE" \
    "String" \
    "Stripe mode for $ENVIRONMENT environment"

create_or_update_parameter \
    "/ai-nexus-workbench/$ENVIRONMENT/stripe-publishable-key" \
    "$STRIPE_PUBLISHABLE_KEY" \
    "SecureString" \
    "Stripe publishable key for $ENVIRONMENT environment"

# 4. Create IAM policy for Parameter Store and Secrets Manager access
echo ""
echo "👤 Creating IAM policy for application access..."

# Check if policy exists
POLICY_NAME="AINexusWorkbench-${ENVIRONMENT}-ParameterAccess"
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"

if aws iam get-policy --policy-arn "$POLICY_ARN" &> /dev/null; then
    log_warning "Policy $POLICY_NAME already exists"
else
    # Create IAM policy document
    cat > policy-document.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "ParameterStoreReadAccess",
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameter",
                "ssm:GetParameters",
                "ssm:GetParametersByPath"
            ],
            "Resource": "arn:aws:ssm:${AWS_REGION}:${ACCOUNT_ID}:parameter/ai-nexus-workbench/${ENVIRONMENT}/*"
        },
        {
            "Sid": "SecretsManagerReadAccess",
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret"
            ],
            "Resource": "arn:aws:secretsmanager:${AWS_REGION}:${ACCOUNT_ID}:secret:ai-nexus-workbench/*"
        },
        {
            "Sid": "KMSDecryptAccess",
            "Effect": "Allow",
            "Action": [
                "kms:Decrypt",
                "kms:DescribeKey"
            ],
            "Resource": "*",
            "Condition": {
                "StringEquals": {
                    "kms:ViaService": [
                        "ssm.${AWS_REGION}.amazonaws.com",
                        "secretsmanager.${AWS_REGION}.amazonaws.com"
                    ]
                }
            }
        }
    ]
}
EOF

    # Create the policy
    aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document file://policy-document.json \
        --description "IAM policy for AI Nexus Workbench $ENVIRONMENT environment to access Parameter Store and Secrets Manager"
    
    rm policy-document.json
    log_step "Created IAM policy: $POLICY_NAME"
fi

# 5. Create CloudFormation template for future deployments
echo ""
echo "📄 Creating CloudFormation template..."

cat > infrastructure/cloudformation-parameters.yaml << EOF
AWSTemplateFormatVersion: '2010-09-09'
Description: 'AI Nexus Workbench - Parameter Store and Secrets Manager setup for ${ENVIRONMENT}'

Parameters:
  Environment:
    Type: String
    Default: ${ENVIRONMENT}
    Description: Environment name (dev, staging, prod)
  
  AppDomain:
    Type: String
    Default: ${DOMAIN}
    Description: Application domain
  
  EnableDebugLogs:
    Type: String
    Default: ${DEBUG_LOGS}
    AllowedValues: [true, false]
    Description: Enable debug logging

Resources:
  # Parameter Store parameters
  AppNameParameter:
    Type: AWS::SSM::Parameter
    Properties:
      Name: !Sub "/ai-nexus-workbench/\${Environment}/app-name"
      Type: String
      Value: "AI Nexus Workbench"
      Description: !Sub "Application name for \${Environment} environment"

  AppVersionParameter:
    Type: AWS::SSM::Parameter
    Properties:
      Name: !Sub "/ai-nexus-workbench/\${Environment}/app-version"
      Type: String
      Value: "1.0.0"
      Description: !Sub "Application version for \${Environment} environment"

  AppDomainParameter:
    Type: AWS::SSM::Parameter
    Properties:
      Name: !Sub "/ai-nexus-workbench/\${Environment}/app-domain"
      Type: String
      Value: !Ref AppDomain
      Description: !Sub "Application domain for \${Environment} environment"

  # IAM Role for application
  ApplicationExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub "AINexusWorkbench-\${Environment}-ExecutionRole"
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service:
                - lambda.amazonaws.com
                - ecs-tasks.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: ParameterStoreAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - ssm:GetParameter
                  - ssm:GetParameters
                  - ssm:GetParametersByPath
                Resource: !Sub "arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/ai-nexus-workbench/\${Environment}/*"
              - Effect: Allow
                Action:
                  - secretsmanager:GetSecretValue
                  - secretsmanager:DescribeSecret
                Resource: !Sub "arn:aws:secretsmanager:\${AWS::Region}:\${AWS::AccountId}:secret:ai-nexus-workbench/*"

Outputs:
  ApplicationExecutionRoleArn:
    Description: ARN of the application execution role
    Value: !GetAtt ApplicationExecutionRole.Arn
    Export:
      Name: !Sub "AINexusWorkbench-\${Environment}-ExecutionRoleArn"

  ParameterStoreNamespace:
    Description: Parameter Store namespace for this environment
    Value: !Sub "/ai-nexus-workbench/\${Environment}/"
    Export:
      Name: !Sub "AINexusWorkbench-\${Environment}-ParameterNamespace"
EOF

log_step "Created CloudFormation template: infrastructure/cloudformation-parameters.yaml"

# 6. Create deployment helper script
echo ""
echo "📜 Creating deployment helper script..."

cat > scripts/update-deployment-parameters.sh << 'EOF'
#!/bin/bash
set -euo pipefail

# Update Deployment Parameters Script
# This script updates Parameter Store values after deployment

ENVIRONMENT="${1:-dev}"
API_GATEWAY_URL="${2:-}"
COGNITO_USER_POOL_ID="${3:-}"
COGNITO_CLIENT_ID="${4:-}"
COGNITO_IDENTITY_POOL_ID="${5:-}"

echo "🔄 Updating deployment parameters for environment: $ENVIRONMENT"

if [[ -n "$API_GATEWAY_URL" ]]; then
    aws ssm put-parameter \
        --name "/ai-nexus-workbench/$ENVIRONMENT/api-gateway-url" \
        --value "$API_GATEWAY_URL" \
        --type "String" \
        --overwrite
    echo "✅ Updated API Gateway URL: $API_GATEWAY_URL"
fi

if [[ -n "$COGNITO_USER_POOL_ID" ]]; then
    aws ssm put-parameter \
        --name "/ai-nexus-workbench/$ENVIRONMENT/cognito-user-pool-id" \
        --value "$COGNITO_USER_POOL_ID" \
        --type "String" \
        --overwrite
    echo "✅ Updated Cognito User Pool ID: $COGNITO_USER_POOL_ID"
fi

if [[ -n "$COGNITO_CLIENT_ID" ]]; then
    aws ssm put-parameter \
        --name "/ai-nexus-workbench/$ENVIRONMENT/cognito-client-id" \
        --value "$COGNITO_CLIENT_ID" \
        --type "String" \
        --overwrite
    echo "✅ Updated Cognito Client ID: $COGNITO_CLIENT_ID"
fi

if [[ -n "$COGNITO_IDENTITY_POOL_ID" ]]; then
    aws ssm put-parameter \
        --name "/ai-nexus-workbench/$ENVIRONMENT/cognito-identity-pool-id" \
        --value "$COGNITO_IDENTITY_POOL_ID" \
        --type "String" \
        --overwrite
    echo "✅ Updated Cognito Identity Pool ID: $COGNITO_IDENTITY_POOL_ID"
fi

echo "🎉 Deployment parameters updated successfully!"
EOF

chmod +x scripts/update-deployment-parameters.sh
log_step "Created deployment helper script"

# Summary
echo ""
echo "🎉 AWS environment setup completed!"
echo ""
echo "📊 Summary of what was created:"
echo "  ✅ Parameter Store parameters for $ENVIRONMENT environment"
echo "  ✅ Secure parameters for sensitive configuration"
echo "  ✅ IAM policy for application access ($POLICY_NAME)"
echo "  ✅ CloudFormation template for infrastructure"
echo "  ✅ Deployment helper scripts"
echo ""
echo "🔧 Next steps:"
echo "  1. Update placeholder values in Parameter Store after deployment:"
echo "     ./scripts/update-deployment-parameters.sh $ENVIRONMENT <api-url> <pool-id> <client-id>"
echo "  2. Add real Stripe keys to Parameter Store:"
echo "     aws ssm put-parameter --name '/ai-nexus-workbench/$ENVIRONMENT/stripe-publishable-key' --value 'pk_test_...' --type SecureString --overwrite"
echo "  3. Run the critical secrets cleanup:"
echo "     ./scripts/cleanup-critical-secrets.sh"
echo "  4. Test environment variable resolution:"
echo "     ./scripts/resolve-environment.sh $ENVIRONMENT"
echo ""
echo "📋 Parameter Store namespace: /ai-nexus-workbench/$ENVIRONMENT/"
echo "🔐 IAM Policy ARN: $POLICY_ARN"
echo ""
log_step "AWS environment setup completed successfully!"
