#!/bin/bash

# Cloudflare DNS Configuration Automation for diatonic.ai
# Usage: ./cloudflare-automation.sh [command]
# 
# Prerequisites:
# 1. Domain must be manually added to Cloudflare dashboard first
# 2. Cloudflare API token with Zone:Edit permissions
# 3. Zone ID from Cloudflare dashboard

set -euo pipefail

# Configuration
DOMAIN="diatonic.ai"
CF_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
CF_ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"
CF_API_BASE="https://api.cloudflare.com/client/v4"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if [[ -z "$CF_API_TOKEN" ]]; then
        log_error "CLOUDFLARE_API_TOKEN environment variable not set"
        log_info "Get your API token from: https://dash.cloudflare.com/profile/api-tokens"
        exit 1
    fi
    
    if [[ -z "$CF_ZONE_ID" ]]; then
        log_warn "CLOUDFLARE_ZONE_ID not set, attempting to discover..."
        get_zone_id
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed. Please install jq first."
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed. Please install curl first."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# API request helper
cf_api() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    
    local curl_args=(-X "$method" -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json")
    
    if [[ -n "$data" ]]; then
        curl_args+=(-d "$data")
    fi
    
    curl -s "${curl_args[@]}" "$CF_API_BASE$endpoint"
}

# Get Zone ID
get_zone_id() {
    log_info "Looking up zone ID for $DOMAIN..."
    
    local response=$(cf_api "GET" "/zones?name=$DOMAIN")
    local success=$(echo "$response" | jq -r '.success')
    
    if [[ "$success" != "true" ]]; then
        log_error "Failed to get zone information:"
        echo "$response" | jq -r '.errors[]?.message // "Unknown error"'
        exit 1
    fi
    
    CF_ZONE_ID=$(echo "$response" | jq -r '.result[0].id // empty')
    
    if [[ -z "$CF_ZONE_ID" ]]; then
        log_error "Zone not found for $DOMAIN"
        log_info "Please add the domain manually in Cloudflare dashboard first"
        exit 1
    fi
    
    log_success "Found zone ID: $CF_ZONE_ID"
    export CLOUDFLARE_ZONE_ID="$CF_ZONE_ID"
}

# Create DNS record
create_dns_record() {
    local name="$1"
    local type="$2"
    local content="$3"
    local proxied="${4:-true}"
    local ttl="${5:-1}" # 1 = Auto TTL
    
    log_info "Creating DNS record: $name.$DOMAIN -> $content"
    
    local data=$(jq -n \
        --arg name "$name" \
        --arg type "$type" \
        --arg content "$content" \
        --argjson proxied "$proxied" \
        --argjson ttl "$ttl" \
        '{
            name: $name,
            type: $type,
            content: $content,
            proxied: $proxied,
            ttl: $ttl
        }')
    
    local response=$(cf_api "POST" "/zones/$CF_ZONE_ID/dns_records" "$data")
    local success=$(echo "$response" | jq -r '.success')
    
    if [[ "$success" == "true" ]]; then
        local record_id=$(echo "$response" | jq -r '.result.id')
        log_success "Created DNS record: $name (ID: $record_id)"
    else
        log_error "Failed to create DNS record for $name:"
        echo "$response" | jq -r '.errors[]?.message // "Unknown error"'
        return 1
    fi
}

# List existing DNS records
list_dns_records() {
    log_info "Listing DNS records for $DOMAIN..."
    
    local response=$(cf_api "GET" "/zones/$CF_ZONE_ID/dns_records")
    local success=$(echo "$response" | jq -r '.success')
    
    if [[ "$success" != "true" ]]; then
        log_error "Failed to list DNS records:"
        echo "$response" | jq -r '.errors[]?.message // "Unknown error"'
        return 1
    fi
    
    echo "$response" | jq -r '.result[] | "\(.name) \(.type) \(.content) \(if .proxied then "Proxied" else "DNS Only" end)"' | \
    while read -r name type content proxy_status; do
        printf "%-30s %-8s %-40s %s\n" "$name" "$type" "$content" "$proxy_status"
    done
}

