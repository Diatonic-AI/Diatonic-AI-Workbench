# Cloudflare Configuration for diatonic.ai
# Note: required_providers is defined in main.tf to avoid conflicts

# Configure Cloudflare Provider
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Variables
variable "cloudflare_api_token" {
  description = "Cloudflare API Token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for diatonic.ai"
  type        = string
  default     = "f889715fdbadcf662ea496b8e40ee6eb"
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
  default     = "35043351f8c199237f5ebd11f4a27c15"
}

# Data source for the zone
data "cloudflare_zone" "main" {
  zone_id = var.cloudflare_zone_id
}

# DNS Records
# Apex domain - CNAME to Amplify CloudFront (will be flattened to A/AAAA)
resource "cloudflare_record" "apex" {
  zone_id = var.cloudflare_zone_id
  name    = "diatonic.ai"
  content = "dxz4p4iipx5lm.cloudfront.net"
  type    = "CNAME"
  proxied = true
  ttl     = 1 # Auto TTL
  comment = "Apex domain pointing to AWS Amplify CloudFront distribution"
}

# WWW subdomain
resource "cloudflare_record" "www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  content = "dxz4p4iipx5lm.cloudfront.net"
  type    = "CNAME"
  proxied = false
  ttl     = 1 # Auto TTL
  comment = "WWW subdomain"
}

# App subdomain
resource "cloudflare_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = "app"
  content = "dxz4p4iipx5lm.cloudfront.net"
  type    = "CNAME"
  proxied = false
  ttl     = 1 # Auto TTL
  comment = "App subdomain"
}

# Dev subdomain
resource "cloudflare_record" "dev" {
  zone_id = var.cloudflare_zone_id
  name    = "dev"
  content = "dxz4p4iipx5lm.cloudfront.net"
  type    = "CNAME"
  proxied = false
  ttl     = 1 # Auto TTL
  comment = "Development subdomain"
}

# App.dev subdomain
resource "cloudflare_record" "app_dev" {
  zone_id = var.cloudflare_zone_id
  name    = "app.dev"
  content = "dxz4p4iipx5lm.cloudfront.net"
  type    = "CNAME"
  proxied = false
  ttl     = 1 # Auto TTL
  comment = "Development app subdomain"
}

# Admin.dev subdomain
resource "cloudflare_record" "admin_dev" {
  zone_id = var.cloudflare_zone_id
  name    = "admin.dev"
  content = "dxz4p4iipx5lm.cloudfront.net"
  type    = "CNAME"
  proxied = false
  ttl     = 1 # Auto TTL
  comment = "Development admin subdomain"
}

# WWW.dev subdomain
resource "cloudflare_record" "www_dev" {
  zone_id = var.cloudflare_zone_id
  name    = "www.dev"
  content = "dxz4p4iipx5lm.cloudfront.net"
  type    = "CNAME"
  proxied = false
  ttl     = 1 # Auto TTL
  comment = "Development www subdomain"
}

# API subdomain (DNS only for API Gateway)
resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  content = "c2n9uk1ovi.execute-api.us-east-2.amazonaws.com" # API Gateway domain
  type    = "CNAME"
  proxied = false # DNS Only for API Gateway
  ttl     = 300
  comment = "API subdomain pointing to API Gateway"
}

# Zone Settings Configuration
# COMMENTED OUT: Requires elevated API permissions
/*
resource "cloudflare_zone_settings_override" "main" {
  zone_id = var.cloudflare_zone_id

  settings {
    # SSL/TLS Settings
    ssl = "full" # Free plan supports "flexible", "full", or "strict"
    always_use_https = "on"
    min_tls_version = "1.2"
    automatic_https_rewrites = "on"

    # Security Settings
    security_level = "medium"
    browser_check = "on"
    hotlink_protection = "off"
    email_obfuscation = "on"
    server_side_exclude = "on"

    # Performance Settings
    brotli = "on"
    minify {
      css  = "on"
      html = "on"
      js   = "on"
    }
    rocket_loader = "on"
    cache_level = "aggressive"
    browser_cache_ttl = 14400 # 4 hours
    
    # Development settings
    development_mode = "off"
    
    # IPv6
    ipv6 = "on"
    
    # HTTP/2
    http2 = "on"
    http3 = "on"
    
    # Always Online
    always_online = "on"
  }
}
*/

