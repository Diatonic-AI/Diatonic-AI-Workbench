#!/bin/bash
# Update CloudFlare DNS to point to AWS Amplify
set -euo pipefail

echo "🌐 Updating CloudFlare DNS for diatonic.ai to point to AWS Amplify"
echo "=================================================="

# Check if API token is set
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    echo "❌ Error: CLOUDFLARE_API_TOKEN environment variable not set"
    echo ""
    echo "Please set your CloudFlare API token:"
    echo "export CLOUDFLARE_API_TOKEN='your_token_here'"
    echo ""
    echo "Get your token from: https://dash.cloudflare.com/profile/api-tokens"
    exit 1
fi

# Set variables
ZONE_ID="2ce1478eaf8042eaa3bee715d34301b9"
AMPLIFY_DOMAIN="dxz4p4iipx5lm.cloudfront.net"
API_GATEWAY_DOMAIN="c2n9uk1ovi.execute-api.us-east-2.amazonaws.com"

echo "🔧 Configuration:"
echo "  - Zone ID: $ZONE_ID"
echo "  - Amplify Domain: $AMPLIFY_DOMAIN"
echo "  - API Gateway: $API_GATEWAY_DOMAIN"
echo ""

# Function to update DNS record
update_dns_record() {
    local name="$1"
    local target="$2"
    local proxied="$3"
    
    echo "📝 Updating DNS record: $name -> $target"
    
    # Get existing record ID
    local record_id=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?name=$name" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" | \
        jq -r '.result[0].id // empty')
    
    if [[ -n "$record_id" && "$record_id" != "null" ]]; then
        # Update existing record
        curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$record_id" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data "{
                \"type\": \"CNAME\",
                \"name\": \"$name\",
                \"content\": \"$target\",
                \"proxied\": $proxied,
                \"ttl\": 1
            }" | jq -r '.success'
    else
        # Create new record
        curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data "{
                \"type\": \"CNAME\",
                \"name\": \"$name\",
                \"content\": \"$target\",
                \"proxied\": $proxied,
                \"ttl\": 1
            }" | jq -r '.success'
    fi
}

# Update main domain records
echo "🌐 Updating main domain records..."
update_dns_record "diatonic.ai" "$AMPLIFY_DOMAIN" "true"
update_dns_record "www.diatonic.ai" "$AMPLIFY_DOMAIN" "true"
update_dns_record "app.diatonic.ai" "$AMPLIFY_DOMAIN" "true"

# Update API record (DNS only, not proxied)
echo "🔌 Updating API subdomain..."
update_dns_record "api.diatonic.ai" "$API_GATEWAY_DOMAIN" "false"

echo ""
echo "✅ DNS records updated successfully!"
echo ""
echo "🕒 DNS propagation may take 5-15 minutes"
echo "🔍 You can check status with:"
echo "   dig diatonic.ai"
echo "   dig www.diatonic.ai"
echo "   dig app.diatonic.ai"
echo "   dig api.diatonic.ai"
echo ""
echo "🌍 Test the site once propagation completes:"
echo "   https://diatonic.ai"
echo "   https://www.diatonic.ai"
echo "   https://app.diatonic.ai"
echo ""
echo "📊 Check AWS Amplify domain status:"
echo "   aws amplify get-domain-association --app-id d3ddhluaptuu35 --domain-name diatonic.ai --region us-east-2"
