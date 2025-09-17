# Outputs for Stripe Billing Module
# Provides configuration details for frontend integration and monitoring

# API Gateway Outputs
output "api_gateway_url" {
  description = "Base URL of the billing API Gateway"
  value = var.create_api_gateway ? "${aws_apigatewayv2_api.billing_api[0].api_endpoint}/billing" : "Using existing API Gateway"
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value = local.api_id
}

output "webhook_endpoint_url" {
  description = "Full URL for Stripe webhook endpoint"
  value = var.create_api_gateway ? "${aws_apigatewayv2_api.billing_api[0].api_endpoint}/stripe/webhook" : "${var.webhook_endpoint_base_url}/stripe/webhook"
}

# Stripe Configuration - COMMENTED OUT
# These will be populated after manual/API Stripe setup
# output "stripe_product_id" {
#   description = "Stripe product ID for AI Nexus Workbench"
#   value = stripe_product.ai_nexus_workbench.id
# }

# output "stripe_price_ids" {
#   description = "Map of subscription tier to Stripe price IDs"
#   value = {
#     premium_monthly = stripe_price.premium_monthly.id
#     premium_annual  = stripe_price.premium_annual.id
#     enterprise      = stripe_price.enterprise_placeholder.id
#   }
#   sensitive = false
# }

# output "ssm_price_parameters" {
#   description = "SSM parameter paths for price IDs (for Lambda env vars)"
#   value = {
#     premium_monthly = aws_ssm_parameter.premium_monthly_price_id.name
#     premium_annual  = aws_ssm_parameter.premium_annual_price_id.name
#     enterprise      = aws_ssm_parameter.enterprise_price_id.name
#   }
# }

# DynamoDB Tables
output "dynamodb_tables" {
  description = "DynamoDB table names and ARNs"
  value = {
    customers = {
      name = aws_dynamodb_table.billing_customers.name
      arn  = aws_dynamodb_table.billing_customers.arn
    }
    subscriptions = {
      name = aws_dynamodb_table.billing_subscriptions.name
      arn  = aws_dynamodb_table.billing_subscriptions.arn
    }
    invoices = {
      name = aws_dynamodb_table.billing_invoices.name
      arn  = aws_dynamodb_table.billing_invoices.arn
    }
    idempotency = {
      name = aws_dynamodb_table.billing_idempotency.name
      arn  = aws_dynamodb_table.billing_idempotency.arn
    }
  }
}

# Lambda Functions
output "lambda_functions" {
  description = "Lambda function names and ARNs"
  value = {
    for key, func in aws_lambda_function.billing_functions : key => {
      name = func.function_name
      arn  = func.arn
    }
  }
}

# Frontend Configuration (to be used in environment variables)
output "frontend_config" {
  description = "Configuration values for frontend integration"
  value = {
    api_base_url = var.create_api_gateway ? "${aws_apigatewayv2_api.billing_api[0].api_endpoint}/billing" : "${var.webhook_endpoint_base_url}/billing"
    tenant_id    = local.tenant_id
    # stripe_price_ids will be populated after Stripe API setup
    stripe_price_ids = {
      # premium_monthly = stripe_price.premium_monthly.id
      # premium_annual  = stripe_price.premium_annual.id  
      # enterprise      = stripe_price.enterprise_placeholder.id
    }
    subscription_tiers = [
      {
        id          = "free"
        name        = "Free"
        description = "Basic features for getting started"
        price       = 0
        interval    = null
        stripe_price_id = null
        features    = ["Basic AI models", "5 projects", "Community support"]
      },
      {
        id          = "premium"
        name        = "Premium"
        description = "Advanced features for professionals"
        price       = var.premium_monthly_price
        interval    = "monthly"
        stripe_price_id = null # stripe_price.premium_monthly.id
        features    = ["All AI models", "Unlimited projects", "Priority support", "Advanced analytics"]
      },
      {
        id          = "premium_annual"
        name        = "Premium Annual"
        description = "Premium plan with annual billing"
        price       = var.premium_annual_price
        interval    = "yearly"
        stripe_price_id = null # stripe_price.premium_annual.id
        features    = ["All AI models", "Unlimited projects", "Priority support", "Advanced analytics", "17% savings"]
      },
      {
        id          = "enterprise"
        name        = "Enterprise"
        description = "Custom solutions for large teams"
        price       = null
        interval    = "contact"
        stripe_price_id = null # stripe_price.enterprise_placeholder.id
        features    = ["Everything in Premium", "Custom integrations", "Dedicated support", "SLA guarantee"]
      }
    ]
  }
  sensitive = false
}

