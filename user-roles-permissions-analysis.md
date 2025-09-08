# AI Nexus Workbench: User Roles and Permissions Analysis & Implementation Plan

## Current State Analysis

### 🔍 Authentication System
The app currently uses **AWS Cognito** for authentication with the following key components:

- **AuthContext** (`src/contexts/AuthContext.tsx`) - Manages user state, authentication flows, and session management
- **User Interface** includes `groups: string[]` field from Cognito JWT token (`cognito:groups`)
- **Protected Route Component** - Basic authentication check but **no role-based restrictions**
- **AWS Amplify Integration** - Properly configured for multi-environment support (dev/staging/prod)

### 📊 Current User Data Structure
```typescript
interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  avatar?: string;
  emailVerified: boolean;
  groups: string[];  // ← Available but unused for permissions
}
```

### 🚫 Current Limitations

1. **No Role-Based Access Control** - All authenticated users see the same content
2. **No Permission System** - Missing role-to-permission mapping
3. **No Content Gating** - Pages don't respect user groups/roles
4. **No Navigation Control** - All links visible regardless of permissions
5. **No Community Data Isolation** - No tenant/group-based data separation

---

## 🎯 Recommended User Groups & Permissions Matrix

### User Groups Hierarchy

| Group | Access Level | Description |
|-------|-------------|-------------|
| **Anonymous** | Public | Non-authenticated visitors |
| **Basic Users** | Limited | Registered users with basic access |
| **Org Users** | Enhanced | Organization members with additional features |
| **Development** | Internal | Internal team members |
| **Testing** | Full | QA and testing team access |

### Detailed Permission Matrix

#### 📖 **Education Hub**
| Feature | Anonymous | Basic Users | Org Users | Development | Testing |
|---------|-----------|-------------|-----------|-------------|---------|
| View Course Catalog | ✅ | ✅ | ✅ | ✅ | ✅ |
| Access Free Content | ✅ | ✅ | ✅ | ✅ | ✅ |
| Access Premium Content | ❌ | ✅ | ✅ | ✅ | ✅ |
| Track Progress | ❌ | ✅ | ✅ | ✅ | ✅ |
| Download Materials | ❌ | Limited | ✅ | ✅ | ✅ |
| Org-Specific Courses | ❌ | ❌ | ✅ | ✅ | ✅ |

#### 🛠️ **Studio (Toolset)**
| Feature | Anonymous | Basic Users | Org Users | Development | Testing |
|---------|-----------|-------------|-----------|-------------|---------|
| View Interface Demo | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Projects | ❌ | ✅ | ✅ | ✅ | ✅ |
| Save Projects | ❌ | ✅ | ✅ | ✅ | ✅ |
| Export Projects | ❌ | Limited | ✅ | ✅ | ✅ |
| Advanced Tools | ❌ | ❌ | ✅ | ✅ | ✅ |
| Team Collaboration | ❌ | ❌ | ✅ | ✅ | ✅ |
| Debug Mode | ❌ | ❌ | ❌ | ✅ | ✅ |

#### 🧪 **Lab (Experimentation)**
| Feature | Anonymous | Basic Users | Org Users | Development | Testing |
|---------|-----------|-------------|-----------|-------------|---------|
| View Lab Overview | ✅ | ✅ | ✅ | ✅ | ✅ |
| Run Experiments | ❌ | ✅ | ✅ | ✅ | ✅ |
| Save Experiments | ❌ | ✅ | ✅ | ✅ | ✅ |
| Advanced Experiments | ❌ | ❌ | ✅ | ✅ | ✅ |
| Model Training | ❌ | Limited | ✅ | ✅ | ✅ |
| Resource Allocation | ❌ | Basic | Enhanced | Full | Full |
| System Experiments | ❌ | ❌ | ❌ | ✅ | ✅ |

#### 👥 **Community (Nexus)**
| Feature | Anonymous | Basic Users | Org Users | Development | Testing |
|---------|-----------|-------------|-----------|-------------|---------|
| View Public Posts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Posts | ❌ | ✅ | ✅ | ✅ | ✅ |
| Join Public Groups | ❌ | ✅ | ✅ | ✅ | ✅ |
| Join Private Groups | ❌ | ❌ | ✅ | ✅ | ✅ |
| Org-Only Content | ❌ | ❌ | ✅ | ✅ | ✅ |
| Moderation Tools | ❌ | ❌ | ❌ | ✅ | ✅ |

