#!/bin/bash

# ================================================================================
# Stripe Webhook Secret Update Script
# Updates the webhook signing secret in AWS Secrets Manager after deployment
# ================================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check arguments
if [[ $# -lt 1 ]]; then
    error "Usage: $0 <webhook_signing_secret> [environment]"
    echo
    log "Example: $0 whsec_1234567890abcdef dev"
    exit 1
fi

WEBHOOK_SECRET="$1"
ENVIRONMENT="${2:-dev}"
AWS_REGION="${AWS_REGION:-us-east-2}"

# Validate webhook secret format
if [[ ! $WEBHOOK_SECRET =~ ^whsec_.+ ]]; then
    error "Invalid webhook secret format. Should start with 'whsec_'"
    exit 1
fi

log "🔐 Updating Stripe webhook signing secret"
log "Environment: $ENVIRONMENT"
log "Secret: ${WEBHOOK_SECRET:0:15}..."

# Update both secrets in AWS Secrets Manager
SECRET_NAME="/ai-nexus/diatonicvisuals/stripe/secret_key"
WEBHOOK_SECRET_NAME="/ai-nexus/diatonicvisuals/stripe/webhook_signing_secret"

# Get the existing main secret and update it
log "Updating main Stripe secret with webhook secret..."

# Get current secret value
if CURRENT_SECRET=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null); then
    # Parse current secret and update webhook_secret field
    UPDATED_SECRET=$(echo "$CURRENT_SECRET" | jq --arg webhook "$WEBHOOK_SECRET" '.webhook_secret = $webhook | .updated_at = (now | strftime("%Y-%m-%d %H:%M:%S UTC"))')
    
    # Update the secret
    aws secretsmanager put-secret-value \
        --secret-id "$SECRET_NAME" \
        --secret-string "$UPDATED_SECRET" \
        --region "$AWS_REGION"
        
    success "✅ Main Stripe secret updated"
else
    error "Failed to retrieve existing secret. Make sure you've run setup-stripe-keys.sh first"
    exit 1
fi

# Update the separate webhook secret
log "Updating webhook signing secret..."

aws secretsmanager put-secret-value \
    --secret-id "$WEBHOOK_SECRET_NAME" \
    --secret-string "$WEBHOOK_SECRET" \
    --region "$AWS_REGION"

success "✅ Webhook signing secret updated"

# Verify the update
log "🔍 Verifying secret update..."

if VERIFY_SECRET=$(aws secretsmanager get-secret-value --secret-id "$WEBHOOK_SECRET_NAME" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null); then
    if [[ "$VERIFY_SECRET" == "$WEBHOOK_SECRET" ]]; then
        success "✅ Secret verification successful"
    else
        error "Secret verification failed"
        exit 1
    fi
else
    error "Failed to verify secret update"
    exit 1
fi

echo
success "🎉 Webhook secret update completed!"
echo
log "📋 Next steps:"
echo "1. Test your webhook endpoint at: https://your-api-gateway-url/v1/webhooks/stripe"
echo "2. Send a test event from Stripe Dashboard to verify webhook processing"
echo "3. Monitor CloudWatch logs for webhook events"
echo
log "🔗 Useful links:"
echo "  - Stripe Webhooks: https://dashboard.stripe.com/webhooks"
echo "  - AWS Secrets Manager: https://console.aws.amazon.com/secretsmanager/"
echo "  - CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/"
