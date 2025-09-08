# AI Nexus Workbench - API Gateway Configuration
# REST API for user management and authentication

# API Gateway REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "${local.name_prefix}-api"
  description = "AI Nexus Workbench API for user management and authentication"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-api-gateway"
    Purpose = "User management API"
  })
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  depends_on = [
    aws_api_gateway_method.user_registration_post,
    aws_api_gateway_method.user_registration_options,
    aws_api_gateway_method.user_profile_get,
    aws_api_gateway_method.user_profile_put,
    aws_api_gateway_method.user_profile_delete,
    aws_api_gateway_method.user_profile_options,
    aws_api_gateway_integration.user_registration_integration,
    aws_api_gateway_integration.user_profile_management_integration,
  ]

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.users.id,
      aws_api_gateway_resource.user_profile.id,
      aws_api_gateway_method.user_registration_post.id,
      aws_api_gateway_method.user_profile_get.id,
      aws_api_gateway_method.user_profile_put.id,
      aws_api_gateway_method.user_profile_delete.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# CloudWatch Logs role for API Gateway (required for logging)
resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "${local.name_prefix}-api-gateway-cloudwatch-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-api-gateway-cloudwatch-role"
  })
}

resource "aws_iam_role_policy" "api_gateway_cloudwatch" {
  name = "${local.name_prefix}-api-gateway-cloudwatch-policy"
  role = aws_iam_role.api_gateway_cloudwatch.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents",
          "logs:GetLogEvents",
          "logs:FilterLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Set the CloudWatch role for API Gateway account settings
resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}

# API Gateway Stage
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment

  # Enable logging
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_logs.arn
    format = jsonencode({
      requestId        = "$context.requestId"
      ip               = "$sourceIp"
      caller           = "$context.identity.caller"
      user             = "$context.identity.user"
      requestTime      = "$requestTime"
      httpMethod       = "$httpMethod"
      resourcePath     = "$resourcePath"
      status           = "$status"
      protocol         = "$protocol"
      responseLength   = "$responseLength"
      error            = "$error.message"
      integrationError = "$integration.error"
    })
  }

  # Enable X-Ray tracing
  xray_tracing_enabled = true

  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-api-stage-${var.environment}"
    Environment = var.environment
  })

  depends_on = [aws_api_gateway_account.main]
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/apigateway/${local.name_prefix}-api"
  retention_in_days = var.environment == "prod" ? 90 : 30

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-api-gateway-logs"
  })
}

# Cognito User Pool Authorizer
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "${local.name_prefix}-cognito-authorizer"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [aws_cognito_user_pool.main.arn]
  identity_source = "method.request.header.Authorization"
}

# API Resources

# /users resource for user registration
resource "aws_api_gateway_resource" "users" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "users"
}

# /users/{user_id} resource for user profile management
resource "aws_api_gateway_resource" "user_profile" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.users.id
  path_part   = "{user_id}"
}

# User Registration Methods (POST /users)
resource "aws_api_gateway_method" "user_registration_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.users.id
  http_method   = "POST"
  authorization = "NONE" # Registration doesn't require authentication

  request_parameters = {
    "method.request.header.Content-Type" = true
  }

  request_validator_id = aws_api_gateway_request_validator.main.id
}

# User Registration OPTIONS method (CORS)
resource "aws_api_gateway_method" "user_registration_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.users.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# User Profile Management Methods (GET, PUT, DELETE /users/{user_id})
resource "aws_api_gateway_method" "user_profile_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.user_profile.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.path.user_id" = true
  }
}

resource "aws_api_gateway_method" "user_profile_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.user_profile.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.path.user_id"        = true
    "method.request.header.Content-Type" = true
  }

  request_validator_id = aws_api_gateway_request_validator.main.id
}

resource "aws_api_gateway_method" "user_profile_delete" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.user_profile.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.path.user_id" = true
  }
}

# User Profile OPTIONS method (CORS)
resource "aws_api_gateway_method" "user_profile_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.user_profile.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Request Validator
resource "aws_api_gateway_request_validator" "main" {
  name                        = "${local.name_prefix}-request-validator"
  rest_api_id                 = aws_api_gateway_rest_api.main.id
  validate_request_body       = true
  validate_request_parameters = true
}

