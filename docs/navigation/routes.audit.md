# Route Audit - AI Nexus Workbench

> **Generated:** 2025-09-16 20:30:00 UTC  
> **Source:** `src/App.tsx` comprehensive analysis  
> **Purpose:** Complete inventory of all routes and their access controls

## Executive Summary

The Diatonic AI Workbench contains **38 routes** across 7 main categories:
- **5 Protected Routes** requiring authentication or permissions
- **33 Public/Mixed Access Routes** including landing pages, resources, and auth flows
- **Permission-based access** using 4 main permission keys
- **Multiple route patterns** including nested services and catch-all handling

## Protected Routes (Authentication/Permissions Required)

| Path | Component | Access Control | Permission | Notes |
|------|-----------|----------------|------------|-------|
| `/dashboard` | `Dashboard` | `requireAuth: true` | - | Main user dashboard/homebase |
| `/toolset` | `Toolset` | `requiredPermission` | `studio.create_agents` | Visual agent builder and templates |
| `/lab` | `Lab` | `requiredPermission` | `lab.run_basic_experiments` | AI experimentation environment |
| `/observatory` | `Observatory` | `requiredPermission` | `observatory.basic_analytics` | Analytics and visualization |
| `/admin` | `AdminDashboard` | `requiredPermission` | `internal.content_management` | Admin panel (lazy loaded) |

## Public and Mixed Access Routes

### Landing and Core Pages
| Path | Component | Access | Notes |
|------|-----------|--------|-------|
| `/` | `Index` | Public | Main landing page |
| `/education` | `Education` | Mixed | Educational content hub |
| `/community` | `Community` | `allowAnonymous: true` | Community hub with anonymous access |

### Service Landing Pages (Marketing)
| Path | Component | Access | Purpose |
|------|-----------|--------|---------|
| `/services/toolset` | `ToolsetLanding` | Public | Toolset marketing page |
| `/services/lab` | `LabLanding` | Public | Lab marketing page |
| `/services/observatory` | `ObservatoryLanding` | Public | Observatory marketing page |
| `/services/community` | `CommunityLanding` | Public | Community marketing page |
| `/services/education` | `EducationLanding` | Public | Education marketing page |

### Resources and Documentation
| Path | Component | Access | Purpose |
|------|-----------|--------|---------|
| `/pricing` | `Pricing` | Public | Pricing information |
| `/documentation` | `Documentation` | Public | Product documentation |
| `/tutorials` | `Tutorials` | Public | User tutorials |
| `/api-reference` | `APIReference` | Public | API documentation |
| `/status` | `Status` | Public | System status page |

### Company Information
| Path | Component | Access | Purpose |
|------|-----------|--------|---------|
| `/about` | `About` | Public | Company information |
| `/blog` | `Blog` | Public | Company blog |
| `/careers` | `Careers` | Public | Career opportunities |
| `/contact` | `Contact` | Public | Contact information |

### Legal Pages
| Path | Component | Access | Purpose |
|------|-----------|--------|---------|
| `/terms` | `Terms` | Public | Terms of service |
| `/privacy` | `Privacy` | Public | Privacy policy |
| `/cookies` | `Cookies` | Public | Cookie policy |
| `/licenses` | `Licenses` | Public | Software licenses |

### Authentication Flow
| Path | Component | Access | Purpose |
|------|-----------|--------|---------|
| `/auth/signin` | `SignInComponent` | Public | User sign in |
| `/auth/signup` | `SignUpForm` | Public | User registration |
| `/auth/confirm` | `ConfirmSignUpForm` | Public | Account confirmation |
| `/auth/callback` | `OAuthCallback` | Public | OAuth callback |

### Error Handling
| Path | Component | Access | Purpose |
|------|-----------|--------|---------|
| `*` | `NotFound` | Public | 404 catch-all route |

## Permission System Analysis

### Current Permission Keys in Use
1. `studio.create_agents` - Access to toolset/agent builder
2. `lab.run_basic_experiments` - Access to AI lab
3. `observatory.basic_analytics` - Access to analytics dashboard
4. `internal.content_management` - Admin panel access

### Route Protection Patterns
- **ProtectedRoute wrapper** - Requires authentication + optional permissions
- **ConditionalRoute wrapper** - Supports anonymous access with `allowAnonymous: true`
- **Lazy loading** - Most secondary routes use React.lazy() for performance

## Implementation Details

### Component Loading Strategy
- **Immediate loading:** Index, Auth components, NotFound
- **Lazy loading:** Dashboard, Toolset, Lab, Observatory, Education, all resources, company, and legal pages

### Route Protection Components
```typescript
<ProtectedRoute requireAuth={true}>           // Authentication only
<ProtectedRoute requiredPermission="perm">    // Permission-based
<ConditionalRoute allowAnonymous={true}>      // Anonymous allowed
```

### Development vs Production Auth
- Development mode uses `DevSignInForm` component
- Production uses standard `SignInForm` component
- Controlled via `import.meta.env.MODE === 'development'`

## Key Findings

### ✅ Well-Organized Areas
- Clear separation between public and protected routes
- Logical grouping of service landing pages
- Comprehensive legal and company page coverage
- Robust authentication flow

### ⚠️ Areas for Improvement
1. **Permission key inconsistencies** between routes and layouts
2. **Missing dedicated Agent Builder route** (currently tab-based)
3. **Limited resources integration** in user profile navigation
4. **No dedicated admin entry point** in main navigation

### 🚨 Critical Issues
1. **Community route** uses `allowAnonymous` but sidebar shows permission gate
2. **Permission mismatches** between App.tsx and DashboardLayout.tsx
3. **Missing Agent Builder** as standalone accessible tool

## Recommendations

1. **Centralize permission keys** to prevent drift
2. **Add dedicated Agent Builder route** at `/toolset/agent-builder`
3. **Create unified navigation configuration** for consistency
4. **Expose resources** (docs, tutorials, API) in user profile navigation
5. **Fix Community access** to be properly anonymous-friendly

---

**Next Steps:** Use this audit as the foundation for navigation improvements and ensure all discovered pages are properly accessible through the user interface.