# Security & Monitoring
output "secrets_manager_arns" {
  description = "Secrets Manager ARNs for API keys (for Lambda permissions)"
  value = {
    stripe_secret_key      = data.aws_secretsmanager_secret.stripe_secret_key.arn
    stripe_webhook_secret  = data.aws_secretsmanager_secret.stripe_webhook_secret.arn
  }
}

output "cloudwatch_log_groups" {
  description = "CloudWatch log group names for monitoring"
  value = {
    lambda_logs = [for log_group in aws_cloudwatch_log_group.lambda_logs : log_group.name]
    api_gateway_access = var.create_api_gateway ? aws_cloudwatch_log_group.api_gateway_access_logs[0].name : null
    api_gateway_execution = var.create_api_gateway ? aws_cloudwatch_log_group.api_gateway_execution_logs[0].name : null
  }
}

output "dead_letter_queue" {
  description = "SQS Dead Letter Queue details"
  value = var.enable_dlq ? {
    name = aws_sqs_queue.billing_dlq[0].name
    arn  = aws_sqs_queue.billing_dlq[0].arn
    url  = aws_sqs_queue.billing_dlq[0].url
  } : null
}

# Tenant Configuration
output "tenant_config" {
  description = "Tenant-specific configuration"
  value = {
    tenant_id    = local.tenant_id
    app_name     = local.app_name
    environment  = var.environment
    region       = data.aws_region.current.name
    account_id   = data.aws_caller_identity.current.account_id
  }
}

# Webhook Configuration for Stripe Dashboard
output "webhook_config" {
  description = "Webhook configuration for manual setup in Stripe Dashboard"
  value = {
    endpoint_url = var.create_api_gateway ? "${aws_apigatewayv2_api.billing_api[0].api_endpoint}/stripe/webhook" : "${var.webhook_endpoint_base_url}/stripe/webhook"
    enabled_events = [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated", 
      "customer.subscription.deleted",
      "invoice.created",
      "invoice.payment_succeeded",
      "invoice.payment_failed",
      "payment_method.attached",
      "payment_method.detached",
      "charge.succeeded",
      "charge.failed"
    ]
    api_version = "2023-10-16"
    metadata_required = {
      tenant_id = local.tenant_id
      app       = local.app_name
    }
  }
}

# EventBridge Configuration
output "eventbridge_config" {
  description = "EventBridge configuration for event-driven processing"
  value = var.enable_eventbridge ? {
    event_bus_name = aws_cloudwatch_event_bus.stripe_events[0].name
    event_bus_arn  = aws_cloudwatch_event_bus.stripe_events[0].arn
    event_rules = {
      for rule_name, rule in aws_cloudwatch_event_rule.stripe_event_rules :
      rule_name => {
        name = rule.name
        arn  = rule.arn
      }
    }
    monitoring_log_group = aws_cloudwatch_log_group.eventbridge_monitoring[0].name
    archive_name = var.enable_event_replay ? aws_cloudwatch_event_archive.stripe_events_archive[0].name : null
    supported_payload_types = {
      snapshot = {
        description = "Full event object with complete data"
        size        = "larger"
        use_case    = "Complete processing, analytics, debugging"
      }
      thin = {
        description = "Essential event information only"
        size        = "smaller" 
        use_case    = "Quick processing, notifications, triggers"
      }
    }
    # Partner event support is handled by stripe-partner-events.tf
    # Enable with: enable_stripe_partner_events = true
    partner_events_enabled = var.enable_stripe_partner_events
  } : null
}

# Resource Names (for external references)
output "resource_names" {
  description = "Resource names for integration with other modules"
  value = {
    lambda_role_arn    = aws_iam_role.lambda_execution_role.arn
    cognito_authorizer_id = var.skip_cognito_check ? null : aws_apigatewayv2_authorizer.cognito_auth[0].id
    resource_prefix    = local.resource_prefix
  }
}
