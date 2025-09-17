# AI Nexus Workbench 🤖

> A comprehensive React-based platform for AI development, featuring visual agent building, AWS integration, and a complete ecosystem for AI education and experimentation.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![AWS](https://img.shields.io/badge/AWS-232F3E?style=flat&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)

## ✨ Features

- 🤖 **Visual Agent Builder** - Drag-and-drop interface for creating AI agents
- 🔐 **AWS Cognito Authentication** - Secure user management and authentication
- 💰 **Integrated Billing System** - Stripe integration with multiple pricing tiers
- 📊 **Lead Management System** - Comprehensive lead capture and analytics
- 🎯 **Onboarding Flow** - Guided user registration with role-based flows
- 📱 **Responsive Design** - Works seamlessly across all device types
- 🌙 **Dark Mode Support** - Built-in theme switching
- ⚡ **Performance Optimized** - Built with Vite and modern React patterns

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- AWS Account with Cognito, API Gateway, DynamoDB, and Lambda access
- Stripe Account for billing integration

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ai-nexus-workbench

# Install dependencies
npm install
# or
yarn install

# Copy environment template
cp .env.example .env.local

# Configure your AWS and Stripe credentials in .env.local
```

### Environment Configuration

Create a `.env.local` file with the following variables:

```env
# AWS Configuration
VITE_AWS_REGION=us-east-2
VITE_AWS_COGNITO_USER_POOL_ID=your_user_pool_id
VITE_AWS_COGNITO_USER_POOL_CLIENT_ID=your_client_id
VITE_AWS_COGNITO_IDENTITY_POOL_ID=your_identity_pool_id
VITE_AWS_API_GATEWAY_ENDPOINT=your_api_gateway_url
VITE_AWS_S3_BUCKET=your_s3_bucket

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Application Configuration
VITE_APP_NAME=AI Nexus Workbench
VITE_APP_VERSION=1.0.0
VITE_ENABLE_DEBUG_LOGS=false
VITE_ENABLE_ANALYTICS=true
```

### Development

```bash
# Start development server
npm run dev
# or
yarn dev

# The application will be available at http://localhost:8080
```

## 🏗️ Infrastructure Deployment

### Prerequisites

- Terraform 1.0+
- AWS CLI configured with appropriate permissions
- Node.js 18+ for Lambda functions

### Deploy AWS Infrastructure

```bash
# Navigate to scripts directory
cd scripts

# Make scripts executable
chmod +x *.sh

# Deploy infrastructure (includes DynamoDB, Lambda, API Gateway)
./deploy-leads.sh deploy dev

# The script will:
# 1. Install Lambda dependencies
# 2. Initialize and plan Terraform
# 3. Deploy infrastructure
# 4. Test API endpoints
# 5. Update frontend configuration automatically
```

### Manual Infrastructure Management

```bash
# Initialize Terraform
cd terraform/leads
terraform init

# Plan deployment
terraform plan -var="environment=dev"

# Apply changes
terraform apply -var="environment=dev"

# Update frontend configuration
cd ../../scripts
./update-frontend-config.sh update dev
```

## 📊 System Architecture

### Frontend Architecture
```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   React App     │───▶│  AWS Cognito │    │   Stripe API    │
│  (TypeScript)   │    │ (Auth)       │    │   (Billing)     │
└─────────────────┘    └──────────────┘    └─────────────────┘
         │                       │                    │
         ▼                       ▼                    ▼
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│  API Gateway    │───▶│  Lambda      │───▶│   DynamoDB      │
│  (REST API)     │    │ (Node.js)    │    │  (Database)     │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

### Key Components

- **Frontend**: React + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Authentication**: AWS Cognito with multi-environment support
- **API Layer**: AWS API Gateway + Lambda functions
- **Database**: DynamoDB for scalable data storage
- **Billing**: Stripe integration with webhooks
- **Lead Management**: Comprehensive lead capture and analytics

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server on :8080
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build
npm run lint         # ESLint check

# Infrastructure
cd scripts
./deploy-leads.sh deploy <env>     # Deploy infrastructure
./deploy-leads.sh test <env>       # Test deployment
./update-frontend-config.sh        # Update frontend config
```

### Project Structure

```
ai-nexus-workbench/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── auth/           # Authentication components
│   │   ├── agent-builder/  # Visual flow builder
│   │   ├── onboarding/     # User onboarding flow
│   │   └── layouts/        # Page layouts
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and API clients
│   ├── pages/              # Route components
│   └── App.tsx             # Main application
├── terraform/              # Infrastructure as code
│   ├── leads/              # Lead management infrastructure
│   └── billing/            # Billing system infrastructure
├── scripts/                # Deployment and utility scripts
├── docs/                   # Project documentation
└── public/                 # Static assets
```

### Key Technologies

#### Frontend
- **React** ^18.3.1 - UI library
- **TypeScript** ^5.5.3 - Type safety
- **Vite** ^5.4.1 - Build tool and dev server
- **@xyflow/react** ^12.6.0 - Visual flow building
- **@tanstack/react-query** ^5.56.2 - Server state management
- **shadcn/ui** - High-quality React components
- **Tailwind CSS** ^3.4.11 - Utility-first CSS

#### AWS Services
- **AWS Amplify** ^6.15.5 - AWS SDK and authentication
- **Cognito** - User authentication and management
- **API Gateway** - REST API endpoints
- **Lambda** - Serverless functions
- **DynamoDB** - NoSQL database
- **S3** - File storage

## 📈 Lead Management System

The platform includes a comprehensive lead management system:

### Features
- **Multi-source lead capture** (pricing page, onboarding flow)
- **Lead scoring and prioritization**
- **Activity tracking and analytics**
- **GDPR-compliant consent management**
- **Real-time notifications and alerts**
- **Export capabilities for sales teams**

### API Endpoints
```
POST   /api/leads              # Create new lead
GET    /api/leads/{id}         # Get lead by ID
GET    /api/leads              # List leads with filtering
PUT    /api/leads/{id}         # Update lead
GET    /api/leads/analytics    # Get lead analytics
POST   /api/leads/enterprise   # Enterprise inquiry
```

### Usage Example
```typescript
import { leadAPI } from '@/lib/api/leadAPI';

// Create a new lead
const lead = await leadAPI.createLead({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  source: 'pricing_page',
  planInterest: 'enterprise'
});

// Track lead activity
await leadAPI.trackActivity(lead.id, 'page_view', {
  page: '/pricing',
  duration: 30
});
```

## 🧪 Testing

### Current Status
Testing framework setup is recommended. Add these dependencies:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
npm install --save-dev @vitejs/plugin-react jsdom
```

### Recommended Test Structure
- **Unit Tests**: Component logic and utilities
- **Integration Tests**: Auth flows, API integration  
- **E2E Tests**: Critical user journeys
- **Visual Tests**: Component library

## 🚀 Deployment

### Development Environment
```bash
# Deploy development infrastructure
./scripts/deploy-leads.sh deploy dev

# Start development server
npm run dev
```

### Production Deployment
```bash
# Deploy production infrastructure
./scripts/deploy-leads.sh deploy prod

# Build and deploy frontend
npm run build
# Deploy to your hosting platform (Vercel, Netlify, etc.)
```

## 📚 Documentation

- [WARP.md](./WARP.md) - Comprehensive project guidance
- [LEAD_CAPTURE_SYSTEM.md](./docs/LEAD_CAPTURE_SYSTEM.md) - Lead management documentation
- [TECHNICAL_STACK.md](./docs/TECHNICAL_STACK.md) - Technical architecture details
- [UI_DESIGN.md](./docs/UI_DESIGN.md) - Design principles and specifications

## 🔧 Troubleshooting

### Common Issues

#### Development Server Issues
```bash
# Clear Vite cache and restart
rm -rf node_modules/.vite
npm run dev
```

#### AWS Authentication Issues
- Verify environment variables are set correctly
- Check Cognito user pool configuration
- Ensure AWS region consistency across services

#### Build Issues
```bash
# Type checking
npx tsc --noEmit

# ESLint check
npm run lint

# Clear build artifacts
rm -rf dist
npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev/) and [React](https://reactjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Visual flow building with [React Flow](https://reactflow.dev/)
- AWS integration with [AWS Amplify](https://docs.amplify.aws/)
- Payments powered by [Stripe](https://stripe.com/)

---

**Ready to build the future of AI development? Let's get started! 🚀**
