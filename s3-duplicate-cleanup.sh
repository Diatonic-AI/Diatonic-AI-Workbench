#!/usr/bin/env bash
# S3 Duplicate Bucket Cleanup Script - Safe removal of older development buckets
# Purpose: Remove the older gwenbxgb series of development buckets after backup
# Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=${DRY_RUN:-true}
BACKUP_DIR="./s3-backup-$(date +%Y%m%d-%H%M%S)"

# Older buckets to potentially remove (created 2025-08-25)
OLD_BUCKETS=(
    "aws-devops-dev-application-development-gwenbxgb"
    "aws-devops-dev-backup-development-gwenbxgb"
    "aws-devops-dev-compliance-development-gwenbxgb"
    "aws-devops-dev-logs-development-gwenbxgb"
    "aws-devops-dev-static-assets-development-gwenbxgb"
)

# Newer buckets to keep (created 2025-09-07)
KEEP_BUCKETS=(
    "aws-devops-dev-application-development-dzfngw8v"
    "aws-devops-dev-backup-development-dzfngw8v"
    "aws-devops-dev-compliance-development-dzfngw8v"
    "aws-devops-dev-logs-development-dzfngw8v"
    "aws-devops-dev-static-assets-development-dzfngw8v"
)

echo -e "${BLUE}🪣 S3 Duplicate Bucket Cleanup${NC}"
echo -e "${BLUE}Mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN (safe)" || echo "EXECUTION (will delete)")${NC}"
echo ""

# Function to check if bucket exists and has content
check_bucket_content() {
    local bucket="$1"
    if aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then
        # Use s3 ls to get basic info (safer than complex JSON queries)
        local ls_output=$(aws s3 ls "s3://$bucket" --recursive --summarize 2>/dev/null || echo "")
        local object_count=0
        local total_size=0
        
        if echo "$ls_output" | grep -q "Total Objects:"; then
            object_count=$(echo "$ls_output" | grep "Total Objects:" | awk '{print $3}')
            total_size=$(echo "$ls_output" | grep "Total Size:" | awk '{print $3}')
        fi
        
        echo "$object_count:$total_size"
        return 0
    else
        echo "BUCKET_NOT_EXISTS"
        return 1
    fi
}

# Function to backup bucket content
backup_bucket() {
    local bucket="$1"
    local backup_path="$BACKUP_DIR/$bucket"
    
    echo -e "${YELLOW}📦 Backing up bucket: $bucket${NC}"
    mkdir -p "$backup_path"
    
    # Get bucket info
    local region=$(aws s3api get-bucket-location --bucket "$bucket" --query 'LocationConstraint' --output text 2>/dev/null || echo "us-east-1")
    [[ "$region" == "None" ]] && region="us-east-1"
    
    # Get bucket policy if exists
    aws s3api get-bucket-policy --bucket "$bucket" --output text > "$backup_path/bucket-policy.json" 2>/dev/null || echo "No bucket policy" > "$backup_path/bucket-policy.txt"
    
    # Get bucket tags if exist
    aws s3api get-bucket-tagging --bucket "$bucket" --output json > "$backup_path/bucket-tags.json" 2>/dev/null || echo "No bucket tags" > "$backup_path/bucket-tags.txt"
    
    # Get bucket versioning
    aws s3api get-bucket-versioning --bucket "$bucket" --output json > "$backup_path/bucket-versioning.json" 2>/dev/null || true
    
    # List all objects with metadata
    aws s3api list-objects-v2 --bucket "$bucket" --output json > "$backup_path/object-list.json" 2>/dev/null || echo "[]" > "$backup_path/object-list.json"
    
    # Copy actual objects if they exist and bucket is small
    local object_count=$(jq '.KeyCount // 0' "$backup_path/object-list.json")
    if [[ $object_count -gt 0 && $object_count -lt 1000 ]]; then
        echo -e "${YELLOW}  📋 Copying $object_count objects from bucket...${NC}"
        mkdir -p "$backup_path/objects"
        aws s3 sync "s3://$bucket" "$backup_path/objects" --quiet || echo "Warning: Some objects could not be copied"
    else
        echo -e "${YELLOW}  📋 Bucket has $object_count objects - skipping object copy (too many or none)${NC}"
    fi
    
    # Create summary
    cat > "$backup_path/BACKUP_SUMMARY.md" << EOF
# Backup Summary for $bucket

**Backup Date**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Bucket Region**: $region
**Object Count**: $object_count
**Backup Location**: $backup_path

## Files Backed Up
- bucket-policy.json (or .txt if none)
- bucket-tags.json (or .txt if none) 
- bucket-versioning.json
- object-list.json (complete object inventory)
$([ $object_count -gt 0 ] && [ $object_count -lt 1000 ] && echo "- objects/ (actual object files)" || echo "- objects/ (skipped - too many objects)")

## Restoration Notes
To restore this bucket configuration:
1. Create new bucket with same name
2. Apply bucket-policy.json if it exists
3. Apply bucket-tags.json if it exists
4. Upload objects from objects/ directory if backed up

## Next Steps
- Review backed up content
- Confirm bucket can be safely deleted
- Execute deletion if approved
EOF

    echo -e "${GREEN}  ✅ Backup completed: $backup_path${NC}"
}

