# Stripe Partner Event Sources Configuration

This document explains how to enable and configure Stripe Partner Event Sources for direct EventBridge integration with Diatonic AI.

## Overview

Stripe Partner Event Sources provide a direct integration between Stripe and AWS EventBridge, bypassing the need for webhooks. This offers several advantages:

- **Lower latency**: Events are delivered directly to EventBridge
- **Higher reliability**: No webhook endpoint to maintain or scale
- **Better security**: No need to expose public webhook endpoints
- **Dual payload support**: Both "snapshot" and "thin" payloads available

## Prerequisites

1. **Stripe Account**: Business or higher tier account with EventBridge integration enabled
2. **AWS EventBridge**: Custom event bus deployed (`ai-nexus-dev-stripe-event-bus`)
3. **Partner Event Destinations**: Configured in Stripe Dashboard

## Setup Process

### Step 1: Configure Stripe Event Destinations

In the Stripe Dashboard:

1. Navigate to **Developers** > **Webhooks**
2. Click **Add Amazon EventBridge destination**
3. Configure two destinations:

   **Snapshot Payload Destination:**
   - **AWS Account ID**: `313476888312`
   - **AWS Region**: `us-east-2`
   - **Name**: `AI Nexus Dev - Snapshot Events`
   - **Description**: `Full event data for comprehensive processing`
   - **Payload Style**: `Snapshot`

   **Thin Payload Destination:**
   - **AWS Account ID**: `313476888312`
   - **AWS Region**: `us-east-2`
   - **Name**: `AI Nexus Dev - Thin Events`
   - **Description**: `Minimal event data for fast processing`
   - **Payload Style**: `Thin`

### Step 2: Associate Partner Event Sources in AWS

After Stripe creates the event destinations, AWS will have pending partner event sources:

1. Open **AWS EventBridge Console**
2. Navigate to **Partner event sources**
3. Find sources matching pattern: `aws.partner/stripe.com/ed_*`
4. Associate each source with the event bus: `ai-nexus-dev-stripe-event-bus`

### Step 3: Enable Partner Events in Terraform

Update your Terraform configuration:

```hcl
# In your dev environment terraform.tfvars or variables
enable_stripe_partner_events = true
stripe_partner_event_source_name = "aws.partner/stripe.com/ed_YOUR_DESTINATION_ID"
```

**Note**: Replace `ed_YOUR_DESTINATION_ID` with the actual destination ID from Stripe.

### Step 4: Apply Terraform Changes

```bash
terraform plan   # Review the changes
terraform apply  # Apply partner event rules
```

## Event Patterns

### Webhook Events vs Partner Events

**Webhook Events:**
- Source: `stripe.webhook`
- Detail-Type: `Stripe Webhook Event`
- Processed through Lambda webhook handler

**Partner Events:**
- Source: `aws.partner/stripe.com/ed_*`
- Detail-Type: `Stripe Event`
- Processed directly by EventBridge rules

## Payload Differences

### Snapshot Payload
```json
{
  "version": "0",
  "id": "event-id",
  "detail-type": "Stripe Event",
  "source": "aws.partner/stripe.com/ed_snapshot_id",
  "detail": {
    "id": "evt_1234567890",
    "type": "customer.subscription.created",
    "data": {
      "object": {
        "id": "sub_1234567890",
        "customer": "cus_1234567890",
        // Complete subscription object with all fields
        "status": "active",
        "current_period_start": 1640995200,
        "current_period_end": 1643673600,
        // ... full object data
      }
    },
    "created": 1640995200,
    "livemode": false,
    "pending_webhooks": 1,
    "request": {
      "id": "req_1234567890",
      "idempotency_key": null
    }
  }
}
```

### Thin Payload
```json
{
  "version": "0",
  "id": "event-id", 
  "detail-type": "Stripe Event",
  "source": "aws.partner/stripe.com/ed_thin_id",
  "detail": {
    "id": "evt_1234567890",
    "type": "customer.subscription.created",
    "data": {
      "object": {
        "id": "sub_1234567890",
        "object": "subscription"
        // Minimal object data - use Stripe API to fetch full details
      }
    },
    "created": 1640995200,
    "livemode": false
  }
}
```

## Event Processing

### Lambda Function Updates

The existing Lambda functions automatically handle both webhook and partner events:

```javascript
// Event source detection
const isPartnerEvent = event.source && event.source.startsWith('aws.partner/stripe.com');
const isWebhookEvent = event.Records || event.detail?.source === 'stripe.webhook';

if (isPartnerEvent) {
  // Process direct partner event
  const stripeEvent = event.detail;
  return processStripeEvent(stripeEvent, 'stripe_partner');
} else if (isWebhookEvent) {
  // Process webhook event
  return processWebhookEvent(event);
}
```

## Monitoring and Troubleshooting

### CloudWatch Logs

Monitor event processing in:
- `/aws/lambda/ai-nexus-dev-stripe-*` - Lambda function logs
- `/aws/events/stripe-billing` - EventBridge monitoring logs

### EventBridge Rules

Check rule metrics:
- `ai-nexus-dev-stripe-subscription_events-rule`
- `ai-nexus-dev-stripe-payment_events-rule` 
- `ai-nexus-dev-stripe-customer_events-rule`
- `ai-nexus-dev-stripe-partner_*_events-rule` (when enabled)

### Common Issues

1. **Partner Event Source Not Found**
   - Verify Stripe destinations are created
   - Check AWS account ID and region match
   - Wait up to 10 minutes for AWS to create partner sources

2. **Events Not Processing**
   - Confirm partner event source association
   - Check EventBridge rule patterns match event types
   - Verify Lambda function permissions

3. **Duplicate Event Processing**
   - Events may be processed by both webhook and partner rules
   - Consider disabling webhook events when partner events are active
   - Use event deduplication in Lambda functions

## Switching from Webhook to Partner Events

To migrate from webhook-only to partner events:

1. **Enable partner events** (this config)
2. **Test partner event processing** in development
3. **Gradually disable webhook events** for specific event types
4. **Monitor for any missed events** during transition
5. **Fully switch to partner events** when confident

## Configuration Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `enable_stripe_partner_events` | Enable partner event sources | `true` |
| `stripe_partner_event_source_name` | Partner event source name | `aws.partner/stripe.com/ed_123...` |

## Next Steps

1. Configure Stripe event destinations
2. Associate partner event sources in AWS Console
3. Enable partner events in Terraform
4. Test event processing
5. Monitor and adjust as needed

For questions or issues, check the CloudWatch logs or contact the development team.
