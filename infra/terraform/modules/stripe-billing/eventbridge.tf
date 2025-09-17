# EventBridge Integration for Stripe Billing Events
# Provides event-driven architecture for processing Stripe webhook events

# Custom EventBridge Event Bus for Stripe events
resource "aws_cloudwatch_event_bus" "stripe_events" {
  count = var.enable_eventbridge ? 1 : 0
  
  name = "${local.resource_prefix}-event-bus"
  tags = local.common_tags
}

# EventBridge Rules for different Stripe event types
locals {
  # Define event routing configuration
  stripe_event_patterns = {
    subscription_events = {
      description = "Subscription lifecycle events"
      event_pattern = jsonencode({
        "source"      = ["stripe.webhook"]
        "detail-type" = ["Stripe Webhook Event"]
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
            }
            input_template = <<EOF
{
  "eventType": "<event_type>",
  "eventId": "<event_id>",
  "subscriptionId": "<subscription_id>",
  "customerId": "<customer_id>",
  "status": "<status>",
  "source": "eventbridge",
  "processedAt": "$${aws.events.event.ingestion-time}"
}
EOF
          }
        }
      ]
    }
    
    payment_events = {
      description = "Payment and invoice events"
      event_pattern = jsonencode({
        "source"      = ["stripe.webhook"]
        "detail-type" = ["Stripe Webhook Event"]
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
          function_key = "list-invoices" # Reuse for payment processing
          input_transformer = {
            input_paths = {
              event_type = "$.detail.type"
              event_id = "$.detail.id"
              amount = "$.detail.data.object.amount"
              currency = "$.detail.data.object.currency"
              customer_id = "$.detail.data.object.customer"
              status = "$.detail.data.object.status"
            }
            input_template = <<EOF
{
  "eventType": "<event_type>",
  "eventId": "<event_id>", 
  "amount": "<amount>",
  "currency": "<currency>",
  "customerId": "<customer_id>",
  "status": "<status>",
  "source": "eventbridge",
  "processedAt": "$${aws.events.event.ingestion-time}"
}
EOF
          }
        }
      ]
    }
    
    customer_events = {
      description = "Customer and setup events"
      event_pattern = jsonencode({
        "source"      = ["stripe.webhook"]
        "detail-type" = ["Stripe Webhook Event"] 
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
          function_key = "get-subscription-status" # Reuse for customer processing
          input_transformer = {
            input_paths = {
              event_type = "$.detail.type"
              event_id = "$.detail.id"
              customer_id = "$.detail.data.object.customer"
              object_id = "$.detail.data.object.id"
            }
            input_template = <<EOF
{
  "eventType": "<event_type>",
  "eventId": "<event_id>",
  "customerId": "<customer_id>",
  "objectId": "<object_id>",
  "source": "eventbridge",
  "processedAt": "$${aws.events.event.ingestion-time}"
}
EOF
          }
        }
      ]
    }

    # Catch-all for monitoring and debugging
    all_events_monitoring = {
      description = "All Stripe events for monitoring and analytics"
      event_pattern = jsonencode({
        "source"      = ["stripe.webhook"]
        "detail-type" = ["Stripe Webhook Event"]
      })
      targets = [
        {
          name = "monitoring-logs"
          type = "cloudwatch_logs"
          log_group_name = "/aws/events/stripe-billing"
        }
      ]
    }
  }
}

# EventBridge Rules
resource "aws_cloudwatch_event_rule" "stripe_event_rules" {
  for_each = var.enable_eventbridge ? local.stripe_event_patterns : tomap({})

  name           = "${local.resource_prefix}-${each.key}-rule"
  description    = each.value.description
  event_bus_name = aws_cloudwatch_event_bus.stripe_events[0].name
  event_pattern  = each.value.event_pattern

  tags = local.common_tags
}

# CloudWatch Log Group for EventBridge monitoring
resource "aws_cloudwatch_log_group" "eventbridge_monitoring" {
  count = var.enable_eventbridge ? 1 : 0
  
  name              = "/aws/events/stripe-billing"
  retention_in_days = var.log_retention_days
  tags              = local.common_tags
}

