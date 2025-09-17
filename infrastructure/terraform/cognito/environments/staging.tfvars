# Staging Environment Configuration for AI Nexus Workbench Cognito

# Environment settings
environment = "staging"
project_name = "ai-nexus-workbench"
domain_name = "diatonic.ai"

# SES email configuration (use same as prod for staging)
ses_email_address = "staging@diatonic.ai"

# Staging callback URLs
callback_urls = [
  "https://staging.diatonic.ai/auth/callback",
  "http://localhost:3000/auth/callback",
  "http://localhost:8080/auth/callback"
]

logout_urls = [
  "https://staging.diatonic.ai/",
  "http://localhost:3000/",
  "http://localhost:8080/"
]

# Security settings for staging (less restrictive than prod)
enable_mfa = false
enable_advanced_security = true
password_require_symbols = false
