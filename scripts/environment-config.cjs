#!/usr/bin/env node
/**
 * Environment Configuration Manager
 * Handles environment-specific settings, PII protection, and selective data sync
 */

const fs = require('fs');
const path = require('path');

// Environment detection and configuration
const getEnvironmentConfig = () => {
  const environment = process.env.NODE_ENV || 'development';
  const region = process.env.VITE_AWS_REGION || 'us-east-2';
  
  const configs = {
    development: {
      environment: 'development',
      region,
      dynamodb: {
        endpoint: 'http://localhost:8002',
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        }
      },
      tablePrefix: 'ai-nexus-workbench-development',
      cloudTablePrefix: 'aws-devops-dev',
      
      // Tables to sync FROM cloud to local (content only, no PII)
      syncableTables: [
        'activity-feed',
        'agent-execution-history',
        'agent-flows',
        'agents',
        'agent-templates',
        'agent-versions',
        'aggregated-analytics',
        'application-settings',
        'cognito-group-mappings',
        'community-comments',
        'community-posts',
        'courses',
        'dashboard-metrics',
        'datasets',
        'education-courses',
        'enrollments',
        'experiment-run-logs',
        'experiment-runs',
        'experiments',
        'flow-node-configs',
        'flow-templates',
        'group-memberships',
        'groups',
        'lab-experiments',
        'lab-model-registry',
        'lesson-progress',
        'lessons',
        'metrics-timeseries',
        'models',
        'notifications',
        'notification-subscriptions',
        'organization-data',
        'organization-memberships',
        'organization-settings',
        'project-memberships',
        'projects',
        'prompts-library',
        'quiz-results',
        'quizzes',
        'reactions',
        'role-permissions',
        'roles',
        'subscription-billing',
        'subscription-limits',
        'system-logs',
        'team-memberships',
        'toolset-items',
        'user-content-metadata',
        'user-permissions',
        'user-profiles',
        'user-progress',
        'user-quotas',
        'users',
        'user-sessions',
        'workspace-memberships',
        'workspaces'
      ],
      
      // Tables that should use mock data locally (contain PII)
      piiTables: [
        'users',
        'user-profiles',
        'user-progress',
        'user-subscriptions',
        'user-sessions',
        'user-preferences',
        'billing-accounts',
        'payment-methods',
        'usage-analytics',
        'support-tickets'
      ],
      
      // Data transformation rules for PII protection
      piiTransforms: {
        users: {
          email: 'generateMockEmail',
          firstName: 'generateMockFirstName',
          lastName: 'generateMockLastName',
          phoneNumber: 'generateMockPhone',
          address: 'generateMockAddress',
          dateOfBirth: 'generateMockDate',
          ssn: 'REDACTED',
          creditCard: 'REDACTED'
        },
        userProfiles: {
          biography: 'generateMockText',
          personalWebsite: 'generateMockUrl',
          linkedinUrl: 'generateMockUrl',
          profileImage: 'generateMockImageUrl'
        }
      },
      
      features: {
        enableCloudSync: true,
        enablePiiProtection: true,
        enableMockDataGeneration: true,
        enableDebugLogging: true,
        requireApprovalForSync: true
      }
    },
    
    staging: {
      environment: 'staging',
      region,
      dynamodb: {
        // Uses AWS credentials from environment/IAM roles
        region
      },
      tablePrefix: 'ai-nexus-workbench-staging',
      cloudTablePrefix: 'ai-nexus-workbench-staging',
      
      // In staging, sync most tables but still protect PII
      syncableTables: [
        'content-pages',
        'content-features',
        'content-testimonials', 
        'content-seo',
        'content-feature-details',
        'toolset-items',
        'education-courses',
        'pricing-plans',
        'lab-experiments',
        'workspaces'
      ],
      
      piiTables: [
        'users',
        'user-profiles',
        'user-progress',
        'billing-accounts',
        'payment-methods'
      ],
      
      features: {
        enableCloudSync: true,
        enablePiiProtection: true,
        enableMockDataGeneration: true,
        enableDebugLogging: false,
        requireApprovalForSync: true
      }
    },
    
    production: {
      environment: 'production',
      region,
      dynamodb: {
        region
      },
      tablePrefix: 'ai-nexus-workbench-prod',
      cloudTablePrefix: 'ai-nexus-workbench-prod',
      
      // Production: no syncing, direct access only
      syncableTables: [],
      piiTables: [],
      
      features: {
        enableCloudSync: false,
        enablePiiProtection: false,
        enableMockDataGeneration: false,
        enableDebugLogging: false,
        requireApprovalForSync: false
      }
    }
  };
  
  return configs[environment] || configs.development;
};

