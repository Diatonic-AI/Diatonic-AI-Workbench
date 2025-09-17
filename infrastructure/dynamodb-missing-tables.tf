# Missing DynamoDB Tables Configuration
# These tables exist in AWS but are not managed by Terraform

# Stripe-related tables
resource "aws_dynamodb_table" "stripe_customers" {
  name           = "ai-nexus-dev-stripe-customers"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  tags = merge(local.common_tags, {
    Name    = "ai-nexus-dev-stripe-customers"
    Purpose = "Stripe customer data"
  })
}

resource "aws_dynamodb_table" "stripe_idempotency" {
  name           = "ai-nexus-dev-stripe-idempotency"
  billing_mode   = "PAY_PER_REQUEST" 
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
  
  tags = merge(local.common_tags, {
    Name    = "ai-nexus-dev-stripe-idempotency"
    Purpose = "Stripe idempotency keys"
  })
}

resource "aws_dynamodb_table" "stripe_invoices" {
  name           = "ai-nexus-dev-stripe-invoices"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  tags = merge(local.common_tags, {
    Name    = "ai-nexus-dev-stripe-invoices"
    Purpose = "Stripe invoice data"
  })
}

resource "aws_dynamodb_table" "stripe_subscriptions" {
  name           = "ai-nexus-dev-stripe-subscriptions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "customer_id"
    type = "S"
  }
  
  global_secondary_index {
    name            = "customer-id-index"
    hash_key        = "customer_id"
    projection_type = "ALL"
  }
  
  tags = merge(local.common_tags, {
    Name    = "ai-nexus-dev-stripe-subscriptions"
    Purpose = "Stripe subscription data"
  })
}

# AI Nexus development tables
resource "aws_dynamodb_table" "activity_feed" {
  name           = "aws-devops-dev-activity-feed"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "timestamp"
    type = "S"
  }
  
  global_secondary_index {
    name            = "timestamp-index"
    hash_key        = "timestamp"
    projection_type = "ALL"
  }
  
  tags = merge(local.common_tags, {
    Name    = "aws-devops-dev-activity-feed"
    Purpose = "User activity feed"
  })
}

# agent_flows and agents tables already defined in dynamodb-feature-modules.tf

resource "aws_dynamodb_table" "aggregated_analytics" {
  name           = "aws-devops-dev-aggregated-analytics"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  tags = merge(local.common_tags, {
    Name    = "aws-devops-dev-aggregated-analytics"
    Purpose = "Aggregated analytics data"
  })
}

resource "aws_dynamodb_table" "community_comments" {
  name           = "aws-devops-dev-community-comments"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "post_id"
    type = "S"
  }
  
  global_secondary_index {
    name            = "post-id-index"
    hash_key        = "post_id"
    projection_type = "ALL"
  }
  
  tags = merge(local.common_tags, {
    Name    = "aws-devops-dev-community-comments"
    Purpose = "Community post comments"
  })
}

# Terraform state lock table
resource "aws_dynamodb_table" "terraform_state_lock" {
  name           = "aws-devops-terraform-state-lock"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"
  
  attribute {
    name = "LockID"
    type = "S"
  }
  
  tags = merge(local.common_tags, {
    Name    = "aws-devops-terraform-state-lock"
    Purpose = "Terraform state locking"
  })
}

# Production tables (diatonic-prod-*)
resource "aws_dynamodb_table" "prod_ai_conversations" {
  name           = "diatonic-prod-ai-conversations"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "user_id"
    type = "S"
  }
  
  global_secondary_index {
    name            = "user-id-index"
    hash_key        = "user_id"
    projection_type = "ALL"
  }
  
  tags = merge(local.common_tags, {
    Name    = "diatonic-prod-ai-conversations"
    Purpose = "Production AI conversations"
  })
}

resource "aws_dynamodb_table" "prod_users" {
  name           = "diatonic-prod-users"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "email"
    type = "S"
  }
  
  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }
  
  tags = merge(local.common_tags, {
    Name    = "diatonic-prod-users"
    Purpose = "Production users"
  })
}
