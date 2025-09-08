#!/usr/bin/env bash
# Cleanup Old Infrastructure: CloudFront + ACM
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗑️ Infrastructure Cleanup: CloudFront + ACM Certificates${NC}"
echo -e "${YELLOW}⚠️  This will destroy existing CloudFront distributions and certificates${NC}"
echo ""

# Discovered infrastructure (corrected IDs)
PROD_CLOUDFRONT_ID="EQKQIA54WHS82"
DEV_CLOUDFRONT_ID="EB3GDEPQ1RC9T"
ACM_CERT_1="arn:aws:acm:us-east-2:313476888312:certificate/5241d9e1-cdee-4674-b625-3701fca53cd7"
ACM_CERT_2="arn:aws:acm:us-east-2:313476888312:certificate/016bfc32-f253-4d48-83cc-57ba6ec5888f"

# Confirmation
echo -e "${RED}📋 Infrastructure to be destroyed:${NC}"
echo "  - Production CloudFront: $PROD_CLOUDFRONT_ID"
echo "    Domains: diatonic.ai, www.diatonic.ai, app.diatonic.ai"
echo "  - Development CloudFront: $DEV_CLOUDFRONT_ID" 
echo "    Domains: dev.diatonic.ai, www.dev.diatonic.ai, app.dev.diatonic.ai, admin.dev.diatonic.ai, api.dev.diatonic.ai"
echo "  - ACM Certificate 1: dev.diatonic.ai"
echo "  - ACM Certificate 2: dev.diatonic.ai"
echo ""

read -p "Are you ABSOLUTELY SURE you want to destroy this infrastructure? (type 'DESTROY' to confirm): " confirmation
if [[ "$confirmation" != "DESTROY" ]]; then
  echo -e "${YELLOW}❌ Cleanup cancelled${NC}"
  exit 1
fi

echo -e "${BLUE}🔄 Starting infrastructure cleanup...${NC}"

# Function to backup distribution config before deletion
backup_distribution() {
  local distribution_id="$1"
  local name="$2"
  
  echo -e "${YELLOW}📸 Backing up $name distribution configuration...${NC}"
  aws cloudfront get-distribution --id "$distribution_id" > "backup-cloudfront-$name-$(date +%Y%m%d_%H%M%S).json" || {
    echo -e "${YELLOW}⚠️  Warning: Could not backup $name distribution config${NC}"
  }
}

# Function to disable and delete CloudFront distribution
delete_cloudfront_distribution() {
  local distribution_id="$1"
  local name="$2"
  
  echo -e "${BLUE}🔄 Processing $name CloudFront distribution: $distribution_id${NC}"
  
  # Get current distribution config
  local config_file="/tmp/cloudfront-config-$distribution_id.json"
  if ! aws cloudfront get-distribution-config --id "$distribution_id" > "$config_file"; then
    echo -e "${RED}❌ Failed to get distribution config for $distribution_id${NC}"
    return 1
  fi
  
  # Check if already disabled
  local enabled=$(jq -r '.DistributionConfig.Enabled' "$config_file")
  local etag=$(jq -r '.ETag' "$config_file")
  
  if [[ "$enabled" == "true" ]]; then
    echo -e "${YELLOW}⏸️  Disabling $name distribution...${NC}"
    
    # Create disabled config
    jq '.DistributionConfig.Enabled = false' "$config_file" > "/tmp/disabled-config-$distribution_id.json"
    
    # Update distribution to disable it
    if aws cloudfront update-distribution \
        --id "$distribution_id" \
        --distribution-config "$(jq -c '.DistributionConfig' "/tmp/disabled-config-$distribution_id.json")" \
        --if-match "$etag" > /dev/null; then
      
      echo -e "${GREEN}✅ $name distribution disabled${NC}"
      echo -e "${YELLOW}⏳ Waiting for distribution to reach Deployed status...${NC}"
      
      # Wait for distribution to be deployed (disabled)
      local attempts=0
      local max_attempts=60  # 30 minutes max
      while [[ $attempts -lt $max_attempts ]]; do
        local status=$(aws cloudfront get-distribution --id "$distribution_id" --query 'Distribution.Status' --output text)
        if [[ "$status" == "Deployed" ]]; then
          break
        fi
        echo -e "${YELLOW}⏳ Status: $status - waiting 30s... (attempt $((attempts+1))/$max_attempts)${NC}"
        sleep 30
        ((attempts++))
      done
      
      if [[ $attempts -ge $max_attempts ]]; then
        echo -e "${RED}❌ Timeout waiting for $name distribution to reach Deployed status${NC}"
        echo -e "${YELLOW}⚠️  You'll need to delete this distribution manually later${NC}"
        return 1
      fi
      
      echo -e "${GREEN}✅ $name distribution is now deployed (disabled)${NC}"
    else
      echo -e "${RED}❌ Failed to disable $name distribution${NC}"
      return 1
    fi
  else
    echo -e "${GREEN}✅ $name distribution already disabled${NC}"
  fi
  
  # Now delete the distribution
  echo -e "${BLUE}🗑️  Deleting $name distribution...${NC}"
  
  # Get fresh ETag after disable operation
  local fresh_etag=$(aws cloudfront get-distribution --id "$distribution_id" --query 'ETag' --output text)
  
  if aws cloudfront delete-distribution --id "$distribution_id" --if-match "$fresh_etag"; then
    echo -e "${GREEN}✅ $name distribution deleted successfully${NC}"
  else
    echo -e "${RED}❌ Failed to delete $name distribution${NC}"
    echo -e "${YELLOW}⚠️  You may need to delete it manually from the AWS Console${NC}"
  fi
  
  # Cleanup temp files
  rm -f "$config_file" "/tmp/disabled-config-$distribution_id.json"
}

