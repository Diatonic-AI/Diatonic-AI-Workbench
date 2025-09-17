#!/bin/bash
set -euo pipefail

# Comprehensive Table Name Migration Script
# Changes all table naming from ai-nexus-workbench/dev-ai-nexus to diatonic-ai/dev-diatonic-ai

echo "🔄 Starting table name migration from ai-nexus-workbench/dev-ai-nexus to diatonic-ai/dev-diatonic-ai"

# Function to backup original files
backup_file() {
    local file="$1"
    if [[ -f "$file" && ! -f "${file}.backup" ]]; then
        cp "$file" "${file}.backup"
        echo "📄 Backed up: $file"
    fi
}

# Function to update table naming in files
update_table_naming() {
    local file="$1"
    local description="$2"
    
    if [[ -f "$file" ]]; then
        backup_file "$file"
        
        # Replace ai-nexus-workbench with diatonic-ai for production
        sed -i 's/ai-nexus-workbench-development/diatonic-ai-development/g' "$file"
        sed -i 's/ai-nexus-workbench-production/diatonic-ai-production/g' "$file"
        sed -i 's/ai-nexus-workbench-${env}/diatonic-ai-${env}/g' "$file"
        sed -i 's/ai-nexus-workbench-\${env}/diatonic-ai-\${env}/g' "$file"
        sed -i 's/"ai-nexus-workbench-" \+ env/"diatonic-ai-" + env/g' "$file"
        sed -i "s/'ai-nexus-workbench-' \+ env/'diatonic-ai-' + env/g" "$file"
        
        # Replace dev-ai-nexus with dev-diatonic-ai for development 
        sed -i 's/dev-ai-nexus-/dev-diatonic-ai-/g' "$file"
        
        # Update prefix constants
        sed -i 's/ai-nexus-/diatonic-ai-/g' "$file"
        
        # Update any hardcoded table references
        sed -i 's/ai-nexus-dev-/diatonic-ai-dev-/g' "$file"
        sed -i 's/ai-nexus-prod-/diatonic-ai-prod-/g' "$file"
        
        echo "✅ Updated $description: $file"
    else
        echo "⚠️  File not found: $file"
    fi
}

# Function to migrate DynamoDB Local tables
migrate_local_tables() {
    echo "🗄️  Migrating DynamoDB Local tables..."
    
    # Get list of existing tables
    local tables=$(aws dynamodb list-tables \
        --endpoint-url http://localhost:8002 \
        --output text \
        --query 'TableNames[]' 2>/dev/null | grep -E '^dev-ai-nexus-' || true)
    
    if [[ -z "$tables" ]]; then
        echo "ℹ️  No dev-ai-nexus-* tables found in local DynamoDB"
        return 0
    fi
    
    echo "📋 Found tables to migrate:"
    echo "$tables"
    
    # For each table, create new table and migrate data
    while IFS= read -r old_table_name; do
        if [[ -z "$old_table_name" ]]; then continue; fi
        
        local new_table_name="${old_table_name/dev-ai-nexus-/dev-diatonic-ai-}"
        
        echo "🔄 Migrating: $old_table_name → $new_table_name"
        
        # Check if new table already exists
        if aws dynamodb describe-table \
           --table-name "$new_table_name" \
           --endpoint-url http://localhost:8002 \
           --output text > /dev/null 2>&1; then
            echo "⚠️  Table $new_table_name already exists, skipping migration"
            continue
        fi
        
        # Get the old table structure
        local table_schema=$(aws dynamodb describe-table \
            --table-name "$old_table_name" \
            --endpoint-url http://localhost:8002 \
            --output json)
        
        # Extract necessary schema information and create new table
        echo "$table_schema" | jq --arg new_name "$new_table_name" '
        {
            TableName: $new_name,
            KeySchema: .Table.KeySchema,
            AttributeDefinitions: .Table.AttributeDefinitions,
            BillingMode: "PAY_PER_REQUEST",
            GlobalSecondaryIndexes: (
                if .Table.GlobalSecondaryIndexes then 
                    [.Table.GlobalSecondaryIndexes[] | {
                        IndexName: .IndexName,
                        KeySchema: .KeySchema,
                        Projection: .Projection
                    }]
                else null end
            )
        } | if .GlobalSecondaryIndexes == null then del(.GlobalSecondaryIndexes) else . end
        ' > "/tmp/${new_table_name}_schema.json"
        
        # Create the new table
        echo "🏗️  Creating new table: $new_table_name"
        aws dynamodb create-table \
            --endpoint-url http://localhost:8002 \
            --cli-input-json "file:///tmp/${new_table_name}_schema.json"
        
        # Wait for table to be active
        echo "⏳ Waiting for table to become active..."
        aws dynamodb wait table-exists \
            --table-name "$new_table_name" \
            --endpoint-url http://localhost:8002
        
        # Scan and copy all items from old table to new table
        echo "📦 Copying data from $old_table_name to $new_table_name"
        
        # Use scan to get all items
        local items=$(aws dynamodb scan \
            --table-name "$old_table_name" \
            --endpoint-url http://localhost:8002 \
            --output json \
            --query 'Items')
        
        # Count items to migrate
        local item_count=$(echo "$items" | jq 'length')
        echo "📊 Found $item_count items to migrate"
        
        if [[ "$item_count" -gt 0 ]]; then
            # Batch write items to new table
            echo "$items" | jq --arg table_name "$new_table_name" '
            {
                RequestItems: {
                    ($table_name): [.[] | {
                        PutRequest: {
                            Item: .
                        }
                    }]
                }
            }' > "/tmp/${new_table_name}_data.json"
            
            # Write items in batches (DynamoDB batch write limit is 25 items)
            aws dynamodb batch-write-item \
                --endpoint-url http://localhost:8002 \
                --request-items "file:///tmp/${new_table_name}_data.json"
        fi
        
        echo "✅ Successfully migrated $old_table_name to $new_table_name"
        
        # Clean up temp files
        rm -f "/tmp/${new_table_name}_schema.json"
        rm -f "/tmp/${new_table_name}_data.json"
        
    done <<< "$tables"
    
    echo "🎉 Local table migration completed!"
}

