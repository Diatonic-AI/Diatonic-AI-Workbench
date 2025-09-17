# ================================================================================
# COMMUNITY API - Lightweight Lambda Function
# ================================================================================
# This file defines the lightweight Community API Lambda function
# Uses AWS SDK v3 provided by Lambda runtime (no dependencies to bundle)
# ================================================================================

# Create the Lambda deployment package (no node_modules needed)
data "archive_file" "community_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/community-api-clean"
  output_path = "${path.module}/../lambda/packages/community-api-clean.zip"
  
  depends_on = [null_resource.community_lambda_build]
}

# Build the Lambda function (minimal setup)
resource "null_resource" "community_lambda_build" {
  triggers = {
    # Rebuild when source files change
    source_hash = filebase64sha256("${path.module}/../lambda/community-api-clean/index.js")
  }

  provisioner "local-exec" {
    command = <<-EOT
      mkdir -p ${path.module}/../lambda/packages
      echo "Community API Lambda function prepared for packaging"
    EOT
  }
}

# Community API Lambda Function
resource "aws_lambda_function" "community_api" {
  filename         = data.archive_file.community_lambda_zip.output_path
  function_name    = "${local.resource_prefix}-community-api"
  role            = aws_iam_role.comprehensive_backend_lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.community_lambda_zip.output_base64sha256

  runtime = local.lambda_config.runtime
  timeout = local.lambda_config.timeout
  memory_size = local.lambda_config.memory_size
  reserved_concurrent_executions = local.lambda_config.reserved_concurrent_executions

  # Environment variables for the Lambda function
  environment {
    variables = merge(local.lambda_config.environment_variables, {
      # DynamoDB table names
      POSTS_TABLE = aws_dynamodb_table.community_posts.name
      COMMENTS_TABLE = aws_dynamodb_table.community_comments.name
      
      # Multi-tenant configuration
      DEFAULT_ORGANIZATION_ID = var.default_organization_id
      ENABLE_TENANT_ISOLATION = var.enable_tenant_isolation ? "true" : "false"
      
      # Feature flags
      ENABLE_DEBUG_MODE = var.enable_debug_mode ? "true" : "false"
    })
  }

  # Enable X-Ray tracing if configured
  dynamic "tracing_config" {
    for_each = var.enable_xray_tracing ? [1] : []
    content {
      mode = "Active"
    }
  }

  # Dead letter configuration
  dead_letter_config {
    target_arn = aws_sqs_queue.community_dlq.arn
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-community-api"
    Function = "community-api"
  })

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.community_dynamodb_policy_attachment,
    aws_cloudwatch_log_group.comprehensive_backend_logs
  ]
}

# CloudWatch Log Group for Community Lambda
resource "aws_cloudwatch_log_group" "community_lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.community_api.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-community-lambda-logs"
  })
}

# Dead Letter Queue for failed executions
resource "aws_sqs_queue" "community_dlq" {
  name = "${local.resource_prefix}-community-dlq"

  # Message retention for 14 days
  message_retention_seconds = 1209600

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-community-dlq"
    Purpose = "dead-letter-queue"
  })
}

# ================================================================================
# IAM POLICIES FOR COMMUNITY LAMBDA
# ================================================================================

# Attach Community DynamoDB policy to Lambda role
resource "aws_iam_role_policy_attachment" "community_dynamodb_policy_attachment" {
  role       = aws_iam_role.comprehensive_backend_lambda_role.name
  policy_arn = aws_iam_policy.dynamodb_community_policy.arn
}

# CloudWatch Logs policy
resource "aws_iam_role_policy" "community_lambda_logs" {
  name = "${local.resource_prefix}-community-lambda-logs"
  role = aws_iam_role.comprehensive_backend_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          aws_cloudwatch_log_group.community_lambda_logs.arn,
          "${aws_cloudwatch_log_group.community_lambda_logs.arn}:*"
        ]
      }
    ]
  })
}

# SQS policy for dead letter queue
resource "aws_iam_role_policy" "community_lambda_sqs" {
  name = "${local.resource_prefix}-community-lambda-sqs"
  role = aws_iam_role.comprehensive_backend_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.community_dlq.arn
      }
    ]
  })
}

# X-Ray tracing policy (if enabled)
resource "aws_iam_role_policy" "community_lambda_xray" {
  count = var.enable_xray_tracing ? 1 : 0
  name  = "${local.resource_prefix}-community-lambda-xray"
  role  = aws_iam_role.comprehensive_backend_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      }
    ]
  })
}

# ================================================================================
# LAMBDA FUNCTION OUTPUTS
# ================================================================================

output "community_lambda_info" {
  description = "Information about the Community Lambda function"
  value = {
    function_name = aws_lambda_function.community_api.function_name
    function_arn  = aws_lambda_function.community_api.arn
    invoke_arn    = aws_lambda_function.community_api.invoke_arn
    log_group     = aws_cloudwatch_log_group.community_lambda_logs.name
    dlq_url       = aws_sqs_queue.community_dlq.id
  }
}
