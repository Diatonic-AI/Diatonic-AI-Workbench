# AI Nexus Workbench - Main API Lambda Configuration
# Handles comprehensive API including webhooks, billing, and all core functionality

# ZIP archive for the main API Lambda
data "archive_file" "main_api_zip" {
  type        = "zip"
  output_path = "${path.module}/main-api.zip"
  
  source_dir  = "${path.module}/../lambda"
  excludes = [
    "*.map",
    "tests",
    "*.test.*",
    "jest.config.js",
    ".env*",
    "**/.git/**",
    "**/tests/**",
    "**/coverage/**",
    "**/*.md",
    "**/README*",
    "**/CHANGELOG*",
    "**/LICENSE*"
  ]
}

# Main API Lambda Function
resource "aws_lambda_function" "main_api" {
  filename         = data.archive_file.main_api_zip.output_path
  function_name    = "${local.name_prefix}-main-api"
  role            = aws_iam_role.main_api_lambda_role.arn
  handler         = "api/handler.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 512
  
  source_code_hash = data.archive_file.main_api_zip.output_base64sha256
  
  environment {
    variables = {
      # DynamoDB Tables - Legacy
      USER_PROFILES_TABLE = aws_dynamodb_table.user_profiles.name
      SYSTEM_LOGS_TABLE   = aws_dynamodb_table.system_logs.name
      USER_SESSIONS_TABLE = aws_dynamodb_table.user_sessions.name
      
      # DynamoDB Tables - Enhanced Permissions System
      USERS_TABLE                   = aws_dynamodb_table.users.name
      USER_PERMISSIONS_TABLE        = aws_dynamodb_table.user_permissions.name
      ROLES_TABLE                   = aws_dynamodb_table.roles.name
      ROLE_PERMISSIONS_TABLE        = aws_dynamodb_table.role_permissions.name
      SUBSCRIPTION_LIMITS_TABLE     = aws_dynamodb_table.subscription_limits.name
      USER_QUOTAS_TABLE            = aws_dynamodb_table.user_quotas.name
      COGNITO_GROUP_MAPPINGS_TABLE  = aws_dynamodb_table.cognito_group_mappings.name
      ORGANIZATION_SETTINGS_TABLE   = aws_dynamodb_table.organization_settings.name
      TEAM_MEMBERSHIPS_TABLE        = aws_dynamodb_table.team_memberships.name
      SUBSCRIPTION_BILLING_TABLE    = aws_dynamodb_table.subscription_billing.name
      
      # Cognito
      USER_POOL_ID        = aws_cognito_user_pool.main.id
      USER_POOL_CLIENT_ID = aws_cognito_user_pool_client.web_client.id
      
      # Environment
      NODE_ENV           = var.environment
      # AWS_REGION is automatically provided by Lambda runtime
      ENVIRONMENT        = var.environment
      
      # CORS Configuration
      CORS_ORIGINS       = jsonencode(var.environment == "prod" ? 
        ["https://${var.domain_name}", "https://www.${var.domain_name}"] : 
        ["http://localhost:3000", "http://localhost:5173", "*"]
      )
      
      # API Configuration
      API_VERSION        = "v1"
      LOG_LEVEL         = var.environment == "prod" ? "INFO" : "DEBUG"
      
      # Secrets Manager - References (actual values retrieved at runtime)
      STRIPE_SECRET_PATH = "/ai-nexus/diatonicvisuals/stripe/secret_key"
      STRIPE_WEBHOOK_SECRET_PATH = "/ai-nexus/diatonicvisuals/stripe/webhook_signing_secret"
    }
  }
  
  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }
  
  tracing_config {
    mode = "Active" # Enable X-Ray tracing
  }
  
  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-main-api"
    Purpose = "Main API handler with webhook support"
  })
}

# IAM Role for Main API Lambda
resource "aws_iam_role" "main_api_lambda_role" {
  name = "${local.name_prefix}-main-api-lambda-role"
  
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
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-main-api-lambda-role"
  })
}

# Basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "main_api_lambda_basic_execution" {
  role       = aws_iam_role.main_api_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# X-Ray tracing policy
