# Stripe Partner Event Sources Integration
# This configuration will handle the Partner Event Sources created by Stripe EventBridge destinations

# Partner Event Source Association (when available)
# Note: These resources are created after Stripe destinations are configured
# and may need to be applied separately after the partner event sources appear

# Data source to check for existing partner event sources
# Note: This data source will only work after partner event sources are created by Stripe
# and may need to be commented out initially until the sources exist
# data "aws_cloudwatch_event_source" "stripe_partner_sources" {
#   count = var.enable_stripe_partner_events ? 1 : 0
#   
#   name_prefix = "aws.partner/stripe.com"
# }

# Updated EventBridge Rules to handle both webhook and partner events
locals {
  # Extended event patterns to include partner event sources
  stripe_event_patterns_extended = var.enable_eventbridge ? {
    subscription_events = {
      description = "Subscription lifecycle events from webhooks and partner sources"
      event_pattern = jsonencode({
        "source" = ["stripe.webhook", "aws.partner/stripe.com"]
        "detail-type" = ["Stripe Webhook Event", "Stripe Event"]
        "detail" = {
          "type" = [
            "customer.subscription.created",
            "customer.subscription.updated", 
            "customer.subscription.deleted"
          ]
        }
      })
      targets = [
        {
          name = "subscription-processor"
          type = "lambda"
          function_key = "update-subscription"
          input_transformer = {
            input_paths = {
              event_type = "$.detail.type"
              event_id = "$.detail.id" 
              subscription_id = "$.detail.data.object.id"
              customer_id = "$.detail.data.object.customer"
              status = "$.detail.data.object.status"
              source_type = "$.source"
              payload_style = "$.detail.payload_style"
            }
            input_template = <<EOF
{
  "eventType": "<event_type>",
  "eventId": "<event_id>",
  "subscriptionId": "<subscription_id>",
  "customerId": "<customer_id>",
  "status": "<status>",
  "source": "<source_type>",
  "payloadStyle": "<payload_style>",
  "processedAt": "$${aws.events.event.ingestion-time}"
}
EOF
          }
        }
      ]
    }
    
    payment_events = {
      description = "Payment and invoice events from webhooks and partner sources"
      event_pattern = jsonencode({
        "source" = ["stripe.webhook", "aws.partner/stripe.com"]
        "detail-type" = ["Stripe Webhook Event", "Stripe Event"]
        "detail" = {
          "type" = [
            "invoice.payment_succeeded",
            "invoice.payment_failed",
            "payment_intent.succeeded",
            "payment_intent.payment_failed",
            "charge.succeeded",
            "charge.failed"
          ]
        }
      })
      targets = [
        {
          name = "payment-processor"
          type = "lambda"
          function_key = "list-invoices"
          input_transformer = {
            input_paths = {
              event_type = "$.detail.type"
              event_id = "$.detail.id"
              amount = "$.detail.data.object.amount"
              currency = "$.detail.data.object.currency"
              customer_id = "$.detail.data.object.customer"
              status = "$.detail.data.object.status"
              source_type = "$.source"
              payload_style = "$.detail.payload_style"
            }
            input_template = <<EOF
{
  "eventType": "<event_type>",
  "eventId": "<event_id>", 
  "amount": "<amount>",
  "currency": "<currency>",
  "customerId": "<customer_id>",
  "status": "<status>",
  "source": "<source_type>",
  "payloadStyle": "<payload_style>",
  "processedAt": "$${aws.events.event.ingestion-time}"
}
EOF
          }
        }
      ]
    }
    
    customer_events = {
      description = "Customer and setup events from webhooks and partner sources"
      event_pattern = jsonencode({
        "source" = ["stripe.webhook", "aws.partner/stripe.com"]
        "detail-type" = ["Stripe Webhook Event", "Stripe Event"] 
        "detail" = {
          "type" = [
            "customer.created",
            "customer.updated",
            "customer.deleted",
            "checkout.session.completed",
            "setup_intent.succeeded",
            "payment_method.attached",
            "payment_method.detached"
          ]
        }
      })
      targets = [
        {
          name = "customer-processor"
          type = "lambda"
          function_key = "get-subscription-status"
          input_transformer = {
            input_paths = {
              event_type = "$.detail.type"
              event_id = "$.detail.id"
              customer_id = "$.detail.data.object.customer"
              object_id = "$.detail.data.object.id"
              source_type = "$.source"
              payload_style = "$.detail.payload_style"
            }
            input_template = <<EOF
{
  "eventType": "<event_type>",
  "eventId": "<event_id>",
  "customerId": "<customer_id>",
  "objectId": "<object_id>",
  "source": "<source_type>",
  "payloadStyle": "<payload_style>",
  "processedAt": "$${aws.events.event.ingestion-time}"
}
EOF
          }
        }
      ]
    }

    # Enhanced monitoring to capture all sources
    all_events_monitoring = {
      description = "All Stripe events for monitoring and analytics from all sources"
      event_pattern = jsonencode({
        "source" = ["stripe.webhook", "aws.partner/stripe.com"]
        "detail-type" = ["Stripe Webhook Event", "Stripe Event"]
      })
      targets = [
        {
          name = "monitoring-logs"
          type = "cloudwatch_logs"
          log_group_name = "/aws/events/stripe-billing"
        }
      ]
    }
  } : {
    # Provide same structure when disabled
    subscription_events = null
    payment_events = null 
    customer_events = null
    all_events_monitoring = null
  }
}

# Variable to enable partner event source integration
variable "enable_stripe_partner_events" {
  description = "Enable Stripe partner event source integration"
  type        = bool
  default     = false
}

# Instructions for manual partner event source association
resource "local_file" "partner_event_source_instructions" {
  count = var.enable_eventbridge ? 1 : 0
  
  filename = "${path.module}/PARTNER-EVENT-SOURCE-SETUP.md"
  content = <<EOF
# Stripe Partner Event Source Setup Instructions

After configuring your Stripe EventBridge destinations, follow these steps:

## 1. Wait for Partner Event Sources
Partner event sources should appear in AWS EventBridge Console within a few minutes after completing the Stripe configuration.

## 2. Associate Partner Event Sources
In AWS EventBridge Console → Partner event sources, look for:
- \`aws.partner/stripe.com/ai-nexus-dev-stripe-snapshot\`
- \`aws.partner/stripe.com/ai-nexus-dev-stripe-thin\`

Associate each with your existing event bus: \`ai-nexus-dev-stripe-event-bus\`

## 3. Update Terraform Configuration
Once associated, set this variable in your Terraform configuration:
\`\`\`hcl
enable_stripe_partner_events = true
\`\`\`

Then run:
\`\`\`bash
terraform plan -var="enable_stripe_partner_events=true"
terraform apply -var="enable_stripe_partner_events=true"
\`\`\`

## 4. Verification
After setup, both webhook and partner event sources will send events to your EventBridge rules.

Check the logs to verify events are being received:
\`\`\`bash
aws logs tail /aws/events/stripe-billing --follow
\`\`\`
EOF
}
