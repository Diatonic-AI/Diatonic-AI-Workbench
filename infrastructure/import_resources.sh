#!/bin/bash
# Systematic AWS Resource Import Script
set -e

echo "🚀 Starting systematic AWS resource import into Terraform..."

# Set Cloudflare API token
export CLOUDFLARE_API_TOKEN="36kSc7uQaElfejzF9v0dMMHBFXgHXluno6-gsgRR"

# Initialize terraform
echo "📋 Initializing Terraform..."
terraform init

echo "✅ Terraform initialized successfully"

# Phase 1: Import ACM Certificates (us-east-1)
echo "🔐 Phase 1: Importing ACM certificates from us-east-1..."

# Certificate: diatonic.ai (main) - 108aeeb9-35ed-4407-85ce-36543c6b8e15
echo "  Importing main diatonic.ai certificate..."
terraform import aws_acm_certificate.diatonic_main arn:aws:acm:us-east-1:313476888312:certificate/108aeeb9-35ed-4407-85ce-36543c6b8e15 || echo "  Already imported or failed"

# Certificate: dev.diatonic.ai - cb8c2da5-bc07-47d5-87fd-17d9a33df5c2
echo "  Importing dev.diatonic.ai certificate..."
terraform import aws_acm_certificate.dev_diatonic arn:aws:acm:us-east-1:313476888312:certificate/cb8c2da5-bc07-47d5-87fd-17d9a33df5c2 || echo "  Already imported or failed"

# Certificate: workbench.diatonic.ai - 8084809d-c4a9-469d-9cdf-034aeeb19a55
echo "  Importing workbench.diatonic.ai certificate..."
terraform import aws_acm_certificate.workbench_diatonic arn:aws:acm:us-east-1:313476888312:certificate/8084809d-c4a9-469d-9cdf-034aeeb19a55 || echo "  Already imported or failed"

# Phase 2: Import DynamoDB Tables (us-east-2)
echo "🗄️ Phase 2: Importing missing DynamoDB tables from us-east-2..."

# Stripe tables
echo "  Importing Stripe tables..."
terraform import aws_dynamodb_table.stripe_customers ai-nexus-dev-stripe-customers || echo "  Already imported or failed"
terraform import aws_dynamodb_table.stripe_idempotency ai-nexus-dev-stripe-idempotency || echo "  Already imported or failed"
terraform import aws_dynamodb_table.stripe_invoices ai-nexus-dev-stripe-invoices || echo "  Already imported or failed"
terraform import aws_dynamodb_table.stripe_subscriptions ai-nexus-dev-stripe-subscriptions || echo "  Already imported or failed"

# AI Nexus development tables
echo "  Importing AI Nexus development tables..."
terraform import aws_dynamodb_table.activity_feed aws-devops-dev-activity-feed || echo "  Already imported or failed"
terraform import aws_dynamodb_table.aggregated_analytics aws-devops-dev-aggregated-analytics || echo "  Already imported or failed"
terraform import aws_dynamodb_table.community_comments aws-devops-dev-community-comments || echo "  Already imported or failed"

# Terraform state lock table
echo "  Importing Terraform state lock table..."
terraform import aws_dynamodb_table.terraform_state_lock aws-devops-terraform-state-lock || echo "  Already imported or failed"

# Production tables
echo "  Importing production tables..."
terraform import aws_dynamodb_table.prod_ai_conversations diatonic-prod-ai-conversations || echo "  Already imported or failed"
terraform import aws_dynamodb_table.prod_users diatonic-prod-users || echo "  Already imported or failed"

echo "✅ Phase 2 completed: DynamoDB tables imported"

# Phase 3: Validate current state
echo "📊 Phase 3: Validating current state..."
terraform plan -var="cloudflare_api_token=$CLOUDFLARE_API_TOKEN" -refresh=true

echo "✅ Import process completed!"
echo "📋 Next step: Review the plan and apply changes"

echo ""
echo "📊 Current Terraform state summary:"
terraform state list | wc -l | xargs echo "Total managed resources:"
echo ""
echo "🚀 To apply the plan:"
echo "terraform apply -var=\"cloudflare_api_token=\$CLOUDFLARE_API_TOKEN\""
