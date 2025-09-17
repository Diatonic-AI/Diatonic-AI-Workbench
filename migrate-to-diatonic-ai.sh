#!/bin/bash
# Migrate AI Nexus Workbench to Diatonic-AI-Workbench
# Break from AWS-DevOps repo and create standalone repo in Diatonic-AI org
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Migrating to Diatonic-AI-Workbench Repository${NC}"
echo -e "${BLUE}=================================================${NC}"

# Configuration
NEW_REPO_NAME="Diatonic-AI-Workbench"
ORG_NAME="Diatonic-AI"
NEW_PROJECT_DIR="/home/daclab-ai/dev/${NEW_REPO_NAME}"
CURRENT_DIR="/home/daclab-ai/dev/AWS-DevOps/apps/ai-nexus-workbench"

echo -e "${GREEN}📋 Migration Configuration:${NC}"
echo "  Current Location: $CURRENT_DIR"
echo "  New Repository: $ORG_NAME/$NEW_REPO_NAME"
echo "  New Location: $NEW_PROJECT_DIR"
echo ""

# Step 1: Create new directory structure
echo -e "${GREEN}📁 Step 1: Creating new directory structure...${NC}"
mkdir -p "$NEW_PROJECT_DIR"

# Step 2: Copy all project files (excluding git history)
echo -e "${GREEN}📋 Step 2: Copying project files...${NC}"
rsync -av \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.env.*' \
  --exclude='*.log' \
  --exclude='.dynamodb-local' \
  "$CURRENT_DIR/" "$NEW_PROJECT_DIR/"

echo -e "${GREEN}✅ Files copied successfully${NC}"

# Step 3: Update package.json with new name and details
echo -e "${GREEN}📦 Step 3: Updating package.json...${NC}"
cd "$NEW_PROJECT_DIR"

# Update package.json
jq '.name = "diatonic-ai-workbench" | 
    .description = "Diatonic AI Workbench - Modern React+Vite+shadcn+Tailwind+TypeScript application for AI development and workflow management" |
    .repository = {
      "type": "git", 
      "url": "https://github.com/Diatonic-AI/Diatonic-AI-Workbench.git"
    } |
    .homepage = "https://github.com/Diatonic-AI/Diatonic-AI-Workbench#readme" |
    .bugs.url = "https://github.com/Diatonic-AI/Diatonic-AI-Workbench/issues"' \
    package.json > package.json.tmp && mv package.json.tmp package.json

echo -e "${GREEN}✅ package.json updated${NC}"

# Step 4: Update README and documentation
echo -e "${GREEN}📚 Step 4: Creating new README...${NC}"
cat > README.md << 'EOF'
# Diatonic AI Workbench

A modern, professional React application built with Vite, shadcn/ui, Tailwind CSS, and TypeScript, designed for AI development workflows and team collaboration.

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5.4+
- **UI Framework**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **State Management**: React Query + Context API
- **Routing**: React Router DOM v6
- **AWS Integration**: AWS SDK v3, Amplify, Cognito
- **Development**: ESLint, TypeScript strict mode

## 🏗️ Architecture

### Visual Flow Builder
- Drag-and-drop interface powered by React Flow
- Custom node types for AI workflows
- Real-time collaboration capabilities

### AWS Integration
- **Authentication**: AWS Cognito
- **Database**: DynamoDB
- **Storage**: S3
- **Hosting**: AWS Amplify

### Modern UI/UX
- Responsive design with dark mode
- Professional component library
- Accessible and performant

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- AWS CLI configured

### Installation

```bash
# Clone the repository
git clone https://github.com/Diatonic-AI/Diatonic-AI-Workbench.git
cd Diatonic-AI-Workbench

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your AWS configuration

# Start development server
npm run dev
```

### Development Commands

```bash
# Development
npm run dev              # Start dev server on :8080
npm run dev:direct       # Direct Vite server
npm run dev:verify       # Verify setup

# Building
npm run build           # Production build
npm run build:dev       # Development build
npm run build:analyze   # Build with bundle analysis

# Testing & Quality
npm run lint            # ESLint check
npm run preview         # Preview production build
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── auth/           # Authentication components  
│   ├── agent-builder/  # Visual flow builder
│   └── layouts/        # Page layouts
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configurations
├── pages/              # Route components
└── App.tsx             # Main application
```

