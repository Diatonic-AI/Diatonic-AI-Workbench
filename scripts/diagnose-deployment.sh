#!/usr/bin/env bash
# Diagnostic Script for www.diatonic.ai Production Issues
# Identifies CloudFront distribution, S3 bucket, and SPA routing configuration problems
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 DIAGNOSTIC REPORT FOR www.diatonic.ai${NC}"
echo "=================================================="
echo ""

# Test 1: Basic connectivity and headers
echo -e "${BLUE}Test 1: Basic Site Connectivity${NC}"
echo "curl -I https://www.diatonic.ai"
curl -I "https://www.diatonic.ai" 2>/dev/null | head -20 | sed 's/^/  /'
echo ""

# Test 2: Asset MIME type check
echo -e "${BLUE}Test 2: JavaScript Asset MIME Type${NC}"
echo "curl -I https://www.diatonic.ai/assets/index-DzYP2ee5.js"
ASSET_RESPONSE=$(curl -sI "https://www.diatonic.ai/assets/index-DzYP2ee5.js" | head -20)
echo "$ASSET_RESPONSE" | sed 's/^/  /'

MIME_TYPE=$(echo "$ASSET_RESPONSE" | grep -i content-type | cut -d' ' -f2- | tr -d '\r' || echo "unknown")
if echo "$MIME_TYPE" | grep -q "javascript"; then
    echo -e "  ${GREEN}✅ MIME Type: Correct ($MIME_TYPE)${NC}"
else
    echo -e "  ${RED}❌ MIME Type: WRONG ($MIME_TYPE) - Should be application/javascript${NC}"
fi
echo ""

# Test 3: Asset body content check
echo -e "${BLUE}Test 3: JavaScript Asset Body Content${NC}"
echo "curl -s https://www.diatonic.ai/assets/index-DzYP2ee5.js | head -5"
ASSET_BODY=$(curl -s "https://www.diatonic.ai/assets/index-DzYP2ee5.js" | head -5)
echo "$ASSET_BODY" | sed 's/^/  /'

if echo "$ASSET_BODY" | grep -q "<!DOCTYPE html>"; then
    echo -e "  ${RED}❌ Content: HTML (WRONG) - Asset is returning HTML instead of JavaScript${NC}"
    echo -e "  ${RED}   This indicates SPA fallback is incorrectly rewriting asset requests${NC}"
elif echo "$ASSET_BODY" | grep -qE "(import|export|function|const|var|let)"; then
    echo -e "  ${GREEN}✅ Content: JavaScript (Correct)${NC}"
else
    echo -e "  ${YELLOW}⚠️  Content: Unknown format${NC}"
fi
echo ""

# Test 4: CSS asset check
echo -e "${BLUE}Test 4: CSS Asset Check${NC}"
echo "curl -I https://www.diatonic.ai/assets/index-BxurtWjp.css"
CSS_RESPONSE=$(curl -sI "https://www.diatonic.ai/assets/index-BxurtWjp.css" 2>/dev/null | head -10 || echo "Failed to fetch CSS")
echo "$CSS_RESPONSE" | sed 's/^/  /'
echo ""

# Test 5: SPA routing test (should return HTML)
echo -e "${BLUE}Test 5: SPA Routing Test${NC}"
echo "curl -I https://www.diatonic.ai/dashboard (should return HTML)"
SPA_RESPONSE=$(curl -sI "https://www.diatonic.ai/dashboard" 2>/dev/null | head -10 || echo "Failed to fetch SPA route")
echo "$SPA_RESPONSE" | sed 's/^/  /'

SPA_MIME=$(echo "$SPA_RESPONSE" | grep -i content-type | cut -d' ' -f2- | tr -d '\r' || echo "unknown")
if echo "$SPA_MIME" | grep -q "text/html"; then
    echo -e "  ${GREEN}✅ SPA Route: Correctly returns HTML${NC}"
else
    echo -e "  ${RED}❌ SPA Route: Wrong MIME type ($SPA_MIME)${NC}"
fi
echo ""