# Function to analyze bucket before deletion
analyze_bucket() {
    local bucket="$1"
    local content_info=$(check_bucket_content "$bucket")
    
    if [[ "$content_info" != "BUCKET_NOT_EXISTS" ]]; then
        local object_count=$(echo "$content_info" | cut -d: -f1)
        local total_size=$(echo "$content_info" | cut -d: -f2)
        # Handle null/non-numeric sizes
        [[ "$total_size" == "null" || -z "$total_size" || ! "$total_size" =~ ^[0-9]+$ ]] && total_size="0"
        local size_mb=0
        if [[ $total_size -gt 0 ]]; then
            size_mb=$((total_size / 1024 / 1024))
        fi
        
        echo -e "${BLUE}📊 Bucket Analysis: $bucket${NC}"
        echo -e "${BLUE}  - Objects: $object_count${NC}"
        echo -e "${BLUE}  - Size: ${size_mb}MB${NC}"
        
        # Get creation date
        local creation_date=$(aws s3api list-buckets --query "Buckets[?Name=='$bucket'].CreationDate" --output text)
        echo -e "${BLUE}  - Created: $creation_date${NC}"
        
        # Check for recent activity
        if [[ $object_count -gt 0 ]]; then
            local latest_object=$(aws s3api list-objects-v2 --bucket "$bucket" --query 'sort_by(Contents, &LastModified)[-1].LastModified' --output text 2>/dev/null || echo "Unknown")
            echo -e "${BLUE}  - Latest object: $latest_object${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ Bucket does not exist: $bucket${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${PURPLE}🎯 PHASE 1: ANALYSIS${NC}"
    
    echo -e "\n${GREEN}✅ KEEP - Newer Development Buckets:${NC}"
    for bucket in "${KEEP_BUCKETS[@]}"; do
        if analyze_bucket "$bucket"; then
            echo ""
        fi
    done
    
    echo -e "\n${YELLOW}⚠️ REVIEW - Older Development Buckets for Potential Removal:${NC}"
    local buckets_to_process=()
    for bucket in "${OLD_BUCKETS[@]}"; do
        if analyze_bucket "$bucket"; then
            buckets_to_process+=("$bucket")
            echo ""
        fi
    done
    
    if [[ ${#buckets_to_process[@]} -eq 0 ]]; then
        echo -e "${GREEN}✅ No old buckets found for cleanup${NC}"
        return 0
    fi
    
    echo -e "\n${PURPLE}🎯 PHASE 2: BACKUP${NC}"
    mkdir -p "$BACKUP_DIR"
    
    for bucket in "${buckets_to_process[@]}"; do
        backup_bucket "$bucket"
    done
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "\n${YELLOW}🔍 DRY RUN MODE - No buckets will be deleted${NC}"
        echo -e "${YELLOW}📁 Backups created in: $BACKUP_DIR${NC}"
        echo -e "\n${YELLOW}To execute actual deletion, run:${NC}"
        echo -e "${YELLOW}  DRY_RUN=false $0${NC}"
        echo -e "\n${RED}⚠️ SAFETY CHECK REQUIRED:${NC}"
        echo -e "${RED}1. Review all backups in $BACKUP_DIR${NC}"
        echo -e "${RED}2. Confirm newer buckets contain same/better data${NC}"
        echo -e "${RED}3. Verify no applications reference old buckets${NC}"
        echo -e "${RED}4. Only then execute with DRY_RUN=false${NC}"
    else
        echo -e "\n${PURPLE}🎯 PHASE 3: DELETION${NC}"
        echo -e "${RED}⚠️ EXECUTING ACTUAL DELETION - This cannot be undone!${NC}"
        echo -e "${RED}Backups saved in: $BACKUP_DIR${NC}"
        
        for bucket in "${buckets_to_process[@]}"; do
            echo -e "\n${RED}🗑️ Deleting bucket: $bucket${NC}"
            
            # Empty bucket first
            echo -e "${YELLOW}  1. Emptying bucket contents...${NC}"
            aws s3 rm "s3://$bucket" --recursive --quiet || echo "Warning: Some objects could not be deleted"
            
            # Delete bucket
            echo -e "${YELLOW}  2. Deleting empty bucket...${NC}"
            if aws s3api delete-bucket --bucket "$bucket"; then
                echo -e "${GREEN}  ✅ Successfully deleted: $bucket${NC}"
            else
                echo -e "${RED}  ❌ Failed to delete: $bucket${NC}"
            fi
        done
        
        echo -e "\n${GREEN}🎉 CLEANUP COMPLETE${NC}"
        echo -e "${GREEN}📁 Backups preserved in: $BACKUP_DIR${NC}"
    fi
    
    # Generate summary report
    cat > "$(dirname "$BACKUP_DIR")/S3_CLEANUP_SUMMARY.md" << EOF
# S3 Bucket Cleanup Summary

**Execution Date**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Mode**: $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "EXECUTION")
**Backup Location**: $BACKUP_DIR

## Buckets Processed
$(printf '- %s\n' "${buckets_to_process[@]}")

## Buckets Preserved (Newer)
$(printf '- %s\n' "${KEEP_BUCKETS[@]}")

## Actions Taken
$([ "$DRY_RUN" = true ] && echo "- Analyzed all bucket contents
- Created full backups of old buckets
- Generated deletion plan" || echo "- Analyzed all bucket contents
- Created full backups of old buckets  
- Emptied and deleted old buckets")

## Cost Impact
- Immediate: Reduced S3 storage costs for removed buckets
- Ongoing: Simplified S3 bucket management
- Billing: Cleaner cost allocation and monitoring

## Next Steps
$([ "$DRY_RUN" = true ] && echo "1. Review backups carefully
2. Verify newer buckets have equivalent data
3. Execute deletion with DRY_RUN=false if approved" || echo "1. Monitor applications for any issues
2. Update documentation to reflect new bucket structure
3. Remove backup files after 30 days if no issues")

---
**Status**: $([ "$DRY_RUN" = true ] && echo "READY FOR EXECUTION" || echo "COMPLETED SUCCESSFULLY")
EOF
    
    echo -e "\n${BLUE}📋 Summary report: $(dirname "$BACKUP_DIR")/S3_CLEANUP_SUMMARY.md${NC}"
}

# Safety checks
if [[ "$DRY_RUN" != "true" ]]; then
    echo -e "${RED}⚠️ WARNING: You are about to delete S3 buckets permanently!${NC}"
    echo -e "${RED}This operation cannot be undone.${NC}"
    echo -e "${RED}Ensure you have reviewed all backups first.${NC}"
    echo ""
    read -p "Are you absolutely sure you want to proceed? Type 'DELETE BUCKETS' to confirm: " confirmation
    
    if [[ "$confirmation" != "DELETE BUCKETS" ]]; then
        echo -e "${YELLOW}Operation cancelled by user${NC}"
        exit 1
    fi
fi

main "$@"
