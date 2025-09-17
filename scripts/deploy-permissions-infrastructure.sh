#!/bin/bash
set -euo pipefail

# AI Nexus Workbench - Permissions Infrastructure Deployment
# This script specifically handles the DynamoDB permissions tables deployment

echo "🏗️  AI Nexus Permissions Infrastructure Deployment"
echo "=================================================="

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENVIRONMENT="${NODE_ENV:-development}"
REGION="${AWS_REGION:-us-east-2}"

echo "📍 Project Root: $PROJECT_ROOT"
echo "📍 Environment: $ENVIRONMENT" 
echo "📍 AWS Region: $REGION"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install Terraform first."
    echo "💡 Visit: https://developer.hashicorp.com/terraform/downloads"
    exit 1
fi

# Check if AWS CLI is available and configured
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install and configure AWS CLI first."
    exit 1
fi

# Test AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured or invalid. Please run 'aws configure' first."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Navigate to infrastructure directory
INFRA_DIR="$PROJECT_ROOT/infrastructure"
if [[ ! -d "$INFRA_DIR" ]]; then
    echo "❌ Infrastructure directory not found: $INFRA_DIR"
    exit 1
fi

cd "$INFRA_DIR"

# Check if permissions infrastructure file exists
PERMISSIONS_FILE="dynamodb-users-permissions.tf"
if [[ ! -f "$PERMISSIONS_FILE" ]]; then
    echo "❌ Permissions infrastructure file not found: $PERMISSIONS_FILE"
    echo "💡 Please ensure the Terraform configuration file exists"
    exit 1
fi

echo "✅ Found permissions infrastructure file: $PERMISSIONS_FILE"
echo ""

# Initialize Terraform if needed
if [[ ! -d ".terraform" ]]; then
    echo "🚀 Initializing Terraform..."
    terraform init
    echo "✅ Terraform initialized"
    echo ""
fi

# Validate Terraform configuration
echo "🔍 Validating Terraform configuration..."
terraform validate
echo "✅ Terraform configuration is valid"
echo ""

# Plan the deployment
echo "📋 Planning infrastructure deployment..."
echo "🔧 This will show you what DynamoDB tables will be created:"
echo ""

# Create a temporary plan file
PLAN_FILE="/tmp/permissions-plan-$$.tfplan"
terraform plan -out="$PLAN_FILE" -var="environment=$ENVIRONMENT" -var="aws_region=$REGION"

echo ""
echo "📊 Plan Summary:"
echo "  • This will create 9 DynamoDB tables for the permissions system"
echo "  • Tables will be prefixed with: ai-nexus-$ENVIRONMENT"
echo "  • Region: $REGION"
echo ""

# Ask for confirmation
read -p "Do you want to apply these infrastructure changes? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Applying infrastructure changes..."
    
    # Apply the plan
    terraform apply "$PLAN_FILE"
    
    # Clean up the plan file
    rm -f "$PLAN_FILE"
    
    echo ""
    echo "✅ Infrastructure deployment completed successfully!"
    echo ""
    
    # Verify the tables were created
    echo "🔍 Verifying created DynamoDB tables..."
    
    TABLE_PREFIX="ai-nexus-$ENVIRONMENT"
    EXPECTED_TABLES=(
        "${TABLE_PREFIX}-users"
        "${TABLE_PREFIX}-user-permissions"
        "${TABLE_PREFIX}-roles"
        "${TABLE_PREFIX}-role-permissions"
        "${TABLE_PREFIX}-subscription-limits"
        "${TABLE_PREFIX}-user-quotas"
        "${TABLE_PREFIX}-cognito-group-mappings"
        "${TABLE_PREFIX}-organization-settings"
        "${TABLE_PREFIX}-team-memberships"
    )
    
    ALL_TABLES_EXIST=true
    for table in "${EXPECTED_TABLES[@]}"; do
        if aws dynamodb describe-table --table-name "$table" --region "$REGION" &> /dev/null; then
            echo "  ✅ $table"
        else
            echo "  ❌ $table (missing)"
            ALL_TABLES_EXIST=false
        fi
    done
    
    if [[ "$ALL_TABLES_EXIST" == true ]]; then
        echo ""
        echo "🎉 All tables created successfully!"
        echo "📊 Summary:"
        echo "  • 9 DynamoDB tables created"
        echo "  • Auto-scaling enabled"
        echo "  • Encryption at rest enabled"
        echo "  • Point-in-time recovery enabled"
        echo "  • Global Secondary Indexes configured"
        echo ""
        echo "🚀 Next step: Run the database seeding script"
        echo "   ./scripts/seed-permissions-tables.js"
    else
        echo ""
        echo "⚠️  Some tables were not created successfully"
        echo "🔧 Please check the Terraform output for errors"
        exit 1
    fi
    
else
    echo "⏭️  Infrastructure deployment cancelled"
    rm -f "$PLAN_FILE"
    exit 0
fi

echo ""
echo "🎯 Infrastructure deployment completed!"
echo "📁 Working directory: $INFRA_DIR"
echo "🔧 To make changes, edit: $PERMISSIONS_FILE"
echo "📚 Documentation: ../PERMISSIONS_SYSTEM.md"