# Test 6: 404 behavior for missing assets
echo -e "${BLUE}Test 6: 404 Behavior for Missing Assets${NC}"
echo "curl -I https://www.diatonic.ai/assets/nonexistent-file.js (should return 404, not HTML)"
MISSING_RESPONSE=$(curl -sI "https://www.diatonic.ai/assets/nonexistent-file.js" 2>/dev/null | head -10)
echo "$MISSING_RESPONSE" | sed 's/^/  /'

if echo "$MISSING_RESPONSE" | grep -q "404"; then
    echo -e "  ${GREEN}✅ Missing Asset: Correctly returns 404${NC}"
elif echo "$MISSING_RESPONSE" | grep -q "200" && echo "$MISSING_RESPONSE" | grep -q "text/html"; then
    echo -e "  ${RED}❌ Missing Asset: Returns 200 HTML (WRONG)${NC}"
    echo -e "  ${RED}   This confirms SPA fallback is incorrectly catching asset 404s${NC}"
else
    echo -e "  ${YELLOW}⚠️  Missing Asset: Unexpected response${NC}"
fi
echo ""

# Test 7: CloudFront distribution discovery
echo -e "${BLUE}Test 7: CloudFront Distribution Discovery${NC}"
echo "Searching for CloudFront distribution serving www.diatonic.ai..."

# Try to find the distribution via AWS CLI
DISTRIBUTIONS=$(aws cloudfront list-distributions --query "DistributionList.Items[*].[Id,Aliases.Items[0],Origins.Items[0].DomainName]" --output text 2>/dev/null || echo "")

if [[ -n "$DISTRIBUTIONS" ]]; then
    echo "Found distributions:"
    echo "$DISTRIBUTIONS" | grep -i diatonic | sed 's/^/  /' || echo "  No distributions found with 'diatonic' in aliases"
    echo ""
    
    # Try to match by domain
    DIATONIC_DIST=$(echo "$DISTRIBUTIONS" | grep -i "www.diatonic.ai" | awk '{print $1}' | head -1 || echo "")
    if [[ -n "$DIATONIC_DIST" ]]; then
        echo -e "${GREEN}✅ Found distribution: $DIATONIC_DIST${NC}"
        
        # Get distribution config
        echo "Fetching distribution configuration..."
        aws cloudfront get-distribution-config --id "$DIATONIC_DIST" --query "DistributionConfig.{DefaultRoot:DefaultRootObject,Behaviors:CacheBehaviors.Items,CustomErrors:CustomErrorResponses.Items}" --output json > "/tmp/cf-config-$DIATONIC_DIST.json" 2>/dev/null || echo "  Failed to fetch config"
        
        if [[ -f "/tmp/cf-config-$DIATONIC_DIST.json" ]]; then
            echo "Configuration saved to: /tmp/cf-config-$DIATONIC_DIST.json"
            
            # Check for problematic custom error responses
            echo ""
            echo "Checking for problematic custom error responses..."
            CUSTOM_ERRORS=$(jq -r '.CustomErrors[]? | select(.ResponseCode == 200) | "Error \(.ErrorCode) → \(.ResponsePagePath)"' "/tmp/cf-config-$DIATONIC_DIST.json" 2>/dev/null || echo "")
            if [[ -n "$CUSTOM_ERRORS" ]]; then
                echo -e "  ${RED}❌ Found problematic custom error responses:${NC}"
                echo "$CUSTOM_ERRORS" | sed 's/^/    /'
                echo -e "  ${RED}   These likely cause assets to return HTML instead of 404${NC}"
            else
                echo -e "  ${GREEN}✅ No problematic custom error responses found${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  Could not identify specific distribution for www.diatonic.ai${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not list CloudFront distributions (permissions or AWS CLI issue)${NC}"
fi
echo ""

# Test 8: Potential bucket discovery
echo -e "${BLUE}Test 8: S3 Bucket Discovery${NC}"
echo "Attempting to identify the S3 origin bucket..."

