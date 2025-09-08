# Environment Configuration and PII Protection

This document describes the environment-specific DynamoDB configuration system that separates development and production data with PII protection for development environments.

## Overview

The AI Nexus Workbench now supports multiple environments with different data handling strategies:

- **Development Environment**: Uses local DynamoDB with selective sync and mock PII data
- **Staging Environment**: Uses local DynamoDB with selective sync and PII protection  
- **Production Environment**: Direct AWS DynamoDB access only (no local sync)

## 🔒 Security Model

### PII Protection Strategy
- **Production**: Real user data stored only in AWS DynamoDB
- **Development/Staging**: Real user data **never** stored locally
- **Content Data**: Safe to sync between environments
- **User Data**: Always replaced with mock data in development

### Table Classifications

#### ✅ Content Tables (Safe to Sync)
```
content-pages          - Website page content
content-features       - Feature descriptions  
content-testimonials   - Customer testimonials
content-seo           - SEO metadata
content-feature-details - Detailed feature info
toolset-items         - Available tools/services
education-courses     - Educational content
pricing-plans         - Pricing information
```

#### 🔒 PII Tables (Mock Data Only in Dev)
```
users                 - User account information
user-profiles         - User profile data
user-progress         - Learning progress tracking
user-subscriptions    - Subscription details
user-sessions         - Session tracking
user-preferences      - User preferences
billing-accounts      - Billing information
payment-methods       - Payment details
usage-analytics       - Usage metrics
support-tickets       - Customer support data
```

## 📁 New Files and Scripts

### 1. `scripts/environment-config.cjs`
Central configuration module that manages environment-specific settings.

**Usage:**
```bash
# Show current environment configuration
node scripts/environment-config.cjs show

# Validate environment setup
node scripts/environment-config.cjs validate

# Export configuration to JSON
node scripts/environment-config.cjs export config.json
```

**Features:**
- Environment detection based on `NODE_ENV`
- Table classification for sync safety
- Mock data generators for PII protection
- Environment validation and safety checks

### 2. `scripts/seed-mock-user-data.sh`
Generates and loads sanitized mock data for PII tables in development.

**Usage:**
```bash
# Seed mock data (default: development)
./scripts/seed-mock-user-data.sh

# Dry run to see what would be created
./scripts/seed-mock-user-data.sh --dry-run

# Force recreate all mock data
./scripts/seed-mock-user-data.sh --force

# Verbose output with preserved temp files
./scripts/seed-mock-user-data.sh --verbose
```

**Features:**
- Generates realistic but fake user data
- Clearly marks all data as mock/development
- Supports multiple PII data types (users, profiles, progress)
- Automatic batch loading with proper error handling
- Production environment blocking for security

### 3. Updated `scripts/dynamodb-schema-sync.sh`
Completely rewritten with environment awareness and PII protection.

**New Commands:**
```bash
# Show comprehensive status with security info
./scripts/dynamodb-schema-sync.sh status

# Sync ONLY safe content tables from cloud
./scripts/dynamodb-schema-sync.sh sync-content-from-cloud

# Load mock data for PII tables
./scripts/dynamodb-schema-sync.sh seed-mock-data

# Complete environment reset with mock data
./scripts/dynamodb-schema-sync.sh reset

# Validate environment configuration
./scripts/dynamodb-schema-sync.sh validate-environment
```

**Security Features:**
- Selective sync: Only content tables are synced from cloud
- PII protection: User data tables use mock data only
- Environment blocking: Production operations are restricted
- Approval gates: Confirmations required for destructive operations

## 🚀 Getting Started

### 1. Initial Setup
```bash
# 1. Ensure DynamoDB Local is running
docker run -d -p 8002:8000 amazon/dynamodb-local

# 2. Check environment configuration
node scripts/environment-config.cjs show

# 3. Validate setup
./scripts/dynamodb-schema-sync.sh validate-environment
```

### 2. Development Workflow
```bash
# 1. Create local table schemas
./scripts/dynamodb-schema-sync.sh create-local

# 2. Sync safe content from cloud
./scripts/dynamodb-schema-sync.sh sync-content-from-cloud

# 3. Load mock PII data
./scripts/dynamodb-schema-sync.sh seed-mock-data

# 4. Check status
./scripts/dynamodb-schema-sync.sh status
```

### 3. Reset Environment (Fresh Start)
```bash
# Complete reset: delete all local tables, recreate, sync content, seed mock data
./scripts/dynamodb-schema-sync.sh reset
```

## 📊 Environment Configurations

### Development Environment
```json
{
  "environment": "development",
  "dynamodb": {
    "endpoint": "http://localhost:8002",
    "credentials": {
      "accessKeyId": "test",
      "secretAccessKey": "test"
    }
  },
  "features": {
    "enableCloudSync": true,
    "enablePiiProtection": true,
    "enableMockDataGeneration": true,
    "requireApprovalForSync": true
  }
}
```