# Create all DNS records for diatonic.ai
create_all_dns_records() {
    log_info "Creating all DNS records for $DOMAIN..."
    
    # Note: For apex domain, we need to use a CNAME to the CloudFront distribution
    # Cloudflare will automatically flatten it to A/AAAA records
    local cloudfront_domain="d34iz6fjitwuax.cloudfront.net"
    
    # Create apex domain record (will be flattened to A/AAAA)
    create_dns_record "$DOMAIN" "CNAME" "$cloudfront_domain" true
    
    # Create all subdomains as CNAME records pointing to apex
    local subdomains=(
        "www"
        "app" 
        "dev"
        "app.dev"
        "admin.dev"
        "www.dev"
    )
    
    for subdomain in "${subdomains[@]}"; do
        create_dns_record "$subdomain" "CNAME" "$DOMAIN" true
    done
    
    log_success "All DNS records created successfully"
}

# Configure SSL/TLS settings
configure_ssl() {
    log_info "Configuring SSL/TLS settings..."
    
    # Set SSL/TLS mode to Full (Strict)
    local ssl_data=$(jq -n '{value: "strict"}')
    local response=$(cf_api "PATCH" "/zones/$CF_ZONE_ID/settings/ssl" "$ssl_data")
    
    if [[ $(echo "$response" | jq -r '.success') == "true" ]]; then
        log_success "SSL/TLS mode set to Full (Strict)"
    else
        log_error "Failed to set SSL/TLS mode"
        echo "$response" | jq -r '.errors[]?.message // "Unknown error"'
    fi
    
    # Enable Always Use HTTPS
    local https_data=$(jq -n '{value: "on"}')
    local response=$(cf_api "PATCH" "/zones/$CF_ZONE_ID/settings/always_use_https" "$https_data")
    
    if [[ $(echo "$response" | jq -r '.success') == "true" ]]; then
        log_success "Always Use HTTPS enabled"
    else
        log_error "Failed to enable Always Use HTTPS"
        echo "$response" | jq -r '.errors[]?.message // "Unknown error"'
    fi
}

# Configure performance settings
configure_performance() {
    log_info "Configuring performance settings..."
    
    # Enable Brotli compression
    local brotli_data=$(jq -n '{value: "on"}')
    cf_api "PATCH" "/zones/$CF_ZONE_ID/settings/brotli" "$brotli_data" >/dev/null
    log_success "Brotli compression enabled"
    
    # Enable Auto Minify for HTML, CSS, JS
    local minify_data=$(jq -n '{value: {css: "on", html: "on", js: "on"}}')
    cf_api "PATCH" "/zones/$CF_ZONE_ID/settings/minify" "$minify_data" >/dev/null
    log_success "Auto Minify enabled (HTML, CSS, JS)"
    
    # Enable Rocket Loader
    local rocket_data=$(jq -n '{value: "on"}')
    cf_api "PATCH" "/zones/$CF_ZONE_ID/settings/rocket_loader" "$rocket_data" >/dev/null
    log_success "Rocket Loader enabled"
    
    # Set cache level to Aggressive
    local cache_data=$(jq -n '{value: "aggressive"}')
    cf_api "PATCH" "/zones/$CF_ZONE_ID/settings/cache_level" "$cache_data" >/dev/null
    log_success "Cache level set to Aggressive"
}

# Configure security settings
configure_security() {
    log_info "Configuring security settings..."
    
    # Set security level to Medium
    local security_data=$(jq -n '{value: "medium"}')
    cf_api "PATCH" "/zones/$CF_ZONE_ID/settings/security_level" "$security_data" >/dev/null
    log_success "Security level set to Medium"
    
    # Enable Bot Fight Mode
    local bot_data=$(jq -n '{value: "on"}')
    cf_api "PATCH" "/zones/$CF_ZONE_ID/settings/bot_management" "$bot_data" >/dev/null
    log_success "Bot Fight Mode enabled"
    
    # Enable Browser Integrity Check
    local integrity_data=$(jq -n '{value: "on"}')
    cf_api "PATCH" "/zones/$CF_ZONE_ID/settings/browser_check" "$integrity_data" >/dev/null
    log_success "Browser Integrity Check enabled"
}