#### 📊 **Observatory (Analytics)**
| Feature | Anonymous | Basic Users | Org Users | Development | Testing |
|---------|-----------|-------------|-----------|-------------|---------|
| View Public Dashboards | ✅ | ✅ | ✅ | ✅ | ✅ |
| Personal Analytics | ❌ | ✅ | ✅ | ✅ | ✅ |
| Org Analytics | ❌ | ❌ | ✅ | ✅ | ✅ |
| Advanced Metrics | ❌ | ❌ | ✅ | ✅ | ✅ |
| System Metrics | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 🛠️ Implementation Plan

### Phase 1: Role-Based Access Control Foundation

#### 1.1 Create Permission System
```typescript
// src/lib/permissions.ts
export type UserRole = 'anonymous' | 'basic' | 'org' | 'development' | 'testing';

export type Permission = 
  | 'education.view_premium'
  | 'studio.create_project'
  | 'studio.advanced_tools'
  | 'lab.run_experiments'
  | 'lab.model_training'
  | 'community.create_posts'
  | 'community.org_content'
  | 'observatory.personal_analytics'
  | 'observatory.org_analytics'
  | 'observatory.system_metrics';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  anonymous: [],
  basic: [
    'education.view_premium',
    'studio.create_project',
    'lab.run_experiments',
    'community.create_posts',
    'observatory.personal_analytics'
  ],
  org: [
    'education.view_premium',
    'studio.create_project',
    'studio.advanced_tools',
    'lab.run_experiments',
    'lab.model_training',
    'community.create_posts',
    'community.org_content',
    'observatory.personal_analytics',
    'observatory.org_analytics'
  ],
  development: [
    // All permissions + development-specific ones
    ...ROLE_PERMISSIONS.org,
    'observatory.system_metrics'
  ],
  testing: [
    // All permissions for comprehensive testing
    ...ROLE_PERMISSIONS.development
  ]
};
```

#### 1.2 Create usePermissions Hook
```typescript
// src/hooks/usePermissions.ts
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_PERMISSIONS, Permission, UserRole } from '@/lib/permissions';

export const usePermissions = () => {
  const { user, isAuthenticated } = useAuth();
  
  const getUserRole = (): UserRole => {
    if (!isAuthenticated || !user) return 'anonymous';
    
    // Map Cognito groups to our role system
    if (user.groups.includes('Testing')) return 'testing';
    if (user.groups.includes('Development')) return 'development';
    if (user.groups.includes('OrgUsers')) return 'org';
    if (user.groups.includes('BasicUsers')) return 'basic';
    
    return 'basic'; // Default for authenticated users
  };
  
  const hasPermission = (permission: Permission): boolean => {
    const role = getUserRole();
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
  };
  
  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };
  
  return {
    role: getUserRole(),
    hasPermission,
    hasAnyPermission,
    isAuthenticated
  };
};
```

#### 1.3 Create Permission Gate Components
```typescript
// src/components/permissions/PermissionGate.tsx
import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/lib/permissions';

interface PermissionGateProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean;
}

export const PermissionGate = ({ 
  permission, 
  children, 
  fallback = null,
}: PermissionGateProps) => {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(permission)) {
    return fallback;
  }
  
  return <>{children}</>;
};

// Multi-permission variant
interface MultiPermissionGateProps {
  permissions: Permission[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export const MultiPermissionGate = ({
  permissions,
  requireAll = false,
  children,
  fallback = null
}: MultiPermissionGateProps) => {
  const { hasPermission, hasAnyPermission } = usePermissions();
  
  const hasAccess = requireAll 
    ? permissions.every(p => hasPermission(p))
    : hasAnyPermission(permissions);
    
  if (!hasAccess) {
    return fallback;
  }
  
  return <>{children}</>;
};
```

### Phase 2: Route Protection and Navigation Control

