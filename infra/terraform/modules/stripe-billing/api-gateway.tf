# API Gateway Configuration for Stripe Billing
# HTTP API v2 with Cognito authorization and proper CORS

# Create HTTP API Gateway (if not extending existing)
resource "aws_apigatewayv2_api" "billing_api" {
  count = var.create_api_gateway ? 1 : 0
  
  name          = "${local.resource_prefix}-api"
  protocol_type = "HTTP"
  description   = "AI Nexus Workbench Stripe Billing API - Diatonicvisuals Tenant"

  cors_configuration {
    allow_credentials = true
    allow_headers = [
      "authorization",
      "content-type",
      "x-amz-date",
      "x-amz-security-token",
      "x-amz-user-agent",
      "stripe-idempotency-key"
    ]
    allow_methods = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS"
    ]
    allow_origins = var.allowed_cors_origins
    expose_headers = [
      "x-amz-request-id"
    ]
    max_age = 300
  }

  tags = local.common_tags
}

# Use existing API Gateway if provided
data "aws_apigatewayv2_api" "existing_api" {
  count  = var.api_gateway_id != "" ? 1 : 0
  api_id = var.api_gateway_id
}

locals {
  api_id           = var.create_api_gateway ? aws_apigatewayv2_api.billing_api[0].id : var.api_gateway_id
  api_execution_arn = var.create_api_gateway ? aws_apigatewayv2_api.billing_api[0].execution_arn : var.api_gateway_execution_arn
}

# Cognito Authorizer (conditional based on skip_cognito_check)
resource "aws_apigatewayv2_authorizer" "cognito_auth" {
  count = var.skip_cognito_check ? 0 : 1
  
  api_id           = local.api_id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${local.resource_prefix}-cognito-auth"

  jwt_configuration {
    audience = [var.cognito_user_pool_id]
    issuer   = "https://cognito-idp.${data.aws_region.current.name}.amazonaws.com/${var.cognito_user_pool_id}"
  }
}

# Lambda Integrations
resource "aws_apigatewayv2_integration" "lambda_integrations" {
  for_each = local.lambda_functions

  api_id               = local.api_id
  integration_type     = "AWS_PROXY"
  integration_method   = "POST"
  integration_uri      = aws_lambda_function.billing_functions[each.key].invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds = min(29000, max(50, each.value.timeout * 1000))

  request_parameters = {
    "overwrite:header.x-tenant-id" = local.tenant_id
  }
}

# Routes Configuration
locals {
  api_routes = {
    # Webhook endpoint (no auth)
    "POST /stripe/webhook" = {
      integration_key = "stripe-webhook-handler"
      authorization_type = "NONE"
      require_auth = false
    },
    # Billing endpoints (Cognito auth required unless skipped)
    "POST /billing/create-checkout-session" = {
      integration_key = "create-checkout-session"
      authorization_type = var.skip_cognito_check ? "NONE" : "JWT"
      authorizer_id = var.skip_cognito_check ? null : aws_apigatewayv2_authorizer.cognito_auth[0].id
      require_auth = !var.skip_cognito_check
    },
    "POST /billing/create-portal-session" = {
      integration_key = "create-portal-session"
      authorization_type = var.skip_cognito_check ? "NONE" : "JWT"
      authorizer_id = var.skip_cognito_check ? null : aws_apigatewayv2_authorizer.cognito_auth[0].id
      require_auth = !var.skip_cognito_check
    },
    "POST /billing/create-setup-intent" = {
      integration_key = "create-setup-intent"
      authorization_type = var.skip_cognito_check ? "NONE" : "JWT"
      authorizer_id = var.skip_cognito_check ? null : aws_apigatewayv2_authorizer.cognito_auth[0].id
      require_auth = !var.skip_cognito_check
    },
    "POST /billing/update-subscription" = {
      integration_key = "update-subscription"
      authorization_type = var.skip_cognito_check ? "NONE" : "JWT"
      authorizer_id = var.skip_cognito_check ? null : aws_apigatewayv2_authorizer.cognito_auth[0].id
      require_auth = !var.skip_cognito_check
    },
    "POST /billing/cancel-subscription" = {
      integration_key = "cancel-subscription"
      authorization_type = var.skip_cognito_check ? "NONE" : "JWT"
      authorizer_id = var.skip_cognito_check ? null : aws_apigatewayv2_authorizer.cognito_auth[0].id
      require_auth = !var.skip_cognito_check
    },
    "GET /billing/status" = {
      integration_key = "get-subscription-status"
      authorization_type = var.skip_cognito_check ? "NONE" : "JWT"
      authorizer_id = var.skip_cognito_check ? null : aws_apigatewayv2_authorizer.cognito_auth[0].id
      require_auth = !var.skip_cognito_check
    },
    "GET /billing/invoices" = {
      integration_key = "list-invoices"
      authorization_type = var.skip_cognito_check ? "NONE" : "JWT"
      authorizer_id = var.skip_cognito_check ? null : aws_apigatewayv2_authorizer.cognito_auth[0].id
      require_auth = !var.skip_cognito_check
    }
  }
}

