#!/usr/bin/env bash
# Lambda Function Renaming Script - ai-nexus-dev to diatonic-ai-dev
set -euo pipefail

REGION="us-east-2"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# Function mapping
declare -A FUNCTION_MAPPINGS=(
    ["ai-nexus-dev-stripe-get-subscription-status"]="diatonic-ai-dev-stripe-get-subscription-status"
    ["ai-nexus-dev-stripe-update-subscription"]="diatonic-ai-dev-stripe-update-subscription"
    ["ai-nexus-dev-stripe-list-invoices"]="diatonic-ai-dev-stripe-list-invoices"
    ["ai-nexus-dev-stripe-cancel-subscription"]="diatonic-ai-dev-stripe-cancel-subscription"
    ["ai-nexus-dev-stripe-stripe-webhook-handler"]="diatonic-ai-dev-stripe-webhook-handler"
    ["ai-nexus-dev-stripe-create-checkout-session"]="diatonic-ai-dev-stripe-create-checkout-session"
    ["ai-nexus-dev-stripe-create-setup-intent"]="diatonic-ai-dev-stripe-create-setup-intent"
    ["ai-nexus-dev-stripe-create-portal-session"]="diatonic-ai-dev-stripe-create-portal-session"
)

# Dry run mode
if [[ "${1:-}" == "--dry-run" ]]; then
    log_info "DRY RUN - Functions that would be renamed:"
    for old_function in "${!FUNCTION_MAPPINGS[@]}"; do
        new_function="${FUNCTION_MAPPINGS[$old_function]}"
        echo "  $old_function → $new_function"
    done
    exit 0
fi

log_info "Lambda renaming script ready"
log_info "Total functions to rename: ${#FUNCTION_MAPPINGS[@]}"
echo "Run with --dry-run to see what would be renamed"
