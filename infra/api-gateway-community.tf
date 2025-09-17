# ================================================================================
# COMMUNITY API - API Gateway Resources
# ================================================================================
# This file extends the existing API Gateway with Community vertical endpoints
# Integrates with existing Cognito authorizer and CORS configuration
# ================================================================================

# Community API Resource - Main endpoint
resource "aws_api_gateway_resource" "community" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  parent_id   = data.aws_api_gateway_rest_api.existing.root_resource_id
  path_part   = "community"
}

# Community API Method - ANY to handle all HTTP methods in Lambda
resource "aws_api_gateway_method" "community_any" {
  rest_api_id   = data.aws_api_gateway_rest_api.existing.id
  resource_id   = aws_api_gateway_resource.community.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = data.aws_api_gateway_authorizer.existing.id

  request_parameters = {
    "method.request.header.Authorization" = true
  }
}

# Community API OPTIONS Method for CORS
resource "aws_api_gateway_method" "community_options" {
  rest_api_id   = data.aws_api_gateway_rest_api.existing.id
  resource_id   = aws_api_gateway_resource.community.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Community Lambda Integration
resource "aws_api_gateway_integration" "community_integration" {
  rest_api_id             = data.aws_api_gateway_rest_api.existing.id
  resource_id             = aws_api_gateway_resource.community.id
  http_method             = aws_api_gateway_method.community_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.community_api.invoke_arn
}

# CORS Integration for Community OPTIONS
resource "aws_api_gateway_integration" "community_options_integration" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  resource_id = aws_api_gateway_resource.community.id
  http_method = aws_api_gateway_method.community_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
}

# OPTIONS Method Response
resource "aws_api_gateway_method_response" "community_options_200" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  resource_id = aws_api_gateway_resource.community.id
  http_method = aws_api_gateway_method.community_options.http_method
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
resource "aws_api_gateway_integration_response" "community_options_integration_response" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  resource_id = aws_api_gateway_resource.community.id
  http_method = aws_api_gateway_method.community_options.http_method
  status_code = aws_api_gateway_method_response.community_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'${join(",", var.cors_origins)}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'"
    "method.response.header.Access-Control-Allow-Methods" = "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'"
  }
}

# Posts Sub-resource
resource "aws_api_gateway_resource" "community_posts" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  parent_id   = aws_api_gateway_resource.community.id
  path_part   = "posts"
}

# Posts Method
resource "aws_api_gateway_method" "community_posts_any" {
  rest_api_id   = data.aws_api_gateway_rest_api.existing.id
  resource_id   = aws_api_gateway_resource.community_posts.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = data.aws_api_gateway_authorizer.existing.id

  request_parameters = {
    "method.request.header.Authorization" = true
  }
}

# Posts OPTIONS
resource "aws_api_gateway_method" "community_posts_options" {
  rest_api_id   = data.aws_api_gateway_rest_api.existing.id
  resource_id   = aws_api_gateway_resource.community_posts.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Posts Lambda Integration
resource "aws_api_gateway_integration" "community_posts_integration" {
  rest_api_id             = data.aws_api_gateway_rest_api.existing.id
  resource_id             = aws_api_gateway_resource.community_posts.id
  http_method             = aws_api_gateway_method.community_posts_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.community_api.invoke_arn
}

# Posts CORS Integration
resource "aws_api_gateway_integration" "community_posts_options_integration" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  resource_id = aws_api_gateway_resource.community_posts.id
  http_method = aws_api_gateway_method.community_posts_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
}

# Posts OPTIONS Responses
resource "aws_api_gateway_method_response" "community_posts_options_200" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  resource_id = aws_api_gateway_resource.community_posts.id
  http_method = aws_api_gateway_method.community_posts_options.http_method
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

resource "aws_api_gateway_integration_response" "community_posts_options_integration_response" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  resource_id = aws_api_gateway_resource.community_posts.id
  http_method = aws_api_gateway_method.community_posts_options.http_method
  status_code = aws_api_gateway_method_response.community_posts_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'${join(",", var.cors_origins)}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'"
    "method.response.header.Access-Control-Allow-Methods" = "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'"
  }
}

# Post Detail Resource (posts/{id})
resource "aws_api_gateway_resource" "community_post_detail" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  parent_id   = aws_api_gateway_resource.community_posts.id
  path_part   = "{id}"
}

# Post Detail Method
resource "aws_api_gateway_method" "community_post_detail_any" {
  rest_api_id   = data.aws_api_gateway_rest_api.existing.id
  resource_id   = aws_api_gateway_resource.community_post_detail.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = data.aws_api_gateway_authorizer.existing.id

  request_parameters = {
    "method.request.header.Authorization" = true
    "method.request.path.id"              = true
  }
}

# Post Detail Integration
resource "aws_api_gateway_integration" "community_post_detail_integration" {
  rest_api_id             = data.aws_api_gateway_rest_api.existing.id
  resource_id             = aws_api_gateway_resource.community_post_detail.id
  http_method             = aws_api_gateway_method.community_post_detail_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.community_api.invoke_arn
}

# Comments Sub-resource (posts/{id}/comments)
resource "aws_api_gateway_resource" "community_post_comments" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  parent_id   = aws_api_gateway_resource.community_post_detail.id
  path_part   = "comments"
}

# Comments Method
resource "aws_api_gateway_method" "community_post_comments_any" {
  rest_api_id   = data.aws_api_gateway_rest_api.existing.id
  resource_id   = aws_api_gateway_resource.community_post_comments.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = data.aws_api_gateway_authorizer.existing.id

  request_parameters = {
    "method.request.header.Authorization" = true
    "method.request.path.id"              = true
  }
}

# Comments Integration
resource "aws_api_gateway_integration" "community_post_comments_integration" {
  rest_api_id             = data.aws_api_gateway_rest_api.existing.id
  resource_id             = aws_api_gateway_resource.community_post_comments.id
  http_method             = aws_api_gateway_method.community_post_comments_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.community_api.invoke_arn
}

# Lambda permission for API Gateway to invoke Community Lambda
resource "aws_lambda_permission" "community_api_gateway_invoke" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.community_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${data.aws_api_gateway_rest_api.existing.execution_arn}/*/*"
}

# ================================================================================
# DEPLOYMENT INTEGRATION
# ================================================================================

# Trigger redeployment of API Gateway when community resources change
resource "aws_api_gateway_deployment" "community_deployment" {
  depends_on = [
    aws_api_gateway_integration.community_integration,
    aws_api_gateway_integration.community_posts_integration,
    aws_api_gateway_integration.community_post_detail_integration,
    aws_api_gateway_integration.community_post_comments_integration,
    aws_api_gateway_integration.community_options_integration,
    aws_api_gateway_integration.community_posts_options_integration
  ]

  rest_api_id = data.aws_api_gateway_rest_api.existing.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.community.id,
      aws_api_gateway_method.community_any.id,
      aws_api_gateway_integration.community_integration.id,
      aws_api_gateway_resource.community_posts.id,
      aws_api_gateway_method.community_posts_any.id,
      aws_api_gateway_integration.community_posts_integration.id,
      aws_api_gateway_resource.community_post_detail.id,
      aws_api_gateway_method.community_post_detail_any.id,
      aws_api_gateway_integration.community_post_detail_integration.id,
      aws_api_gateway_resource.community_post_comments.id,
      aws_api_gateway_method.community_post_comments_any.id,
      aws_api_gateway_integration.community_post_comments_integration.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}