# Get zone analytics
get_analytics() {
    log_info "Getting zone analytics..."
    
    local since=$(date -d "7 days ago" --iso-8601)
    local until=$(date --iso-8601)
    
    local response=$(cf_api "GET" "/zones/$CF_ZONE_ID/analytics/dashboard?since=${since}&until=${until}")
    
    if [[ $(echo "$response" | jq -r '.success') == "true" ]]; then
        echo "$response" | jq -r '.result | 
            "Requests: \(.totals.requests.all // 0) | " +
            "Bandwidth: \(.totals.bandwidth.all // 0) bytes | " +
            "Unique Visitors: \(.totals.uniques.all // 0) | " +
            "Cached: \(.totals.requests.cached // 0) | " +
            "Uncached: \(.totals.requests.uncached // 0)"'
    else
        log_error "Failed to get analytics"
    fi
}

# Test DNS propagation
test_propagation() {
    log_info "Testing DNS propagation..."
    
    local test_domains=("$DOMAIN" "www.$DOMAIN" "app.$DOMAIN" "dev.$DOMAIN")
    
    for domain in "${test_domains[@]}"; do
        log_info "Testing $domain..."
        
        # Test with Cloudflare DNS
        local cf_result=$(dig +short @1.1.1.1 "$domain" A | head -1)
        
        # Test with Google DNS
        local google_result=$(dig +short @8.8.8.8 "$domain" A | head -1)
        
        if [[ -n "$cf_result" && -n "$google_result" ]]; then
            log_success "$domain resolves to $cf_result (CF) / $google_result (Google)"
        else
            log_warn "$domain may not be fully propagated yet"
        fi
    done
}

# Show current zone settings
show_zone_settings() {
    log_info "Current zone settings for $DOMAIN:"
    
    local response=$(cf_api "GET" "/zones/$CF_ZONE_ID/settings")
    
    if [[ $(echo "$response" | jq -r '.success') == "true" ]]; then
        echo "$response" | jq -r '.result[] | select(.id == "ssl" or .id == "always_use_https" or .id == "brotli" or .id == "cache_level" or .id == "security_level") | "\(.id): \(.value)"'
    else
        log_error "Failed to get zone settings"
    fi
}

# Main menu
show_help() {
    cat << EOF
Cloudflare DNS Configuration Automation for $DOMAIN

Prerequisites:
1. Domain must be added to Cloudflare dashboard first
2. Set CLOUDFLARE_API_TOKEN environment variable
3. Optionally set CLOUDFLARE_ZONE_ID environment variable

Commands:
  check          - Check prerequisites and zone status
  list           - List existing DNS records
  create-dns     - Create all DNS records for diatonic.ai
  configure-ssl  - Configure SSL/TLS settings
  configure-perf - Configure performance settings
  configure-sec  - Configure security settings
  configure-all  - Run all configuration steps
  analytics      - Show zone analytics (last 7 days)
  test-dns       - Test DNS propagation
  settings       - Show current zone settings
  help           - Show this help message

Environment Variables:
  CLOUDFLARE_API_TOKEN - Your Cloudflare API token (required)
  CLOUDFLARE_ZONE_ID   - Zone ID (will be auto-discovered if not set)

Examples:
  export CLOUDFLARE_API_TOKEN="your_token_here"
  $0 check
  $0 create-dns
  $0 configure-all
EOF
}

# Main execution
case "${1:-help}" in
    "check")
        check_prerequisites
        show_zone_settings
        ;;
    "list")
        check_prerequisites
        list_dns_records
        ;;
    "create-dns")
        check_prerequisites
        create_all_dns_records
        ;;
    "configure-ssl")
        check_prerequisites
        configure_ssl
        ;;
    "configure-perf")
        check_prerequisites
        configure_performance
        ;;
    "configure-sec")
        check_prerequisites
        configure_security
        ;;
    "configure-all")
        check_prerequisites
        create_all_dns_records
        configure_ssl
        configure_performance
        configure_security
        log_success "All configurations completed!"
        ;;
    "analytics")
        check_prerequisites
        get_analytics
        ;;
    "test-dns")
        test_propagation
        ;;
    "settings")
        check_prerequisites
        show_zone_settings
        ;;
    "help"|*)
        show_help
        ;;
esac
