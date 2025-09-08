# Stripe Restricted API Key Permissions

## For AI Nexus Workbench Backend Integration

### ✅ ENABLE These Permissions:

**Core Resources:**
- [x] Customers - Write
- [x] Payment Methods - Write  
- [x] Payment Intents - Write
- [x] Setup Intents - Write
- [x] Products - Read
- [x] Events - Read

**Checkout:**
- [x] Checkout Sessions - Write

**Billing:**
- [x] Subscriptions - Write
- [x] Invoices - Read
- [x] Customer portal - Write
- [x] Prices - Read
- [x] Coupons - Read (optional, for discounts)

**Webhook:**
- [x] Webhook Endpoints - Read

### ❌ LEAVE DISABLED (Security):

- Balance, Balance Transfers, Payouts
- Disputes, Chargebacks
- Files, Tokens, Sources
- Connect features
- Issuing, Terminal
- Reporting, Sigma
- Tax features
- Climate, Radar
- All other permissions not listed above

## Setup Instructions

1. Go to: https://dashboard.stripe.com/apikeys
2. Click "Create restricted key"
3. Name it: `AI-Nexus-Workbench-Backend-dev`
4. Enable ONLY the permissions listed above
5. Copy the generated key (starts with `rk_test_` or `rk_live_`)
6. Run the setup script and paste the key when prompted

## Key Format Examples

- Test key: `rk_test_51ABC...`
- Live key: `rk_live_51ABC...`

## Security Notes

- This key has minimal permissions needed for billing operations
- Never commit this key to version control
- Store only in AWS Secrets Manager
- Rotate keys regularly (every 6 months recommended)