# Lambda Integrations

# User Registration Lambda Integration
resource "aws_api_gateway_integration" "user_registration_integration" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.user_registration_post.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.user_registration.invoke_arn

  depends_on = [aws_api_gateway_method.user_registration_post]
}

# User Registration OPTIONS Integration (CORS)
resource "aws_api_gateway_integration" "user_registration_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.user_registration_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
}

# User Profile Management Lambda Integration
resource "aws_api_gateway_integration" "user_profile_management_integration" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_profile.id
  http_method = aws_api_gateway_method.user_profile_get.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.user_profile_management.invoke_arn

  depends_on = [aws_api_gateway_method.user_profile_get]
}

# Additional integrations for PUT and DELETE
resource "aws_api_gateway_integration" "user_profile_put_integration" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_profile.id
  http_method = aws_api_gateway_method.user_profile_put.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.user_profile_management.invoke_arn

  depends_on = [aws_api_gateway_method.user_profile_put]
}

resource "aws_api_gateway_integration" "user_profile_delete_integration" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_profile.id
  http_method = aws_api_gateway_method.user_profile_delete.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.user_profile_management.invoke_arn

  depends_on = [aws_api_gateway_method.user_profile_delete]
}

# User Profile OPTIONS Integration (CORS)
resource "aws_api_gateway_integration" "user_profile_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_profile.id
  http_method = aws_api_gateway_method.user_profile_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
}

# Method Responses

# User Registration Method Response
resource "aws_api_gateway_method_response" "user_registration_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.user_registration_post.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_method_response" "user_registration_400" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.user_registration_post.http_method
  status_code = "400"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_method_response" "user_registration_409" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.user_registration_post.http_method
  status_code = "409"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_method_response" "user_registration_500" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.user_registration_post.http_method
  status_code = "500"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# User Registration OPTIONS Method Response (CORS)
resource "aws_api_gateway_method_response" "user_registration_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.user_registration_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

# User Profile Method Responses
resource "aws_api_gateway_method_response" "user_profile_get_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_profile.id
  http_method = aws_api_gateway_method.user_profile_get.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_method_response" "user_profile_put_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_profile.id
  http_method = aws_api_gateway_method.user_profile_put.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_method_response" "user_profile_delete_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_profile.id
  http_method = aws_api_gateway_method.user_profile_delete.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

# User Profile OPTIONS Method Response (CORS)
resource "aws_api_gateway_method_response" "user_profile_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_profile.id
  http_method = aws_api_gateway_method.user_profile_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

# Integration Responses

# User Registration Integration Responses
resource "aws_api_gateway_integration_response" "user_registration_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.user_registration_post.http_method
  status_code = aws_api_gateway_method_response.user_registration_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
  }

  depends_on = [aws_api_gateway_integration.user_registration_integration]
}

# User Registration OPTIONS Integration Response (CORS)
resource "aws_api_gateway_integration_response" "user_registration_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.user_registration_options.http_method
  status_code = aws_api_gateway_method_response.user_registration_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
  }

  depends_on = [aws_api_gateway_integration.user_registration_options]
}

# User Profile Integration Responses
resource "aws_api_gateway_integration_response" "user_profile_get_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_profile.id
  http_method = aws_api_gateway_method.user_profile_get.http_method
  status_code = aws_api_gateway_method_response.user_profile_get_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,PUT,DELETE,OPTIONS'"
  }

  depends_on = [aws_api_gateway_integration.user_profile_management_integration]
}

resource "aws_api_gateway_integration_response" "user_profile_put_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_profile.id
  http_method = aws_api_gateway_method.user_profile_put.http_method
  status_code = aws_api_gateway_method_response.user_profile_put_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,PUT,DELETE,OPTIONS'"
  }

  depends_on = [aws_api_gateway_integration.user_profile_put_integration]
}

resource "aws_api_gateway_integration_response" "user_profile_delete_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_profile.id
  http_method = aws_api_gateway_method.user_profile_delete.http_method
  status_code = aws_api_gateway_method_response.user_profile_delete_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,PUT,DELETE,OPTIONS'"
  }

  depends_on = [aws_api_gateway_integration.user_profile_delete_integration]
}

