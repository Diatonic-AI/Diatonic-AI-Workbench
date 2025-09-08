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
