#!/bin/bash
# AWS Amplify Deployment Script for React+Vite+shadcn+Tailwind App
set -euo pipefail

echo "🚀 Deploying React App to AWS Amplify (No CloudFront Required)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
  echo -e "${RED}Error: Please run this script from the React app directory${NC}"
  exit 1
fi

# Install Amplify CLI if not present
if ! command -v amplify &> /dev/null; then
    echo -e "${YELLOW}Installing Amplify CLI...${NC}"
    npm install -g @aws-amplify/cli
fi

# Check if already initialized
if [[ ! -d "amplify" ]]; then
    echo -e "${GREEN}Initializing Amplify project...${NC}"
    
    # Initialize Amplify with default settings
    amplify init --quickstart --frontend javascript --framework react \
      --srcDir src --distDir dist --buildCommand "npm run build" \
      --startCommand "npm run dev:direct" --yes
    
    echo -e "${GREEN}Adding Amplify hosting...${NC}"
    
    # Add hosting with S3 (no CloudFront)
    amplify add hosting --type static --buckets-only
    
else
    echo -e "${YELLOW}Amplify already initialized${NC}"
fi

# Build the app
echo -e "${GREEN}Building React app...${NC}"
npm run build

# Deploy to Amplify
echo -e "${GREEN}Publishing to Amplify...${NC}"
amplify publish --yes

# Show the URL
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}Your app is now live at the URL shown above${NC}"

# Additional info
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Your app is hosted on S3 with global distribution"
echo "2. Automatic HTTPS with AWS certificates"
echo "3. Branch-based deployments available"
echo "4. CI/CD integration with Git available"
