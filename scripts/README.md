# Scripts Directory

This directory contains environment-aware scripts for managing DynamoDB configuration, data synchronization, and development workflows with PII protection.

## 🚀 Setup Scripts

### `migration-api-server.js`
**Production DynamoDB Migration API Server with JWT Auth and MCP Integration**

Enterprise-grade migration system with REST API for managing database schema and data migrations remotely.

#### Features:
- ✅ JWT-based authentication with role-based permissions
- ✅ RESTful API for all migration operations  
- ✅ MCP-Hub integration for enhanced tooling
- ✅ High-level operations library (20+ migration operations)
- ✅ Production safety guards and confirmation codes
- ✅ Comprehensive audit logging and compliance
- ✅ Multi-environment support (dev/staging/prod)
- ✅ Concurrent migration management
- ✅ Schema validation and safety checks
- ✅ Automatic backup creation and rollback support

#### Quick Start:
```bash
cd scripts/
npm run setup
cp .env.example .env
# Configure .env file
npm run dev
```

#### API Endpoints:
- `POST /api/auth/login` - JWT authentication
- `POST /api/migrations/validate` - Validate migration files
- `POST /api/migrations/execute` - Execute migrations
- `GET /api/migrations/{id}` - Get migration status
- `GET /api/migrations/active` - List active migrations
- `GET /api/migrations/history` - Migration history
- `GET /api/mcp/tools` - List MCP tools
- `POST /api/mcp/execute` - Execute MCP tool chains

#### Migration File Format:
Migrations are JSON files with operations like:
- `createTable`, `modifyTable`, `deleteTable`
- `createGSI`, `deleteGSI`, `createLSI`
- `migrateData`, `transformData`, `seedData`
- `mcpToolChain` for MCP integration
- Pre/post hooks for complex workflows

#### Example Usage:
```bash
# Login and get JWT token
curl -X POST http://localhost:3001/api/auth/login \
  -d '{"username":"admin","password":"admin-password"}'

# Execute migration
curl -X POST http://localhost:3001/api/migrations/execute \
  -H "Authorization: Bearer $TOKEN" \
  -d @migrations/001-initial-schema-setup.json
```

#### Production Features:
- Confirmation codes required for production deletions
- Automatic backup creation before migrations
- Single concurrency limit in production
- Admin-only production access
- Comprehensive audit logging

### `setup-dev-environment.sh`
**Automated Development Environment Setup**

This script performs a complete automated setup of the AI Lab Backend development environment:

#### What it does:
- ✅ Checks prerequisites (Node.js, AWS CLI, CDK, etc.)
- ✅ Verifies AWS credentials and permissions
- ✅ Sets up infrastructure project dependencies
- ✅ Bootstraps AWS CDK if needed
- ✅ Deploys the complete backend infrastructure to development
- ✅ Configures AWS Secrets Manager placeholders
- ✅ Creates sample tenants and test users
- ✅ Tests the deployment with health checks
- ✅ Generates development documentation and environment files

#### Usage:
```bash
# Make sure you're in the project root and have AWS credentials configured
cd /home/daclab-ai/dev/AWS-DevOps/apps/ai-nexus-workbench
./scripts/setup-dev-environment.sh
```

#### Prerequisites:
- AWS CLI v2 configured with valid credentials
- Node.js 18+, npm, TypeScript compiler
- AWS CDK v2 installed globally
- Appropriate AWS permissions (see IMPLEMENTATION_GUIDE.md)

#### Outputs:
- `.env.development` - Frontend environment configuration
- `DEV_README.md` - Development environment documentation
- Deployed AWS infrastructure in development environment
- Sample tenants and test users ready for development
- CloudWatch dashboards and monitoring setup

#### Post-Setup:
1. Update API secrets in AWS Secrets Manager:
   - `ainexus-dev/openai/key` - Add your OpenAI API key
   - `ainexus-dev/stripe/secret` - Add Stripe API credentials

2. Test the setup:
   ```bash
   curl https://your-api-endpoint/v1/health
   ```

3. Start developing with the generated environment configuration

## 🔐 Permissions System Scripts

### `setup-permissions-system.sh`
**Complete DynamoDB Permissions System Setup**

This script provides end-to-end setup of the comprehensive DynamoDB-based permissions system:

#### What it does:
- ✅ Validates prerequisites (Node.js, AWS CLI, Terraform)
- ✅ Deploys 9 DynamoDB tables via dedicated infrastructure script
- ✅ Seeds database with 100+ permissions across 11 feature areas
- ✅ Creates subscription tier roles (Free → Enterprise) and internal roles
- ✅ Sets up Cognito group mappings with backward compatibility
- ✅ Creates sample development users for testing
- ✅ Verifies successful deployment

#### Usage:
```bash
cd /home/daclab-ai/dev/AWS-DevOps/apps/ai-nexus-workbench
./scripts/setup-permissions-system.sh
```

### `deploy-permissions-infrastructure.sh`
**Dedicated Terraform Deployment for Permissions Tables**

