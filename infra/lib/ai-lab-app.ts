#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AILabCoreStack } from './ai-lab-core-stack';

const app = new cdk.App();

// Get environment configuration
const environment = app.node.tryGetContext('environment') || 'dev';
const region = app.node.tryGetContext('region') || 'us-east-2';
const account = app.node.tryGetContext('account');

// Environment-specific configuration
const config = {
  dev: {
    corsOrigins: [
      'http://localhost:3000',
      'http://localhost:8080', 
      'https://dev.diatonic.ai'
    ],
    enableWaf: false,
    enableDetailedLogging: true,
    domainName: 'dev.diatonic.ai',
  },
  staging: {
    corsOrigins: [
      'https://staging.diatonic.ai'
    ],
    enableWaf: true,
    enableDetailedLogging: true,
    domainName: 'staging.diatonic.ai',
  },
  prod: {
    corsOrigins: [
      'https://app.diatonic.ai',
      'https://diatonic.ai'
    ],
    enableWaf: true,
    enableDetailedLogging: false,
    domainName: 'app.diatonic.ai',
  },
};

const envConfig = config[environment as keyof typeof config] || config.dev;

// Deploy the AI Lab Core Stack
new AILabCoreStack(app, `AILabCore-${environment}`, {
  env: {
    account,
    region,
  },
  environment: environment as 'dev' | 'staging' | 'prod',
  ...envConfig,
  tags: {
    Environment: environment,
    Project: 'ai-nexus-workbench',
    Component: 'ai-lab-backend',
    Owner: 'AI Nexus Team',
    CostCenter: 'Development',
    ManagedBy: 'CDK',
  },
});

// Add global tags
cdk.Tags.of(app).add('Project', 'ai-nexus-workbench');
cdk.Tags.of(app).add('ManagedBy', 'CDK');
cdk.Tags.of(app).add('Environment', environment);