### Staging Environment
```json
{
  "environment": "staging",
  "dynamodb": {
    "region": "us-east-2"
  },
  "features": {
    "enableCloudSync": true,
    "enablePiiProtection": true,
    "enableMockDataGeneration": true,
    "requireApprovalForSync": true
  }
}
```

### Production Environment
```json
{
  "environment": "production",
  "dynamodb": {
    "region": "us-east-2"
  },
  "features": {
    "enableCloudSync": false,
    "enablePiiProtection": false,
    "enableMockDataGeneration": false,
    "requireApprovalForSync": false
  }
}
```

## 🔧 Application Integration

### Update DynamoDB Configuration
Your application's `src/lib/dynamodb-config.ts` should detect the environment and use appropriate settings:

```typescript
import { getConfig } from '../scripts/environment-config.cjs';

const config = getConfig();

export const dynamoDbConfig = {
  region: config.region,
  ...(config.dynamodb.endpoint && {
    endpoint: config.dynamodb.endpoint,
    credentials: config.dynamodb.credentials
  })
};

export const tablePrefix = config.tablePrefix;
```

### Content Service Updates
Update content services to use environment-aware table names:

```typescript
import { createTableName } from '../scripts/environment-config.cjs';
import { getConfig } from '../scripts/environment-config.cjs';

const config = getConfig();

// Use environment-specific table names
const pagesTableName = createTableName('content-pages', config);
const usersTableName = createTableName('users', config);
```

## 🛡️ Security Guarantees

### What This System Prevents
1. **PII Data Leaks**: Real user data never leaves production AWS environment
2. **Accidental Sync**: PII tables cannot be synced to local development
3. **Production Interference**: Development operations are blocked in production
4. **Data Mixing**: Clear separation between real and mock data

### What This System Enables
1. **Safe Development**: Work with realistic but fake user data
2. **Content Updates**: Safely sync non-sensitive content for testing
3. **Environment Consistency**: Same application code works across all environments
4. **Security Audit**: Clear visibility into what data is where

## 📋 Troubleshooting

### Common Issues

#### 1. Environment Configuration Errors
```bash
# Check current configuration
node scripts/environment-config.cjs show

# Validate configuration
node scripts/environment-config.cjs validate
```

#### 2. Local DynamoDB Connection Issues
```bash
# Check if DynamoDB Local is running
docker ps | grep dynamodb

# Start DynamoDB Local if needed
docker run -d -p 8002:8000 amazon/dynamodb-local

# Test connection
aws dynamodb list-tables --endpoint-url http://localhost:8002 --region us-east-2
```

#### 3. AWS Credentials Issues
```bash
# Check AWS configuration
aws configure list

# Test AWS access
aws dynamodb list-tables --region us-east-2
```

#### 4. Mock Data Generation Issues
```bash
# Test mock data generation (dry run)
./scripts/seed-mock-user-data.sh --dry-run

# Check dependencies
./scripts/seed-mock-user-data.sh --help
```

### Support Commands

#### Check Overall Status
```bash
./scripts/dynamodb-schema-sync.sh status
```

#### List Local vs Cloud Tables
```bash
./scripts/dynamodb-schema-sync.sh list-local
./scripts/dynamodb-schema-sync.sh list-cloud
```

#### Validate Complete Setup
```bash
./scripts/dynamodb-schema-sync.sh validate-environment
```

## 🔄 Migration from Previous Setup

### For Existing Developments

1. **Backup Existing Data** (if needed):
   ```bash
   # Export any important local data before migration
   ./scripts/dynamodb-schema-sync-old.sh status
   ```

2. **Update Environment**:
   ```bash
   # Update to new system
   git pull origin main
   chmod +x scripts/*.sh scripts/*.cjs
   ```

3. **Reset Environment**:
   ```bash
   # Complete reset to new system
   ./scripts/dynamodb-schema-sync.sh reset
   ```

4. **Verify Setup**:
   ```bash
   # Confirm everything is working
   ./scripts/dynamodb-schema-sync.sh status
   ```

## 📚 Additional Resources

- [AWS DynamoDB Local Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Data Privacy and Security](https://aws.amazon.com/compliance/data-privacy/)

## 🤝 Contributing

When adding new tables or data types:

1. **Classify the table** in `scripts/environment-config.cjs`:
   - Add to `syncableTables` if it contains public/content data
   - Add to `piiTables` if it contains user or sensitive data

2. **Add PII transformations** if needed:
   - Define field-level transformations for sensitive data
   - Create appropriate mock data generators

3. **Test in all environments**:
   - Verify development uses mock data
   - Confirm staging respects PII protection
   - Ensure production is unaffected

4. **Update documentation**:
   - Add the new table to appropriate classification lists
   - Document any special handling requirements
