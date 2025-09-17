# AI Nexus Workbench - Simplified Terraform Outputs
# Only outputs for resources that actually exist

# General Information
output "deployment_info" {
  description = "General deployment information"
  value = {
    project           = var.project
    environment       = var.environment
    region            = local.region
    account_id        = local.account_id
    deployed_at       = timestamp()
    terraform_version = "~> 1.5"
  }
}

output "resource_prefix" {
  description = "Resource naming prefix used for all resources"
  value       = local.name_prefix
}

output "common_tags" {
  description = "Common tags applied to all resources"
  value       = local.common_tags
  sensitive   = false
}

# DynamoDB Outputs
output "dynamodb_tables" {
  description = "DynamoDB table information"
  value = {
    user_profiles = {
      name = aws_dynamodb_table.user_profiles.name
      arn  = aws_dynamodb_table.user_profiles.arn
    }
    organization_data = {
      name = aws_dynamodb_table.organization_data.name
      arn  = aws_dynamodb_table.organization_data.arn
    }
    system_logs = {
      name = aws_dynamodb_table.system_logs.name
      arn  = aws_dynamodb_table.system_logs.arn
    }
    user_sessions = {
      name = aws_dynamodb_table.user_sessions.name
      arn  = aws_dynamodb_table.user_sessions.arn
    }
    application_settings = {
      name = aws_dynamodb_table.application_settings.name
      arn  = aws_dynamodb_table.application_settings.arn
    }
    user_content_metadata = {
      name = aws_dynamodb_table.user_content_metadata.name
      arn  = aws_dynamodb_table.user_content_metadata.arn
    }
  }
}

# Lambda Outputs
output "lambda_functions" {
  description = "Lambda function information"
  value = {
    user_profile_management = {
      function_name = aws_lambda_function.user_profile_management.function_name
      arn           = aws_lambda_function.user_profile_management.arn
    }
    auth_post_authentication = {
      function_name = aws_lambda_function.auth_post_authentication.function_name
      arn           = aws_lambda_function.auth_post_authentication.arn
    }
    user_registration = {
      function_name = aws_lambda_function.user_registration.function_name
      arn           = aws_lambda_function.user_registration.arn
    }
  }
}

output "lambda_layer_arn" {
  description = "Lambda layer ARN for shared dependencies"
  value       = aws_lambda_layer_version.shared_layer.arn
}

# API Gateway Outputs
output "api_gateway_info" {
  description = "API Gateway information"
  value = {
    rest_api_id   = aws_api_gateway_rest_api.main.id
    stage_name    = aws_api_gateway_stage.main.stage_name
    invoke_url    = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.main.stage_name}"
    execution_arn = aws_api_gateway_rest_api.main.execution_arn
    authorizer_id = aws_api_gateway_authorizer.cognito.id
  }
}

output "api_endpoints" {
  description = "API endpoint URLs"
  value = {
    base_url = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.main.stage_name}"
    endpoints = {
      users        = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.main.stage_name}/users"
      user_profile = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.main.stage_name}/users/{user_id}"
      # Lead management endpoints
      leads        = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.main.stage_name}/leads"
      lead_detail  = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.main.stage_name}/leads/{leadId}"
      lead_analytics = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.main.stage_name}/leads/analytics"
    }
  }
}

# S3 Outputs
output "s3_bucket_info" {
  description = "S3 bucket information"
  value = {
    bucket_name        = aws_s3_bucket.user_content.bucket
    bucket_arn         = aws_s3_bucket.user_content.arn
    bucket_domain_name = aws_s3_bucket.user_content.bucket_domain_name
    region             = aws_s3_bucket.user_content.region
  }
}

# IAM Role Outputs
output "iam_roles" {
  description = "IAM role information"
  value = {
    lambda_execution_role = {
      arn  = aws_iam_role.lambda_execution_role.arn
      name = aws_iam_role.lambda_execution_role.name
    }
  }
}

# Security Outputs
output "security_info" {
  description = "Security configuration information"
  value = {
    kms_key_arn  = var.environment == "prod" ? aws_kms_key.ai_nexus_key[0].arn : null
    kms_alias    = var.environment == "prod" ? aws_kms_alias.ai_nexus_key_alias[0].name : null
    waf_enabled  = local.current_env_config.enable_waf
    cors_origins = var.allowed_cors_origins
  }
}

# Monitoring Outputs
output "monitoring_info" {
  description = "Monitoring and logging configuration"
  value = {
    cloudwatch_log_group = {
      name              = aws_cloudwatch_log_group.lambda_logs.name
      arn               = aws_cloudwatch_log_group.lambda_logs.arn
      retention_in_days = aws_cloudwatch_log_group.lambda_logs.retention_in_days
    }
    api_gateway_log_group = {
      name = aws_cloudwatch_log_group.api_gateway_logs.name
      arn  = aws_cloudwatch_log_group.api_gateway_logs.arn
    }
  }
}

# Configuration Parameters
output "ssm_parameters" {
  description = "SSM parameter information"
  value = {
    app_config = {
      name = aws_ssm_parameter.app_config.name
      arn  = aws_ssm_parameter.app_config.arn
    }
  }
}

# Frontend Configuration - the most important output!
output "frontend_config" {
  description = "Configuration values needed for frontend applications"
  value = {
    aws_region               = var.aws_region
    cognito_user_pool_id     = aws_cognito_user_pool.main.id
    cognito_app_client_id    = aws_cognito_user_pool_client.web_client.id
    cognito_identity_pool_id = aws_cognito_identity_pool.main.id
    cognito_domain           = aws_cognito_user_pool_domain.main.domain
    api_base_url             = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.main.stage_name}"
    s3_bucket                = aws_s3_bucket.user_content.bucket
    user_groups              = keys(local.cognito_user_groups)
    # Lead management API endpoints
    leads_api = {
      base_url = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.main.stage_name}"
      endpoints = {
        create_lead = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.main.stage_name}/leads"
        list_leads = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.main.stage_name}/leads"
        get_lead = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.main.stage_name}/leads/{leadId}"
        update_lead = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.main.stage_name}/leads/{leadId}"
        analytics = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.main.stage_name}/leads/analytics"
      }
    }
  }
}
