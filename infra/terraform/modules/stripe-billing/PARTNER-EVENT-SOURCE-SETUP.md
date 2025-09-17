# Stripe Partner Event Source Setup Instructions

After configuring your Stripe EventBridge destinations, follow these steps:

## 1. Wait for Partner Event Sources
Partner event sources should appear in AWS EventBridge Console within a few minutes after completing the Stripe configuration.

## 2. Associate Partner Event Sources
In AWS EventBridge Console → Partner event sources, look for:
- \`aws.partner/stripe.com/ai-nexus-dev-stripe-snapshot\`
- \`aws.partner/stripe.com/ai-nexus-dev-stripe-thin\`

Associate each with your existing event bus: \`ai-nexus-dev-stripe-event-bus\`

## 3. Update Terraform Configuration
Once associated, set this variable in your Terraform configuration:
\`\`\`hcl
enable_stripe_partner_events = true
\`\`\`

Then run:
\`\`\`bash
terraform plan -var="enable_stripe_partner_events=true"
terraform apply -var="enable_stripe_partner_events=true"
\`\`\`

## 4. Verification
After setup, both webhook and partner event sources will send events to your EventBridge rules.

Check the logs to verify events are being received:
\`\`\`bash
aws logs tail /aws/events/stripe-billing --follow
\`\`\`
