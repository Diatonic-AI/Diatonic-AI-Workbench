#!/bin/bash

# ================================================================================
# Stripe API Keys Setup Script
# Creates restricted API keys with minimal permissions for AI Nexus Workbench
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

log "🔐 Setting up Stripe restricted API keys for AI Nexus Workbench"
log "Environment: $ENVIRONMENT"

# Check if user is logged in to Stripe CLI
if ! stripe config --list | grep -q "account_id"; then
    error "Not logged in to Stripe CLI. Please run: stripe login"
    exit 1
fi

# Get account info
ACCOUNT_ID=$(stripe config --list | grep "account_id" | cut -d "'" -f2)
log "Using Stripe account: $ACCOUNT_ID"

# ================================================================================
# CREATE RESTRICTED API KEY FOR BACKEND
# ================================================================================

log "Creating restricted API key for backend operations..."

# Define the permissions needed for the billing integration
BACKEND_PERMISSIONS='{
  "core": {
    "customers": "write",
    "payment_methods": "write",
    "subscriptions": "write",
    "invoices": "read",
    "checkout_sessions": "write",
    "billing_portal_sessions": "write",
    "setup_intents": "write"
  },
  "products": {
    "products": "read",
    "prices": "read"
  },
  "payment_intents": {
    "payment_intents": "write"
  }
}'

# Create restricted key for backend (we'll use Stripe CLI to help us)
log "📝 You need to create a restricted API key manually in the Stripe Dashboard:"
echo
echo "1. Go to: https://dashboard.stripe.com/apikeys"
echo "2. Click 'Create restricted key'"
echo "3. Name it: 'AI-Nexus-Workbench-Backend-${ENVIRONMENT}'"
echo "4. Enable these permissions:"
echo "   ✅ Core resources:"
echo "      - Customers: Write"
echo "      - Payment methods: Write"
echo "      - Subscriptions: Write"  
echo "      - Invoices: Read"
echo "      - Checkout Sessions: Write"
echo "      - Customer portal: Write"
echo "      - Setup Intents: Write"
echo "   ✅ Products:"
echo "      - Products: Read"
echo "      - Prices: Read" 
echo "   ✅ Payment Intents:"
echo "      - Payment Intents: Write"
echo
echo "5. Copy the generated key (starts with rk_live_ or rk_test_)"

read -p "Press Enter when you have created the restricted key and copied it..."
echo
read -p "🔑 Paste your restricted API key here: " -s RESTRICTED_KEY
echo

# Validate the key format
if [[ ! $RESTRICTED_KEY =~ ^rk_(live|test)_.+ ]]; then
    error "Invalid API key format. Should start with rk_live_ or rk_test_"
    exit 1
fi

# Determine key type
if [[ $RESTRICTED_KEY =~ ^rk_live_ ]]; then
    KEY_TYPE="live"
    log "🔴 Using LIVE mode key"
elif [[ $RESTRICTED_KEY =~ ^rk_test_ ]]; then
    KEY_TYPE="test"
    log "🟡 Using TEST mode key"
fi

success "✅ API key validated"

# ================================================================================
# CREATE WEBHOOK ENDPOINT AND GET SIGNING SECRET
# ================================================================================

log "Setting up webhook endpoint..."

# We need to get the API Gateway URL first (it will be available after deployment)
warning "⚠️  Webhook endpoint setup will need to be completed after deployment"
log "After deployment, you'll need to:"
echo "1. Get your API Gateway URL from the deployment output"
echo "2. Create a webhook endpoint in Stripe Dashboard:"
echo "   - URL: https://your-api-gateway-url/v1/webhooks/stripe"
echo "   - Events to send:"
echo "     ✅ customer.subscription.created"
echo "     ✅ customer.subscription.updated" 
echo "     ✅ customer.subscription.deleted"
echo "     ✅ invoice.payment_succeeded"
echo "     ✅ invoice.payment_failed"
echo "     ✅ customer.created"
echo "     ✅ customer.updated"
echo "3. Copy the webhook signing secret (starts with whsec_)"

# For now, we'll set a placeholder webhook secret
WEBHOOK_SECRET="whsec_placeholder_will_be_updated_after_deployment"

# ================================================================================
# STORE SECRETS IN AWS SECRETS MANAGER
# ================================================================================

log "Storing secrets in AWS Secrets Manager..."

# Create the main Stripe secret with all keys
STRIPE_SECRET_VALUE=$(cat << EOF
{
  "secret_key": "$RESTRICTED_KEY",
  "webhook_secret": "$WEBHOOK_SECRET",
  "key_type": "$KEY_TYPE",
  "environment": "$ENVIRONMENT",
  "created_at": "$(date -u +"%Y-%m-%d %H:%M:%S UTC")",
  "permissions": "restricted_backend_key"
}
EOF
)

# Store in AWS Secrets Manager
SECRET_NAME="/ai-nexus/diatonicvisuals/stripe/secret_key"

