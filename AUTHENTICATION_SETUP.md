# Authentication Setup - AI Nexus Workbench Development

## Overview

This document describes the comprehensive authentication system implemented for the AI Nexus Workbench development environment, featuring a fixed `dev-tenant` context and seamless integration with local DynamoDB data.

## 🏗️ Architecture

### DevAuth Context (`src/contexts/DevAuthContext.tsx`)

**Purpose**: Provides development-friendly authentication that simulates real auth behavior while maintaining tenant isolation.

**Key Features**:
- ✅ Automatic initialization with development user
- ✅ Mock authentication with persistent localStorage
- ✅ Fixed `dev-tenant` context for consistency
- ✅ Role-based permissions (admin, user, viewer)
- ✅ Production AWS Amplify fallback
- ✅ Development status indicator component

**Configuration**:
```typescript
const DEV_TENANT_CONFIG = {
  id: 'dev-tenant',
  name: 'Development Environment',
  environment: 'development',
  features: [
    'visual-agent-builder',
    'lab-experiments',
    'community-posts', 
    'education-courses',
    'dashboard-metrics',
    'admin-tools'
  ]
};
```

### Service Client Integration (`src/lib/tenant-service-client.ts`)

**Purpose**: Handles API communication with automatic tenant context and authentication headers.

**Features**:
- ✅ Automatic tenant ID injection
- ✅ JWT-style auth token support
- ✅ Request/response interceptors
- ✅ Error handling with retry logic
- ✅ Development utilities and mocking

**Usage Pattern**:
```typescript
const client = createServiceClient('dev-tenant', 'auth-token');
const response = await client.get<ApiResponse<ToolsetItem[]>>('/api/toolset');
```

### Content Hooks (`src/hooks/useTenantContent.ts`)

**Purpose**: React Query-powered hooks for fetching tenant-aware content with automatic caching.

**Available Hooks**:
- `useToolsetItems()` - Visual agent builder tools
- `useLabExperiments()` - Lab experiment data
- `useDashboardMetrics()` - Real-time dashboard data
- `useCommunityPosts()` - Community content with pagination
- `useEducationCourses()` - Learning materials
- `useApiHealth()` - API server health monitoring
- `useDevUtilities()` - Development helper functions

**Caching Strategy**:
- Toolset items: 5 minutes stale time
- Lab experiments: 3 minutes stale time
- Dashboard metrics: 2 minutes with auto-refresh
- Community posts: 1 minute with pagination support
- Education courses: 10 minutes (less volatile)

## 🔐 Authentication Flow

### Development Mode (Default)

1. **Automatic Login**: User is automatically authenticated with admin permissions
2. **Tenant Context**: Fixed to `dev-tenant` for all operations
3. **Data Access**: Full access to all seeded local DynamoDB data
4. **UI Indicators**: Development status badge shows in top-right corner

### Quick Login Options

The DevSignInForm provides instant login with different roles:

| Role | Email | Permissions | Description |
|------|-------|-------------|-------------|
| Admin | admin@example.com | read:all, write:all, admin:all | Full system access |
| Developer | developer@example.com | read:all, write:own | Standard development user |
| Viewer | viewer@example.com | read:all | Read-only access |

### Production Mode

- Uses real AWS Amplify authentication
- Integrates with Cognito user pools
- Maintains same tenant context patterns
- Automatic fallback when `import.meta.env.MODE !== 'development'`

## 🌐 API Integration

### Express API Server (`src/api/server.ts`)

**Status**: ✅ Running on http://localhost:3001

**Endpoints**:
- `GET /api/health` - Server health check
- `GET /api/toolset` - Toolset items with tenant filtering
- `GET /api/lab` - Lab experiments
- `GET /api/dashboard` - Dashboard metrics
- `GET /api/community` - Community posts (paginated)
- `GET /api/education` - Education courses

**Tenant Isolation**:
All endpoints automatically filter data by tenant ID from request headers.

### DynamoDB Integration

**Local Development**:
- Uses DynamoDB Local on http://localhost:8000
- Seeded with realistic test data for `dev-tenant`
- Automatic table creation and data population

