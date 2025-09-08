#!/bin/bash

# ================================================================================
# Stripe Webhook Setup and Configuration Script
# Automatically configures Stripe webhooks after API Gateway deployment
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

ENVIRONMENT="${1:-dev}"
AWS_REGION="${AWS_REGION:-us-east-2}"
WEBHOOK_URL="${2:-}"

log "🎣 Setting up Stripe webhook configuration"
log "Environment: $ENVIRONMENT"

# ================================================================================
# GET API GATEWAY URL
# ================================================================================

get_api_gateway_url() {
    log "🔍 Looking for deployed API Gateway URL..."
    
    # Try to get from Terraform outputs first
    if command -v terraform >/dev/null 2>&1; then
        pushd "../infrastructure" >/dev/null 2>&1 || true
        
        local tf_output
        if tf_output=$(terraform output -raw stripe_webhook_url 2>/dev/null); then
            echo "$tf_output"
            popd >/dev/null 2>&1 || true
            return 0
        fi
        
        # Try main API invoke URL
        if tf_output=$(terraform output -raw main_api_invoke_url 2>/dev/null); then
            echo "${tf_output}/v1/webhooks/stripe"
            popd >/dev/null 2>&1 || true
            return 0
        fi
        
        popd >/dev/null 2>&1 || true
    fi
    
    # Try to find via AWS CLI
    log "📡 Searching for API Gateway via AWS CLI..."
    
    local api_id
    api_id=$(aws apigateway get-rest-apis \
        --query "items[?contains(name, 'ai-nexus-workbench') && contains(name, 'main-api')].id" \
        --output text \
        --region "$AWS_REGION" 2>/dev/null | head -1)
    
    if [[ -n "$api_id" && "$api_id" != "None" ]]; then
        local stage_name="$ENVIRONMENT"
        local api_url="https://${api_id}.execute-api.${AWS_REGION}.amazonaws.com/${stage_name}/v1/webhooks/stripe"
        echo "$api_url"
        return 0
    fi
    
    error "Could not determine API Gateway URL"
    echo "Please provide the webhook URL as second argument:"
    echo "  $0 $ENVIRONMENT https://your-api-gateway-url/v1/webhooks/stripe"
    return 1
}

# ================================================================================
# VERIFY WEBHOOK ENDPOINT
# ================================================================================

verify_webhook_endpoint() {
    local webhook_url="$1"
    
    log "🔍 Verifying webhook endpoint is accessible..."
    log "Testing: $webhook_url"
    
    # Test with health check endpoint first
    local health_url="${webhook_url%/webhooks/stripe}/webhooks/health"
    
    if curl -s -f -X GET "$health_url" -H "Accept: application/json" >/dev/null 2>&1; then
        success "✅ Webhook endpoint is accessible"
        return 0
    else
        warning "⚠️  Webhook endpoint health check failed, but continuing..."
        log "This might be expected if the Lambda hasn't been deployed yet"
        return 0
    fi
}

# ================================================================================
# CHECK EXISTING STRIPE WEBHOOKS
# ================================================================================

list_existing_webhooks() {
    log "📋 Checking existing Stripe webhooks..."
    
    local webhooks_json
    if webhooks_json=$(stripe webhooks list --format=json 2>/dev/null); then
        local webhook_count
        webhook_count=$(echo "$webhooks_json" | jq '.data | length')
        
        if [[ $webhook_count -gt 0 ]]; then
            log "Found $webhook_count existing webhook(s):"
            echo "$webhooks_json" | jq -r '.data[] | "  - \(.url) (\(.id)) - Status: \(.status)"'
            
            # Check if our URL already exists
            local existing_id
            existing_id=$(echo "$webhooks_json" | jq -r --arg url "$WEBHOOK_URL" '.data[] | select(.url == $url) | .id')
            
            if [[ -n "$existing_id" && "$existing_id" != "null" ]]; then
                warning "⚠️  Webhook already exists for this URL: $existing_id"
                echo "Do you want to:"
                echo "  1. Update existing webhook"
                echo "  2. Delete and recreate webhook"
                echo "  3. Skip webhook creation"
                
                read -p "Choose option (1-3): " -r choice
                case $choice in
                    1) return 1 ;; # Update existing
                    2) 
                        log "🗑️  Deleting existing webhook..."
                        stripe webhooks delete "$existing_id"
                        success "✅ Existing webhook deleted"
                        return 0 # Create new
                        ;;
                    3) return 2 ;; # Skip
                    *) return 0 ;; # Default: create new
                esac
            fi
        else
            log "No existing webhooks found"
        fi
    else
        warning "⚠️  Could not list existing webhooks"
    fi
    
    return 0
}

# ================================================================================
# CREATE STRIPE WEBHOOK
# ================================================================================

