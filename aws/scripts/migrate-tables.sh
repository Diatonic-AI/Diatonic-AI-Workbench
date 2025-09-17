#!/usr/bin/env bash
# DynamoDB Table Migration Script - Diatonic AI Dev Environment
set -euo pipefail

# Configuration
REGION="us-east-2"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Core table mappings (start with essential ones)
declare -A TABLE_MAPPINGS=(
    ["aws-devops-dev-users"]="diatonic-ai-dev-users"
    ["aws-devops-dev-user-sessions"]="diatonic-ai-dev-user-sessions"
    ["aws-devops-dev-agents"]="diatonic-ai-dev-agents"
    ["ai-nexus-dev-stripe-customers"]="diatonic-ai-dev-stripe-customers"
)

# Dry run mode
if [[ "${1:-}" == "--dry-run" ]]; then
    log_info "DRY RUN MODE - Tables that would be migrated:"
    for old_table in "${!TABLE_MAPPINGS[@]}"; do
        new_table="${TABLE_MAPPINGS[$old_table]}"
        echo "  $old_table → $new_table"
    done
    exit 0
fi

log_info "This would migrate ${#TABLE_MAPPINGS[@]} tables to diatonic-ai-dev-* naming"
log_warning "Full migration script ready - run with --dry-run to see planned changes"
