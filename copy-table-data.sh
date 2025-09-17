#!/bin/bash
set -euo pipefail

# Simple script to copy data from one DynamoDB table to another
copy_table_data() {
    local source_table="$1"
    local target_table="$2"
    local endpoint="http://localhost:8002"
    
    echo "📦 Copying data from $source_table to $target_table..."
    
    # Get all items from source table
    local items_json=$(aws dynamodb scan \
        --table-name "$source_table" \
        --endpoint-url "$endpoint" \
        --output json \
        --query 'Items')
    
    local item_count=$(echo "$items_json" | jq 'length')
    echo "📊 Found $item_count items to copy"
    
    if [[ "$item_count" -eq 0 ]]; then
        echo "ℹ️  No items to copy"
        return 0
    fi
    
    # For each item, put it into the target table
    echo "$items_json" | jq -r '.[] | @base64' | while IFS= read -r item_base64; do
        local item_json=$(echo "$item_base64" | base64 -d)
        
        echo "   Copying item..."
        aws dynamodb put-item \
            --table-name "$target_table" \
            --endpoint-url "$endpoint" \
            --item "$item_json" \
            --output text > /dev/null
    done
    
    echo "✅ Copied $item_count items to $target_table"
}

# Create new table with same schema
create_table_from_schema() {
    local source_table="$1"
    local target_table="$2"
    local endpoint="http://localhost:8002"
    
    echo "🏗️  Creating table $target_table from schema of $source_table..."
    
    # Get source table description
    local table_desc=$(aws dynamodb describe-table \
        --table-name "$source_table" \
        --endpoint-url "$endpoint" \
        --output json)
    
    # Extract and modify schema for new table
    local create_request=$(echo "$table_desc" | jq --arg new_name "$target_table" '{
        TableName: $new_name,
        KeySchema: .Table.KeySchema,
        AttributeDefinitions: .Table.AttributeDefinitions,
        BillingMode: "PAY_PER_REQUEST"
    } + (if .Table.GlobalSecondaryIndexes then {
        GlobalSecondaryIndexes: [.Table.GlobalSecondaryIndexes[] | {
            IndexName: .IndexName,
            KeySchema: .KeySchema,
            Projection: .Projection
        }]
    } else {} end)')
    
    # Create the new table
    local temp_schema="/tmp/${target_table}_create.json"
    echo "$create_request" > "$temp_schema"
    
    aws dynamodb create-table \
        --endpoint-url "$endpoint" \
        --cli-input-json "file://$temp_schema" > /dev/null
    
    rm -f "$temp_schema"
    
    # Wait for table to be active
    echo "⏳ Waiting for table to become active..."
    for i in {1..30}; do
        local status=$(aws dynamodb describe-table \
            --table-name "$target_table" \
            --endpoint-url "$endpoint" \
            --output text \
            --query 'Table.TableStatus')
        
        if [[ "$status" == "ACTIVE" ]]; then
            echo "✅ Table $target_table is now active"
            return 0
        fi
        echo "   Waiting... ($i/30) Status: $status"
        sleep 2
    done
    
    echo "❌ Timeout waiting for table to become active"
    return 1
}

# Main migration function
migrate_single_table() {
    local old_table="$1"
    local new_table="$2"
    
    echo ""
    echo "🔄 Migrating: $old_table → $new_table"
    
    # Check if target table already exists
    if aws dynamodb describe-table \
       --table-name "$new_table" \
       --endpoint-url http://localhost:8002 \
       --output text > /dev/null 2>&1; then
        echo "⚠️  Table $new_table already exists, skipping migration"
        return 0
    fi
    
    # Create new table with same schema
    create_table_from_schema "$old_table" "$new_table"
    
    # Copy data
    copy_table_data "$old_table" "$new_table"
    
    echo "✅ Successfully migrated $old_table to $new_table"
}

echo "🚀 Starting targeted table migration..."

# Check DynamoDB Local is running
if ! curl -s http://localhost:8002 >/dev/null 2>&1; then
    echo "❌ DynamoDB Local is not running on localhost:8002"
    exit 1
fi

# Get current table list
tables=$(aws dynamodb list-tables \
    --endpoint-url http://localhost:8002 \
    --output text \
    --query 'TableNames[]')

echo "📋 Current tables:"
echo "$tables"

echo ""
echo "🔄 Starting migration of dev-ai-nexus-* tables to dev-diatonic-ai-*..."

# Migrate dev-ai-nexus tables
for table in $tables; do
    if [[ "$table" =~ ^dev-ai-nexus- ]]; then
        new_name="${table/dev-ai-nexus-/dev-diatonic-ai-}"
        migrate_single_table "$table" "$new_name"
    fi
done

echo ""
echo "🔄 Starting migration of ai-nexus-workbench-development-* tables to diatonic-ai-development-*..."

# Migrate ai-nexus-workbench-development tables
for table in $tables; do
    if [[ "$table" =~ ^ai-nexus-workbench-development- ]]; then
        new_name="${table/ai-nexus-workbench-development-/diatonic-ai-development-}"
        migrate_single_table "$table" "$new_name"
    fi
done

echo ""
echo "📋 Final table list:"
aws dynamodb list-tables --endpoint-url http://localhost:8002 --output text --query 'TableNames[]' | sort

echo ""
echo "🎉 Migration completed successfully!"