resource "aws_iam_role_policy_attachment" "main_api_lambda_xray" {
  role       = aws_iam_role.main_api_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# Custom policy for Main API Lambda
resource "aws_iam_policy" "main_api_lambda_policy" {
  name        = "${local.name_prefix}-main-api-lambda-policy"
  description = "Policy for Main API Lambda function"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # DynamoDB access
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          # Legacy tables
          aws_dynamodb_table.user_profiles.arn,
          aws_dynamodb_table.system_logs.arn,
          aws_dynamodb_table.user_sessions.arn,
          "${aws_dynamodb_table.user_profiles.arn}/index/*",
          "${aws_dynamodb_table.system_logs.arn}/index/*",
          "${aws_dynamodb_table.user_sessions.arn}/index/*",
          
          # Enhanced permissions tables
          aws_dynamodb_table.users.arn,
          aws_dynamodb_table.user_permissions.arn,
          aws_dynamodb_table.roles.arn,
          aws_dynamodb_table.role_permissions.arn,
          aws_dynamodb_table.subscription_limits.arn,
          aws_dynamodb_table.user_quotas.arn,
          aws_dynamodb_table.cognito_group_mappings.arn,
          aws_dynamodb_table.organization_settings.arn,
          aws_dynamodb_table.team_memberships.arn,
          aws_dynamodb_table.subscription_billing.arn,
          "${aws_dynamodb_table.users.arn}/index/*",
          "${aws_dynamodb_table.user_permissions.arn}/index/*",
          "${aws_dynamodb_table.roles.arn}/index/*",
          "${aws_dynamodb_table.role_permissions.arn}/index/*",
          "${aws_dynamodb_table.subscription_limits.arn}/index/*",
          "${aws_dynamodb_table.user_quotas.arn}/index/*",
          "${aws_dynamodb_table.cognito_group_mappings.arn}/index/*",
          "${aws_dynamodb_table.organization_settings.arn}/index/*",
          "${aws_dynamodb_table.team_memberships.arn}/index/*",
          "${aws_dynamodb_table.subscription_billing.arn}/index/*"
        ]
      },
      
      # Secrets Manager access
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:*:secret:/ai-nexus/diatonicvisuals/stripe/*"
        ]
      },
      
      # S3 access (for file uploads/downloads)
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion"
        ]
        Resource = [
          "arn:aws:s3:::${local.name_prefix}-*/*"
        ]
      },
      
      # EventBridge access (for domain events)
      {
        Effect = "Allow"
        Action = [
          "events:PutEvents"
        ]
        Resource = [
          "arn:aws:events:${var.aws_region}:*:event-bus/${local.name_prefix}-*"
        ]
      },
      
      # Cognito access
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminListGroupsForUser",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminRemoveUserFromGroup",
          "cognito-idp:ListUsers"
        ]
        Resource = [
          aws_cognito_user_pool.main.arn
        ]
      },
      
      # SQS access (for DLQ)
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = [
          aws_sqs_queue.lambda_dlq.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "main_api_lambda_policy" {
  role       = aws_iam_role.main_api_lambda_role.name
  policy_arn = aws_iam_policy.main_api_lambda_policy.arn
}

# Dead Letter Queue for Lambda
resource "aws_sqs_queue" "lambda_dlq" {
  name = "${local.name_prefix}-lambda-dlq"
  
  message_retention_seconds = 1209600 # 14 days
  visibility_timeout_seconds = 60
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-lambda-dlq"
  })
}

# Main API Gateway REST API
resource "aws_api_gateway_rest_api" "main_api" {
  name        = "${local.name_prefix}-main-api"
  description = "AI Nexus Workbench Main API - handles all core functionality including webhooks"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
  
  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-main-api-gateway"
    Purpose = "Main API with webhook support"
  })
}

# API Gateway proxy resource (catch-all)
resource "aws_api_gateway_resource" "main_api_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main_api.id
  parent_id   = aws_api_gateway_rest_api.main_api.root_resource_id
  path_part   = "{proxy+}"
}

# API Gateway proxy method (ANY)
resource "aws_api_gateway_method" "main_api_proxy" {
  rest_api_id   = aws_api_gateway_rest_api.main_api.id
  resource_id   = aws_api_gateway_resource.main_api_proxy.id
  http_method   = "ANY"
  authorization = "NONE" # Authorization handled in Lambda
  
  request_parameters = {
    "method.request.path.proxy" = true
  }
}

# API Gateway root OPTIONS method (CORS)
resource "aws_api_gateway_method" "main_api_options" {
  rest_api_id   = aws_api_gateway_rest_api.main_api.id
  resource_id   = aws_api_gateway_rest_api.main_api.root_resource_id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# API Gateway proxy integration
resource "aws_api_gateway_integration" "main_api_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main_api.id
  resource_id = aws_api_gateway_resource.main_api_proxy.id
  http_method = aws_api_gateway_method.main_api_proxy.http_method
  
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.main_api.invoke_arn
}

# API Gateway OPTIONS integration (CORS)
resource "aws_api_gateway_integration" "main_api_options" {
  rest_api_id = aws_api_gateway_rest_api.main_api.id
  resource_id = aws_api_gateway_rest_api.main_api.root_resource_id
  http_method = aws_api_gateway_method.main_api_options.http_method
  
  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
}

# API Gateway method response for OPTIONS (CORS)
resource "aws_api_gateway_method_response" "main_api_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main_api.id
  resource_id = aws_api_gateway_rest_api.main_api.root_resource_id
  http_method = aws_api_gateway_method.main_api_options.http_method
  status_code = "200"
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

# API Gateway integration response for OPTIONS (CORS)
resource "aws_api_gateway_integration_response" "main_api_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main_api.id
  resource_id = aws_api_gateway_rest_api.main_api.root_resource_id
  http_method = aws_api_gateway_method.main_api_options.http_method
  status_code = aws_api_gateway_method_response.main_api_options_200.status_code
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Request-ID'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,PATCH,DELETE,OPTIONS'"
  }
  
  depends_on = [aws_api_gateway_integration.main_api_options]
}

