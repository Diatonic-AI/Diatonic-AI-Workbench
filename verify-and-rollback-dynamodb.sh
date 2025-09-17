#!/bin/bash
# DynamoDB Migration Verification and Rollback Script

set -euo pipefail

# Configuration
LOCAL_ENDPOINT="http://localhost:8002"
AWS_REGION="us-east-2"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to show usage
show_usage() {
    echo "Usage: $0 [verify|rollback|sync-to-aws|compare]"
    echo ""
    echo "Commands:"
    echo "  verify      - Verify local table structure and data integrity"
    echo "  rollback    - Delete all diatonic-ai prefixed tables from local"
    echo "  sync-to-aws - Upload renamed tables back to AWS production"
    echo "  compare     - Compare local and AWS table counts and structure"
    exit 1
}

# Function to verify local tables
verify_local_tables() {
    echo -e "${BLUE}🔍 Verifying Local DynamoDB Tables${NC}"
    echo -e "${BLUE}===================================${NC}"
    
    # Check connectivity
    if ! curl -s "$LOCAL_ENDPOINT" >/dev/null; then
        echo -e "${RED}❌ Local DynamoDB not accessible at $LOCAL_ENDPOINT${NC}"
        exit 1
    fi
    
    # Get all local tables
    local all_tables=($(aws dynamodb list-tables --endpoint-url "$LOCAL_ENDPOINT" --query 'TableNames[]' --output text))
    local diatonic_tables=($(aws dynamodb list-tables --endpoint-url "$LOCAL_ENDPOINT" --query 'TableNames[?starts_with(@, `diatonic-ai-`) || starts_with(@, `dev-diatonic-ai-`)]' --output text))
    
    echo -e "${GREEN}✅ Total local tables: ${#all_tables[@]}${NC}"
    echo -e "${GREEN}✅ Diatonic-AI tables: ${#diatonic_tables[@]}${NC}"
    
    echo -e "\n${BLUE}📋 Diatonic-AI Tables with Item Counts:${NC}"
    for table in "${diatonic_tables[@]}"; do
        if [ -n "$table" ]; then
            local count=$(aws dynamodb scan --endpoint-url "$LOCAL_ENDPOINT" --table-name "$table" --select COUNT --query 'Count' --output text 2>/dev/null || echo "0")
            echo -e "  - ${GREEN}$table${NC}: $count items"
        fi
    done
    
    # Check table structure consistency
    echo -e "\n${BLUE}🏗️  Verifying table structures...${NC}"
    local structure_errors=0
    
    for table in "${diatonic_tables[@]}"; do
        if [ -n "$table" ]; then
            local status=$(aws dynamodb describe-table --endpoint-url "$LOCAL_ENDPOINT" --table-name "$table" --query 'Table.TableStatus' --output text 2>/dev/null || echo "ERROR")
            if [ "$status" != "ACTIVE" ]; then
                echo -e "${RED}❌ $table: Status is $status${NC}"
                ((structure_errors++))
            fi
        fi
    done
    
    if [ $structure_errors -eq 0 ]; then
        echo -e "${GREEN}✅ All tables have ACTIVE status${NC}"
    else
        echo -e "${RED}❌ Found $structure_errors tables with issues${NC}"
    fi
    
    # Verify key application tables exist
    local critical_tables=(
        "dev-diatonic-ai-dashboard-metrics"
        "dev-diatonic-ai-lab-experiments" 
        "dev-diatonic-ai-toolset-items"
        "diatonic-ai-development-content-features"
        "diatonic-ai-development-content-pages"
    )
    
    echo -e "\n${BLUE}🎯 Checking critical application tables...${NC}"
    local missing_critical=0
    
    for table in "${critical_tables[@]}"; do
        if aws dynamodb describe-table --endpoint-url "$LOCAL_ENDPOINT" --table-name "$table" >/dev/null 2>&1; then
            echo -e "  ${GREEN}✅ $table${NC}"
        else
            echo -e "  ${RED}❌ $table (MISSING)${NC}"
            ((missing_critical++))
        fi
    done
    
    if [ $missing_critical -eq 0 ]; then
        echo -e "\n${GREEN}🎉 Verification completed successfully!${NC}"
        echo -e "${GREEN}All critical tables are present and accessible.${NC}"
        return 0
    else
        echo -e "\n${RED}⚠️  Verification found $missing_critical missing critical tables${NC}"
        return 1
    fi
}

