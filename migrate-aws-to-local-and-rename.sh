#!/bin/bash
# AWS to Local DynamoDB Migration and Rename Script
# This script will:
# 1. Download all AWS tables to local DynamoDB
# 2. Rename tables from old prefixes to new diatonic-ai prefixes
# 3. Migrate data between renamed tables

set -euo pipefail

# Configuration
AWS_REGION="us-east-2"
LOCAL_ENDPOINT="http://localhost:8002"
BACKUP_DIR="/tmp/dynamodb-migration-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$BACKUP_DIR/migration.log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# List of table prefixes to migrate and their new mappings
declare -A PREFIX_MAPPING=(
    ["ai-nexus-dev-"]="dev-diatonic-ai-"
    ["aws-devops-dev-"]="dev-diatonic-ai-"
    ["ai-nexus-workbench-development-"]="diatonic-ai-development-"
)

log "${BLUE}🚀 Starting AWS to Local DynamoDB Migration and Rename Process${NC}"
log "${BLUE}================================================================${NC}"

# Function to get all tables from AWS
get_aws_tables() {
    log "${YELLOW}📋 Fetching table list from AWS (region: $AWS_REGION)...${NC}"
    
    aws dynamodb list-tables \
        --region "$AWS_REGION" \
        --query 'TableNames' \
        --output text | tr '\t' '\n' > "$BACKUP_DIR/aws-tables.txt"
    
    local table_count=$(wc -l < "$BACKUP_DIR/aws-tables.txt")
    log "${GREEN}✅ Found $table_count tables in AWS${NC}"
    
    # Show first 10 tables for verification
    log "${BLUE}📋 First 10 tables found:${NC}"
    head -10 "$BACKUP_DIR/aws-tables.txt" | while read table; do
        log "  - $table"
    done
    
    if [ $table_count -gt 10 ]; then
        log "  ... and $((table_count - 10)) more tables"
    fi
}

# Function to check if local DynamoDB is running
check_local_dynamodb() {
    log "${YELLOW}🔍 Checking local DynamoDB connectivity...${NC}"
    
    if ! curl -s "$LOCAL_ENDPOINT" >/dev/null; then
        log "${RED}❌ Local DynamoDB not accessible at $LOCAL_ENDPOINT${NC}"
        log "${RED}Please ensure DynamoDB Local is running on port 8002${NC}"
        exit 1
    fi
    
    log "${GREEN}✅ Local DynamoDB is accessible${NC}"
}

# Function to download table schema from AWS
download_table_schema() {
    local table_name="$1"
    local schema_file="$BACKUP_DIR/schemas/${table_name}.json"
    
    mkdir -p "$BACKUP_DIR/schemas"
    
    aws dynamodb describe-table \
        --region "$AWS_REGION" \
        --table-name "$table_name" \
        --query 'Table.{TableName:TableName,KeySchema:KeySchema,AttributeDefinitions:AttributeDefinitions,GlobalSecondaryIndexes:GlobalSecondaryIndexes,LocalSecondaryIndexes:LocalSecondaryIndexes,BillingMode:BillingMode,ProvisionedThroughput:ProvisionedThroughput,StreamSpecification:StreamSpecification}' \
        --output json > "$schema_file"
    
    echo "$schema_file"
}

# Function to download table data from AWS
download_table_data() {
    local table_name="$1"
    local data_file="$BACKUP_DIR/data/${table_name}.json"
    
    mkdir -p "$BACKUP_DIR/data"
    
    log "  📦 Downloading data from $table_name..."
    
    # Use scan to get all data (be careful with large tables)
    aws dynamodb scan \
        --region "$AWS_REGION" \
        --table-name "$table_name" \
        --output json > "$data_file"
    
    local item_count=$(jq '.Items | length' "$data_file")
    log "  📊 Downloaded $item_count items from $table_name"
    
    echo "$data_file"
}

