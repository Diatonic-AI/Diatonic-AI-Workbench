#!/bin/bash
# Initialize AWS Amplify locally for development
set -euo pipefail

echo "🚀 Initializing AWS Amplify for local development..."

# Check if Amplify CLI is installed
if ! command -v amplify >/dev/null 2>&1; then
    echo "📦 Installing Amplify CLI..."
    npm install -g @aws-amplify/cli
else
    echo "✅ Amplify CLI already installed: $(amplify --version)"
fi

# Load development environment credentials
if [[ -f "aws-service-accounts/dev-env.sh" ]]; then
    echo "🔧 Loading development environment credentials..."
    source aws-service-accounts/dev-env.sh
else
    echo "❌ Development environment credentials not found!"
    echo "Run ./scripts/setup-aws-service-accounts.sh first"
    exit 1
fi

# Verify AWS credentials
echo "🔍 Verifying AWS credentials..."
aws sts get-caller-identity

# Check if Amplify is already initialized
if [[ -f "amplify/team-provider-info.json" ]]; then
    echo "✅ Amplify already initialized"
    echo "📋 Current Amplify status:"
    amplify status
    
    # Ask if user wants to reconfigure
    read -p "Do you want to reconfigure Amplify? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "✅ Using existing Amplify configuration"
        exit 0
    fi
    
    echo "🔄 Removing existing Amplify configuration..."
    rm -rf amplify/
    rm -f src/aws-exports.js 2>/dev/null || true
fi

# Initialize Amplify project
echo "🚀 Initializing new Amplify project..."

# Create amplify init configuration
cat > amplify-init-config.json << EOF
{
  "projectName": "diatonic-ai-workbench",
  "envName": "dev",
  "defaultEditor": "code",
  "appType": "javascript",
  "framework": "react",
  "srcDir": "src",
  "distDir": "dist",
  "buildDir": "build",
  "startCommand": "npm start",
  "useProfile": false,
  "profileName": "",
  "accessKeyId": "$AWS_ACCESS_KEY_ID",
  "secretAccessKey": "$AWS_SECRET_ACCESS_KEY",
  "region": "$AWS_DEFAULT_REGION"
}
EOF

# Initialize Amplify
amplify init --amplify "$(cat amplify-init-config.json)"

# Clean up config file
rm amplify-init-config.json

# Add essential Amplify services
echo "📱 Adding essential Amplify services..."

# Add authentication (Cognito)
echo "🔐 Adding authentication service..."
amplify add auth <<EOF
Do you want to use the default authentication and security configuration? Default configuration
How do you want users to be able to sign in? Username
Do you want to configure advanced settings? No, I am done.
EOF

# Add API (GraphQL)
echo "🌐 Adding API service..."
amplify add api <<EOF
Please select from one of the below mentioned services: GraphQL
Provide API name: diatomicai
Choose the default authorization type for the API: Amazon Cognito User Pool
Do you want to configure advanced settings for the GraphQL API: No, I am done.
Do you have an annotated GraphQL schema? No
Choose a schema template: Single object with fields (e.g., "Todo" with ID, name, description)
Do you want to edit the schema now? No
EOF

# Add storage (S3)
echo "💾 Adding storage service..."
amplify add storage <<EOF
Please select from one of the below mentioned services: Content (Images, audio, video, etc.)
Please provide a friendly name for your resource: diatomicaistorage
Please provide bucket name: diatonic-ai-workbench-storage
Who should have access: Auth users only
What kind of access do you want for Authenticated users? read/write
EOF

# Add hosting
echo "🌐 Adding hosting service..."
amplify add hosting <<EOF
Select the plugin module to execute: Amazon CloudFront and S3
Select the environment setup: DEV (S3 only with HTTP)
hosting bucket name: diatonic-ai-workbench-hosting
index doc for the website: index.html
error doc for the website: error.html
EOF

# Deploy the backend
echo "🚀 Deploying Amplify backend..."
amplify push --yes

# Generate AWS exports
echo "📄 Generating AWS exports for React app..."
if [[ -f "src/aws-exports.js" ]]; then
    echo "✅ AWS exports generated successfully"
else
    echo "⚠️  AWS exports not found - may need manual configuration"
fi

# Create environment-specific configuration
echo "⚙️  Creating environment configuration..."
cat > src/amplify-config.ts << 'EOF'
// Environment-specific Amplify configuration
import { Amplify } from 'aws-amplify';

// Import the auto-generated config
let awsExports: any;
try {
  awsExports = require('./aws-exports').default;
} catch (error) {
  console.warn('AWS exports not found - using fallback configuration');
  awsExports = {
    region: process.env.REACT_APP_AWS_REGION || 'us-east-2',
    // Add other fallback configurations as needed
  };
}

// Configure Amplify with environment-specific settings
const amplifyConfig = {
  ...awsExports,
  // Override with environment variables if needed
  aws_project_region: process.env.REACT_APP_AWS_REGION || awsExports.aws_project_region,
  aws_cognito_region: process.env.REACT_APP_AWS_REGION || awsExports.aws_cognito_region,
};

// Configure Amplify
Amplify.configure(amplifyConfig);

export default amplifyConfig;
EOF

# Update src/main.tsx to include Amplify configuration
if [[ -f "src/main.tsx" ]]; then
    if ! grep -q "amplify-config" src/main.tsx; then
        echo "📝 Updating main.tsx with Amplify configuration..."
        sed -i "1i import './amplify-config';" src/main.tsx
    else
        echo "✅ Amplify configuration already included in main.tsx"
    fi
fi

# Create local development script
cat > scripts/dev-with-amplify.sh << 'EOF'
#!/bin/bash
# Start development server with Amplify backend
set -euo pipefail

echo "🚀 Starting development server with Amplify backend..."

# Load development environment
source aws-service-accounts/dev-env.sh

# Start Amplify mock services (optional for local development)
# amplify mock &

# Start React development server
npm run dev

EOF

chmod +x scripts/dev-with-amplify.sh

# Display configuration summary
echo ""
echo "✅ Amplify initialization completed successfully!"
echo ""
echo "📋 Configuration Summary:"
echo "  - Project Name: diatonic-ai-workbench"
echo "  - Environment: dev"
echo "  - AWS Account: $(aws sts get-caller-identity --query Account --output text)"
echo "  - AWS Region: $AWS_DEFAULT_REGION"
echo "  - Service Account: $AMPLIFY_SERVICE_ACCOUNT_DEV"
echo ""
echo "🏗️  Amplify Services Added:"
echo "  - ✅ Authentication (Cognito User Pools)"
echo "  - ✅ API (GraphQL with DynamoDB)"
echo "  - ✅ Storage (S3 Bucket)"
echo "  - ✅ Hosting (CloudFront + S3)"
echo ""
echo "🔧 Next Steps:"
echo "  1. Review the generated schema in amplify/backend/api/diatomicai/schema.graphql"
echo "  2. Customize authentication settings if needed: amplify update auth"
echo "  3. Test the application: npm run dev"
echo "  4. Deploy updates: amplify push"
echo ""
echo "🌐 Amplify Console:"
echo "  Visit: https://console.aws.amazon.com/amplify/home?region=$AWS_DEFAULT_REGION#/"
echo ""
echo "📖 Documentation:"
echo "  - Amplify React Guide: https://docs.amplify.aws/javascript/start/getting-started/"
echo "  - API Documentation: https://docs.amplify.aws/javascript/build-a-backend/graphqlapi/"
