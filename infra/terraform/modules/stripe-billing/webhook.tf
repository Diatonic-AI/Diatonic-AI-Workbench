# Stripe Webhook Configuration - COMMENTED OUT
# These will be created via Stripe API after infrastructure deployment

# Webhook endpoint resource (created after API Gateway is available)
# resource "stripe_webhook_endpoint" "billing_webhook" {
#   url = var.create_api_gateway ? "${aws_apigatewayv2_api.billing_api[0].api_endpoint}/stripe/webhook" : "${var.webhook_endpoint_base_url}/stripe/webhook"
#   
#   enabled_events = [
#     "checkout.session.completed",
#     "customer.subscription.created",
#     "customer.subscription.updated",
#     "customer.subscription.deleted", 
#     "invoice.created",
#     "invoice.payment_succeeded",
#     "invoice.payment_failed",
#     "invoice.voided",
#     "payment_intent.succeeded",
#     "payment_intent.payment_failed",
#     "payment_method.attached",
#     "payment_method.detached",
#     "charge.succeeded",
#     "charge.failed",
#     "charge.dispute.created"
#   ]
#
#   api_version = "2023-10-16"
#   description = "AI Nexus Workbench webhook for ${var.environment} - Diatonicvisuals tenant"
#   
#   metadata = local.stripe_metadata
#
#   # Ensure API Gateway is created first
#   depends_on = [
#     aws_apigatewayv2_api.billing_api,
#     aws_apigatewayv2_stage.billing_stage,
#     aws_apigatewayv2_route.billing_routes
#   ]
# }

# Store webhook signing secret in AWS Secrets Manager
# Note: This should be manually created with the actual webhook secret from Stripe
# The secret value will be available after the webhook is created in Stripe Dashboard
# resource "aws_ssm_parameter" "webhook_endpoint_id" {
#   name        = "/ai-nexus/diatonicvisuals/stripe/webhook/endpoint_id"
#   type        = "String"
#   value       = stripe_webhook_endpoint.billing_webhook.id
#   description = "Stripe webhook endpoint ID for ${var.environment}"
#
#   tags = local.common_tags
# }

# Output webhook details for manual secret setup - COMMENTED OUT
# output "webhook_setup_instructions" {
#   description = "Instructions for setting up webhook signing secret"
#   value = {
#     webhook_endpoint_id = stripe_webhook_endpoint.billing_webhook.id
#     webhook_url        = stripe_webhook_endpoint.billing_webhook.url
#     webhook_secret_arn = data.aws_secretsmanager_secret.stripe_webhook_secret.arn
#     setup_instructions = [
#       "1. Copy the webhook signing secret from Stripe Dashboard",
#       "2. Run: aws secretsmanager put-secret-value --secret-id '${data.aws_secretsmanager_secret.stripe_webhook_secret.arn}' --secret-string 'whsec_your_signing_secret_here'",
#       "3. Verify webhook events are being received by checking CloudWatch logs for the stripe-webhook-handler Lambda"
#     ]
#   }
# }

# Lambda permission for Stripe webhook (additional for webhook endpoint)
resource "aws_lambda_permission" "stripe_webhook_invoke" {
  statement_id  = "AllowExecutionFromStripeWebhook"
  action        = "lambda:InvokeFunction" 
  function_name = aws_lambda_function.billing_functions["stripe-webhook-handler"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${local.api_execution_arn}/*/POST/stripe/webhook"
}

# CloudWatch alarm for webhook failures
resource "aws_cloudwatch_metric_alarm" "webhook_failures" {
  alarm_name          = "${local.resource_prefix}-webhook-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "3"
  alarm_description   = "This metric monitors Stripe webhook processing failures"
  alarm_actions       = [] # Add SNS topic ARN for notifications if needed

  dimensions = {
    FunctionName = aws_lambda_function.billing_functions["stripe-webhook-handler"].function_name
  }

  tags = local.common_tags
}