# Function to create table in local DynamoDB
create_local_table() {
    local aws_schema_file="$1"
    local new_table_name="$2"
    
    # Modify schema for local creation (remove unsupported fields)
    local local_schema=$(jq --arg name "$new_table_name" '
        .TableName = $name |
        del(.GlobalSecondaryIndexes[]?.ProvisionedThroughput) |
        del(.LocalSecondaryIndexes[]?.ProvisionedThroughput) |
        del(.ProvisionedThroughput) |
        del(.StreamSpecification) |
        .BillingMode = "PAY_PER_REQUEST"
    ' "$aws_schema_file")
    
    # Create the table
    echo "$local_schema" | aws dynamodb create-table \
        --endpoint-url "$LOCAL_ENDPOINT" \
        --cli-input-json file:///dev/stdin >/dev/null
    
    # Wait for table to be active
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local status=$(aws dynamodb describe-table \
            --endpoint-url "$LOCAL_ENDPOINT" \
            --table-name "$new_table_name" \
            --query 'Table.TableStatus' \
            --output text 2>/dev/null || echo "UNKNOWN")
        
        if [ "$status" = "ACTIVE" ]; then
            log "  ✅ Table $new_table_name is now active"
            return 0
        fi
        
        if [ $attempt -eq 1 ]; then
            log "  ⏳ Waiting for table $new_table_name to become active..."
        fi
        
        sleep 2
        ((attempt++))
    done
    
    log "${RED}❌ Table $new_table_name did not become active within expected time${NC}"
    return 1
}

# Function to upload data to local table
upload_data_to_local() {
    local data_file="$1"
    local new_table_name="$2"
    
    local item_count=$(jq '.Items | length' "$data_file")
    
    if [ "$item_count" -eq 0 ]; then
        log "  ℹ️  No items to upload to $new_table_name"
        return 0
    fi
    
    log "  📤 Uploading $item_count items to $new_table_name..."
    
    # Create batch write requests (max 25 items per batch)
    local batch_size=25
    local total_batches=$(( (item_count + batch_size - 1) / batch_size ))
    local batch_num=1
    
    while [ $batch_num -le $total_batches ]; do
        local start_index=$(( (batch_num - 1) * batch_size ))
        
        # Create batch request
        local batch_request=$(jq --arg table "$new_table_name" --argjson start $start_index --argjson size $batch_size '
            {
                RequestItems: {
                    ($table): [
                        .Items[$start:$start+$size] | .[] | {
                            PutRequest: {
                                Item: .
                            }
                        }
                    ]
                }
            }
        ' "$data_file")
        
        # Write batch to file and execute
        local batch_file="/tmp/batch_${new_table_name}_${batch_num}.json"
        echo "$batch_request" > "$batch_file"
        
        aws dynamodb batch-write-item \
            --endpoint-url "$LOCAL_ENDPOINT" \
            --cli-input-json "file://$batch_file" >/dev/null
        
        rm -f "$batch_file"
        
        if [ $total_batches -gt 1 ]; then
            log "    Batch $batch_num/$total_batches completed"
        fi
        
        ((batch_num++))
        
        # Small delay to avoid overwhelming local DynamoDB
        sleep 0.1
    done
    
    log "  ✅ Successfully uploaded $item_count items to $new_table_name"
}

# Function to determine new table name
get_new_table_name() {
    local old_table_name="$1"
    
    for old_prefix in "${!PREFIX_MAPPING[@]}"; do
        if [[ "$old_table_name" == $old_prefix* ]]; then
            local new_prefix="${PREFIX_MAPPING[$old_prefix]}"
            local suffix="${old_table_name#$old_prefix}"
            echo "${new_prefix}${suffix}"
            return 0
        fi
    done
    
    # If no mapping found, return original name (for tables we don't want to rename)
    echo "$old_table_name"
}

# Function to migrate a single table
migrate_single_table() {
    local aws_table="$1"
    local new_table_name=$(get_new_table_name "$aws_table")
    
    # Skip if the new name is the same as old name (no renaming needed)
    if [ "$aws_table" = "$new_table_name" ]; then
        log "${YELLOW}⏭️  Skipping $aws_table (no renaming needed)${NC}"
        return 0
    fi
    
    log "${BLUE}🔄 Migrating: $aws_table → $new_table_name${NC}"
    
    # Check if table already exists locally
    if aws dynamodb describe-table --endpoint-url "$LOCAL_ENDPOINT" --table-name "$new_table_name" >/dev/null 2>&1; then
        log "${YELLOW}⚠️  Table $new_table_name already exists locally, skipping...${NC}"
        return 0
    fi
    
    # Step 1: Download schema from AWS
    log "  🏗️  Downloading schema from AWS..."
    local schema_file=$(download_table_schema "$aws_table")
    
    # Step 2: Download data from AWS
    local data_file=$(download_table_data "$aws_table")
    
    # Step 3: Create table locally with new name
    log "  🏗️  Creating local table $new_table_name..."
    if create_local_table "$schema_file" "$new_table_name"; then
        
        # Step 4: Upload data to local table
        upload_data_to_local "$data_file" "$new_table_name"
        
        log "${GREEN}✅ Successfully migrated $aws_table to $new_table_name${NC}"
    else
        log "${RED}❌ Failed to create table $new_table_name${NC}"
        return 1
    fi
}

# Function to show migration summary
show_migration_summary() {
    log "${BLUE}📊 Migration Summary${NC}"
    log "${BLUE}===================${NC}"
    
    # Count AWS tables
    local aws_table_count=$(wc -l < "$BACKUP_DIR/aws-tables.txt")
    
    # Count local tables
    local local_table_count=$(aws dynamodb list-tables --endpoint-url "$LOCAL_ENDPOINT" --query 'TableNames | length(@)' --output text)
    
    # Count migrated tables (those with new prefixes)
    local migrated_count=0
    for old_prefix in "${!PREFIX_MAPPING[@]}"; do
        local count=$(aws dynamodb list-tables --endpoint-url "$LOCAL_ENDPOINT" --query "TableNames[?starts_with(@, '${PREFIX_MAPPING[$old_prefix]}')]" --output text | wc -w)
        migrated_count=$((migrated_count + count))
    done
    
    log "${GREEN}✅ AWS Tables Found: $aws_table_count${NC}"
    log "${GREEN}✅ Local Tables Total: $local_table_count${NC}"
    log "${GREEN}✅ Tables Migrated: $migrated_count${NC}"
    
    # Show new diatonic-ai tables
    log "\n${BLUE}📋 New diatonic-ai tables created:${NC}"
    aws dynamodb list-tables --endpoint-url "$LOCAL_ENDPOINT" --query 'TableNames[?starts_with(@, `diatonic-ai-`) || starts_with(@, `dev-diatonic-ai-`)]' --output text | tr '\t' '\n' | sort | while read table; do
        if [ -n "$table" ]; then
            local item_count=$(aws dynamodb scan --endpoint-url "$LOCAL_ENDPOINT" --table-name "$table" --select COUNT --query 'Count' --output text)
            log "  - $table ($item_count items)"
        fi
    done
}

# Main execution
main() {
    log "${BLUE}Starting migration process...${NC}"
    
    # Step 1: Check prerequisites
    check_local_dynamodb
    
    # Step 2: Get AWS tables
    get_aws_tables
    
    # Step 3: Process each table
    log "\n${YELLOW}🔄 Processing tables for migration...${NC}"
    
    local total_tables=0
    local migrated_tables=0
    local skipped_tables=0
    local failed_tables=0
    
    while read -r aws_table; do
        if [ -n "$aws_table" ]; then
            ((total_tables++))
            
            local new_name=$(get_new_table_name "$aws_table")
            
            if [ "$aws_table" = "$new_name" ]; then
                ((skipped_tables++))
                continue
            fi
            
            if migrate_single_table "$aws_table"; then
                ((migrated_tables++))
            else
                ((failed_tables++))
                log "${RED}❌ Failed to migrate $aws_table${NC}"
            fi
            
            # Progress indicator
            if [ $((total_tables % 10)) -eq 0 ]; then
                log "${BLUE}📈 Progress: $total_tables tables processed${NC}"
            fi
        fi
    done < "$BACKUP_DIR/aws-tables.txt"
    
    # Step 4: Show summary
    log "\n${GREEN}🎉 Migration Process Completed!${NC}"
    show_migration_summary
    
    log "\n${BLUE}📁 Migration artifacts saved to: $BACKUP_DIR${NC}"
    log "${BLUE}📄 Full log available at: $LOG_FILE${NC}"
    
    log "\n${GREEN}Final Status:${NC}"
    log "${GREEN}  - Total tables processed: $total_tables${NC}"
    log "${GREEN}  - Successfully migrated: $migrated_tables${NC}"
    log "${GREEN}  - Skipped (no rename): $skipped_tables${NC}"
    log "${RED}  - Failed: $failed_tables${NC}"
    
    if [ $failed_tables -gt 0 ]; then
        log "${YELLOW}⚠️  Some tables failed to migrate. Check the log for details.${NC}"
        return 1
    fi
}

# Handle script interruption
trap 'log "${RED}❌ Migration interrupted by user${NC}"; exit 130' INT TERM

# Run main function
main "$@"