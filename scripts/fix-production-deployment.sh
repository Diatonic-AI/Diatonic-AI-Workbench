#!/usr/bin/env bash
# Emergency Production Fix for www.diatonic.ai
# Fixes MIME type issues with JavaScript assets being served as text/html
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}🚨 EMERGENCY PRODUCTION FIX FOR www.diatonic.ai${NC}"
echo -e "${RED}Issue: JavaScript assets served with text/html MIME type${NC}"
echo ""

# Get the S3 bucket name (you'll need to replace this)
BUCKET_NAME="${1:-}"
if [[ -z "$BUCKET_NAME" ]]; then
    echo -e "${YELLOW}Usage: $0 <S3_BUCKET_NAME> [CLOUDFRONT_DISTRIBUTION_ID]${NC}"
    echo -e "${YELLOW}Example: $0 diatonic-ai-production-bucket E123ABCDEFGHIJ${NC}"
    echo ""
    echo -e "${BLUE}To find the bucket name:${NC}"
    echo "  1. AWS Console → CloudFront → find www.diatonic.ai distribution"
    echo "  2. Look at Origin → Domain name (e.g., mybucket.s3.amazonaws.com)"
    echo "  3. The bucket name is the part before .s3.amazonaws.com"
    exit 1
fi

CLOUDFRONT_DISTRIBUTION_ID="${2:-}"

echo -e "${BLUE}🔧 Target Configuration:${NC}"
echo "  - S3 Bucket: $BUCKET_NAME"
echo "  - CloudFront Distribution: ${CLOUDFRONT_DISTRIBUTION_ID:-'To be determined'}"
echo ""

# Verify we have a built application
if [[ ! -d "dist" ]]; then
    echo -e "${YELLOW}📦 Building application first...${NC}"
    npm run build
fi

if [[ ! -d "dist/assets" ]]; then
    echo -e "${RED}❌ No dist/assets directory found. Build failed?${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Built application found${NC}"
echo ""

# Backup current deployment (optional)
echo -e "${BLUE}💾 Creating deployment backup...${NC}"
BACKUP_DIR="deployment-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Download current index.html for backup
aws s3 cp "s3://$BUCKET_NAME/index.html" "$BACKUP_DIR/index.html.backup" 2>/dev/null || echo "⚠️  Couldn't backup current index.html"

echo -e "${GREEN}✅ Backup created in $BACKUP_DIR${NC}"
echo ""

# Step 1: Upload assets with correct MIME types
echo -e "${BLUE}🚀 Step 1: Uploading assets with correct MIME types...${NC}"

# Upload JavaScript files with correct MIME type
find dist/assets -name "*.js" -type f | while read -r file; do
    key="${file#dist/}"
    echo "  📄 Uploading $key as application/javascript"
    aws s3 cp "$file" "s3://$BUCKET_NAME/$key" \
        --content-type "application/javascript" \
        --cache-control "public, max-age=31536000, immutable"
done

# Upload CSS files with correct MIME type
find dist/assets -name "*.css" -type f | while read -r file; do
    key="${file#dist/}"
    echo "  📄 Uploading $key as text/css"
    aws s3 cp "$file" "s3://$BUCKET_NAME/$key" \
        --content-type "text/css" \
        --cache-control "public, max-age=31536000, immutable"
done

# Upload other asset files (images, fonts, etc.)
find dist/assets \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.svg" -o -name "*.ico" -o -name "*.woff2" -o -name "*.woff" \) -type f | while read -r file; do
    key="${file#dist/}"
    echo "  📄 Uploading $key with auto-detected MIME type"
    aws s3 cp "$file" "s3://$BUCKET_NAME/$key" \
        --cache-control "public, max-age=31536000, immutable"
done

echo -e "${GREEN}✅ Assets uploaded with correct MIME types${NC}"
echo ""

# Step 2: Upload index.html (atomic deployment)
echo -e "${BLUE}🚀 Step 2: Uploading index.html...${NC}"
aws s3 cp "dist/index.html" "s3://$BUCKET_NAME/index.html" \
    --content-type "text/html; charset=utf-8" \
    --cache-control "no-cache, no-store, must-revalidate"

echo -e "${GREEN}✅ index.html uploaded${NC}"
echo ""

# Step 3: Upload other static files
echo -e "${BLUE}🚀 Step 3: Uploading other static files...${NC}"
for file in dist/*.svg dist/*.ico dist/*.txt; do
    if [[ -f "$file" ]]; then
        key="${file#dist/}"
        echo "  📄 Uploading $key"
        aws s3 cp "$file" "s3://$BUCKET_NAME/$key" \
            --cache-control "public, max-age=31536000, immutable"
    fi
done

echo -e "${GREEN}✅ Static files uploaded${NC}"
echo ""

# Step 4: CloudFront invalidation (if distribution ID provided)
if [[ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
    echo -e "${BLUE}🚀 Step 4: Invalidating CloudFront cache...${NC}"
    aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --paths "/index.html" "/" \
        --output table
    
    echo -e "${GREEN}✅ CloudFront invalidation created${NC}"
    echo -e "${YELLOW}⏳ Cache invalidation takes 1-5 minutes to complete${NC}"
else
    echo -e "${YELLOW}⚠️  Step 4: CloudFront distribution ID not provided${NC}"
    echo -e "${YELLOW}   Manual invalidation required for immediate effect${NC}"
    echo -e "${YELLOW}   Invalidate paths: /index.html and /${NC}"
fi

echo ""

# Step 5: Verification
echo -e "${BLUE}🔍 Step 5: Quick verification...${NC}"
sleep 2  # Brief wait

echo "  🌐 Testing www.diatonic.ai/assets/index-DzYP2ee5.js..."
MIME_TYPE=$(curl -sI "https://www.diatonic.ai/assets/index-DzYP2ee5.js" | grep -i content-type | cut -d' ' -f2- | tr -d '\r')
if echo "$MIME_TYPE" | grep -q "javascript"; then
    echo -e "  ${GREEN}✅ MIME type fixed: $MIME_TYPE${NC}"
else
    echo -e "  ${RED}❌ MIME type still wrong: $MIME_TYPE${NC}"
    echo -e "  ${YELLOW}   This may be due to CDN cache. Wait 1-5 minutes and try again.${NC}"
fi

echo ""
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "  1. Wait 1-5 minutes for CDN cache invalidation"
echo "  2. Test https://www.diatonic.ai in browser (hard refresh)"
echo "  3. Check browser console for JavaScript errors"
echo "  4. If still failing, run: ./scripts/diagnose-deployment.sh"
echo ""
echo -e "${BLUE}📁 Backup Location: $BACKUP_DIR${NC}"
echo -e "${BLUE}📋 Rollback Command: aws s3 cp $BACKUP_DIR/index.html.backup s3://$BUCKET_NAME/index.html${NC}"
