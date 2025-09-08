#!/usr/bin/env bash
# AWS Amplify Custom Domain Setup Script
set -euo pipefail

# Configuration
APP_ID="ddfry2y14h2zr"
DOMAIN_NAME="${1:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
  echo "Usage: $0 <domain-name>"
  echo "Example: $0 diatonic-ai.com"
  exit 1
}

if [[ -z "$DOMAIN_NAME" ]]; then
  echo -e "${RED}Error: Domain name required${NC}"
  usage
fi

echo -e "${BLUE}🌐 Setting up custom domain: $DOMAIN_NAME${NC}"
echo -e "${BLUE}📱 App ID: $APP_ID${NC}"

# Check if domain is already configured
echo -e "${YELLOW}🔍 Checking existing domain configuration...${NC}"
if aws amplify list-domain-associations --app-id "$APP_ID" --query "domainAssociations[?domainName=='$DOMAIN_NAME']" --output text | grep -q "$DOMAIN_NAME"; then
  echo -e "${YELLOW}⚠️  Domain $DOMAIN_NAME is already configured for this app${NC}"
  
  # Show current status
  echo -e "${BLUE}📊 Current domain status:${NC}"
  aws amplify get-domain-association \
    --app-id "$APP_ID" \
    --domain-name "$DOMAIN_NAME" \
    --query 'domainAssociation.{Status:domainStatus,Domain:domainName,Certificate:certificateVerificationDNSRecord}' \
    --output table
    
  read -p "Do you want to continue and update configuration? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
  fi
else
  echo -e "${GREEN}✅ Domain not yet configured, proceeding with setup...${NC}"
fi

# Check if domain exists in Route 53
echo -e "${YELLOW}🔍 Checking if domain exists in Route 53...${NC}"
if aws route53 list-hosted-zones --query "HostedZones[?Name=='${DOMAIN_NAME}.']" --output text | grep -q "$DOMAIN_NAME"; then
  echo -e "${GREEN}✅ Domain found in Route 53${NC}"
  DOMAIN_IN_ROUTE53=true
else
  echo -e "${YELLOW}⚠️  Domain not found in Route 53${NC}"
  echo -e "${BLUE}ℹ️  You'll need to manually configure DNS records with your domain provider${NC}"
  DOMAIN_IN_ROUTE53=false
fi

# Create domain association
echo -e "${YELLOW}🚀 Creating domain association...${NC}"

# Create subdomain configuration
SUBDOMAIN_CONFIG='[
  {
    "prefix": "www",
    "branchName": "main"
  },
  {
    "prefix": "dev",
    "branchName": "develop" 
  }
]'

# Add staging if branch exists
if git ls-remote --exit-code --heads origin staging >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Staging branch detected, adding staging subdomain${NC}"
  SUBDOMAIN_CONFIG='[
    {
      "prefix": "www", 
      "branchName": "main"
    },
    {
      "prefix": "staging",
      "branchName": "staging"
    },
    {
      "prefix": "dev",
      "branchName": "develop"
    }
  ]'
fi

# Create or update domain association
if aws amplify create-domain-association \
  --app-id "$APP_ID" \
  --domain-name "$DOMAIN_NAME" \
  --sub-domain-settings "$SUBDOMAIN_CONFIG" \
  --enable-auto-sub-domain; then
  
  echo -e "${GREEN}✅ Domain association created successfully${NC}"
else
  echo -e "${YELLOW}⚠️  Domain may already exist, trying to update...${NC}"
  
  # Try to update instead
  aws amplify update-domain-association \
    --app-id "$APP_ID" \
    --domain-name "$DOMAIN_NAME" \
    --sub-domain-settings "$SUBDOMAIN_CONFIG" \
    --enable-auto-sub-domain || {
    echo -e "${RED}❌ Failed to create or update domain association${NC}"
    exit 1
  }
fi

# Show domain setup status
echo -e "${BLUE}📊 Domain setup status:${NC}"
aws amplify get-domain-association \
  --app-id "$APP_ID" \
  --domain-name "$DOMAIN_NAME" \
  --output table

# Provide next steps
echo -e "${GREEN}🎉 Domain setup initiated!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"

if [[ "$DOMAIN_IN_ROUTE53" == "true" ]]; then
  echo -e "${GREEN}✅ Route 53 Integration:${NC}"
  echo "   - DNS records will be automatically configured"
  echo "   - SSL certificate will be automatically provisioned"
  echo "   - Setup should complete in 10-15 minutes"
else
  echo -e "${YELLOW}⚠️  Manual DNS Configuration Required:${NC}"
  echo "   1. Add these DNS records to your domain provider:"
  echo "      - Type: CNAME, Name: www, Value: $APP_ID.amplifyapp.com"
  echo "      - Type: CNAME, Name: dev, Value: $APP_ID.amplifyapp.com"
  echo "   2. If your provider supports ALIAS records for root domain:"
  echo "      - Type: ALIAS, Name: @, Value: $APP_ID.amplifyapp.com"
  echo "   3. Wait for DNS propagation (24-48 hours)"
fi

echo ""
echo -e "${BLUE}🔍 Monitor Progress:${NC}"
echo "   aws amplify get-domain-association --app-id $APP_ID --domain-name $DOMAIN_NAME"
echo ""
echo -e "${BLUE}🌐 Future URLs:${NC}"
echo "   - https://www.$DOMAIN_NAME (Production - main branch)"
echo "   - https://dev.$DOMAIN_NAME (Development - develop branch)"
if git ls-remote --exit-code --heads origin staging >/dev/null 2>&1; then
echo "   - https://staging.$DOMAIN_NAME (Staging - staging branch)"
fi
echo ""
echo -e "${GREEN}✨ Domain setup complete!${NC}"
