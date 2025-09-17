#!/bin/bash

# Import script for existing DynamoDB tables that are causing creation conflicts
# This script imports DynamoDB tables that already exist in AWS but are not in Terraform state

set -e

echo "Importing existing DynamoDB tables into Terraform state..."

# DynamoDB tables to import
declare -A dynamo_tables=(
    ["ai-nexus-dev-stripe-customers"]="aws_dynamodb_table.stripe_customers"
    ["ai-nexus-dev-stripe-idempotency"]="aws_dynamodb_table.stripe_idempotency"
    ["ai-nexus-dev-stripe-invoices"]="aws_dynamodb_table.stripe_invoices"
    ["ai-nexus-dev-stripe-subscriptions"]="aws_dynamodb_table.stripe_subscriptions"
    ["aws-devops-dev-activity-feed"]="aws_dynamodb_table.activity_feed"
    ["aws-devops-dev-aggregated-analytics"]="aws_dynamodb_table.aggregated_analytics"
    ["aws-devops-dev-community-comments"]="aws_dynamodb_table.community_comments"
    ["aws-devops-terraform-state-lock"]="aws_dynamodb_table.terraform_state_lock"
    ["diatonic-prod-ai-conversations"]="aws_dynamodb_table.prod_ai_conversations"
    ["diatonic-prod-users"]="aws_dynamodb_table.prod_users"
)

# Function to check if table exists in AWS
check_table_exists() {
    local table_name="$1"
    if aws dynamodb describe-table --table-name "$table_name" --region us-east-2 >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to import table if it exists
import_table() {
    local table_name="$1"
    local tf_resource="$2"
    
    echo "Checking if table '$table_name' exists in AWS..."
    if check_table_exists "$table_name"; then
        echo "  ✓ Table exists. Importing into Terraform state as $tf_resource"
        if terraform import "$tf_resource" "$table_name"; then
            echo "  ✓ Successfully imported $table_name"
        else
            echo "  ❌ Failed to import $table_name"
            return 1
        fi
    else
        echo "  ⚠️  Table $table_name does not exist in AWS"
    fi
}

# Import each table
for table_name in "${!dynamo_tables[@]}"; do
    tf_resource="${dynamo_tables[$table_name]}"
    import_table "$table_name" "$tf_resource"
done

echo "DynamoDB table import process completed!"
echo "Run 'terraform plan' to verify the imports and see remaining changes."
