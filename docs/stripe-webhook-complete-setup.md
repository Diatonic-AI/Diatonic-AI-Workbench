# 🎯 Stripe Webhook Complete Setup Guide

**Status:** Ready for Infrastructure Deployment  
**Updated:** 2025-09-08 05:10 UTC

## 📋 What We've Accomplished

### ✅ Stripe Configuration
- **API Key:** Restricted live key installed in test mode ✅
- **Products Created:** AI Nexus Basic ($9.99/mo) & Premium ($29.99/mo, $299.99/yr) ✅
- **Secrets Manager:** Configured with API key and webhook placeholder ✅

### ✅ Lambda Code Ready
- **Webhook Handler:** Complete TypeScript implementation ✅
  - Located: `/lambda/api/handlers/webhooks.ts`
  - Supports: All Stripe events (subscription, payment, customer)
  - Features: Signature verification, event logging, tenant management

- **API Router:** Comprehensive routing system ✅
  - Route: `POST /v1/webhooks/stripe` (no auth required)
  - Handler: `webhookHandlers.handleStripeWebhook`
  - CORS: Properly configured for webhook calls

### ✅ Infrastructure Code Ready
- **Main API Lambda:** Terraform configuration created ✅
  - File: `infrastructure/main-api-lambda.tf`
  - Runtime: Node.js 18.x with TypeScript support
  - Permissions: DynamoDB, Secrets Manager, EventBridge, S3

- **API Gateway:** Full proxy configuration ✅
  - Catch-all routing with `{proxy+}` pattern
  - CORS support for all origins
  - CloudWatch logging enabled

### ✅ Automation Scripts
- **Webhook Setup:** `scripts/setup-stripe-webhook.sh` ✅
- **Secret Management:** `scripts/update-webhook-secret.sh` ✅
- **Deployment Ready:** All components integrated

## 🚀 Next Steps Required

### Step 1: Deploy Infrastructure
```bash
cd infrastructure/
terraform plan
terraform apply
```

This will create:
- Main API Lambda function with your webhook code
- API Gateway with webhook endpoints
- All required IAM roles and permissions

### Step 2: Get Webhook URL
After deployment, Terraform will output the webhook URL:
```bash
terraform output stripe_webhook_url
# Example: https://abc123.execute-api.us-east-2.amazonaws.com/dev/v1/webhooks/stripe
```

### Step 3: Configure Stripe Webhook
Run the automated setup script:
```bash
cd scripts/
./setup-stripe-webhook.sh dev
```

This will:
- Auto-detect your deployed API Gateway URL
- Create Stripe webhook endpoint
- Configure all required events
- Update webhook signing secret in AWS Secrets Manager

### Step 4: Test Webhook
```bash
# Test webhook processing
curl -X GET https://your-api-url/v1/webhooks/health

# Check CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/ai-nexus-workbench"
```

## 🎯 Current Webhook Configuration

### Supported Events
Your webhook handler supports these Stripe events:

**Subscription Events:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**Payment Events:**
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Customer Events:**
- `customer.created`
- `customer.updated`

**Additional Events (ready to configure):**
- `checkout.session.completed`
- `setup_intent.succeeded`
- `setup_intent.canceled`

### Database Integration
Webhook events will be stored in DynamoDB:
- **Tenant Updates:** Subscription status, billing info
- **Payment Records:** Successful/failed payments with metadata
- **Event Logs:** Complete webhook event audit trail
- **Domain Events:** Published to EventBridge for downstream processing

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│ Stripe Webhook  │───▶│  API Gateway    │───▶│ Main API Lambda │
│                 │    │ /v1/webhooks/   │    │ (webhook handler)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   DynamoDB      │◀───│ Secrets Manager │    │   EventBridge   │
│ (tenant data)   │    │ (webhook secret)│    │ (domain events) │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Manual Configuration (If Needed)

If you prefer to set up webhooks manually:

### 1. Create Webhook in Stripe Dashboard
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://your-api-gateway-url/v1/webhooks/stripe`
4. Events: Select events listed above
5. Copy signing secret (starts with `whsec_`)

### 2. Update Webhook Secret
```bash
./scripts/update-webhook-secret.sh whsec_YOUR_SECRET_HERE dev
```

## 🧪 Testing Your Setup

### Test Webhook Endpoint
```bash
# Health check
curl https://your-api-url/v1/webhooks/health

# Expected response:
{
  "status": "healthy",
  "service": "ai-nexus-workbench-webhooks",
  "timestamp": "2025-09-08T05:10:00Z"
}
```

### Test Stripe Integration
1. Create test subscription using Stripe test card: `4242 4242 4242 4242`
2. Monitor CloudWatch logs for webhook events
3. Verify DynamoDB updates for tenant billing status

### CloudWatch Logs Location
- **Log Group:** `/aws/lambda/ai-nexus-workbench-dev-main-api`
- **API Gateway Logs:** `/aws/apigateway/ai-nexus-workbench-dev-main-api`

## 🚨 Troubleshooting

### Common Issues

**Webhook Signature Verification Fails:**
- Ensure webhook secret is correctly stored in Secrets Manager
- Check that Lambda has permission to read secrets
- Verify Stripe CLI is in test mode matching your account

**Lambda Function Not Found:**
- Verify Terraform deployment completed successfully
- Check Lambda function exists: `aws lambda list-functions --query 'Functions[?contains(FunctionName, `main-api`)]'`

**API Gateway 502 Errors:**
- Check Lambda execution role has all required permissions
- Verify Node.js dependencies are included in deployment package
- Review CloudWatch logs for Lambda errors

**DynamoDB Access Denied:**
- Confirm Lambda execution role has DynamoDB permissions
- Verify table names match environment variables

## 📊 Monitoring & Observability

### CloudWatch Metrics to Monitor
- **API Gateway:** Request count, latency, errors
- **Lambda:** Duration, errors, throttles
- **DynamoDB:** Read/write capacity, throttles

### Alarms to Set Up
- Webhook failure rate > 5%
- Lambda error rate > 1%
- API Gateway 4xx/5xx errors

---

## 🎯 Summary Status

| Component | Status | Notes |
|-----------|--------|-------|
| Stripe API Keys | ✅ Ready | Test mode, restricted permissions |
| Stripe Products | ✅ Ready | Basic & Premium plans configured |
| Lambda Code | ✅ Ready | TypeScript webhook handlers complete |
| Infrastructure | 🟡 Pending | Terraform files ready for deployment |
| Webhook Config | 🟡 Pending | Automated script ready |
| Testing | 🔵 Todo | After infrastructure deployment |

**Next Action:** Run `terraform apply` to deploy infrastructure, then run webhook setup script.

Your Stripe integration is architecturally complete and ready for deployment! 🚀