#### 2.1 Enhanced Protected Route Component
```typescript
// src/components/auth/ProtectedRoute.tsx
import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredPermission?: Permission;
  fallback?: ReactNode;
}

export const ProtectedRoute = ({ 
  children, 
  requireAuth = true,
  requiredPermission,
  fallback 
}: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasPermission } = usePermissions();
  
  if (isLoading) {
    return <div>Loading...</div>; // Your loading component
  }
  
  if (requireAuth && !isAuthenticated) {
    return fallback || <div>Please sign in to access this page</div>;
  }
  
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback || <div>You don't have permission to access this page</div>;
  }
  
  return <>{children}</>;
};
```

#### 2.2 Update Navigation Components
```typescript
// src/components/Navbar.tsx - Add role-based navigation
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';

const Navbar = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const { role } = usePermissions();

  return (
    <nav className="...">
      {/* ... existing navbar code ... */}
      
      <div className="hidden md:block ml-10 flex-grow">
        <div className="flex items-center space-x-4">
          <Link to="/education">Education</Link>
          
          <PermissionGate 
            permission="studio.create_project"
            fallback={<span className="text-muted-foreground">Toolset</span>}
          >
            <Link to="/toolset">Toolset</Link>
          </PermissionGate>
          
          <PermissionGate permission="lab.run_experiments">
            <Link to="/lab">AI Lab</Link>
          </PermissionGate>
          
          <PermissionGate permission="community.create_posts">
            <Link to="/community">Community</Link>
          </PermissionGate>
          
          {/* Observatory - show different versions based on role */}
          {role === 'development' || role === 'testing' ? (
            <Link to="/observatory">Observatory (Full)</Link>
          ) : (
            <PermissionGate permission="observatory.personal_analytics">
              <Link to="/observatory">Observatory</Link>
            </PermissionGate>
          )}
        </div>
      </div>
    </nav>
  );
};
```

### Phase 3: Page-Level Content Control

#### 3.1 Update Education Page
```typescript
// src/pages/Education.tsx - Add premium content gating
import { PermissionGate } from '@/components/permissions/PermissionGate';

const Education = () => {
  return (
    <div>
      {/* ... existing code ... */}
      
      {/* Free courses for everyone */}
      <section className="py-12">
        <h2>Free Courses</h2>
        {/* Display free courses */}
      </section>
      
      {/* Premium courses for authenticated users */}
      <PermissionGate 
        permission="education.view_premium"
        fallback={
          <div className="text-center p-8">
            <h3>Premium Content</h3>
            <p>Sign up to access premium courses and tutorials</p>
            <Button asChild>
              <Link to="/auth/signup">Sign Up Now</Link>
            </Button>
          </div>
        }
      >
        <section className="py-12">
          <h2>Premium Courses</h2>
          {/* Display premium courses */}
        </section>
      </PermissionGate>
    </div>
  );
};
```

#### 3.2 Update Community Page with Data Isolation
```typescript
// src/pages/Community.tsx - Add organization-based content
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';

const Community = () => {
  const { role } = usePermissions();

  return (
    <DashboardLayout>
      {/* ... existing public content ... */}
      
      {/* Organization-specific content */}
      <PermissionGate permission="community.org_content">
        <Card>
          <CardHeader>
            <CardTitle>Organization Feed</CardTitle>
            <CardDescription>
              Content from your organization members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Organization-specific posts and discussions */}
          </CardContent>
        </Card>
      </PermissionGate>
      
      {/* Development/Testing tools */}
      {(role === 'development' || role === 'testing') && (
        <Card>
          <CardHeader>
            <CardTitle>Moderation Tools</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Admin tools for development/testing */}
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
};
```

### Phase 4: Backend Data Isolation (Recommendations)

#### 4.1 API Gateway Authorization
```typescript
// Recommended AWS API Gateway authorizer configuration
export const apiAuthConfig = {
  type: 'COGNITO_USER_POOLS',
  authorizerUri: 'arn:aws:cognito-idp:region:account:userpool/userPoolId',
  scopes: [
    'basic-access',
    'org-access', 
    'development-access'
  ]
};
```

#### 4.2 Database Access Patterns
```sql
-- Example RLS (Row Level Security) for PostgreSQL
-- Community posts with organization isolation
CREATE POLICY community_posts_isolation ON posts
FOR ALL TO authenticated_users
USING (
  user_organization = current_user_claim('cognito:groups')::jsonb ? 'OrgUsers'
  OR visibility = 'public'
);
```