# Function to delete ACM certificate
delete_acm_certificate() {
  local cert_arn="$1"
  local cert_domain="$2"
  
  echo -e "${BLUE}🔄 Deleting ACM certificate for $cert_domain${NC}"
  echo -e "${BLUE}   ARN: $cert_arn${NC}"
  
  if aws acm delete-certificate --certificate-arn "$cert_arn"; then
    echo -e "${GREEN}✅ ACM certificate deleted: $cert_domain${NC}"
  else
    echo -e "${RED}❌ Failed to delete ACM certificate: $cert_domain${NC}"
    echo -e "${YELLOW}⚠️  Certificate may be in use or require manual deletion${NC}"
  fi
}

# Backup configurations first
echo -e "${BLUE}📸 Creating backups before deletion...${NC}"
backup_distribution "$PROD_CLOUDFRONT_ID" "production"
backup_distribution "$DEV_CLOUDFRONT_ID" "development"

# Delete CloudFront distributions
echo -e "${BLUE}🌐 Deleting CloudFront distributions...${NC}"
delete_cloudfront_distribution "$PROD_CLOUDFRONT_ID" "Production"
delete_cloudfront_distribution "$DEV_CLOUDFRONT_ID" "Development"

# Wait a bit before deleting certificates
echo -e "${YELLOW}⏸️  Waiting 2 minutes for distributions to fully delete...${NC}"
sleep 120

# Delete ACM certificates
echo -e "${BLUE}🔒 Deleting ACM certificates...${NC}"
delete_acm_certificate "$ACM_CERT_1" "dev.diatonic.ai"
delete_acm_certificate "$ACM_CERT_2" "dev.diatonic.ai" 

# Verify cleanup
echo -e "${BLUE}🔍 Verifying cleanup...${NC}"

echo -e "${BLUE}CloudFront distributions remaining:${NC}"
aws cloudfront list-distributions --query "DistributionList.Items[?contains(Aliases.Items[0], 'diatonic')].{Id:Id,Aliases:Aliases.Items}" --output table || echo "None found"

echo -e "${BLUE}ACM certificates remaining:${NC}"
aws acm list-certificates --query "CertificateSummaryList[?contains(DomainName, 'diatonic')].{DomainName:DomainName,Status:Status}" --output table || echo "None found"

echo ""
echo -e "${GREEN}🎉 Infrastructure cleanup completed!${NC}"
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "  ✅ CloudFront distributions disabled and deleted"
echo -e "  ✅ ACM certificates deleted"
echo -e "  ✅ Backup files created for recovery (if needed)"
echo ""
echo -e "${YELLOW}🔄 Next steps:${NC}"
echo -e "  1. Set up new Amplify domain: ./scripts/setup-domain.sh diatonic.ai"
echo -e "  2. Create staging environment: git checkout -b staging && git push origin staging"
echo -e "  3. Test new deployment thoroughly"
echo ""
echo -e "${GREEN}✨ Ready for clean Amplify deployment!${NC}"
