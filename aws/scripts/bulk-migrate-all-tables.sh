#!/usr/bin/env bash
# Complete Bulk DynamoDB Table Migration Script
set -euo pipefail

# Configuration
REGION="us-east-2"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Core table mappings for bulk migration
declare -A TABLE_MAPPINGS=(
    ["aws-devops-dev-users"]="diatonic-ai-dev-users"
    ["aws-devops-dev-user-sessions"]="diatonic-ai-dev-user-sessions"
    ["aws-devops-dev-agents"]="diatonic-ai-dev-agents"
    ["aws-devops-dev-projects"]="diatonic-ai-dev-projects"
    ["aws-devops-dev-workspaces"]="diatonic-ai-dev-workspaces"
    ["ai-nexus-dev-stripe-customers"]="diatonic-ai-dev-stripe-customers"
    ["ai-nexus-dev-stripe-invoices"]="diatonic-ai-dev-stripe-invoices"
    ["ai-nexus-dev-stripe-subscriptions"]="diatonic-ai-dev-stripe-subscriptions"
    ["ai-nexus-dev-stripe-idempotency"]="diatonic-ai-dev-stripe-idempotency"
    ["diatonic-ai-workbench-dev"]="diatonic-ai-dev-workbench-main"
)

table_exists() {
    aws dynamodb describe-table --table-name "$1" --region "$REGION" >/dev/null 2>&1
}

get_table_count() {
    aws dynamodb scan --table-name "$1" --select COUNT --region "$REGION" | jq -r '.Count'
}

# Dry run mode
if [[ "${1:-}" == "--dry-run" ]]; then
    log_info "DRY RUN - Tables that would be migrated:"
    for old_table in "${!TABLE_MAPPINGS[@]}"; do
        new_table="${TABLE_MAPPINGS[$old_table]}"
        if table_exists "$old_table"; then
            count=$(get_table_count "$old_table")
            echo "✅ $old_table → $new_table ($count items)"
        else
            echo "❌ $old_table → $new_table (not found)"
        fi
    done
    exit 0
fi

log_info "This would migrate ${#TABLE_MAPPINGS[@]} tables to diatonic-ai-dev-* naming"
log_warning "Run with --dry-run to see what would be migrated"