**Table Structure**:
```
dev-ai-nexus-toolset_items      # Visual agent builder tools
dev-ai-nexus-lab_experiments    # Lab experiment data  
dev-ai-nexus-dashboard_metrics  # Real-time metrics
dev-ai-nexus-community_posts    # Community content
dev-ai-nexus-education_courses  # Learning materials
```

## 🧪 Testing Strategy

### Comprehensive Test Suite (`tests/auth-integration.test.ts`)

**Test Coverage**:
- ✅ DevAuth context initialization
- ✅ User role simulation and switching
- ✅ Tenant context consistency
- ✅ API service client integration
- ✅ Content hooks with caching
- ✅ Error handling and recovery
- ✅ Full authentication → API → data flow

**Test Commands**:
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode for development
npm run test:auth          # Run only auth tests
npm run test:coverage      # Generate coverage report
npm run test:ui            # Visual test interface
```

## 🚀 Getting Started

### 1. Start the API Server
```bash
npm run api:start
```

### 2. Start the Development Server
```bash
npm run dev
```

### 3. Access the Application
- **Frontend**: http://localhost:8083
- **API**: http://localhost:3001/api
- **Sign In**: http://localhost:8083/auth/signin (dev mode)

### 4. Development Features

**Quick Access**:
- Click any quick login button for instant authentication
- Development status shows current user/tenant in top-right
- All API calls automatically include tenant context

**Available Users**:
- Admin: Full access to all features and data
- Developer: Standard development permissions
- Viewer: Read-only access for testing UI

## 🔧 Configuration

### Environment Variables (Development)

```env
NODE_ENV=development
VITE_AWS_REGION=us-east-2
API_PORT=3001
```

### Key Configuration Files

- `src/contexts/DevAuthContext.tsx` - Authentication logic
- `src/lib/tenant-service-client.ts` - API client configuration  
- `src/lib/server-aws-config.ts` - Server-side AWS configuration
- `src/hooks/useTenantContent.ts` - Data fetching hooks
- `vitest.config.ts` - Test configuration

## 📊 Data Management

### Seeded Test Data

The system includes realistic test data for development:
- **50+ toolset items** across different categories
- **30+ lab experiments** with various statuses
- **20+ dashboard metrics** with time series data
- **40+ community posts** with tags and categories
- **15+ education courses** with structured content

### Data Refresh

```bash
npm run db:setup          # Recreate tables and seed data
npm run db:seed           # Reseed existing tables
```

## 🎯 Next Steps

### Current Status: ✅ COMPLETED

- [x] DevAuth context with tenant isolation
- [x] Service client with automatic headers
- [x] Content hooks with React Query integration
- [x] Development sign-in form with quick options
- [x] API server with DynamoDB integration
- [x] Comprehensive test suite
- [x] Production AWS Amplify fallback

### Ready for Component Testing

The authentication system is now fully functional and ready for:
1. ✅ Component integration testing
2. ✅ UI component development  
3. ✅ Page-level implementations
4. ✅ Production deployment preparation

## 🔍 Debugging

### Development Tools

**DevAuth Status Component**: Shows real-time auth status in development
**Browser DevTools**: Check `localStorage` for persisted auth state
**Network Tab**: Verify tenant headers in API requests
**React DevTools**: Inspect auth context and query states

### Common Issues

**API Server Not Running**: Run `npm run api:start`
**DynamoDB Connection**: Ensure DynamoDB Local is running on port 8000
**Cache Issues**: Use dev utilities to clear React Query caches
**Import Errors**: Check that all TypeScript paths are correctly resolved

### Health Checks

```bash
# API Server Health
curl http://localhost:3001/api/health

# Frontend Health  
curl http://localhost:8083

# Auth Status (in browser console)
localStorage.getItem('dev-auth-user')
```

---

## 📚 Related Documentation

- [WARP.md](./WARP.md) - Project overview and architecture
- [Technical Stack](./TECHNICAL_STACK.md) - Complete technology breakdown
- [Local Development Setup](./LOCAL_DEVELOPMENT.md) - Environment setup guide

---

**🎉 Authentication system successfully implemented with dev-tenant context, API integration, and comprehensive testing framework!**