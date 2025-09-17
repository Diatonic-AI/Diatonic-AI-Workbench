# Shared Local Values for AI Nexus Workbench
# This file defines common local values used across all Terraform files

locals {
  # Common naming convention used across all resources
  name_prefix = "${var.project}-${var.environment}"

  # Account and region information
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  # Common tags applied to all resources
  common_tags = {
    Name        = "${local.name_prefix}-ai-nexus-workbench"
    Project     = var.project
    Environment = var.environment
    Component   = "ai-nexus-workbench"
    ManagedBy   = "Terraform"
    Owner       = "AI Nexus Team"
    CostCenter  = "Development"
  }

  # Environment-specific configurations
  environment_config = {
    dev = {
      enable_advanced_security = false
      enable_waf               = false
      log_retention_days       = 7
      enable_backup            = false
    }
    staging = {
      enable_advanced_security = true
      enable_waf               = false
      log_retention_days       = 30
      enable_backup            = true
    }
    prod = {
      enable_advanced_security = true
      enable_waf               = true
      log_retention_days       = 90
      enable_backup            = true
    }
  }

  current_env_config = local.environment_config[var.environment]
}
