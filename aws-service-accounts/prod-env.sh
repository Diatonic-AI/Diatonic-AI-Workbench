#!/bin/bash
# Production environment AWS credentials
export AWS_ACCESS_KEY_ID=$(grep "AWS_ACCESS_KEY_ID" aws-service-accounts/amplify-diatonic-ai-prod-credentials.txt | cut -d'=' -f2)
export AWS_SECRET_ACCESS_KEY=$(grep "AWS_SECRET_ACCESS_KEY" aws-service-accounts/amplify-diatonic-ai-prod-credentials.txt | cut -d'=' -f2)
export AWS_DEFAULT_REGION=us-east-2
export AWS_PROFILE=amplify-diatonic-ai-prod

echo "🔧 Production environment AWS credentials loaded"
echo "👤 Using service account: amplify-diatonic-ai-prod"
