# ================================================================================
# EDUCATION API - Lambda Function
# ================================================================================
# This file defines the Lambda function for the Education vertical API
# Includes proper IAM roles, environment variables, and deployment package
# ================================================================================

# Create the Lambda deployment package
data "archive_file" "education_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/education-api"
  output_path = "${path.module}/../lambda/packages/education-api.zip"
  
  depends_on = [null_resource.education_lambda_build]
}

# Build the Lambda function
resource "null_resource" "education_lambda_build" {
  triggers = {
    # Rebuild when source files change
    source_hash = filebase64sha256("${path.module}/../lambda/education-api/index.js")
  }

  provisioner "local-exec" {
    command = <<-EOT
      mkdir -p ${path.module}/../lambda/education-api
      mkdir -p ${path.module}/../lambda/packages
    EOT
  }
}

# Education API Lambda Function
resource "aws_lambda_function" "education_api" {
  filename         = data.archive_file.education_lambda_zip.output_path
  function_name    = "${local.resource_prefix}-education-api"
  role            = aws_iam_role.comprehensive_backend_lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.education_lambda_zip.output_base64sha256

  runtime = local.lambda_config.runtime
  timeout = local.lambda_config.timeout
  memory_size = local.lambda_config.memory_size
  reserved_concurrent_executions = local.lambda_config.reserved_concurrent_executions

  # Environment variables for the Lambda function
  environment {
    variables = merge(local.lambda_config.environment_variables, {
      # DynamoDB table names
      COURSES_TABLE = aws_dynamodb_table.courses.name
      LESSONS_TABLE = aws_dynamodb_table.lessons.name
      ENROLLMENTS_TABLE = aws_dynamodb_table.enrollments.name
      PROGRESS_TABLE = aws_dynamodb_table.lesson_progress.name
      
      # Multi-tenant configuration
      DEFAULT_ORGANIZATION_ID = var.default_organization_id
      ENABLE_TENANT_ISOLATION = var.enable_tenant_isolation ? "true" : "false"
      
      # Feature flags
      ENABLE_DEBUG_MODE = var.enable_debug_mode ? "true" : "false"
      CREATE_TEST_DATA = var.create_test_data ? "true" : "false"
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
    target_arn = aws_sqs_queue.education_dlq.arn
  }

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-education-api"
    Function = "education-api"
  })

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.education_dynamodb_policy_attachment,
    aws_cloudwatch_log_group.comprehensive_backend_logs
  ]
}

# CloudWatch Log Group for Education Lambda
resource "aws_cloudwatch_log_group" "education_lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.education_api.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-education-lambda-logs"
  })
}

# Dead Letter Queue for failed executions
resource "aws_sqs_queue" "education_dlq" {
  name = "${local.resource_prefix}-education-dlq"

  # Message retention for 14 days
  message_retention_seconds = 1209600

  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-education-dlq"
    Purpose = "dead-letter-queue"
  })
}


# ================================================================================
# IAM POLICIES FOR EDUCATION LAMBDA
# ================================================================================

# Attach Education DynamoDB policy to Lambda role
resource "aws_iam_role_policy_attachment" "education_dynamodb_policy_attachment" {
  role       = aws_iam_role.comprehensive_backend_lambda_role.name
  policy_arn = aws_iam_policy.dynamodb_education_policy.arn
}

# Additional CloudWatch Logs policy
resource "aws_iam_role_policy" "education_lambda_logs" {
  name = "${local.resource_prefix}-education-lambda-logs"
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
          aws_cloudwatch_log_group.education_lambda_logs.arn,
          "${aws_cloudwatch_log_group.education_lambda_logs.arn}:*"
        ]
      }
    ]
  })
}

# SQS policy for dead letter queue
resource "aws_iam_role_policy" "education_lambda_sqs" {
  name = "${local.resource_prefix}-education-lambda-sqs"
  role = aws_iam_role.comprehensive_backend_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.education_dlq.arn
      }
    ]
  })
}

# X-Ray tracing policy (if enabled)
resource "aws_iam_role_policy" "education_lambda_xray" {
  count = var.enable_xray_tracing ? 1 : 0
  name  = "${local.resource_prefix}-education-lambda-xray"
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

output "education_lambda_info" {
  description = "Information about the Education Lambda function"
  value = {
    function_name = aws_lambda_function.education_api.function_name
    function_arn  = aws_lambda_function.education_api.arn
    invoke_arn    = aws_lambda_function.education_api.invoke_arn
    log_group     = aws_cloudwatch_log_group.education_lambda_logs.name
    dlq_url       = aws_sqs_queue.education_dlq.id
  }
}
