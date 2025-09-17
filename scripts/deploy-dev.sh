#!/usr/bin/env bash
# AI Nexus Workbench - Dev Environment Deployment Script
set -euo pipefail

# Configuration
REGION=${REGION:-us-east-2}
BUCKET=${BUCKET:-aws-devops-dev-static-assets-development-gwenbxgb}
APP_DOMAIN=${APP_DOMAIN:-dev.diatonic.ai}
API_DOMAIN=${API_DOMAIN:-api.dev.diatonic.ai}
AUTH_DOMAIN=${AUTH_DOMAIN:-auth.dev.diatonic.ai}
CF_DISTRIBUTION_ID=${CF_DISTRIBUTION_ID:-EB3GDEPQ1RC9T}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check for required tools
    local tools=("aws" "npm" "curl")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]]; then
        error "Must run from the ai-nexus-workbench root directory"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Build the application
build_app() {
    log "Building the application..."
    
    # Install dependencies
    npm ci
    
    # Build for development
    npm run build
    
    success "Build completed"
}

# Deploy assets to S3
deploy_assets() {
    log "Deploying assets to S3..."
    
    # Sync everything except index.html with long-lived cache
    aws s3 sync dist/ s3://$BUCKET/ \
        --exclude "index.html" \
        --cache-control "public, max-age=31536000, immutable" \
        --delete
    
    # Upload index.html with correct headers
    aws s3 cp dist/index.html s3://$BUCKET/index.html \
        --content-type "text/html; charset=utf-8" \
        --cache-control "no-cache, no-store, must-revalidate" \
        --metadata-directive REPLACE
    
    # Handle special files if they exist
    if [ -f dist/manifest.webmanifest ]; then
        aws s3 cp dist/manifest.webmanifest s3://$BUCKET/manifest.webmanifest \
            --content-type "application/manifest+json" \
            --cache-control "no-cache" \
            --metadata-directive REPLACE
    fi
    
    if [ -f dist/sw.js ]; then
        aws s3 cp dist/sw.js s3://$BUCKET/sw.js \
            --content-type "application/javascript; charset=utf-8" \
            --cache-control "no-cache" \
            --metadata-directive REPLACE
    fi
    
    if [ -f dist/robots.txt ]; then
        aws s3 cp dist/robots.txt s3://$BUCKET/robots.txt \
            --content-type "text/plain; charset=utf-8" \
            --cache-control "public, max-age=300" \
            --metadata-directive REPLACE
    fi
    
    success "Assets deployed to S3"
}

# Invalidate CloudFront cache
invalidate_cache() {
    log "Invalidating CloudFront cache..."
    
    local invalidation_result=$(aws cloudfront create-invalidation \
        --distribution-id "$CF_DISTRIBUTION_ID" \
        --paths "/" "/index.html" "/manifest.webmanifest" \
        --output json)
    
    local invalidation_id=$(echo "$invalidation_result" | grep -o '"Id": "[^"]*"' | cut -d'"' -f4)
    
    log "Invalidation created with ID: $invalidation_id"
    success "Cache invalidation initiated"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Wait a moment for cache invalidation to propagate
    sleep 10
    
    # Check if the site returns HTML with correct content type
    local headers=$(curl -sI "https://$APP_DOMAIN" | head -20)
    
    if echo "$headers" | grep -q "HTTP/2 200"; then
        if echo "$headers" | grep -q "content-type: text/html"; then
            success "Site is serving HTML content correctly"
        else
            warn "Site is responding but content-type may be incorrect"
        fi
    else
        warn "Site may not be responding correctly"
    fi
    
    # Check a sample asset
    local sample_js=$(basename "$(ls dist/assets/*.js | head -1)" 2>/dev/null || echo "")
    if [[ -n "$sample_js" ]]; then
        local asset_headers=$(curl -sI "https://$APP_DOMAIN/assets/$sample_js" 2>/dev/null | head -10)
        if echo "$asset_headers" | grep -q "HTTP/2 200"; then
            success "Assets are being served correctly"
        else
            warn "Assets may not be accessible"
        fi
    fi
}

# Main deployment function
main() {
    log "Starting deployment to dev environment..."
    
    check_prerequisites
    build_app
    deploy_assets
    invalidate_cache
    verify_deployment
    
    echo
    success "🎉 Deployment completed successfully!"
    log "🌐 Your app is available at: https://$APP_DOMAIN"
    log "📊 CloudFront Distribution: $CF_DISTRIBUTION_ID"
    log "🪣 S3 Bucket: $BUCKET"
    
    echo
    log "Next steps:"
    echo "  1. Test the application in your browser"
    echo "  2. Check console for any JavaScript errors"
    echo "  3. Verify API endpoints are working"
    echo "  4. Test authentication flows"
}

# Handle script interruption
trap 'error "Deployment interrupted"; exit 130' INT TERM

# Run main function
main "$@"
