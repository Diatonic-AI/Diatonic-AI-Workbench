# AI Nexus Workbench - Lead Management Lambda Function
# Handles lead capture, qualification, and sales pipeline operations

# Lambda execution role for leads
resource "aws_iam_role" "lambda_leads_role" {
  name = "${local.name_prefix}-lambda-leads-role"

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

# IAM policy for leads Lambda
resource "aws_iam_role_policy" "lambda_leads_policy" {
  name = "${local.name_prefix}-lambda-leads-policy"
  role = aws_iam_role.lambda_leads_role.id

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
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.name_prefix}-leads:*"
      },
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
          aws_dynamodb_table.leads.arn,
          "${aws_dynamodb_table.leads.arn}/*",
          aws_dynamodb_table.lead_activities.arn,
          "${aws_dynamodb_table.lead_activities.arn}/*"
        ]
      }
    ]
  })
}

# Archive Lambda source code
data "archive_file" "lambda_leads_zip" {
  type        = "zip"
  source_dir  = "../backend/lambda-leads"
  output_path = "../backend/lambda-leads.zip"
}

# Lead Management Lambda Function
resource "aws_lambda_function" "leads" {
  filename         = data.archive_file.lambda_leads_zip.output_path
  function_name    = "${local.name_prefix}-leads"
  role            = aws_iam_role.lambda_leads_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 256
  source_code_hash = data.archive_file.lambda_leads_zip.output_base64sha256

  environment {
    variables = {
      LEADS_TABLE            = aws_dynamodb_table.leads.name
      LEAD_ACTIVITIES_TABLE  = aws_dynamodb_table.lead_activities.name
      FRONTEND_URL          = var.environment == "prod" ? "https://${var.domain_name}" : "http://localhost:3000"
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-leads"
    Purpose = "Lead management and sales pipeline operations"
  })

  depends_on = [
    aws_iam_role_policy.lambda_leads_policy,
    aws_cloudwatch_log_group.lambda_leads_logs
  ]
}

# CloudWatch Log Group for leads Lambda
resource "aws_cloudwatch_log_group" "lambda_leads_logs" {
  name              = "/aws/lambda/${local.name_prefix}-leads"
  retention_in_days = var.environment == "prod" ? 30 : 14

  tags = local.common_tags
}

# API Gateway Integration for leads
resource "aws_api_gateway_resource" "leads" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "leads"
}

# Leads collection methods (POST /leads, GET /leads)
resource "aws_api_gateway_method" "leads_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.leads.id
  http_method   = "POST"
  authorization = "NONE"

  request_parameters = {
    "method.request.header.Content-Type" = true
  }
}

resource "aws_api_gateway_method" "leads_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.leads.id
  http_method   = "GET"
  authorization = "NONE"

  request_parameters = {
    "method.request.querystring.status"      = false
    "method.request.querystring.limit"       = false
    "method.request.querystring.lastKey"     = false
    "method.request.querystring.company"     = false
    "method.request.querystring.priority_min" = false
  }
}

resource "aws_api_gateway_method" "leads_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.leads.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Individual lead resource (GET /leads/{leadId}, PUT /leads/{leadId})
resource "aws_api_gateway_resource" "lead_individual" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.leads.id
  path_part   = "{leadId}"
}

resource "aws_api_gateway_method" "lead_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.lead_individual.id
  http_method   = "GET"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.leadId" = true
  }
}

resource "aws_api_gateway_method" "lead_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.lead_individual.id
  http_method   = "PUT"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.leadId" = true
    "method.request.header.Content-Type" = true
  }
}

resource "aws_api_gateway_method" "lead_individual_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.lead_individual.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Lead analytics resource (GET /leads/analytics)
resource "aws_api_gateway_resource" "lead_analytics" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.leads.id
  path_part   = "analytics"
}

resource "aws_api_gateway_method" "lead_analytics_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.lead_analytics.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "lead_analytics_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.lead_analytics.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Lambda integrations for all methods
resource "aws_api_gateway_integration" "leads_post_integration" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.leads.id
  http_method = aws_api_gateway_method.leads_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.leads.invoke_arn
}

resource "aws_api_gateway_integration" "leads_get_integration" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.leads.id
  http_method = aws_api_gateway_method.leads_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.leads.invoke_arn
}

