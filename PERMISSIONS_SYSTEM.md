# AI Nexus Workbench - DynamoDB Permissions System

This document describes the comprehensive permissions and role-based access control (RBAC) system for AI Nexus Workbench, built on DynamoDB with AWS Cognito integration.

## 🏗️ System Architecture

### Database Structure

The permissions system consists of 9 core DynamoDB tables:

1. **Users** (`ai-nexus-{env}-users`) - Core user profile and subscription data
2. **User Permissions** (`ai-nexus-{env}-user-permissions`) - Individual user permission overrides
3. **Roles** (`ai-nexus-{env}-roles`) - Role definitions (subscription tiers + internal roles)
4. **Role Permissions** (`ai-nexus-{env}-role-permissions`) - Permissions associated with roles
5. **Subscription Limits** (`ai-nexus-{env}-subscription-limits`) - Quota definitions per subscription tier
6. **User Quotas** (`ai-nexus-{env}-user-quotas`) - Individual user quota tracking
7. **Cognito Group Mappings** (`ai-nexus-{env}-cognito-group-mappings`) - AWS Cognito to role mapping
8. **Organization Settings** (`ai-nexus-{env}-organization-settings`) - Organization-level configuration
9. **Team Memberships** (`ai-nexus-{env}-team-memberships`) - Team and organization memberships

### Role Hierarchy

#### Subscription Tiers (Public Users)
- **Free**: Basic access with limited features
- **Basic**: Core features with moderate quotas
- **Pro**: Advanced features with higher quotas
- **Extreme**: Premium features with extensive quotas
- **Enterprise**: Full feature access with unlimited quotas

#### Internal Roles (AI Nexus Team)
- **Internal Developer**: Full system access including debugging
- **Internal Administrator**: Full system access with user management
- **Internal Manager**: Administrative access without debugging/impersonation

## 📋 Permission System

### Feature Areas

The system organizes permissions into logical feature areas:

- **EDUCATION**: Course access, progress tracking, premium content
- **STUDIO**: Agent builder, templates, integrations, version control
- **LAB**: Experiments, model training, execution time, analytics
- **COMMUNITY**: Social features, groups, content moderation
- **OBSERVATORY**: Analytics, dashboards, reporting, data export
- **TEAM**: Collaboration, member management, permissions
- **CORE**: Dashboard access, profile management
- **API**: API access levels and rate limits
- **STORAGE**: Storage quotas and file management
- **SUPPORT**: Support channels and SLA levels
- **SECURITY**: Security features and compliance
- **INTERNAL**: System administration and debugging (internal only)

### Permission Naming Convention

Permissions follow a hierarchical naming pattern:
```
{feature_area}.{action}_{resource}

Examples:
- education.view_courses
- studio.create_agents
- lab.run_advanced_experiments
- internal.debug_all_users
```

## 🚀 Getting Started

### 1. Infrastructure Setup

Deploy the DynamoDB tables using Terraform:

```bash
# Plan the infrastructure changes
npm run terraform:plan:db

# Apply the changes
npm run terraform:apply:db
```

### 2. Database Seeding

Populate the tables with default roles, permissions, and Cognito mappings:

```bash
# Development environment
npm run db:seed:dev

# Production environment (creates no sample users)
npm run db:seed:prod
```

### 3. Service Integration

Initialize the permissions service in your application:

```typescript
import { PermissionsService } from './services/permissions-service';

const permissionsService = new PermissionsService({
  region: process.env.AWS_REGION || 'us-east-2',
  environment: process.env.NODE_ENV || 'development'
});

// Check user permissions
const hasAccess = await permissionsService.hasPermission(
  userId, 
  'studio.create_agents'
);

// Get user's effective permissions
const permissions = await permissionsService.getUserEffectivePermissions(userId);

// Check subscription limits
const withinLimits = await permissionsService.isWithinSubscriptionLimit(
  userId, 
  'agents_created', 
  currentCount
);
```

## 🔧 Development Workflow

### Adding New Permissions

1. **Define the permission** in `seed-permissions-tables.js`:
   ```javascript
   PERMISSIONS_BY_FEATURE.STUDIO.push('studio.new_feature');
   ```

2. **Add to role definitions** as appropriate:
   ```javascript
   ROLE_DEFINITIONS.pro.permissions.push('studio.new_feature');
   ```

3. **Update the database**:
   ```bash
   npm run db:seed:dev
   ```

4. **Use in application code**:
   ```typescript
   const canUseNewFeature = await permissionsService.hasPermission(
     userId, 
     'studio.new_feature'
   );
   ```

### Managing Subscription Limits

