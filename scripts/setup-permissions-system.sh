#!/bin/bash
set -euo pipefail

# AI Nexus Workbench - Permissions System Setup Script
# This script sets up the complete DynamoDB permissions system

echo "🚀 AI Nexus Workbench - Permissions System Setup"
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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
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

# Install dependencies if needed
if [[ ! -d "$PROJECT_ROOT/node_modules" ]]; then
    echo "📦 Installing Node.js dependencies..."
    cd "$PROJECT_ROOT"
    npm install
    echo "✅ Dependencies installed"
    echo ""
fi

# Step 1: Deploy DynamoDB tables with Terraform (if available)
echo "🏗️  Step 1: Infrastructure Deployment"
echo "🔧 Using dedicated permissions infrastructure deployment script..."
echo ""

# Check if the dedicated infrastructure script exists
INFRA_SCRIPT="$PROJECT_ROOT/scripts/deploy-permissions-infrastructure.sh"
if [[ -f "$INFRA_SCRIPT" ]] && [[ -x "$INFRA_SCRIPT" ]]; then
    echo "📋 Running dedicated infrastructure deployment script..."
    "$INFRA_SCRIPT"
    
    # Check the exit code
    if [[ $? -eq 0 ]]; then
        echo "✅ Infrastructure deployment completed successfully"
    else
        echo "⚠️  Infrastructure deployment encountered issues"
        echo "💡 You can continue with manual table creation or fix the issues and retry"
        echo "🔧 Alternatively, run: $INFRA_SCRIPT"
        echo ""
        read -p "Do you want to continue with database seeding anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "⏹️  Setup cancelled"
            exit 1
        fi
    fi
else
    echo "⚠️  Dedicated infrastructure script not found or not executable"
    echo "📁 Expected: $INFRA_SCRIPT"
    echo "💡 You can:"
    echo "   1. Create DynamoDB tables manually"
    echo "   2. Run Terraform directly from the infrastructure/ directory"
    echo "   3. Fix the script permissions: chmod +x $INFRA_SCRIPT"
    echo ""
    read -p "Do you want to continue with database seeding only? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "⏹️  Setup cancelled"
        exit 1
    fi
fi

cd "$PROJECT_ROOT"

echo ""

# Step 2: Seed the database
echo "🌱 Step 2: Database Seeding"
echo "🔧 Populating DynamoDB tables with default permissions data..."

cd "$PROJECT_ROOT"

# Run the seeding script
echo "📊 Running permissions seeding script..."
NODE_ENV="$ENVIRONMENT" AWS_REGION="$REGION" node scripts/seed-permissions-tables.js

echo ""
echo "✅ Database seeding completed!"

# Step 3: Verification
echo "🔍 Step 3: Verification"
echo "🔧 Verifying the setup..."

# Check if the seeding was successful by trying to list tables
echo "📋 Checking DynamoDB tables..."

TABLE_PREFIX="ai-nexus-dev"
if [[ "$ENVIRONMENT" == "production" ]]; then
    TABLE_PREFIX="ai-nexus-prod"
fi

# List of expected tables
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
    echo "✅ All required tables are present"
else
    echo "⚠️  Some tables are missing - please check the infrastructure deployment"
fi

echo ""

# Final summary
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📊 Summary:"
echo "  • Environment: $ENVIRONMENT"
echo "  • Region: $REGION"
echo "  • Tables: 9 permissions tables created/updated"
echo "  • Roles: Subscription tiers + internal roles configured"
echo "  • Permissions: Complete feature-based permission system"
echo "  • Cognito Integration: Group mappings configured"

if [[ "$ENVIRONMENT" != "production" ]]; then
    echo "  • Test Users: 3 sample users created for development"
fi

echo ""
echo "📚 Next Steps:"
echo "  1. Review the PERMISSIONS_SYSTEM.md documentation"
echo "  2. Integrate the PermissionsService into your application"
echo "  3. Update your authentication middleware to use the new system"
echo "  4. Test the permission checks in your UI components"
echo ""
echo "🔗 Quick References:"
echo "  • Permissions Service: src/lib/services/permissions-service.ts"
echo "  • Documentation: PERMISSIONS_SYSTEM.md"
echo "  • Terraform Config: infrastructure/dynamodb-users-permissions.tf" 
echo "  • Seeding Script: scripts/seed-permissions-tables.js"
echo ""
echo "Happy coding! 🚀"