# Page Rules for enhanced caching and performance
# COMMENTED OUT: Requires elevated API permissions
/*
resource "cloudflare_page_rule" "cache_everything_static" {
  zone_id  = var.cloudflare_zone_id
  target   = "*.diatonic.ai/*.{css,js,png,jpg,jpeg,gif,ico,svg,woff,woff2,ttf,eot}"
  priority = 1
  status   = "active"

  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 2592000 # 30 days
    browser_cache_ttl = 86400 # 24 hours
  }
}

resource "cloudflare_page_rule" "cache_api_bypass" {
  zone_id  = var.cloudflare_zone_id
  target   = "api.diatonic.ai/*"
  priority = 2
  status   = "active"

  actions {
    cache_level = "bypass"
  }
}
*/

# Security Rules using modern Cloudflare Ruleset (replacing deprecated filter/firewall rules)
# COMMENTED OUT: Requires elevated API permissions
/*
resource "cloudflare_ruleset" "security_rules" {
  zone_id     = var.cloudflare_zone_id
  name        = "AI Nexus Security Rules"
  description = "Custom security rules for diatonic.ai"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules {
    action = "block"
    expression = "(cf.bot_management.score lt 30) and not (cf.bot_management.verified_bot)"
    description = "Block known bad bots"
    enabled = true
  }

  rules {
    action = "challenge"
    expression = "(http.request.uri.path matches \"^/api/.*$\") and (rate(1m) > 100)"
    description = "Rate limit API endpoints"
    enabled = true
  }
}
*/
# Uncomment if you have a custom certificate
# resource "cloudflare_certificate_pack" "advanced_certificate" {
#   zone_id               = var.cloudflare_zone_id
#   type                  = "advanced"
#   hosts                 = ["diatonic.ai", "*.diatonic.ai"]
#   validation_method     = "txt"
#   validity_period_days  = 90
#   certificate_authority = "lets_encrypt"
#   cloudflare_branding   = false
# }

# Workers (example - can be used for edge functions)
# resource "cloudflare_worker_script" "redirect_handler" {
#   account_id = var.cloudflare_account_id
#   name       = "redirect-handler"
#   content = file("${path.module}/workers/redirect-handler.js")
# }

# resource "cloudflare_worker_route" "redirect_handler" {
#   zone_id     = var.cloudflare_zone_id
#   pattern     = "diatonic.ai/redirect/*"
#   script_name = cloudflare_worker_script.redirect_handler.name
# }

# Output values
output "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  value       = var.cloudflare_zone_id
}

output "cloudflare_nameservers" {
  description = "Cloudflare nameservers"
  value       = data.cloudflare_zone.main.name_servers
}

output "dns_records" {
  description = "Created DNS records"
  value = {
    apex      = cloudflare_record.apex.hostname
    www       = cloudflare_record.www.hostname
    app       = cloudflare_record.app.hostname
    dev       = cloudflare_record.dev.hostname
    app_dev   = cloudflare_record.app_dev.hostname
    admin_dev = cloudflare_record.admin_dev.hostname
    www_dev   = cloudflare_record.www_dev.hostname
    api       = cloudflare_record.api.hostname
  }
}

# SSL status output commented out - requires elevated API permissions
/*
output "ssl_status" {
  description = "SSL/TLS configuration status"
  value = {
    ssl_mode = cloudflare_zone_settings_override.main.settings[0].ssl
    always_use_https = cloudflare_zone_settings_override.main.settings[0].always_use_https
    min_tls_version = cloudflare_zone_settings_override.main.settings[0].min_tls_version
  }
}
*/