Focused script for deploying just the DynamoDB permissions infrastructure:

#### What it does:
- ✅ Validates Terraform configuration
- ✅ Creates execution plan for 9 permissions tables
- ✅ Deploys with auto-scaling, encryption, and backup enabled
- ✅ Verifies successful table creation

#### Usage:
```bash
./scripts/deploy-permissions-infrastructure.sh
```

### `seed-permissions-tables.js`
**Database Seeding with Default Permissions Data**

Node.js script that populates the permissions tables:

#### What it creates:
- **9 Role Types**: 5 subscription tiers + 4 internal roles
- **100+ Permissions**: Across Education, Studio, Lab, Community, Observatory, Team, Core, API, Storage, Support, Security, and Internal feature areas
- **Cognito Mappings**: Maps AWS Cognito groups to roles
- **Sample Users**: Development-only test users
- **Organization Settings**: Default configuration

#### Usage:
```bash
# Development environment
NODE_ENV=development node scripts/seed-permissions-tables.js

# Production environment (no sample users)
NODE_ENV=production node scripts/seed-permissions-tables.js
```

## 📁 Future Scripts

This directory will expand with additional automation scripts:

### Planned Scripts
- `setup-staging-environment.sh` - Staging environment deployment
- `setup-prod-environment.sh` - Production environment deployment with additional safeguards
- `backup-data.sh` - Database and S3 backup automation
- `load-test.sh` - API load testing with realistic workloads
- `cleanup-resources.sh` - Clean up development/test resources
- `deploy-api-handlers.sh` - Deploy individual Lambda functions for development
- `setup-monitoring.sh` - Enhanced monitoring and alerting setup

### Migration API Scripts
- `migration-api-server.js` - ✅ **IMPLEMENTED** Production migration API server
- `migrations/001-initial-schema-setup.json` - ✅ **IMPLEMENTED** Sample migration file
- `package.json` - ✅ **IMPLEMENTED** Dependencies and scripts
- `.env.example` - ✅ **IMPLEMENTED** Environment template

### Development Workflow Scripts
- `local-dev-server.sh` - Start local development server with LocalStack
- `run-tests.sh` - Execute comprehensive test suite
- `generate-docs.sh` - Generate API documentation from OpenAPI specs
- `sync-env-config.sh` - Sync environment configurations across environments

## 🔧 Script Development Guidelines

When adding new scripts to this directory:

1. **Use bash with strict mode**: `set -euo pipefail`
2. **Include color-coded logging functions**
3. **Check prerequisites before execution**
4. **Provide clear error messages and recovery guidance**
5. **Make scripts idempotent (safe to run multiple times)**
6. **Include comprehensive documentation**
7. **Test scripts in isolated environments before committing**

### Script Template
```bash
#!/usr/bin/env bash
# Script Description
set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

main() {
    log_info "Starting script execution..."
    # Implementation here
    log_success "Script completed successfully"
}

trap 'log_error "Script interrupted"; exit 1' INT TERM
main "$@"
```

## 📚 Related Documentation

- [Implementation Guide](../docs/Backend/IMPLEMENTATION_GUIDE.md) - Complete deployment and setup guide
- [Technical Stack](../docs/TECHNICAL_STACK.md) - Architecture and technology overview  
- [WARP.md](../WARP.md) - Project context and configuration
- [DynamoDB Schema](../docs/Backend/DYNAMODB_BACKEND_SCHEMA.md) - Database design documentation

## 🎯 Quick Commands

```bash
# Setup development environment (full automation)
./scripts/setup-dev-environment.sh

# Setup permissions system (complete)
./scripts/setup-permissions-system.sh

# Deploy permissions infrastructure only
./scripts/deploy-permissions-infrastructure.sh

# Seed permissions database only
node scripts/seed-permissions-tables.js

# Migration API Server
cd scripts/
npm run setup                    # Install dependencies
npm run dev                      # Start development server
npm start                        # Start production server
npm run health                   # Check server health

# Check script permissions
ls -la scripts/

# Make any script executable
chmod +x scripts/script-name.sh

# View script help (if implemented)
./scripts/script-name.sh --help
```

### NPM Script Shortcuts
```bash
# Migration API Server
npm start                        # Start production server
npm run dev                      # Start development server with auto-reload
npm test                         # Run tests with coverage
npm run lint                     # Run ESLint checks
npm run setup                    # Install dependencies and setup
npm run health                   # Health check
npm run docker:build             # Build Docker image
npm run docker:run               # Run Docker container

# Complete permissions setup
npm run permissions:setup

# Infrastructure deployment
npm run infra:deploy
npm run infra:deploy:dev
npm run infra:deploy:prod

# Database operations
npm run db:seed:dev
npm run db:seed:prod
npm run db:validate
npm run db:backup

# Terraform operations
npm run terraform:plan
npm run terraform:apply
```

---

**Directory Status**: Active Development  
**Primary Maintainer**: AI Development Team  
**Last Updated**: 2025-01-07 20:23:00 UTC
