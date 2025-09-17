#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CommunityCoreStack } from '../lib/community-core-stack';
import { ObservatoryCoreStack } from '../lib/observatory-core-stack';

const app = new cdk.App();

// Read environment from context or default to 'dev'
const environment = app.node.tryGetContext('environment') || 'dev';
const enableWaf = app.node.tryGetContext('enableWaf') === 'true';
const enableDetailedLogging = app.node.tryGetContext('enableDetailedLogging') === 'true';
const enableRealTimeAnalytics = app.node.tryGetContext('enableRealTimeAnalytics') === 'true';
const enableDataLake = app.node.tryGetContext('enableDataLake') === 'true';

// CORS origins from context or defaults
const corsOrigins = app.node.tryGetContext('corsOrigins')?.split(',') || [
  'http://localhost:3000',
  'http://localhost:8080',
];

// Account and region configuration
const account = process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID;
const region = process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-2';

if (!account) {
  console.error('❌ AWS account ID must be provided via CDK_DEFAULT_ACCOUNT or AWS_ACCOUNT_ID environment variable');
  process.exit(1);
}

console.log(`🚀 Deploying AI Nexus Workbench Backend Stacks`);
console.log(`📍 Environment: ${environment}`);
console.log(`🌎 Account: ${account}, Region: ${region}`);
console.log(`🔧 WAF: ${enableWaf}, Detailed Logging: ${enableDetailedLogging}`);
console.log(`📊 Real-time Analytics: ${enableRealTimeAnalytics}, Data Lake: ${enableDataLake}`);

// ================================================================================
// COMMUNITY CORE STACK
// ================================================================================

const communityStack = new CommunityCoreStack(app, `AiNexusCommunityCore-${environment}`, {
  environment: environment as 'dev' | 'staging' | 'prod',
  enableWaf,
  enableDetailedLogging,
  corsOrigins,
  env: {
    account,
    region,
  },
  description: `AI Nexus Community Backend Stack - ${environment}`,
  tags: {
    Environment: environment,
    Project: 'ai-nexus-workbench',
    Component: 'community-backend',
    ManagedBy: 'cdk',
    'Cost-Center': 'ai-nexus',
  },
});

// ================================================================================
// OBSERVATORY CORE STACK (depends on Community for User Pool)
// ================================================================================

const observatoryStack = new ObservatoryCoreStack(app, `AiNexusObservatoryCore-${environment}`, {
  environment: environment as 'dev' | 'staging' | 'prod',
  enableRealTimeAnalytics,
  enableDataLake,
  retentionDays: environment === 'prod' ? 90 : 30,
  corsOrigins,
  communityUserPoolId: communityStack.userPool.userPoolId,
  env: {
    account,
    region,
  },
  description: `AI Nexus Observatory Backend Stack - ${environment}`,
  tags: {
    Environment: environment,
    Project: 'ai-nexus-workbench',
    Component: 'observatory-backend',
    ManagedBy: 'cdk',
    'Cost-Center': 'ai-nexus',
  },
});

// Add dependency to ensure Community stack deploys first
observatoryStack.addDependency(communityStack);

// ================================================================================
// STACK OUTPUTS AND CROSS-REFERENCES
// ================================================================================

// Output cross-stack references
new cdk.CfnOutput(communityStack, 'BackendStacksInfo', {
  value: JSON.stringify({
    communityApi: communityStack.api.url,
    observatoryApi: observatoryStack.api.url,
    userPoolId: communityStack.userPool.userPoolId,
    eventBuses: {
      community: communityStack.eventBus.eventBusName,
      observatory: observatoryStack.eventBus.eventBusName,
    },
  }),
  description: 'Backend stacks integration information',
  exportName: `ai-nexus-backend-${environment}-info`,
});

// Environment-specific configurations
if (environment === 'prod') {
  // Add production-specific configurations
  cdk.Tags.of(communityStack).add('Backup', 'daily');
  cdk.Tags.of(observatoryStack).add('Backup', 'daily');
  cdk.Tags.of(communityStack).add('Monitoring', 'enhanced');
  cdk.Tags.of(observatoryStack).add('Monitoring', 'enhanced');
} else {
  // Development/staging configurations
  cdk.Tags.of(communityStack).add('Backup', 'weekly');
  cdk.Tags.of(observatoryStack).add('Backup', 'weekly');
  cdk.Tags.of(communityStack).add('Monitoring', 'basic');
  cdk.Tags.of(observatoryStack).add('Monitoring', 'basic');
}

console.log(`✅ Stack definitions complete`);
console.log(`📋 Community Stack: ${communityStack.stackName}`);
console.log(`📋 Observatory Stack: ${observatoryStack.stackName}`);
console.log(`🎯 Run: cdk deploy --all --context environment=${environment}`);