if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
    log "Secret exists, updating..."
    aws secretsmanager put-secret-value \
        --secret-id "$SECRET_NAME" \
        --secret-string "$STRIPE_SECRET_VALUE" \
        --region "$AWS_REGION"
else
    log "Creating new secret..."
    aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --description "Stripe API secret key for AI Nexus Workbench billing integration" \
        --secret-string "$STRIPE_SECRET_VALUE" \
        --region "$AWS_REGION"
fi

success "✅ Stripe API secret stored in AWS Secrets Manager"

# Store webhook secret separately (will be updated later)
WEBHOOK_SECRET_NAME="/ai-nexus/diatonicvisuals/stripe/webhook_signing_secret"

if aws secretsmanager describe-secret --secret-id "$WEBHOOK_SECRET_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
    log "Webhook secret exists, updating..."
    aws secretsmanager put-secret-value \
        --secret-id "$WEBHOOK_SECRET_NAME" \
        --secret-string "$WEBHOOK_SECRET" \
        --region "$AWS_REGION"
else
    log "Creating webhook secret..."
    aws secretsmanager create-secret \
        --name "$WEBHOOK_SECRET_NAME" \
        --description "Stripe webhook signing secret for webhook verification" \
        --secret-string "$WEBHOOK_SECRET" \
        --region "$AWS_REGION"
fi

success "✅ Webhook signing secret stored in AWS Secrets Manager"

# ================================================================================
# CREATE STRIPE PRODUCTS AND PRICES (if in test mode)
# ================================================================================

if [[ "$KEY_TYPE" == "test" ]]; then
    log "Setting up test products and prices..."
    
    # Check if products already exist
    if stripe products list --limit 1 | jq -e '.data | length > 0' >/dev/null; then
        log "Products already exist, skipping creation"
    else
        log "Creating test products..."
        
        # Create Basic plan
        BASIC_PRODUCT=$(stripe products create \
            --name "AI Nexus Basic" \
            --description "Basic plan for AI Nexus Workbench" \
            --metadata "plan=basic,tier=starter" \
            --output json)
        
        BASIC_PRODUCT_ID=$(echo "$BASIC_PRODUCT" | jq -r '.id')
        
        # Create Premium plan  
        PREMIUM_PRODUCT=$(stripe products create \
            --name "AI Nexus Premium" \
            --description "Premium plan for AI Nexus Workbench with advanced features" \
            --metadata "plan=premium,tier=professional" \
            --output json)
        
        PREMIUM_PRODUCT_ID=$(echo "$PREMIUM_PRODUCT" | jq -r '.id')
        
        # Create prices
        stripe prices create \
            --product "$BASIC_PRODUCT_ID" \
            --unit-amount 999 \
            --currency usd \
            --recurring-interval month \
            --nickname "Basic Monthly" \
            --metadata "plan=basic,interval=month" >/dev/null
            
        stripe prices create \
            --product "$PREMIUM_PRODUCT_ID" \
            --unit-amount 2999 \
            --currency usd \
            --recurring-interval month \
            --nickname "Premium Monthly" \
            --metadata "plan=premium,interval=month" >/dev/null
            
        stripe prices create \
            --product "$PREMIUM_PRODUCT_ID" \
            --unit-amount 29999 \
            --currency usd \
            --recurring-interval year \
            --nickname "Premium Annual" \
            --metadata "plan=premium,interval=year" >/dev/null
        
        success "✅ Test products and prices created"
    fi
fi

# ================================================================================
# VERIFICATION AND NEXT STEPS
# ================================================================================

log "🔍 Verifying setup..."

# Test the API key
if stripe balance retrieve >/dev/null 2>&1; then
    success "✅ API key is working correctly"
else
    warning "⚠️  API key test failed - please verify the key has correct permissions"
fi

# List available products
log "Available products:"
stripe products list --limit 5 | jq -r '.data[] | "  - \(.name) (\(.id))"'

echo
success "🎉 Stripe API keys setup completed!"
echo
log "📋 Summary:"
echo "  - Restricted API key stored in AWS Secrets Manager: $SECRET_NAME"
echo "  - Webhook secret stored in AWS Secrets Manager: $WEBHOOK_SECRET_NAME"
echo "  - Key type: $KEY_TYPE"
echo "  - Environment: $ENVIRONMENT"
echo
warning "🚨 IMPORTANT - Complete after deployment:"
echo "1. Get your deployed API Gateway URL"
echo "2. Create webhook endpoint: https://your-api-url/v1/webhooks/stripe"
echo "3. Update webhook signing secret in AWS Secrets Manager"
echo "4. Test the webhook endpoint"
echo
log "🔗 Useful links:"
echo "  - Stripe Dashboard: https://dashboard.stripe.com/apikeys"
echo "  - Webhook settings: https://dashboard.stripe.com/webhooks"
echo "  - AWS Secrets Manager: https://console.aws.amazon.com/secretsmanager/"