# API Gateway deployment
resource "aws_api_gateway_deployment" "main_api" {
  rest_api_id = aws_api_gateway_rest_api.main_api.id
  
  depends_on = [
    aws_api_gateway_method.main_api_proxy,
    aws_api_gateway_method.main_api_options,
    aws_api_gateway_integration.main_api_proxy,
    aws_api_gateway_integration.main_api_options
  ]
  
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.main_api_proxy.id,
      aws_api_gateway_method.main_api_proxy.id,
      aws_api_gateway_integration.main_api_proxy.id,
    ]))
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway stage
resource "aws_api_gateway_stage" "main_api" {
  deployment_id = aws_api_gateway_deployment.main_api.id
  rest_api_id   = aws_api_gateway_rest_api.main_api.id
  stage_name    = var.environment
  
  # Enable detailed CloudWatch metrics
  xray_tracing_enabled = true
  
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.main_api_gateway_logs.arn
    format = jsonencode({
      requestId        = "$context.requestId"
      extendedRequestId = "$context.extendedRequestId"
      ip               = "$context.identity.sourceIp"
      caller           = "$context.identity.caller"
      user             = "$context.identity.user"
      requestTime      = "$context.requestTime"
      httpMethod       = "$context.httpMethod"
      resourcePath     = "$context.resourcePath"
      status           = "$context.status"
      protocol         = "$context.protocol"
      responseLength   = "$context.responseLength"
      error            = "$context.error.message"
      integrationError = "$context.integration.error"
      integrationStatus = "$context.integration.status"
      integrationLatency = "$context.integration.latency"
      responseLatency  = "$context.responseLatency"
    })
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-main-api-stage-${var.environment}"
  })
}

# CloudWatch Log Group for Main API Gateway
resource "aws_cloudwatch_log_group" "main_api_gateway_logs" {
  name              = "/aws/apigateway/${local.name_prefix}-main-api"
  retention_in_days = var.environment == "prod" ? 90 : 30
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-main-api-gateway-logs"
  })
}

# Lambda permission for API Gateway to invoke main API
resource "aws_lambda_permission" "main_api_gateway_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main_api.execution_arn}/*/*"
}

# Custom domain name for Main API (if domain provided)
resource "aws_api_gateway_domain_name" "main_api" {
  count           = var.domain_name != "" && var.acm_certificate_arn != "" ? 1 : 0
  domain_name     = "api.${var.domain_name}"
  certificate_arn = "arn:aws:acm:us-east-1:313476888312:certificate/108aeeb9-35ed-4407-85ce-36543c6b8e15"
  
  endpoint_configuration {
    types = ["EDGE"]
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-main-api-domain"
  })
}

# Base path mapping for custom domain
resource "aws_api_gateway_base_path_mapping" "main_api" {
  count       = var.domain_name != "" && var.acm_certificate_arn != "" ? 1 : 0
  api_id      = aws_api_gateway_rest_api.main_api.id
  stage_name  = aws_api_gateway_stage.main_api.stage_name
  domain_name = aws_api_gateway_domain_name.main_api[0].domain_name
}

# Usage Plan for Main API
resource "aws_api_gateway_usage_plan" "main_api" {
  name        = "${local.name_prefix}-main-api-usage-plan"
  description = "Usage plan for AI Nexus Workbench Main API"
  
  api_stages {
    api_id = aws_api_gateway_rest_api.main_api.id
    stage  = aws_api_gateway_stage.main_api.stage_name
  }
  
  quota_settings {
    limit  = var.environment == "prod" ? 100000 : 10000 # Requests per period
    period = "DAY"
  }
  
  throttle_settings {
    rate_limit  = var.environment == "prod" ? 1000 : 100  # Requests per second
    burst_limit = var.environment == "prod" ? 2000 : 200  # Burst capacity
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-main-api-usage-plan"
  })
}

# Outputs for Main API
output "main_api_gateway_id" {
  description = "ID of the Main API Gateway"
  value       = aws_api_gateway_rest_api.main_api.id
}

output "main_api_gateway_execution_arn" {
  description = "Execution ARN of the Main API Gateway"
  value       = aws_api_gateway_rest_api.main_api.execution_arn
}

output "main_api_invoke_url" {
  description = "Invoke URL of the Main API Gateway"
  value       = aws_api_gateway_stage.main_api.invoke_url
}

output "main_api_custom_domain" {
  description = "Custom domain for the Main API (if configured)"
  value       = var.domain_name != "" ? "https://api.${var.domain_name}" : null
}

output "stripe_webhook_url" {
  description = "URL for Stripe webhooks"
  value = "${aws_api_gateway_stage.main_api.invoke_url}/v1/webhooks/stripe"
}

output "main_api_lambda_function_name" {
  description = "Name of the Main API Lambda function"
  value       = aws_lambda_function.main_api.function_name
}
