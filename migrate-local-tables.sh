#!/bin/bash
set -euo pipefail

echo "🔄 Migrating local DynamoDB tables from ai-nexus to diatonic-ai naming..."

# Function to migrate a single table
migrate_table() {
    local old_name="$1"
    local new_name="$2"
    
    echo "🔄 Migrating: $old_name → $new_name"
    
    # Check if new table already exists
    if aws dynamodb describe-table \
       --table-name "$new_name" \
       --endpoint-url http://localhost:8002 >/dev/null 2>&1; then
        echo "⚠️  Table $new_name already exists, skipping..."
        return 0
    fi
    
    # Get table schema
    echo "📋 Getting table schema for $old_name..."
    local schema_file="/tmp/${new_name}_schema.json"
    
    aws dynamodb describe-table \
        --table-name "$old_name" \
        --endpoint-url http://localhost:8002 \
        --output json | jq --arg new_name "$new_name" '
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
        ' > "$schema_file"
    
    # Create new table
    echo "🏗️  Creating new table: $new_name"
    aws dynamodb create-table \
        --endpoint-url http://localhost:8002 \
        --cli-input-json "file://$schema_file"
    
    # Wait for table to be active
    echo "⏳ Waiting for table to become active..."
    local max_wait=30
    local wait_count=0
    while [[ $wait_count -lt $max_wait ]]; do
        if aws dynamodb describe-table \
           --table-name "$new_name" \
           --endpoint-url http://localhost:8002 \
           --output json | jq -r '.Table.TableStatus' | grep -q "ACTIVE"; then
            break
        fi
        echo "   Still waiting... ($((wait_count + 1))/$max_wait)"
        sleep 2
        ((wait_count++))
    done
    
    # Copy data
    echo "📦 Copying data from $old_name to $new_name..."
    local data_file="/tmp/${new_name}_data.json"
    
    # Get all items
    aws dynamodb scan \
        --table-name "$old_name" \
        --endpoint-url http://localhost:8002 \
        --output json \
        --query 'Items' > "$data_file"
    
    local item_count=$(jq 'length' "$data_file")
    echo "📊 Found $item_count items to migrate"
    
    if [[ "$item_count" -gt 0 ]]; then
        # Split into batches of 25 (DynamoDB batch write limit)
        local batch_size=25
        local total_batches=$(( (item_count + batch_size - 1) / batch_size ))
        
        for ((batch=0; batch<total_batches; batch++)); do
            local start_idx=$((batch * batch_size))
            local batch_file="/tmp/${new_name}_batch_${batch}.json"
            
            jq --argjson start "$start_idx" --argjson size "$batch_size" --arg table_name "$new_name" '
            {
                RequestItems: {
                    ($table_name): (.[$start:$start+$size] | map({
                        PutRequest: {
                            Item: .
                        }
                    }))
                }
            }' "$data_file" > "$batch_file"
            
            echo "   Writing batch $((batch + 1))/$total_batches..."
            aws dynamodb batch-write-item \
                --endpoint-url http://localhost:8002 \
                --request-items "file://$batch_file"
            
            rm -f "$batch_file"
        done
    fi
    
    echo "✅ Successfully migrated $old_name to $new_name"
    
    # Cleanup
    rm -f "$schema_file" "$data_file"
}

# Check if DynamoDB Local is running
if ! curl -s http://localhost:8002 >/dev/null 2>&1; then
    echo "❌ DynamoDB Local is not running on localhost:8002"
    echo "💡 Please start DynamoDB Local first:"
    echo "   docker run -p 8002:8000 -d amazon/dynamodb-local"
    exit 1
fi

# Get current tables
echo "📋 Getting current table list..."
local_tables=$(aws dynamodb list-tables --endpoint-url http://localhost:8002 --output text --query 'TableNames[]' 2>/dev/null || true)

if [[ -z "$local_tables" ]]; then
    echo "ℹ️  No tables found in local DynamoDB"
    exit 0
fi

echo "📋 Current tables:"
echo "$local_tables" | sort

echo ""
echo "🚀 Starting migration..."

# Migrate dev-ai-nexus-* tables to dev-diatonic-ai-*
echo ""
echo "📦 Migrating dev-ai-nexus-* tables..."
dev_ai_nexus_found=false
for table in $local_tables; do
    if [[ "$table" =~ ^dev-ai-nexus- ]]; then
        dev_ai_nexus_found=true
        new_name="${table/dev-ai-nexus-/dev-diatonic-ai-}"
        migrate_table "$table" "$new_name"
    fi
done
if [[ "$dev_ai_nexus_found" == "false" ]]; then
    echo "ℹ️  No dev-ai-nexus-* tables found"
fi

# Migrate ai-nexus-workbench-development-* tables to diatonic-ai-development-*
echo ""
echo "📦 Migrating ai-nexus-workbench-development-* tables..."
ai_nexus_dev_found=false
for table in $local_tables; do
    if [[ "$table" =~ ^ai-nexus-workbench-development- ]]; then
        ai_nexus_dev_found=true
        new_name="${table/ai-nexus-workbench-development-/diatonic-ai-development-}"
        migrate_table "$table" "$new_name"
    fi
done
if [[ "$ai_nexus_dev_found" == "false" ]]; then
    echo "ℹ️  No ai-nexus-workbench-development-* tables found"
fi

# Show final table list
echo ""
echo "📋 Final table list:"
aws dynamodb list-tables --endpoint-url http://localhost:8002 --output text --query 'TableNames[]' | sort

echo ""
echo "🎉 Table migration completed successfully!"
echo ""
echo "📋 Summary:"
echo "   • dev-ai-nexus-* → dev-diatonic-ai-*"
echo "   • ai-nexus-workbench-development-* → diatonic-ai-development-*"
echo ""
echo "💡 Next steps:"
echo "   1. Test the application with the new table names"
echo "   2. Once confirmed working, you can drop the old tables:"
echo "      aws dynamodb delete-table --table-name <old-table> --endpoint-url http://localhost:8002"