resource "aws_api_gateway_integration" "leads_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.leads.id
  http_method = aws_api_gateway_method.leads_options.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.leads.invoke_arn
}

resource "aws_api_gateway_integration" "lead_get_integration" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.lead_individual.id
  http_method = aws_api_gateway_method.lead_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.leads.invoke_arn
}

resource "aws_api_gateway_integration" "lead_put_integration" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.lead_individual.id
  http_method = aws_api_gateway_method.lead_put.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.leads.invoke_arn
}

resource "aws_api_gateway_integration" "lead_individual_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.lead_individual.id
  http_method = aws_api_gateway_method.lead_individual_options.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.leads.invoke_arn
}

resource "aws_api_gateway_integration" "lead_analytics_get_integration" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.lead_analytics.id
  http_method = aws_api_gateway_method.lead_analytics_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.leads.invoke_arn
}

resource "aws_api_gateway_integration" "lead_analytics_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.lead_analytics.id
  http_method = aws_api_gateway_method.lead_analytics_options.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.leads.invoke_arn
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "api_gateway_leads" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.leads.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# Method responses for proper CORS
resource "aws_api_gateway_method_response" "leads_post_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.leads.id
  http_method = aws_api_gateway_method.leads_post.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"      = true
    "method.response.header.Access-Control-Allow-Headers"     = true
    "method.response.header.Access-Control-Allow-Methods"     = true
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_method_response" "leads_get_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.leads.id
  http_method = aws_api_gateway_method.leads_get.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"      = true
    "method.response.header.Access-Control-Allow-Headers"     = true
    "method.response.header.Access-Control-Allow-Methods"     = true
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_method_response" "leads_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.leads.id
  http_method = aws_api_gateway_method.leads_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"      = true
    "method.response.header.Access-Control-Allow-Headers"     = true
    "method.response.header.Access-Control-Allow-Methods"     = true
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_method_response" "lead_get_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.lead_individual.id
  http_method = aws_api_gateway_method.lead_get.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"      = true
    "method.response.header.Access-Control-Allow-Headers"     = true
    "method.response.header.Access-Control-Allow-Methods"     = true
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_method_response" "lead_put_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.lead_individual.id
  http_method = aws_api_gateway_method.lead_put.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"      = true
    "method.response.header.Access-Control-Allow-Headers"     = true
    "method.response.header.Access-Control-Allow-Methods"     = true
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_method_response" "lead_individual_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.lead_individual.id
  http_method = aws_api_gateway_method.lead_individual_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"      = true
    "method.response.header.Access-Control-Allow-Headers"     = true
    "method.response.header.Access-Control-Allow-Methods"     = true
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_method_response" "lead_analytics_get_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.lead_analytics.id
  http_method = aws_api_gateway_method.lead_analytics_get.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"      = true
    "method.response.header.Access-Control-Allow-Headers"     = true
    "method.response.header.Access-Control-Allow-Methods"     = true
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_method_response" "lead_analytics_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.lead_analytics.id
  http_method = aws_api_gateway_method.lead_analytics_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"      = true
    "method.response.header.Access-Control-Allow-Headers"     = true
    "method.response.header.Access-Control-Allow-Methods"     = true
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

# Outputs
output "leads_lambda" {
  description = "Lead management Lambda function information"
  value = {
    function_name = aws_lambda_function.leads.function_name
    arn          = aws_lambda_function.leads.arn
  }
}

output "leads_api_endpoints" {
  description = "Lead management API endpoints"
  value = {
    base_url      = "${aws_api_gateway_deployment.main.invoke_url}${aws_api_gateway_stage.main.stage_name}"
    create_lead   = "${aws_api_gateway_deployment.main.invoke_url}${aws_api_gateway_stage.main.stage_name}/leads"
    list_leads    = "${aws_api_gateway_deployment.main.invoke_url}${aws_api_gateway_stage.main.stage_name}/leads"
    get_lead      = "${aws_api_gateway_deployment.main.invoke_url}${aws_api_gateway_stage.main.stage_name}/leads/{leadId}"
    update_lead   = "${aws_api_gateway_deployment.main.invoke_url}${aws_api_gateway_stage.main.stage_name}/leads/{leadId}"
    analytics     = "${aws_api_gateway_deployment.main.invoke_url}${aws_api_gateway_stage.main.stage_name}/leads/analytics"
  }
}