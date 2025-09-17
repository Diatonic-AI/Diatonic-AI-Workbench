# Lambda Functions for Stripe Billing Integration
# Secure, tenant-isolated functions with comprehensive error handling

# SQS Dead Letter Queue for failed Lambda executions
resource "aws_sqs_queue" "billing_dlq" {
  count = var.enable_dlq ? 1 : 0
  name  = "${local.resource_prefix}-dlq"

  message_retention_seconds = 1209600 # 14 days
  visibility_timeout_seconds = 60

  tags = local.common_tags
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "lambda_logs" {
  for_each = toset([
    "stripe-webhook-handler",
    "create-checkout-session",
    "create-portal-session",
    "create-setup-intent",
    "update-subscription",
    "cancel-subscription",
    "get-subscription-status",
    "list-invoices"
  ])

  name              = "/aws/lambda/${local.resource_prefix}-${each.key}"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

# IAM Role for Lambda Functions
resource "aws_iam_role" "lambda_execution_role" {
  name = "${local.resource_prefix}-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# IAM Policy for Lambda Functions
resource "aws_iam_role_policy" "lambda_execution_policy" {
  name = "${local.resource_prefix}-lambda-execution-policy"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # CloudWatch Logs
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.resource_prefix}-*:*"
      },
      # Secrets Manager - Stripe Keys
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          data.aws_secretsmanager_secret.stripe_secret_key.arn,
          data.aws_secretsmanager_secret.stripe_webhook_secret.arn
        ]
      },
      # SSM Parameters - Price IDs
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/ai-nexus/diatonicvisuals/stripe/prices/*"
        ]
      },
      # DynamoDB Tables
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.billing_customers.arn,
          aws_dynamodb_table.billing_subscriptions.arn,
          aws_dynamodb_table.billing_invoices.arn,
          aws_dynamodb_table.billing_idempotency.arn,
          "${aws_dynamodb_table.billing_customers.arn}/index/*",
          "${aws_dynamodb_table.billing_subscriptions.arn}/index/*",
          "${aws_dynamodb_table.billing_invoices.arn}/index/*"
        ]
      },
      # SQS Dead Letter Queue
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = var.enable_dlq ? aws_sqs_queue.billing_dlq[0].arn : ""
      }
    ]
  })
}

# VPC Configuration for Lambda (if provided)
resource "aws_iam_role_policy_attachment" "lambda_vpc_execution" {
  count      = length(var.subnet_ids) > 0 ? 1 : 0
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Lambda Functions
locals {
  lambda_functions = {
    stripe-webhook-handler = {
      handler     = "index.handler"
      description = "Handles Stripe webhook events with signature verification"
      timeout     = 60
      environment = {
        TENANT_ID                     = local.tenant_id
        STRIPE_WEBHOOK_SECRET_ARN     = data.aws_secretsmanager_secret.stripe_webhook_secret.arn
        TABLE_CUSTOMERS               = aws_dynamodb_table.billing_customers.name
        TABLE_SUBSCRIPTIONS           = aws_dynamodb_table.billing_subscriptions.name
        TABLE_INVOICES                = aws_dynamodb_table.billing_invoices.name
        TABLE_IDEMPOTENCY             = aws_dynamodb_table.billing_idempotency.name
        LOG_LEVEL                     = "info"
        ENABLE_EVENTBRIDGE            = tostring(var.enable_eventbridge)
        EVENTBRIDGE_BUS_NAME          = var.enable_eventbridge ? "${local.resource_prefix}-event-bus" : ""
      }
    },
    create-checkout-session = {
      handler     = "index.handler"
      description = "Creates Stripe checkout sessions for subscription purchases"
      timeout     = 30
      environment = {
        TENANT_ID                 = local.tenant_id
        STRIPE_SECRET_ARN         = data.aws_secretsmanager_secret.stripe_secret_key.arn
        PRICE_MAP_SSM_PATH        = "/ai-nexus/diatonicvisuals/stripe/prices"
        TABLE_CUSTOMERS           = aws_dynamodb_table.billing_customers.name
        TABLE_SUBSCRIPTIONS       = aws_dynamodb_table.billing_subscriptions.name
        LOG_LEVEL                 = "info"
        ENABLE_TAX                = var.enable_tax_calculation ? "true" : "false"
        ENABLE_PROMOTION_CODES    = var.enable_promotion_codes ? "true" : "false"
        TRIAL_PERIOD_DAYS         = tostring(var.default_trial_period_days)
      }
    },
    create-portal-session = {
      handler     = "index.handler"
      description = "Creates Stripe billing portal sessions"
      timeout     = 30
      environment = {
        TENANT_ID         = local.tenant_id
        STRIPE_SECRET_ARN = data.aws_secretsmanager_secret.stripe_secret_key.arn
        TABLE_CUSTOMERS   = aws_dynamodb_table.billing_customers.name
        LOG_LEVEL         = "info"
      }
    },
    create-setup-intent = {
      handler     = "index.handler"
      description = "Creates Stripe setup intents for payment method management"
      timeout     = 30
      environment = {
        TENANT_ID         = local.tenant_id
        STRIPE_SECRET_ARN = data.aws_secretsmanager_secret.stripe_secret_key.arn
        TABLE_CUSTOMERS   = aws_dynamodb_table.billing_customers.name
        LOG_LEVEL         = "info"
      }
    },
    update-subscription = {
      handler     = "index.handler"
      description = "Updates existing Stripe subscriptions"
      timeout     = 30
      environment = {
        TENANT_ID              = local.tenant_id
        STRIPE_SECRET_ARN      = data.aws_secretsmanager_secret.stripe_secret_key.arn
        PRICE_MAP_SSM_PATH     = "/ai-nexus/diatonicvisuals/stripe/prices"
        TABLE_CUSTOMERS        = aws_dynamodb_table.billing_customers.name
        TABLE_SUBSCRIPTIONS    = aws_dynamodb_table.billing_subscriptions.name
        LOG_LEVEL              = "info"
      }
    },
    cancel-subscription = {
      handler     = "index.handler"
      description = "Cancels Stripe subscriptions"
      timeout     = 30
      environment = {
        TENANT_ID           = local.tenant_id
        STRIPE_SECRET_ARN   = data.aws_secretsmanager_secret.stripe_secret_key.arn
        TABLE_SUBSCRIPTIONS = aws_dynamodb_table.billing_subscriptions.name
        LOG_LEVEL           = "info"
      }
    },
    get-subscription-status = {
      handler     = "index.handler"
      description = "Retrieves user subscription status and entitlements"
      timeout     = 15
      environment = {
        TENANT_ID           = local.tenant_id
        TABLE_CUSTOMERS     = aws_dynamodb_table.billing_customers.name
        TABLE_SUBSCRIPTIONS = aws_dynamodb_table.billing_subscriptions.name
        LOG_LEVEL           = "info"
      }
    },
    list-invoices = {
      handler     = "index.handler"
      description = "Lists user invoices with pagination"
      timeout     = 15
      environment = {
        TENANT_ID     = local.tenant_id
        TABLE_INVOICES = aws_dynamodb_table.billing_invoices.name
        LOG_LEVEL     = "info"
      }
    }
  }
}

# Lambda Function Resources
resource "aws_lambda_function" "billing_functions" {
  for_each = local.lambda_functions

  function_name    = "${local.resource_prefix}-${each.key}"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = each.value.handler
  runtime         = var.lambda_runtime
  timeout         = each.value.timeout
  memory_size     = var.lambda_memory_size
  
  # Placeholder for deployment package - will be updated with actual code
  filename         = "${path.module}/lambda-placeholder.zip"
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  environment {
    variables = each.value.environment
  }

  # VPC Configuration (optional)
  dynamic "vpc_config" {
    for_each = length(var.subnet_ids) > 0 ? [1] : []
    content {
      subnet_ids         = var.subnet_ids
      security_group_ids = var.security_group_ids
    }
  }

  # Dead Letter Queue Configuration
  dynamic "dead_letter_config" {
    for_each = var.enable_dlq ? [1] : []
    content {
      target_arn = aws_sqs_queue.billing_dlq[0].arn
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs,
    aws_iam_role_policy.lambda_execution_policy
  ]

  tags = merge(local.common_tags, {
    FunctionType = each.key
  })
}

# Placeholder ZIP file for Lambda functions (will be replaced with actual builds)
data "archive_file" "lambda_placeholder" {
  type        = "zip"
  output_path = "${path.module}/lambda-placeholder.zip"
  
  source {
    content  = <<EOF
exports.handler = async (event) => {
  console.log('Placeholder function - replace with actual implementation');
  return {
    statusCode: 501,
    body: JSON.stringify({
      message: 'Function not implemented yet'
    })
  };
};
EOF
    filename = "index.js"
  }
}

# Lambda Permissions for API Gateway
resource "aws_lambda_permission" "api_gateway_invoke" {
  for_each = local.lambda_functions

  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.billing_functions[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  
  # Use local execution ARN or null for broad permissions (temporary)
  # TODO: Tighten this once API Gateway execution ARN is available
  source_arn = var.api_gateway_execution_arn != "" ? "${var.api_gateway_execution_arn}/*" : null
}

# CloudWatch Alarms for Lambda Functions
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = local.lambda_functions

  alarm_name          = "${local.resource_prefix}-${each.key}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "60"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors ${each.key} lambda errors"
  alarm_actions       = [] # Add SNS topic ARN for notifications if needed

  dimensions = {
    FunctionName = aws_lambda_function.billing_functions[each.key].function_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  for_each = local.lambda_functions

  alarm_name          = "${local.resource_prefix}-${each.key}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "60"
  statistic           = "Average"
  threshold           = tostring(each.value.timeout * 1000 * 0.8) # 80% of timeout
  alarm_description   = "This metric monitors ${each.key} lambda duration"
  alarm_actions       = [] # Add SNS topic ARN for notifications if needed

  dimensions = {
    FunctionName = aws_lambda_function.billing_functions[each.key].function_name
  }

  tags = local.common_tags
}