# Function to compare local vs AWS
compare_tables() {
    echo -e "${BLUE}🔍 Comparing Local vs AWS Tables${NC}"
    echo -e "${BLUE}================================${NC}"
    
    # Get AWS tables
    local aws_tables=($(aws dynamodb list-tables --region "$AWS_REGION" --query 'TableNames[]' --output text))
    
    # Get local tables
    local local_tables=($(aws dynamodb list-tables --endpoint-url "$LOCAL_ENDPOINT" --query 'TableNames[]' --output text))
    
    echo -e "${GREEN}📊 AWS Tables: ${#aws_tables[@]}${NC}"
    echo -e "${GREEN}📊 Local Tables: ${#local_tables[@]}${NC}"
    
    # Count by prefix
    local aws_ai_nexus=0
    local aws_devops=0
    local aws_workbench=0
    local local_diatonic=0
    local local_dev_diatonic=0
    
    if [ ${#aws_tables[@]} -gt 0 ] && [ -n "${aws_tables[0]}" ]; then
        aws_ai_nexus=$(printf '%s\n' "${aws_tables[@]}" | grep -c "^ai-nexus-dev-" 2>/dev/null | head -1 || echo 0)
        aws_devops=$(printf '%s\n' "${aws_tables[@]}" | grep -c "^aws-devops-dev-" 2>/dev/null | head -1 || echo 0)
        aws_workbench=$(printf '%s\n' "${aws_tables[@]}" | grep -c "^ai-nexus-workbench-development-" 2>/dev/null | head -1 || echo 0)
    fi
    
    if [ ${#local_tables[@]} -gt 0 ] && [ -n "${local_tables[0]}" ]; then
        local_diatonic=$(printf '%s\n' "${local_tables[@]}" | grep -c "^diatonic-ai-" 2>/dev/null | head -1 || echo 0)
        local_dev_diatonic=$(printf '%s\n' "${local_tables[@]}" | grep -c "^dev-diatonic-ai-" 2>/dev/null | head -1 || echo 0)
    fi
    
    # Ensure variables contain only digits
    aws_ai_nexus=${aws_ai_nexus//[^0-9]/}
    aws_devops=${aws_devops//[^0-9]/}
    aws_workbench=${aws_workbench//[^0-9]/}
    local_diatonic=${local_diatonic//[^0-9]/}
    local_dev_diatonic=${local_dev_diatonic//[^0-9]/}
    
    # Default to 0 if empty
    aws_ai_nexus=${aws_ai_nexus:-0}
    aws_devops=${aws_devops:-0}
    aws_workbench=${aws_workbench:-0}
    local_diatonic=${local_diatonic:-0}
    local_dev_diatonic=${local_dev_diatonic:-0}
    
    echo -e "\n${BLUE}📋 Table Count Breakdown:${NC}"
    echo -e "  AWS ai-nexus-dev-*: $aws_ai_nexus"
    echo -e "  AWS aws-devops-dev-*: $aws_devops"  
    echo -e "  AWS ai-nexus-workbench-development-*: $aws_workbench"
    echo -e "  Local diatonic-ai-*: $local_diatonic"
    echo -e "  Local dev-diatonic-ai-*: $local_dev_diatonic"
    
    local expected_migrated=$((aws_ai_nexus + aws_devops + aws_workbench))
    local actual_migrated=$((local_diatonic + local_dev_diatonic))
    
    echo -e "\n${BLUE}📊 Migration Status:${NC}"
    echo -e "  Expected migrated: $expected_migrated"
    echo -e "  Actual migrated: $actual_migrated"
    
    if [ $actual_migrated -ge $expected_migrated ]; then
        echo -e "  ${GREEN}✅ Migration appears complete${NC}"
    else
        echo -e "  ${YELLOW}⚠️  Some tables may not have been migrated${NC}"
    fi
}

# Function to rollback (delete diatonic tables)
rollback_migration() {
    echo -e "${RED}⚠️  ROLLBACK OPERATION${NC}"
    echo -e "${RED}=====================${NC}"
    echo -e "${YELLOW}This will delete ALL diatonic-ai prefixed tables from local DynamoDB!${NC}"
    echo -e "${YELLOW}Are you sure you want to proceed? (type 'yes' to confirm)${NC}"
    
    read -r confirmation
    if [ "$confirmation" != "yes" ]; then
        echo -e "${GREEN}Rollback cancelled.${NC}"
        exit 0
    fi
    
    # Get diatonic tables
    local diatonic_tables=($(aws dynamodb list-tables --endpoint-url "$LOCAL_ENDPOINT" --query 'TableNames[?starts_with(@, `diatonic-ai-`) || starts_with(@, `dev-diatonic-ai-`)]' --output text))
    
    echo -e "\n${BLUE}🗑️  Deleting ${#diatonic_tables[@]} diatonic tables...${NC}"
    
    local deleted_count=0
    for table in "${diatonic_tables[@]}"; do
        if [ -n "$table" ]; then
            echo "  Deleting $table..."
            aws dynamodb delete-table --endpoint-url "$LOCAL_ENDPOINT" --table-name "$table" >/dev/null
            ((deleted_count++))
        fi
    done
    
    echo -e "\n${GREEN}✅ Deleted $deleted_count tables${NC}"
    echo -e "${GREEN}Rollback completed successfully.${NC}"
}

# Function to sync tables back to AWS (DANGEROUS!)
sync_to_aws() {
    echo -e "${RED}⚠️  SYNC TO AWS OPERATION${NC}"
    echo -e "${RED}==========================${NC}"
    echo -e "${YELLOW}This will create/update tables in AWS production!${NC}"
    echo -e "${YELLOW}This operation can affect production data!${NC}"
    echo -e "${YELLOW}Are you absolutely sure? (type 'SYNC_TO_PRODUCTION' to confirm)${NC}"
    
    read -r confirmation
    if [ "$confirmation" != "SYNC_TO_PRODUCTION" ]; then
        echo -e "${GREEN}Sync cancelled for safety.${NC}"
        exit 0
    fi
    
    echo -e "\n${BLUE}🚀 Starting sync to AWS...${NC}"
    
    # Get local diatonic tables
    local local_tables=($(aws dynamodb list-tables --endpoint-url "$LOCAL_ENDPOINT" --query 'TableNames[?starts_with(@, `diatonic-ai-`) || starts_with(@, `dev-diatonic-ai-`)]' --output text))
    
    local synced_count=0
    local failed_count=0
    
    for table in "${local_tables[@]}"; do
        if [ -n "$table" ]; then
            echo -e "\n${BLUE}🔄 Syncing $table to AWS...${NC}"
            
            # Check if table exists in AWS
            if aws dynamodb describe-table --region "$AWS_REGION" --table-name "$table" >/dev/null 2>&1; then
                echo -e "${YELLOW}  Table already exists in AWS, skipping creation...${NC}"
            else
                echo -e "  Creating table in AWS..."
                
                # Get local table schema
                local local_schema=$(aws dynamodb describe-table --endpoint-url "$LOCAL_ENDPOINT" --table-name "$table" --query 'Table.{TableName:TableName,KeySchema:KeySchema,AttributeDefinitions:AttributeDefinitions,GlobalSecondaryIndexes:GlobalSecondaryIndexes,LocalSecondaryIndexes:LocalSecondaryIndexes}' --output json)
                
                # Create table in AWS (simplified, may need adjustment for production)
                echo "$local_schema" | jq '.BillingMode = "PAY_PER_REQUEST"' | aws dynamodb create-table --region "$AWS_REGION" --cli-input-json file:///dev/stdin >/dev/null
                
                # Wait for table to be active
                echo -e "  Waiting for table to become active..."
                aws dynamodb wait table-exists --region "$AWS_REGION" --table-name "$table"
            fi
            
            # Sync data (this is a simplified approach - production would need more sophisticated sync)
            echo -e "  Scanning local data..."
            local data_file="/tmp/${table}_sync.json"
            aws dynamodb scan --endpoint-url "$LOCAL_ENDPOINT" --table-name "$table" --output json > "$data_file"
            
            local item_count=$(jq '.Items | length' "$data_file")
            echo -e "  Found $item_count items to sync"
            
            if [ $item_count -gt 0 ]; then
                echo -e "  ${YELLOW}WARNING: Data sync not implemented in this script!${NC}"
                echo -e "  ${YELLOW}Manual data migration required for production safety.${NC}"
            fi
            
            rm -f "$data_file"
            ((synced_count++))
        fi
    done
    
    echo -e "\n${GREEN}✅ Sync completed: $synced_count tables processed${NC}"
    echo -e "${YELLOW}⚠️  Remember to verify data integrity in AWS!${NC}"
}

# Main execution
main() {
    local command="${1:-}"
    
    case "$command" in
        "verify")
            verify_local_tables
            ;;
        "compare")
            compare_tables
            ;;
        "rollback")
            rollback_migration
            ;;
        "sync-to-aws")
            sync_to_aws
            ;;
        *)
            show_usage
            ;;
    esac
}

main "$@"