// Mock data generators for PII protection
const mockDataGenerators = {
  generateMockEmail: (originalEmail, index) => {
    const domains = ['example.com', 'test.local', 'mock.dev', 'demo.app'];
    const domain = domains[index % domains.length];
    return `user${index + 1000}@${domain}`;
  },
  
  generateMockFirstName: (original, index) => {
    const names = ['Alex', 'Jordan', 'Casey', 'Riley', 'Sage', 'Quinn', 'Avery', 'Blake', 'Cameron', 'Dakota'];
    return names[index % names.length];
  },
  
  generateMockLastName: (original, index) => {
    const names = ['Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Jackson'];
    return names[index % names.length];
  },
  
  generateMockPhone: (original, index) => {
    return `+1-555-${String(1000 + index).padStart(4, '0')}`;
  },
  
  generateMockAddress: (original, index) => {
    const addresses = [
      '123 Main St, Anytown, ST 12345',
      '456 Oak Ave, Somewhere, ST 67890', 
      '789 Pine Rd, Nowhere, ST 13579',
      '321 Elm St, Everywhere, ST 24680'
    ];
    return addresses[index % addresses.length];
  },
  
  generateMockDate: (original, index) => {
    const year = 1980 + (index % 30);
    const month = (index % 12) + 1;
    const day = (index % 28) + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  },
  
  generateMockText: (original, index) => {
    const texts = [
      'This is sample biographical information for development purposes.',
      'Mock user profile data for testing and development.',
      'Generated content to protect real user information.',
      'Development environment placeholder text.'
    ];
    return texts[index % texts.length];
  },
  
  generateMockUrl: (original, index) => {
    return `https://example-${index}.com`;
  },
  
  generateMockImageUrl: (original, index) => {
    return `https://via.placeholder.com/150x150?text=User${index}`;
  }
};

// Apply PII transformations to data
const applyPiiTransforms = (tableName, items, config) => {
  if (!config.features.enablePiiProtection) {
    return items;
  }
  
  const transforms = config.piiTransforms[tableName];
  if (!transforms) {
    return items;
  }
  
  return items.map((item, index) => {
    const transformedItem = { ...item };
    
    for (const [field, transformType] of Object.entries(transforms)) {
      if (transformType === 'REDACTED') {
        transformedItem[field] = '[REDACTED]';
      } else if (mockDataGenerators[transformType]) {
        transformedItem[field] = mockDataGenerators[transformType](item[field], index);
      }
    }
    
    // Add development marker
    transformedItem._mockData = true;
    transformedItem._originalDataRedacted = true;
    
    return transformedItem;
  });
};

// Table classification helpers
const isContentTable = (tableName, config) => {
  return config.syncableTables.some(syncableTable => 
    tableName.includes(syncableTable)
  );
};

const isPiiTable = (tableName, config) => {
  return config.piiTables.some(piiTable => 
    tableName.includes(piiTable)
  );
};

const shouldSyncTable = (tableName, config) => {
  // Never sync in production
  if (config.environment === 'production') {
    return false;
  }
  
  // Only sync content tables, never PII tables
  return isContentTable(tableName, config) && !isPiiTable(tableName, config);
};