# User Profile OPTIONS Integration Response (CORS)
resource "aws_api_gateway_integration_response" "user_profile_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_profile.id
  http_method = aws_api_gateway_method.user_profile_options.http_method
  status_code = aws_api_gateway_method_response.user_profile_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,PUT,DELETE,OPTIONS'"
  }

  depends_on = [aws_api_gateway_integration.user_profile_options]
}

# Lambda Permissions for API Gateway
resource "aws_lambda_permission" "api_gateway_invoke_user_registration" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.user_registration.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_invoke_user_profile_management" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.user_profile_management.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# API Gateway Usage Plan and API Keys (for rate limiting)
resource "aws_api_gateway_usage_plan" "main" {
  name        = "${local.name_prefix}-usage-plan"
  description = "Usage plan for AI Nexus Workbench API"

  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.main.stage_name
  }

  quota_settings {
    limit  = var.environment == "prod" ? 10000 : 1000 # Requests per period
    period = "DAY"
  }

  throttle_settings {
    rate_limit  = var.environment == "prod" ? 100 : 50  # Requests per second
    burst_limit = var.environment == "prod" ? 200 : 100 # Burst capacity
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-usage-plan"
  })
}

# Custom Domain (optional - if domain_name is provided)
resource "aws_api_gateway_domain_name" "main" {
  count           = var.domain_name != "" && var.acm_certificate_arn != "" ? 1 : 0
  domain_name     = "api-${var.environment}.${var.domain_name}"
  regional_certificate_arn = var.acm_certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-api-domain"
  })
}

# Base Path Mapping (if custom domain is used)
resource "aws_api_gateway_base_path_mapping" "main" {
  count       = var.domain_name != "" && var.acm_certificate_arn != "" ? 1 : 0
  api_id      = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  domain_name = aws_api_gateway_domain_name.main[0].domain_name
}

# WAF Web ACL for API Gateway (optional security layer)
resource "aws_wafv2_web_acl" "api_gateway" {
  count = var.environment == "prod" ? 1 : 0
  name  = "${local.name_prefix}-api-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = 2000 # Requests per 5-minute window
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-RateLimit"
      sampled_requests_enabled   = true
    }

    action {
      block {}
    }
  }

  # AWS Managed Rules
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-CommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-api-waf"
  })

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-WAF"
    sampled_requests_enabled   = true
  }
}

# Associate WAF with API Gateway
resource "aws_wafv2_web_acl_association" "api_gateway" {
  count        = var.environment == "prod" ? 1 : 0
  resource_arn = aws_api_gateway_stage.main.arn
  web_acl_arn  = aws_wafv2_web_acl.api_gateway[0].arn
}

# Outputs
output "api_gateway_rest_api_id" {
  description = "ID of the API Gateway REST API"
  value       = aws_api_gateway_rest_api.main.id
}

output "api_gateway_execution_arn" {
  description = "Execution ARN of the API Gateway REST API"
  value       = aws_api_gateway_rest_api.main.execution_arn
}

output "api_gateway_invoke_url" {
  description = "Invoke URL of the API Gateway"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "api_gateway_stage_name" {
  description = "Name of the API Gateway stage"
  value       = aws_api_gateway_stage.main.stage_name
}

output "api_gateway_custom_domain_name" {
  description = "Custom domain name for the API (if configured)"
  value       = var.domain_name != "" && var.acm_certificate_arn != "" && length(aws_api_gateway_domain_name.main) > 0 ? aws_api_gateway_domain_name.main[0].domain_name : null
}

output "api_gateway_cloudfront_domain_name" {
  description = "CloudFront domain name for the custom domain (if configured)"
  value       = var.domain_name != "" && var.acm_certificate_arn != "" && length(aws_api_gateway_domain_name.main) > 0 ? aws_api_gateway_domain_name.main[0].cloudfront_domain_name : null
}

output "api_gateway_usage_plan_id" {
  description = "ID of the API Gateway usage plan"
  value       = aws_api_gateway_usage_plan.main.id
}