# Extract bucket from CloudFront origin if we found it
if [[ -n "${DIATONIC_DIST:-}" ]] && [[ -f "/tmp/cf-config-$DIATONIC_DIST.json" ]]; then
    ORIGIN_DOMAIN=$(aws cloudfront get-distribution --id "$DIATONIC_DIST" --query "Distribution.DistributionConfig.Origins.Items[0].DomainName" --output text 2>/dev/null || echo "")
    if [[ -n "$ORIGIN_DOMAIN" ]] && echo "$ORIGIN_DOMAIN" | grep -q "s3"; then
        BUCKET_NAME=$(echo "$ORIGIN_DOMAIN" | sed 's/.s3.*.amazonaws.com//')
        echo -e "  ${GREEN}✅ Likely S3 bucket: $BUCKET_NAME${NC}"
        export DISCOVERED_BUCKET="$BUCKET_NAME"
        
        # Test bucket access
        echo "Testing bucket access..."
        if aws s3 ls "s3://$BUCKET_NAME/" >/dev/null 2>&1; then
            echo -e "  ${GREEN}✅ Can access bucket contents${NC}"
        else
            echo -e "  ${YELLOW}⚠️  Cannot access bucket (permissions issue)${NC}"
        fi
    else
        echo -e "  ${YELLOW}⚠️  Origin is not S3 or couldn't determine bucket name${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠️  Cannot determine S3 bucket without CloudFront distribution info${NC}"
fi
echo ""

# Summary and Recommendations
echo -e "${BLUE}📋 DIAGNOSTIC SUMMARY${NC}"
echo "=================================================="

if echo "$MIME_TYPE" | grep -q "javascript"; then
    echo -e "${GREEN}✅ Status: MIME types are correct - issue may be resolved${NC}"
else
    echo -e "${RED}❌ Status: MIME type issue confirmed - JavaScript assets served as HTML${NC}"
    
    echo ""
    echo -e "${BLUE}🔧 RECOMMENDED FIXES:${NC}"
    echo ""
    
    if [[ -n "${DISCOVERED_BUCKET:-}" ]]; then
        echo -e "${YELLOW}Option 1: Quick Fix (Re-upload with correct MIME types)${NC}"
        echo "  ./scripts/fix-production-deployment.sh $DISCOVERED_BUCKET ${DIATONIC_DIST:-}"
        echo ""
    fi
    
    echo -e "${YELLOW}Option 2: CloudFront Configuration Fix${NC}"
    echo "  1. Go to AWS Console → CloudFront → Your Distribution"
    echo "  2. Create a new behavior for path pattern: /assets/*"
    echo "     - Allowed HTTP Methods: GET, HEAD"
    echo "     - Compress objects: Yes"
    echo "     - Custom error responses: None (empty)"
    echo "  3. Remove/modify Custom Error Responses that map 404/403 to index.html"
    echo "  4. Update default behavior to use CloudFront Function for SPA routing:"
    echo ""
    echo "     CloudFront Function (Viewer Request):"
    echo "     function handler(event) {"
    echo "       var req = event.request;"
    echo "       var uri = req.uri;"
    echo "       var accept = (req.headers['accept'] && req.headers['accept'].value) || '';"
    echo "       var hasExt = uri.includes('.') || uri.endsWith('/');"
    echo "       if (!hasExt && accept.includes('text/html')) {"
    echo "         req.uri = '/index.html';"
    echo "       }"
    echo "       return req;"
    echo "     }"
    echo ""
    
    echo -e "${YELLOW}Option 3: Atomic Redeployment${NC}"
    echo "  1. Build locally: npm run build"
    echo "  2. Upload assets first: aws s3 sync dist/assets/ s3://BUCKET/assets/ --content-type application/javascript"
    echo "  3. Upload index.html last: aws s3 cp dist/index.html s3://BUCKET/index.html"
    echo "  4. Invalidate: aws cloudfront create-invalidation --distribution-id ID --paths '/index.html' '/'"
fi

echo ""
echo -e "${BLUE}📁 Debug Files Created:${NC}"
ls -la /tmp/cf-config-* 2>/dev/null | sed 's/^/  /' || echo "  None"

echo ""
echo -e "${BLUE}🔍 Next Steps:${NC}"
echo "  1. If MIME types are wrong, run the fix script"
echo "  2. If still failing, check CloudFront behaviors and custom error responses"
echo "  3. Monitor https://www.diatonic.ai for 5-10 minutes after changes"
echo "  4. Test in incognito/private browser window to avoid cache"
