# ================================================================================
# EDUCATION API - API Gateway Resources Extension
# ================================================================================
# This file extends the existing API Gateway with Education vertical endpoints
# Integrates with existing Cognito authorizer and CORS configuration
# ================================================================================

# Education API Resource - Main endpoint
resource "aws_api_gateway_resource" "education" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  parent_id   = data.aws_api_gateway_rest_api.existing.root_resource_id
  path_part   = "education"
}

# Education API Method - ANY to handle all HTTP methods in Lambda
resource "aws_api_gateway_method" "education_any" {
  rest_api_id   = data.aws_api_gateway_rest_api.existing.id
  resource_id   = aws_api_gateway_resource.education.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = data.aws_api_gateway_authorizer.existing.id

  request_parameters = {
    "method.request.header.Authorization" = true
  }
}

# Education API OPTIONS Method for CORS
resource "aws_api_gateway_method" "education_options" {
  rest_api_id   = data.aws_api_gateway_rest_api.existing.id
  resource_id   = aws_api_gateway_resource.education.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Education Lambda Integration
resource "aws_api_gateway_integration" "education_integration" {
  rest_api_id             = data.aws_api_gateway_rest_api.existing.id
  resource_id             = aws_api_gateway_resource.education.id
  http_method             = aws_api_gateway_method.education_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.education_api.invoke_arn
}

# CORS Integration for Education OPTIONS
resource "aws_api_gateway_integration" "education_options_integration" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  resource_id = aws_api_gateway_resource.education.id
  http_method = aws_api_gateway_method.education_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
}

# OPTIONS Method Response
resource "aws_api_gateway_method_response" "education_options_200" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  resource_id = aws_api_gateway_resource.education.id
  http_method = aws_api_gateway_method.education_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

# OPTIONS Integration Response
resource "aws_api_gateway_integration_response" "education_options_integration_response" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  resource_id = aws_api_gateway_resource.education.id
  http_method = aws_api_gateway_method.education_options.http_method
  status_code = aws_api_gateway_method_response.education_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'${join(",", var.cors_origins)}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'"
    "method.response.header.Access-Control-Allow-Methods" = "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'"
  }
}

# Courses Sub-resource
resource "aws_api_gateway_resource" "education_courses" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  parent_id   = aws_api_gateway_resource.education.id
  path_part   = "courses"
}

# Courses Method
resource "aws_api_gateway_method" "education_courses_any" {
  rest_api_id   = data.aws_api_gateway_rest_api.existing.id
  resource_id   = aws_api_gateway_resource.education_courses.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = data.aws_api_gateway_authorizer.existing.id

  request_parameters = {
    "method.request.header.Authorization" = true
  }
}

# Courses OPTIONS
resource "aws_api_gateway_method" "education_courses_options" {
  rest_api_id   = data.aws_api_gateway_rest_api.existing.id
  resource_id   = aws_api_gateway_resource.education_courses.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Courses Lambda Integration
resource "aws_api_gateway_integration" "education_courses_integration" {
  rest_api_id             = data.aws_api_gateway_rest_api.existing.id
  resource_id             = aws_api_gateway_resource.education_courses.id
  http_method             = aws_api_gateway_method.education_courses_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.education_api.invoke_arn
}

# Courses CORS Integration
resource "aws_api_gateway_integration" "education_courses_options_integration" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  resource_id = aws_api_gateway_resource.education_courses.id
  http_method = aws_api_gateway_method.education_courses_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
}

# Courses OPTIONS Responses (similar pattern)
resource "aws_api_gateway_method_response" "education_courses_options_200" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  resource_id = aws_api_gateway_resource.education_courses.id
  http_method = aws_api_gateway_method.education_courses_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "education_courses_options_integration_response" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  resource_id = aws_api_gateway_resource.education_courses.id
  http_method = aws_api_gateway_method.education_courses_options.http_method
  status_code = aws_api_gateway_method_response.education_courses_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'${join(",", var.cors_origins)}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'"
    "method.response.header.Access-Control-Allow-Methods" = "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'"
  }
}

# Course Detail Resource (courses/{id})
resource "aws_api_gateway_resource" "education_course_detail" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  parent_id   = aws_api_gateway_resource.education_courses.id
  path_part   = "{id}"
}

# Course Detail Method
resource "aws_api_gateway_method" "education_course_detail_any" {
  rest_api_id   = data.aws_api_gateway_rest_api.existing.id
  resource_id   = aws_api_gateway_resource.education_course_detail.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = data.aws_api_gateway_authorizer.existing.id

  request_parameters = {
    "method.request.header.Authorization" = true
    "method.request.path.id"              = true
  }
}

# Course Detail Integration
resource "aws_api_gateway_integration" "education_course_detail_integration" {
  rest_api_id             = data.aws_api_gateway_rest_api.existing.id
  resource_id             = aws_api_gateway_resource.education_course_detail.id
  http_method             = aws_api_gateway_method.education_course_detail_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.education_api.invoke_arn
}

# Lambda permission for API Gateway to invoke Education Lambda
resource "aws_lambda_permission" "education_api_gateway_invoke" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.education_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${data.aws_api_gateway_rest_api.existing.execution_arn}/*/*"
}

# ================================================================================
# DEPLOYMENT INTEGRATION
# ================================================================================

# Trigger redeployment of API Gateway when education resources change
resource "aws_api_gateway_deployment" "education_deployment" {
  depends_on = [
    aws_api_gateway_integration.education_integration,
    aws_api_gateway_integration.education_courses_integration,
    aws_api_gateway_integration.education_course_detail_integration,
    aws_api_gateway_integration.education_options_integration,
    aws_api_gateway_integration.education_courses_options_integration
  ]

  rest_api_id = data.aws_api_gateway_rest_api.existing.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.education.id,
      aws_api_gateway_method.education_any.id,
      aws_api_gateway_integration.education_integration.id,
      aws_api_gateway_resource.education_courses.id,
      aws_api_gateway_method.education_courses_any.id,
      aws_api_gateway_integration.education_courses_integration.id,
      aws_api_gateway_resource.education_course_detail.id,
      aws_api_gateway_method.education_course_detail_any.id,
      aws_api_gateway_integration.education_course_detail_integration.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Update existing stage with new deployment