create_stripe_webhook() {
    local webhook_url="$1"
    
    log "🎣 Creating Stripe webhook endpoint..."
    log "URL: $webhook_url"
    
    # Define webhook events we want to listen for
    local webhook_events=(
        "customer.subscription.created"
        "customer.subscription.updated"
        "customer.subscription.deleted"
        "invoice.payment_succeeded"
        "invoice.payment_failed"
        "customer.created"
        "customer.updated"
        "checkout.session.completed"
        "setup_intent.succeeded"
        "setup_intent.canceled"
    )
    
    log "📡 Configuring webhook for ${#webhook_events[@]} event types"
    
    # Build events parameter for Stripe CLI
    local events_param=""
    for event in "${webhook_events[@]}"; do
        events_param+="--events $event "
    done
    
    # Create the webhook
    local webhook_result
    webhook_result=$(stripe webhooks create \
        --url "$webhook_url" \
        --description "AI Nexus Workbench - Billing & Subscription Events ($ENVIRONMENT)" \
        $events_param \
        --format=json)
    
    if [[ $? -eq 0 ]]; then
        local webhook_id
        local webhook_secret
        
        webhook_id=$(echo "$webhook_result" | jq -r '.id')
        webhook_secret=$(echo "$webhook_result" | jq -r '.secret')
        
        success "✅ Webhook created successfully!"
        log "   - Webhook ID: $webhook_id"
        log "   - Signing Secret: ${webhook_secret:0:15}..."
        
        # Update AWS Secrets Manager with the webhook secret
        update_webhook_secret "$webhook_secret"
        
        return 0
    else
        error "❌ Failed to create Stripe webhook"
        return 1
    fi
}

# ================================================================================
# UPDATE WEBHOOK SECRET IN AWS SECRETS MANAGER
# ================================================================================

update_webhook_secret() {
    local webhook_secret="$1"
    
    log "🔐 Updating webhook secret in AWS Secrets Manager..."
    
    # Use the existing update script
    if [[ -f "./update-webhook-secret.sh" ]]; then
        "./update-webhook-secret.sh" "$webhook_secret" "$ENVIRONMENT"
    else
        # Inline update if script not available
        aws secretsmanager put-secret-value \
            --secret-id "/ai-nexus/diatonicvisuals/stripe/webhook_signing_secret" \
            --secret-string "$webhook_secret" \
            --region "$AWS_REGION" >/dev/null
        
        success "✅ Webhook secret updated in AWS Secrets Manager"
    fi
}

# ================================================================================
# TEST WEBHOOK FUNCTIONALITY
# ================================================================================

test_webhook() {
    local webhook_url="$1"
    
    log "🧪 Testing webhook functionality..."
    
    # Send test event from Stripe
    log "📤 Sending test webhook event from Stripe..."
    
    if stripe events resend --webhook-endpoint "$webhook_url" evt_test_webhook 2>/dev/null; then
        success "✅ Test webhook sent successfully"
        log "💡 Check your CloudWatch logs to verify webhook processing"
        
        # Provide CloudWatch logs link
        local log_group_name="/aws/lambda/ai-nexus-workbench-$ENVIRONMENT-main-api"
        log "📊 CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups/log-group/${log_group_name//\//%2F}"
        
    else
        warning "⚠️  Could not send test webhook event"
        log "💡 You can manually test webhooks from the Stripe Dashboard"
    fi
}

# ================================================================================
# MAIN EXECUTION
# ================================================================================

main() {
    # Get webhook URL
    if [[ -z "$WEBHOOK_URL" ]]; then
        WEBHOOK_URL=$(get_api_gateway_url)
        if [[ $? -ne 0 ]]; then
            exit 1
        fi
    fi
    
    log "🎯 Using webhook URL: $WEBHOOK_URL"
    
    # Verify endpoint accessibility
    verify_webhook_endpoint "$WEBHOOK_URL"
    
    # Check existing webhooks
    local webhook_action=0
    list_existing_webhooks
    webhook_action=$?
    
    case $webhook_action in
        0)
            # Create new webhook
            create_stripe_webhook "$WEBHOOK_URL"
            ;;
        1)
            # Update existing webhook
            warning "⚠️  Webhook update not implemented yet"
            log "💡 Please delete existing webhook manually and run this script again"
            ;;
        2)
            # Skip webhook creation
            log "⏭️  Skipping webhook creation"
            ;;
    esac
    
    # Test webhook if created
    if [[ $webhook_action -eq 0 ]]; then
        test_webhook "$WEBHOOK_URL"
    fi
    
    # Final summary
    echo
    success "🎉 Stripe webhook setup completed!"
    echo
    log "📋 Summary:"
    echo "  - Environment: $ENVIRONMENT"
    echo "  - Webhook URL: $WEBHOOK_URL"
    echo "  - Webhook Secret: Updated in AWS Secrets Manager"
    echo
    log "🔗 Useful links:"
    echo "  - Stripe Webhooks: https://dashboard.stripe.com/webhooks"
    echo "  - API Gateway Console: https://console.aws.amazon.com/apigateway/"
    echo "  - CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/"
    echo
    log "🧪 Next steps:"
    echo "1. Test webhook processing by making a test transaction"
    echo "2. Monitor CloudWatch logs for webhook events"
    echo "3. Verify subscription events are handled correctly"
}

# Check dependencies
if ! command -v stripe >/dev/null 2>&1; then
    error "Stripe CLI not found. Please install: https://stripe.com/docs/stripe-cli"
    exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
    error "AWS CLI not found. Please install AWS CLI"
    exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
    error "jq not found. Please install jq"
    exit 1
fi

# Execute main function
main "$@"