# EventBridge Targets - Lambda Functions  
locals {
  # Use the basic webhook patterns for now
  active_event_patterns = var.enable_eventbridge ? local.stripe_event_patterns : {
    subscription_events = null
    payment_events = null
    customer_events = null
    all_events_monitoring = null
  }
}

resource "aws_cloudwatch_event_target" "lambda_targets" {
  for_each = {
    for rule_key, rule_config in local.active_event_patterns :
    rule_key => rule_config
    if length([for target in rule_config.targets : target if target.type == "lambda"]) > 0
  }

  rule           = aws_cloudwatch_event_rule.stripe_event_rules[each.key].name
  event_bus_name = aws_cloudwatch_event_bus.stripe_events[0].name
  target_id      = "lambda-target-${each.key}"
  arn            = aws_lambda_function.billing_functions[each.value.targets[0].function_key].arn

  # Input transformation for cleaner event processing
  dynamic "input_transformer" {
    for_each = length([for target in each.value.targets : target if contains(keys(target), "input_transformer")]) > 0 ? [1] : []
    content {
      input_paths    = each.value.targets[0].input_transformer.input_paths
      input_template = each.value.targets[0].input_transformer.input_template
    }
  }
}

# EventBridge Targets - CloudWatch Logs
resource "aws_cloudwatch_event_target" "logs_targets" {
  for_each = {
    for rule_key, rule_config in local.active_event_patterns :
    rule_key => rule_config
    if length([for target in rule_config.targets : target if target.type == "cloudwatch_logs"]) > 0
  }

  rule           = aws_cloudwatch_event_rule.stripe_event_rules[each.key].name
  event_bus_name = aws_cloudwatch_event_bus.stripe_events[0].name
  target_id      = "logs-target-${each.key}"
  arn            = aws_cloudwatch_log_group.eventbridge_monitoring[0].arn
}

# Lambda Permissions for EventBridge
resource "aws_lambda_permission" "eventbridge_invoke" {
  for_each = toset([
    for rule_key, rule_config in local.active_event_patterns :
    rule_config.targets[0].function_key
    if length([for target in rule_config.targets : target if target.type == "lambda"]) > 0
  ])

  statement_id  = "AllowExecutionFromEventBridge-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.billing_functions[each.key].function_name
  principal     = "events.amazonaws.com"
  source_arn    = "arn:aws:events:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:rule/${local.resource_prefix}-*"
}

# Updated IAM Policy for Webhook Handler to publish to EventBridge
resource "aws_iam_role_policy" "webhook_eventbridge_policy" {
  count = var.enable_eventbridge ? 1 : 0
  
  name = "${local.resource_prefix}-webhook-eventbridge-policy"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "events:PutEvents"
        ]
        Resource = [
          aws_cloudwatch_event_bus.stripe_events[0].arn,
          "arn:aws:events:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:rule/${local.resource_prefix}-*"
        ]
      }
    ]
  })
}

# EventBridge Archive for event replay (optional but recommended)
resource "aws_cloudwatch_event_archive" "stripe_events_archive" {
  count = var.enable_eventbridge && var.enable_event_replay ? 1 : 0
  
  name             = "${local.resource_prefix}-events-archive"
  event_source_arn = aws_cloudwatch_event_bus.stripe_events[0].arn
  description      = "Archive of Stripe webhook events for replay and analysis"
  retention_days   = var.event_archive_retention_days

  event_pattern = jsonencode({
    "source" = ["stripe.webhook"]
  })
}

# CloudWatch Metrics for EventBridge monitoring
resource "aws_cloudwatch_metric_alarm" "eventbridge_failed_invocations" {
  count = var.enable_eventbridge ? 1 : 0
  
  alarm_name          = "${local.resource_prefix}-eventbridge-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FailedInvocations"
  namespace           = "AWS/Events"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "EventBridge failed invocations for Stripe events"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    EventBusName = aws_cloudwatch_event_bus.stripe_events[0].name
  }

  tags = local.common_tags
}