// Environment validation
const validateEnvironment = (config) => {
  const required = ['environment', 'region', 'tablePrefix'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
  
  // Validate development environment has required security features
  if (config.environment === 'development') {
    if (!config.features.enablePiiProtection) {
      console.warn('⚠️  WARNING: PII protection is disabled in development');
    }
    
    if (!config.features.requireApprovalForSync) {
      console.warn('⚠️  WARNING: Sync approval requirement is disabled');
    }
  }
  
  return true;
};

// Configuration export
const getConfig = () => {
  const config = getEnvironmentConfig();
  validateEnvironment(config);
  return config;
};

// Helper functions
const createTableName = (baseTableName, config) => {
  return `${config.tablePrefix}-${baseTableName}`;
};

const parseTableName = (fullTableName, config) => {
  return fullTableName.replace(`${config.tablePrefix}-`, '');
};

const getCloudTableName = (localTableName, config) => {
  const baseName = parseTableName(localTableName, config);
  return `${config.cloudTablePrefix}-${baseName}`;
};

// Generate environment-specific documentation
const generateConfigDocumentation = (config) => {
  const doc = `
# Environment Configuration: ${config.environment.toUpperCase()}

## Settings
- **Environment**: ${config.environment}
- **Region**: ${config.region}
- **Table Prefix**: ${config.tablePrefix}
- **Cloud Prefix**: ${config.cloudTablePrefix}

## Data Sync Policy
### ✅ Syncable Tables (${config.syncableTables.length})
${config.syncableTables.map(table => `  - ${table}`).join('\n')}

### 🔒 PII Tables (${config.piiTables.length}) - LOCAL MOCK DATA ONLY
${config.piiTables.map(table => `  - ${table}`).join('\n')}

## Security Features
- **PII Protection**: ${config.features.enablePiiProtection ? '✅ ENABLED' : '❌ DISABLED'}
- **Mock Data Generation**: ${config.features.enableMockDataGeneration ? '✅ ENABLED' : '❌ DISABLED'}
- **Sync Approval Required**: ${config.features.requireApprovalForSync ? '✅ ENABLED' : '❌ DISABLED'}
- **Debug Logging**: ${config.features.enableDebugLogging ? '✅ ENABLED' : '❌ DISABLED'}

## DynamoDB Configuration
${config.dynamodb.endpoint ? `- **Local Endpoint**: ${config.dynamodb.endpoint}` : '- **Cloud Connection**: Via AWS SDK'}
${config.dynamodb.credentials ? '- **Credentials**: Local test credentials' : '- **Credentials**: AWS IAM/Environment'}
  `;
  
  return doc.trim();
};

module.exports = {
  getConfig,
  applyPiiTransforms,
  isContentTable,
  isPiiTable,
  shouldSyncTable,
  createTableName,
  parseTableName,
  getCloudTableName,
  generateConfigDocumentation,
  mockDataGenerators
};

// CLI usage
if (require.main === module) {
  const config = getConfig();
  
  const command = process.argv[2];
  switch (command) {
    case 'show':
      console.log(generateConfigDocumentation(config));
      break;
      
    case 'validate':
      console.log('✅ Environment configuration is valid');
      console.log(`Environment: ${config.environment}`);
      console.log(`Syncable tables: ${config.syncableTables.length}`);
      console.log(`PII tables: ${config.piiTables.length}`);
      break;
      
    case 'export':
      const outputFile = process.argv[3] || `/tmp/env-config-${config.environment}.json`;
      fs.writeFileSync(outputFile, JSON.stringify(config, null, 2));
      console.log(`Configuration exported to: ${outputFile}`);
      break;
      
    default:
      console.log('Environment Configuration Manager');
      console.log('');
      console.log('Usage: node environment-config.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  show      - Display current environment configuration');
      console.log('  validate  - Validate environment setup');  
      console.log('  export    - Export configuration to JSON file');
      break;
  }
}
