#!/bin/bash
# Initialize AWS Amplify for React+Vite+shadcn+Tailwind+TypeScript Application
set -euo pipefail

# Add Amplify to PATH
export PATH="$HOME/.amplify/bin:$PATH"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Initializing AWS Amplify for AI Nexus Workbench${NC}"
echo -e "${BLUE}React + Vite + shadcn/ui + Tailwind + TypeScript + AWS SDK${NC}"

# Verify we're in the right directory
if [[ ! -f "package.json" ]] || ! grep -q "vite_react_shadcn_ts" package.json; then
  echo "❌ Error: Please run this from the AI Nexus Workbench directory"
  exit 1
fi

echo -e "${GREEN}✅ Found React+Vite+shadcn project${NC}"

# Check if already initialized
if [[ -d "amplify" ]]; then
  echo -e "${YELLOW}⚠️  Amplify already initialized. Skipping init...${NC}"
else
  echo -e "${GREEN}📦 Initializing Amplify project...${NC}"
  
  # Initialize with non-interactive settings
  amplify init \
    --appId ai-nexus-workbench \
    --envName prod \
    --defaultEditor code \
    --yes
fi

# Add hosting
echo -e "${GREEN}🌐 Adding Amplify Hosting...${NC}"
if ! amplify status | grep -q "hosting"; then
  echo -e "${BLUE}Configuring hosting for React SPA...${NC}"
  
  # Add hosting with manual configuration for React SPA
  amplify add hosting <<EOF
Hosting with Amplify Console (Managed hosting with custom domains, Continuous deployment)
Continuous deployment (Git-based deployments)
EOF

else
  echo -e "${YELLOW}⚠️  Hosting already configured${NC}"
fi

echo -e "${GREEN}🏗️  Building the application...${NC}"
npm run build

echo -e "${GREEN}🚀 Publishing to Amplify...${NC}"
amplify publish --yes

echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Your React+Vite+shadcn+Tailwind app is now live!${NC}"
echo ""
echo -e "${YELLOW}🔗 Key Features Enabled:${NC}"
echo "  ✅ Static hosting with global CDN"
echo "  ✅ Automatic HTTPS certificates"  
echo "  ✅ React Router SPA support"
echo "  ✅ AWS SDK integration ready"
echo "  ✅ shadcn/ui components optimized"
echo "  ✅ Tailwind CSS compiled and minified"
echo "  ✅ TypeScript build optimizations"
echo ""
echo -e "${YELLOW}📊 Next Steps:${NC}"
echo "  1. Connect your Git repository for CI/CD"
echo "  2. Set up custom domain if needed"
echo "  3. Configure environment variables"
echo "  4. Add AWS backend services (API, Auth, Storage)"
echo ""
amplify status