## 🌐 Deployment

### AWS Amplify (Recommended)
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize and deploy
amplify init
amplify add hosting
amplify publish
```

### Manual S3 Deployment
```bash
npm run build
aws s3 sync dist/ s3://your-bucket-name --delete
```

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env.local` and configure:

```env
VITE_AWS_REGION=us-east-2
VITE_AWS_COGNITO_USER_POOL_ID=your-pool-id
VITE_AWS_COGNITO_USER_POOL_CLIENT_ID=your-client-id
VITE_API_GATEWAY_URL=your-api-url
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Live Demo](https://diatonic-ai-workbench.amplifyapp.com)
- [Documentation](https://docs.diatonic.ai)
- [Issues](https://github.com/Diatonic-AI/Diatonic-AI-Workbench/issues)
- [Diatonic AI](https://diatonic.ai)
EOF

echo -e "${GREEN}✅ README.md created${NC}"

# Step 5: Initialize new Git repository
echo -e "${GREEN}🔄 Step 5: Initializing new Git repository...${NC}"
git init
git add .
git commit -m "Initial commit: Diatonic AI Workbench

- React 18 + Vite + TypeScript
- shadcn/ui + Tailwind CSS  
- AWS SDK integration
- Visual flow builder
- Professional UI/UX"

echo -e "${GREEN}✅ Git repository initialized${NC}"

# Step 6: Create GitHub repository
echo -e "${GREEN}🌐 Step 6: Creating GitHub repository...${NC}"
gh repo create "$ORG_NAME/$NEW_REPO_NAME" \
  --public \
  --description "Modern React+Vite+shadcn+Tailwind+TypeScript application for AI development workflows" \
  --homepage "https://diatonic.ai" \
  --clone=false

# Add remote and push
git remote add origin "https://github.com/$ORG_NAME/$NEW_REPO_NAME.git"
git branch -M main
git push -u origin main

echo -e "${GREEN}✅ Repository created and pushed to GitHub${NC}"

# Step 7: Set up GitHub repository settings
echo -e "${GREEN}⚙️  Step 7: Configuring repository settings...${NC}"

# Enable features
gh repo edit "$ORG_NAME/$NEW_REPO_NAME" \
  --enable-issues \
  --enable-projects \
  --enable-wiki

# Create initial labels
gh label create "bug" --color "d73a4a" --description "Something isn't working" --repo "$ORG_NAME/$NEW_REPO_NAME" || true
gh label create "enhancement" --color "a2eeef" --description "New feature or request" --repo "$ORG_NAME/$NEW_REPO_NAME" || true
gh label create "documentation" --color "0075ca" --description "Improvements or additions to documentation" --repo "$ORG_NAME/$NEW_REPO_NAME" || true
gh label create "aws" --color "ff9500" --description "AWS-related changes" --repo "$ORG_NAME/$NEW_REPO_NAME" || true
gh label create "ui/ux" --color "7057ff" --description "User interface and experience" --repo "$ORG_NAME/$NEW_REPO_NAME" || true

echo -e "${GREEN}✅ Repository configured${NC}"

# Summary
echo ""
echo -e "${BLUE}🎉 Migration Complete!${NC}"
echo -e "${BLUE}===================${NC}"
echo ""
echo -e "${GREEN}✅ New Repository Created:${NC}"
echo "  📍 Location: $NEW_PROJECT_DIR"
echo "  🌐 GitHub: https://github.com/$ORG_NAME/$NEW_REPO_NAME"
echo "  🏠 Homepage: https://diatonic.ai"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "  1. cd $NEW_PROJECT_DIR"
echo "  2. npm install"
echo "  3. Set up CI/CD with GitHub Actions"
echo "  4. Configure AWS Amplify deployment"
echo "  5. Update environment variables"
echo ""
echo -e "${GREEN}🚀 Ready for CI/CD setup!${NC}"