1. **Define limits** in the subscription system
2. **Track usage** using `incrementQuotaUsage()`
3. **Check limits** before operations using `isWithinSubscriptionLimit()`

### Testing Permissions

Create test users with specific roles:

```typescript
// Development environment includes these test users:
// - dev.admin@ai-nexus.local (internal_admin role)
// - dev.manager@ai-nexus.local (internal_manager role) 
// - test.pro@ai-nexus.local (pro subscription role)
```

## 📊 Monitoring and Analytics

### Permission Analytics

Track permission usage patterns:

```typescript
// Get permission usage statistics
const stats = await permissionsService.getPermissionUsageStats(
  'studio.create_agents',
  { startDate: '2024-01-01', endDate: '2024-01-31' }
);

// Get quota utilization by subscription tier
const quotaStats = await permissionsService.getQuotaUtilizationStats('basic');
```

### Audit Logging

The system automatically logs:
- Permission checks and results
- Role changes and assignments
- Quota usage and limit breaches
- Administrative actions

## 🔒 Security Considerations

### Data Protection
- All PII is encrypted at rest in DynamoDB
- Cognito integration provides secure authentication
- Role-based access prevents privilege escalation

### Compliance Features
- Audit trails for all permission changes
- Data retention policies
- GDPR-compliant user data deletion
- SOC 2 compliance features for enterprise customers

### Access Patterns
- Users can only access their own data by default
- Internal roles have explicit cross-user access permissions
- Organization-scoped data access for team features

## 🛠️ Database Operations

### Backup and Recovery
```bash
# Backup permissions data
npm run db:backup

# Validate data integrity
npm run db:validate
```

### Migration Support
```bash
# Run migration scripts for schema updates
npm run db:migrate
```

### Reset (Development Only)
```bash
# Reset all permissions tables (DESTRUCTIVE!)
npm run db:reset
```

## 📚 API Reference

### Core Methods

#### User Management
- `getUser(userId)` - Get user profile with role and subscription
- `upsertUser(userData)` - Create or update user profile
- `updateUserRole(userId, newRole)` - Change user's role
- `getUsersByRole(role)` - Get all users with specific role

#### Permission Checks
- `hasPermission(userId, permission)` - Check if user has permission
- `getUserEffectivePermissions(userId)` - Get all user permissions
- `checkMultiplePermissions(userId, permissions)` - Batch permission check

#### Quota Management  
- `isWithinSubscriptionLimit(userId, resource, currentValue)` - Check quota limits
- `incrementQuotaUsage(userId, resource, amount)` - Track resource usage
- `resetUserQuota(userId, resource)` - Reset quota counter

#### Role Management
- `assignRolePermission(roleId, permission)` - Add permission to role
- `removeRolePermission(roleId, permission)` - Remove permission from role
- `getUsersInRole(roleId)` - Get users with specific role

### Error Handling

All methods return structured error responses:

```typescript
{
  success: boolean;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  data?: any;
}
```

## 🔄 Migration from Legacy System

### Cognito Group Migration

The system maintains backward compatibility with existing Cognito groups:

```javascript
// Legacy groups automatically map to new roles:
'Testing' -> 'internal_dev'
'Development' -> 'internal_dev'
'OrgUsers' -> 'pro'
'BasicUsers' -> 'basic'
```

### Data Migration Process

1. **Export existing user data** from old system
2. **Map to new schema** using migration script
3. **Import via batch operations** with validation
4. **Verify data integrity** using validation tools

## ⚡ Performance Optimization

### Query Patterns
- Primary key access for user lookups: O(1)
- GSI queries for role-based operations: O(log n)
- Batch operations for bulk permission checks
- Caching layer for frequently accessed permissions

### Scaling Considerations
- DynamoDB auto-scaling enabled
- Read replicas for high-traffic scenarios
- Connection pooling for database access
- Caching strategies for permission data

## 🧪 Testing

### Unit Tests
```bash
# Run permission system tests
npm test -- permissions

# Run integration tests
npm test -- integration/permissions
```

### Load Testing
```bash
# Simulate high-permission check volume
npm run test:load:permissions
```

## 📈 Roadmap

### Planned Features
- [ ] Dynamic permission assignment
- [ ] Time-based permission grants
- [ ] Multi-tenant organization support
- [ ] Advanced quota management with rollover
- [ ] Machine learning-based usage predictions
- [ ] Real-time permission sync across regions

### Version History
- **v2.0**: Complete DynamoDB-based permissions system
- **v1.0**: Basic Cognito group-based permissions

---

For questions or support regarding the permissions system, please contact the development team or create an issue in the project repository.
