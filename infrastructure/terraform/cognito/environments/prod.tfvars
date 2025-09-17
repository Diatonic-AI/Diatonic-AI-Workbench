# Production Environment Configuration for AI Nexus Workbench Cognito

# Environment settings
environment = "prod"
project_name = "ai-nexus-workbench"
domain_name = "diatonic.ai"

# SES email configuration (replace with your verified SES email)
ses_email_address = "noreply@diatonic.ai"

# Production callback URLs
callback_urls = [
  "https://diatonic.ai/auth/callback",
  "https://app.diatonic.ai/auth/callback"
]

logout_urls = [
  "https://diatonic.ai/",
  "https://app.diatonic.ai/"
]

# Security settings for production
enable_mfa = true
enable_advanced_security = true
password_require_symbols = true
