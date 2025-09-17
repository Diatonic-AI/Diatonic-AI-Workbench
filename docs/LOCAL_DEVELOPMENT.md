# Local Development with DynamoDB

This guide explains how to set up and run the AI Nexus Workbench locally with a complete DynamoDB environment using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ 
- npm or yarn

## Quick Start

### Option 1: Full Setup (Recommended)
```bash
# Start everything at once
npm run dev:full
```

This command will:
1. Start Docker containers (LocalStack + DynamoDB)
2. Wait for services to initialize
3. Create DynamoDB tables and seed sample data
4. Start the Vite dev server

### Option 2: Step by Step

1. **Start Docker services:**
   ```bash
   npm run docker:up
   ```

2. **Create DynamoDB tables:**
   ```bash
   npm run db:setup
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

## Services Overview

The local development environment includes:

| Service | URL | Description |
|---------|-----|-------------|
| **Vite Dev Server** | http://localhost:8083 | React application |
| **DynamoDB Local** | http://localhost:8002 | Local DynamoDB instance |
| **DynamoDB Admin** | http://localhost:8001 | Web UI for DynamoDB |
| **LocalStack** | http://localhost:4566 | Local AWS services |

## Development Scripts

| Script | Description |
|--------|-------------|
| `npm run docker:up` | Start Docker containers |
| `npm run docker:down` | Stop and remove containers |
| `npm run docker:logs` | View container logs |
| `npm run db:setup` | Create DynamoDB tables and seed data |
| `npm run db:reset` | Reset entire database |
| `npm run dev:full` | Full development environment startup |

## DynamoDB Tables

The following tables are automatically created:

- **dev-ai-nexus-landing-pages** - Page content and metadata
- **dev-ai-nexus-page-sections** - Page sections and components  
- **dev-ai-nexus-seo-metadata** - SEO information
- **dev-ai-nexus-features** - Feature listings
- **dev-ai-nexus-testimonials** - User testimonials
- **dev-ai-nexus-pricing-plans** - Pricing information

## Sample Data

The setup script automatically seeds the database with sample data for:
- Landing pages (Toolset, Lab, Observatory, Community)
- Default configurations
- Test content

## Environment Configuration

The application uses these environment variables for local development:

```bash
# AWS Configuration (for local development)
VITE_AWS_REGION=us-east-2
VITE_AWS_ENDPOINT=http://localhost:8002
VITE_AWS_ACCESS_KEY_ID=test
VITE_AWS_SECRET_ACCESS_KEY=test

# Application Configuration
VITE_ENVIRONMENT=development
VITE_APP_NAME=AI Nexus Workbench
```

## Troubleshooting

### Docker Issues

**Containers won't start:**
```bash
# Check Docker status
docker ps

# View logs
npm run docker:logs

# Reset everything
docker system prune -a
npm run docker:up
```

**Port conflicts:**
```bash
# Check what's using the ports
sudo lsof -i :8001
sudo lsof -i :8002
sudo lsof -i :4566

# Kill processes if needed
sudo pkill -f localstack
sudo pkill -f dynamodb-local
```

### DynamoDB Issues

**Tables not created:**
```bash
# Reset database
npm run db:reset

# Or manually recreate
npm run db:setup
```

**Connection errors:**
```bash
# Test DynamoDB connection
curl http://localhost:8002/

# Check LocalStack health
curl http://localhost:4566/health
```

**View tables in DynamoDB Admin:**
1. Go to http://localhost:8001
2. Use endpoint: `http://localhost:8002`
3. Use region: `us-east-2`
4. Use dummy credentials: `test/test`

### Application Issues

**Environment variables not loading:**
```bash
# Check .env file exists
ls -la .env*

# Restart dev server
npm run dev
```

**AWS SDK errors:**
- Ensure Docker containers are running
- Verify DynamoDB Local is accessible at localhost:8002
- Check browser network tab for connection errors

## Development Workflow

### Making Changes

1. **Code changes** are hot-reloaded automatically
2. **DynamoDB schema changes** require `npm run db:reset`
3. **Environment changes** require restarting the dev server

### Testing Database Operations

Use the DynamoDB Admin UI at http://localhost:8001 to:
- View table data
- Run queries
- Monitor operations
- Debug issues

### Debugging

1. **Application logs**: Browser developer console
2. **DynamoDB logs**: `npm run docker:logs`
3. **LocalStack logs**: Check Docker logs for LocalStack container

## Production Differences

Local development uses:
- DynamoDB Local instead of AWS DynamoDB
- LocalStack for AWS services
- Test credentials
- Different endpoint URLs

Production uses:
- Real AWS services
- IAM roles and policies
- Production endpoints
- Environment-specific configurations

## Next Steps

After setting up local development:

1. Review the main [README.md](../README.md) for application overview
2. Check [TECHNICAL_STACK.md](TECHNICAL_STACK.md) for architecture details
3. See [WARP.md](../WARP.md) for development guidelines
4. Start developing with full local DynamoDB support!

## Need Help?

- Check the Docker logs: `npm run docker:logs`
- Verify services are running: `docker ps`
- Test DynamoDB connection: `node scripts/setup-dynamodb-local.js`
- Reset everything: `npm run db:reset`