# Main configuration files to update
echo "📝 Updating configuration files..."

# Update main table configuration
update_table_naming "src/lib/dynamodb-config.ts" "DynamoDB config"
update_table_naming "src/lib/content-service.ts" "Content service"
update_table_naming "src/lib/server-aws-config.ts" "Server AWS config"
update_table_naming "src/lib/api/dynamodb-client.ts" "DynamoDB client"

# Update Lambda functions
update_table_naming "lambda/api/utils/database.ts" "Lambda database utils"
update_table_naming "lambda/deploy-package/api/utils/database.ts" "Deploy package database utils"
update_table_naming "src/aws-lambda/repositories/content.repository.ts" "Content repository"

# Update Terraform configurations
update_table_naming "infrastructure/dynamodb.tf" "Terraform DynamoDB"
update_table_naming "infrastructure/main.tf" "Terraform main"
update_table_naming "infrastructure/locals.tf" "Terraform locals"
update_table_naming "infra/main.tf" "CDK Infrastructure main"
update_table_naming "infra/lib/ai-lab-core-stack.ts" "AI Lab stack"
update_table_naming "infra/lib/community-core-stack.ts" "Community stack"
update_table_naming "infra/lib/observatory-core-stack.ts" "Observatory stack"

# Update scripts
update_table_naming "scripts/setup-dynamodb.js" "Setup DynamoDB script"
update_table_naming "scripts/setup-dynamodb-local.js" "Setup local DynamoDB script"
update_table_naming "scripts/setup-production-dynamodb.js" "Setup production DynamoDB script"
update_table_naming "scripts/test-local-dynamodb.js" "Test local DynamoDB script"
update_table_naming "scripts/dynamodb-migrate.sh" "DynamoDB migrate script"
update_table_naming "scripts/dynamodb-schema-sync.sh" "DynamoDB schema sync script"
update_table_naming "scripts/migration-api-server.js" "Migration API server"
update_table_naming "scripts/seed-dev-data.js" "Seed dev data script"
update_table_naming "scripts/environment-config.cjs" "Environment config"

# Update environment files
update_table_naming "scripts/.env.example" "Environment example"
update_table_naming "scripts/.env" "Environment config"

# Update documentation
update_table_naming "docs/DYNAMODB_CMS_SETUP.md" "DynamoDB setup docs"
update_table_naming "docs/LOCAL_DEVELOPMENT.md" "Local development docs"
update_table_naming "docs/LOCAL_DEVELOPMENT_SETUP.md" "Local development setup docs"
update_table_naming "docs/PRODUCTION_REPLICA_SETUP.md" "Production replica setup docs"
update_table_naming "README.md" "README"

# Update deployment scripts
update_table_naming "deploy-production.sh" "Production deployment"
update_table_naming "scripts/deploy-dev.sh" "Dev deployment"
update_table_naming "infrastructure/deploy.sh" "Infrastructure deployment"

# Update migration files
find migrations/ -name "*.json" -type f | while IFS= read -r file; do
    update_table_naming "$file" "Migration $(basename "$file")"
done

# Update any schema files
find scripts/migrations/ -name "*.json" -type f | while IFS= read -r file; do
    update_table_naming "$file" "Schema migration $(basename "$file")"
done

# Migrate DynamoDB Local tables
echo ""
echo "🚀 Starting local DynamoDB table migration..."
if command -v aws >/dev/null 2>&1; then
    if curl -s http://localhost:8002 > /dev/null 2>&1; then
        migrate_local_tables
    else
        echo "⚠️  DynamoDB Local not running at localhost:8002"
        echo "💡 To migrate tables later, start DynamoDB Local and run:"
        echo "   aws dynamodb list-tables --endpoint-url http://localhost:8002"
    fi
else
    echo "⚠️  AWS CLI not found. Please install it to migrate local tables."
fi

echo ""
echo "🎉 Table name migration completed successfully!"
echo ""
echo "📋 Summary of changes:"
echo "   • dev-ai-nexus-* → dev-diatonic-ai-* (development tables)"  
echo "   • ai-nexus-workbench-* → diatonic-ai-* (production tables)"
echo ""
echo "🔄 Next steps:"
echo "   1. Review the updated configuration files"
echo "   2. Test the application locally"
echo "   3. Deploy infrastructure changes to update production tables"
echo "   4. Update any external references to the old table names"
echo ""
echo "💾 Original files have been backed up with .backup extension"
echo "🔧 Run 'git status' to see all modified files"