---

## 🚀 Quick Start Implementation

### Step 1: Create Permission System Files
Create the following files in order:

1. `src/lib/permissions.ts` - Permission definitions and role mappings
2. `src/hooks/usePermissions.ts` - Permission checking hook
3. `src/components/permissions/PermissionGate.tsx` - Permission gate components

### Step 2: Update AuthContext
Add role detection logic to the existing `AuthContext.tsx`:

```typescript
// In parseUserFromAuth function, add role detection
const getUserRole = (groups: string[]): UserRole => {
  if (groups.includes('Testing')) return 'testing';
  if (groups.includes('Development')) return 'development';
  if (groups.includes('OrgUsers')) return 'org';
  if (groups.includes('BasicUsers')) return 'basic';
  return 'basic';
};

// Add role to User interface
interface User {
  // ... existing fields ...
  role: UserRole;
}
```

### Step 3: Update App Routes
Wrap routes with appropriate protection:

```typescript
// src/App.tsx
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/education" element={<Education />} />
  
  <Route path="/toolset" element={
    <ProtectedRoute requiredPermission="studio.create_project">
      <Toolset />
    </ProtectedRoute>
  } />
  
  <Route path="/lab" element={
    <ProtectedRoute requiredPermission="lab.run_experiments">
      <Lab />
    </ProtectedRoute>
  } />
  
  {/* ... other routes ... */}
</Routes>
```

### Step 4: Test Implementation
1. Create test users in Cognito with different group assignments
2. Test navigation visibility and page access
3. Verify content gating works correctly
4. Test fallback components and error states

---

## 📋 Testing Strategy

### Manual Testing Checklist

#### Anonymous Users
- [ ] Can access homepage and education overview
- [ ] Cannot access dashboard, toolset, lab, community
- [ ] See sign-up prompts for premium content
- [ ] Navigation shows limited options

#### Basic Users
- [ ] Can access all basic features
- [ ] Can create projects and run basic experiments
- [ ] Can participate in public community discussions
- [ ] See personal analytics only

#### Org Users
- [ ] Can access advanced tools and features
- [ ] Can see organization-specific content
- [ ] Can access enhanced analytics
- [ ] Can participate in private organization groups

#### Development/Testing Users
- [ ] Can access all features
- [ ] Can see system metrics and admin tools
- [ ] Can access debug and testing interfaces
- [ ] Have moderation capabilities

### Automated Testing (Recommended)
```typescript
// Example test for permission system
describe('Permission System', () => {
  it('should restrict access based on user role', () => {
    const basicUser = { groups: ['BasicUsers'] };
    expect(hasPermission(basicUser, 'studio.advanced_tools')).toBe(false);
    
    const orgUser = { groups: ['OrgUsers'] };
    expect(hasPermission(orgUser, 'studio.advanced_tools')).toBe(true);
  });
});
```

---

## 🎯 Success Metrics

### Implementation Success Criteria
- [ ] All user groups have appropriate access levels
- [ ] No unauthorized access to protected content
- [ ] Smooth user experience with clear permission messaging
- [ ] Scalable permission system for future features

### User Experience Goals
- [ ] Anonymous users encouraged to sign up
- [ ] Basic users see value in upgrading to org access
- [ ] Org users have enhanced collaborative features
- [ ] Development team has full debugging capabilities

---

## 🔮 Future Enhancements

### Advanced Permission Features
1. **Dynamic Permissions** - Runtime permission changes without redeploy
2. **Feature Flags Integration** - A/B testing with permission-based feature rollouts
3. **Usage-Based Permissions** - Tiered access based on usage metrics
4. **Time-Based Access** - Temporary permissions for limited-time features
5. **Resource Quotas** - Per-role limits on compute resources and storage

### Analytics and Monitoring
1. **Permission Analytics** - Track feature usage by role
2. **Access Attempt Monitoring** - Log unauthorized access attempts
3. **Role Migration Tracking** - Monitor user progression through roles
4. **Performance Impact Analysis** - Measure permission check performance

This implementation plan provides a comprehensive foundation for role-based access control while maintaining flexibility for future enhancements and organizational needs.