# API Routes
resource "aws_apigatewayv2_route" "billing_routes" {
  for_each = local.api_routes

  api_id    = local.api_id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integrations[each.value.integration_key].id}"

  authorization_type = each.value.authorization_type
  authorizer_id      = lookup(each.value, "authorizer_id", null)

  # Note: Request parameter validation for API Gateway v2 is handled differently
  # API Gateway v2 does not support inline request parameter validation like v1
  # Validation should be handled in the Lambda function or via request validators
}

# API Gateway Stage
resource "aws_apigatewayv2_stage" "billing_stage" {
  count = var.create_api_gateway ? 1 : 0
  
  api_id      = aws_apigatewayv2_api.billing_api[0].id
  name        = "billing"
  auto_deploy = true
  description = "Stripe billing API stage for ${var.environment}"

  # Note: Throttling for HTTP API v2 stages is configured differently
  # Throttling is handled at the route level via throttling_policy blocks

  # Access logging
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_access_logs[0].arn
    format = jsonencode({
      requestId      = "$context.requestId"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      userAgent      = "$context.identity.userAgent"
      sourceIp       = "$context.identity.sourceIp"
      tenantId       = local.tenant_id
    })
  }

  tags = local.common_tags

  depends_on = [
    aws_cloudwatch_log_group.api_gateway_access_logs
  ]
}

# CloudWatch Log Group for API Gateway Access Logs
resource "aws_cloudwatch_log_group" "api_gateway_access_logs" {
  count = var.create_api_gateway ? 1 : 0
  
  name              = "/aws/apigateway/${local.resource_prefix}-access-logs"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

# CloudWatch Log Group for API Gateway Execution Logs
resource "aws_cloudwatch_log_group" "api_gateway_execution_logs" {
  count = var.create_api_gateway ? 1 : 0
  
  name              = "/aws/apigateway/${local.resource_prefix}-execution-logs"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

# API Gateway Deployment (manual trigger for updates)
resource "aws_apigatewayv2_deployment" "billing_deployment" {
  count = var.create_api_gateway ? 1 : 0
  
  api_id      = aws_apigatewayv2_api.billing_api[0].id
  description = "Billing API deployment for ${var.environment}"

  triggers = {
    redeployment = sha1(jsonencode([
      aws_apigatewayv2_route.billing_routes,
      aws_apigatewayv2_integration.lambda_integrations
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_apigatewayv2_route.billing_routes
  ]
}

# Custom Domain Name (optional)
resource "aws_apigatewayv2_domain_name" "billing_domain" {
  count = var.create_api_gateway && var.custom_domain_name != "" ? 1 : 0
  
  domain_name = var.custom_domain_name

  domain_name_configuration {
    certificate_arn = var.acm_certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  tags = local.common_tags
}

resource "aws_apigatewayv2_api_mapping" "billing_domain_mapping" {
  count = var.create_api_gateway && var.custom_domain_name != "" ? 1 : 0
  
  api_id      = aws_apigatewayv2_api.billing_api[0].id
  domain_name = aws_apigatewayv2_domain_name.billing_domain[0].id
  stage       = aws_apigatewayv2_stage.billing_stage[0].id
}

# CloudWatch Alarms for API Gateway
resource "aws_cloudwatch_metric_alarm" "api_gateway_4xx_errors" {
  count = var.create_api_gateway ? 1 : 0
  
  alarm_name          = "${local.resource_prefix}-api-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "20"
  alarm_description   = "This metric monitors API Gateway 4XX errors"
  alarm_actions       = [] # Add SNS topic ARN for notifications if needed

  dimensions = {
    ApiName = aws_apigatewayv2_api.billing_api[0].name
    Stage   = aws_apigatewayv2_stage.billing_stage[0].name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_5xx_errors" {
  count = var.create_api_gateway ? 1 : 0
  
  alarm_name          = "${local.resource_prefix}-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors API Gateway 5XX errors"
  alarm_actions       = [] # Add SNS topic ARN for notifications if needed

  dimensions = {
    ApiName = aws_apigatewayv2_api.billing_api[0].name
    Stage   = aws_apigatewayv2_stage.billing_stage[0].name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_latency" {
  count = var.create_api_gateway ? 1 : 0
  
  alarm_name          = "${local.resource_prefix}-api-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "IntegrationLatency"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Average"
  threshold           = "10000" # 10 seconds
  alarm_description   = "This metric monitors API Gateway integration latency"
  alarm_actions       = [] # Add SNS topic ARN for notifications if needed

  dimensions = {
    ApiName = aws_apigatewayv2_api.billing_api[0].name
    Stage   = aws_apigatewayv2_stage.billing_stage[0].name
  }

  tags = local.common_tags
}
