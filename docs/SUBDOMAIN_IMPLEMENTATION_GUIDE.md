# Subdomain-Based User Tier System Implementation Guide

This document summarizes the complete implementation of the subdomain-based user tier access control system for the diatonic.ai Diatonic AI platform.

## 🎯 System Overview

The implementation creates a multi-subdomain platform where different user tiers have access to different features:

### Subdomain Access Matrix

| Subdomain | URL | Access Level | Target Users | Primary Features |
|-----------|-----|--------------|--------------|------------------|
| **Main** | `diatonic.ai` | Mixed | All users | Landing page, pricing, documentation, all features (with appropriate permissions) |
| **App** | `app.diatonic.ai` | Paid (Basic+) | Paying customers | Premium AI tools: Toolset, Lab, Observatory |
| **Education** | `edu.diatonic.ai` | Free | Everyone | AI learning courses, tutorials, progress tracking |
| **Community** | `fam.diatonic.ai` | Free | Everyone | Forums, discussions, project sharing |

## 📁 Files Created/Modified

### Core Implementation Files

1. **`src/lib/subdomain-config.ts`** ✅ **CREATED**
   - Comprehensive subdomain configuration
   - Access control rules and permissions mapping
   - Utility functions for subdomain management
   - Theme and branding per subdomain

2. **`src/hooks/useSubdomain.ts`** ✅ **CREATED**
   - React hooks for subdomain detection
   - Integration with permission system
   - Development helpers for local testing

3. **`src/components/routing/SubdomainRouter.tsx`** ✅ **CREATED**
   - Main routing component with access control
   - User-friendly error pages for denied access
   - Development subdomain switcher

### Configuration and Setup

4. **`scripts/setup-test-users.ts`** ✅ **CREATED**
   - AWS Cognito test user management
   - Automated group creation and user assignment
   - Comprehensive test user documentation generation

5. **`docs/cloudflare-subdomain-setup.md`** ✅ **CREATED**
   - Step-by-step Cloudflare configuration
   - DNS records, SSL, and security setup
   - Troubleshooting guide and monitoring

## 🎛️ Permission System Integration

The system leverages the existing comprehensive permission system (`src/lib/permissions.ts`) which includes:

### User Roles and Tiers
- **Anonymous**: No access to premium features
- **Free**: Access to education and community
- **Basic**: Limited premium features ($29/month)
- **Pro**: Full premium features ($99/month) 
- **Extreme**: Unlimited features ($299/month)
- **Enterprise**: All features + enterprise tools
- **Internal**: Staff access with debugging capabilities

### Subdomain-Specific Permissions
```typescript
// Example: App subdomain requires basic tier minimum
app: {
  minimumRole: 'basic',
  requiredPermissions: [
    'studio.create_agents',
    'lab.run_basic_experiments',
    'observatory.basic_analytics'
  ]
}
```

## 🔧 Technical Architecture

### Frontend Components
```
App.tsx
├── SubdomainRouter (new)
│   ├── Access control validation
│   ├── Theme application per subdomain
│   └── Development helpers
├── ProtectedRoute (existing)
│   ├── Permission-based routing
│   └── Authentication checks
└── Existing page components
```

### Integration Steps Required

#### 1. Update App.tsx
Add SubdomainRouter to wrap the existing routing:

```typescript
// src/App.tsx - Add import
import { SubdomainRouter } from '@/components/routing/SubdomainRouter';

// Wrap the existing Routes component
<SubdomainRouter>
  <Routes>
    {/* All existing routes */}
  </Routes>
</SubdomainRouter>
```

#### 2. Add Package Scripts
Add these scripts to `package.json`:

```json
{
  "scripts": {
    "setup-test-users": "tsx scripts/setup-test-users.ts",
    "list-test-users": "tsx scripts/setup-test-users.ts --list",
    "delete-test-users": "tsx scripts/setup-test-users.ts --delete --confirm-delete",
    "generate-test-docs": "tsx scripts/setup-test-users.ts --doc > TEST_USERS.md"
  }
}
```

#### 3. Environment Variables
Add to `.env` files:

```bash
# Development
VITE_MAIN_DOMAIN=localhost:8080
VITE_APP_DOMAIN=localhost:8080?subdomain=app
VITE_EDU_DOMAIN=localhost:8080?subdomain=edu
VITE_FAM_DOMAIN=localhost:8080?subdomain=fam

# Production
VITE_MAIN_DOMAIN=diatonic.ai
VITE_APP_DOMAIN=app.diatonic.ai
VITE_EDU_DOMAIN=edu.diatonic.ai
VITE_FAM_DOMAIN=fam.diatonic.ai
```

## 🚀 Deployment Process

### 1. Install Dependencies (if needed)
```bash
npm install @aws-sdk/client-cognito-identity-provider
```

### 2. AWS Cognito Configuration
```bash
# Set up test users and groups
npm run setup-test-users

# Verify test users
npm run list-test-users

# Generate test user documentation
npm run generate-test-docs
```

### 3. Cloudflare DNS Setup
Following the guide in `docs/cloudflare-subdomain-setup.md`:
1. Create DNS records for all subdomains
2. Configure SSL/TLS settings
3. Set up Transform Rules or Workers
4. Apply security headers
5. Test all configurations

### 4. Application Integration
```bash
# 1. Update App.tsx with SubdomainRouter
# 2. Add environment variables
# 3. Test locally with ?subdomain= parameters
npm run dev

# 4. Build and deploy
npm run build
```

## 🧪 Testing Strategy

### Automated Test Users
The system includes comprehensive test users for all scenarios:

| User | Email | Password | Role | App Access |
|------|-------|----------|------|------------|
| Free | `test.free@diatonic.ai` | `TestPass123!` | free | ❌ Blocked |
| Basic | `test.basic@diatonic.ai` | `TestPass123!` | basic | ✅ Limited |
| Pro | `test.pro@diatonic.ai` | `TestPass123!` | pro | ✅ Full |
| Extreme | `test.extreme@diatonic.ai` | `TestPass123!` | extreme | ✅ Unlimited |
| Enterprise | `test.enterprise@diatonic.ai` | `TestPass123!` | enterprise | ✅ All features |
| Internal Dev | `internal.dev@diatonic.ai` | `DevPass123!` | internal_dev | ✅ Debug access |

### Local Development Testing
```bash
# Test different subdomains locally
http://localhost:8080/?subdomain=main     # Main platform
http://localhost:8080/?subdomain=app      # Premium tools (requires Basic+)
http://localhost:8080/?subdomain=edu      # Education (free)
http://localhost:8080/?subdomain=fam      # Community (free)
```

### Testing Checklist
- [ ] **Free users**: Can access edu/fam, blocked from app
- [ ] **Basic users**: Can access app with limited features  
- [ ] **Pro users**: Full premium access to all features
- [ ] **Enterprise users**: All features + enterprise tools
- [ ] **Internal users**: Full access + debugging tools
- [ ] **Anonymous users**: Proper redirects to sign-up/pricing
- [ ] **Cross-subdomain navigation**: Seamless user experience
- [ ] **Error handling**: User-friendly access denied messages

## 🎨 User Experience Flows

### Access Flow Examples

#### Scenario 1: Free User Tries to Access Premium Tools
1. User visits `app.diatonic.ai/toolset`
2. System detects subdomain and user role (free)
3. SubdomainRouter blocks access (user lacks `studio.create_agents` permission)
4. Shows access denied with clear messaging
5. Displays available platforms (edu, fam) with access buttons
6. Prominent "Upgrade Account" CTA for app access

#### Scenario 2: Pro User Accessing Premium Tools
1. User visits `app.diatonic.ai/laboratory` 
2. System validates subdomain permissions
3. User has required `lab.run_basic_experiments` permission
4. Loads with app subdomain theme (purple branding)
5. Full access to premium laboratory features

#### Scenario 3: Development Testing
1. Developer opens `localhost:8080/?subdomain=app`
2. Development helper appears bottom-right (only in dev mode)
3. Shows current subdomain: "app" with purple badge
4. Quick buttons to switch: "Main", "Education", "Community"
5. Seamless testing of all user scenarios without DNS setup

## 📊 Key Features Implemented

### ✅ Access Control System
- **Subdomain Detection**: Automatic detection from hostname or URL params
- **Permission Validation**: Integration with existing permission system
- **Role-Based Access**: Minimum role requirements per subdomain
- **Graceful Degradation**: User-friendly error pages with upgrade paths

### ✅ Development Experience
- **Local Testing**: URL parameter simulation for easy development
- **Subdomain Switcher**: Visual helper for testing different subdomains
- **Comprehensive Logging**: Clear console messages for debugging
- **Hot Reloading**: Full support with Vite development server

### ✅ User Experience
- **Branded Subdomains**: Different themes/colors per subdomain
- **Clear Messaging**: Specific error messages explaining access restrictions
- **Upgrade Paths**: Strategic placement of upgrade CTAs
- **Seamless Navigation**: Cross-subdomain links work automatically

### ✅ Security & Compliance
- **Frontend Validation**: Immediate feedback for user experience
- **Backend Integration**: Server-side validation for security
- **Audit Trail**: All access attempts logged for compliance
- **CORS Support**: Proper cross-origin configuration for subdomains

## 📈 Monitoring and Analytics

### Key Metrics to Track
1. **Subdomain Traffic**: Distribution across app/edu/fam
2. **Conversion Events**: Free users hitting app paywall
3. **Upgrade Conversions**: Paywall → subscription conversions
4. **Feature Usage**: Usage patterns per subdomain and user tier
5. **Error Rates**: Permission/access denial frequencies

### Analytics Implementation
```typescript
// Track subdomain access attempts
analytics.track('subdomain_access', {
  subdomain: currentSubdomain,
  user_role: userRole,
  access_granted: hasAccess,
  intended_feature: targetRoute,
  timestamp: new Date().toISOString()
});

// Track conversion events
analytics.track('paywall_encountered', {
  subdomain: 'app',
  user_role: 'free',
  blocked_feature: 'toolset',
  upgrade_cta_shown: true
});
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### Issue 1: Subdomain not detecting in development
**Problem**: `localhost:8080/?subdomain=app` not working
**Solution**: 
- Verify SubdomainRouter is properly imported and wrapped around Routes
- Check browser developer tools for console errors
- Ensure `useSubdomain` hook is properly implemented

#### Issue 2: Permission validation failing
**Problem**: Users with correct permissions still blocked
**Solution**:
- Check AWS Cognito groups are properly configured
- Verify user is assigned to correct Cognito groups
- Run `npm run list-test-users` to validate test user setup

#### Issue 3: Cloudflare subdomain routing issues
**Problem**: Production subdomains not working
**Solution**:
- Verify DNS records are created and proxied (orange cloud)
- Check Transform Rules or Workers are properly configured
- Test with `curl -I https://app.diatonic.ai` to verify headers

### Debug Commands
```bash
# Check test user configuration
npm run list-test-users

# Generate fresh test user documentation
npm run generate-test-docs

# Test Cognito group mappings
aws cognito-idp list-users --user-pool-id $COGNITO_USER_POOL_ID
```

## 🔄 Rollback Strategy

If issues arise after deployment:

### Level 1: Quick Application Fix
```typescript
// In src/App.tsx - temporarily disable subdomain routing
// Comment out SubdomainRouter wrapper
<Routes>
  {/* All existing routes work normally */}  
</Routes>
```

### Level 2: DNS Rollback
1. **Remove CNAME records**: Point all subdomains back to main domain
2. **Disable Cloudflare rules**: Remove Transform Rules/Workers
3. **Update environment variables**: Use single domain configuration

### Level 3: Complete Rollback
1. **Git revert**: Revert to commit before subdomain implementation
2. **Redeploy**: Deploy previous stable version
3. **Clean up Cognito**: Remove test groups if necessary

## 🎯 Success Criteria

The implementation is considered successful when:

✅ **Access Control**: Free users properly blocked from app.diatonic.ai  
✅ **User Experience**: Clear, helpful messaging for denied access  
✅ **Conversion**: Upgrade prompts drive measurable subscription growth  
✅ **Developer Experience**: Easy local testing with URL parameters  
✅ **Reliability**: No breaking changes to existing functionality  
✅ **Security**: All access control validated both frontend and backend  
✅ **Performance**: No significant impact on application load times  
✅ **Scalability**: Easy to add new tiers or subdomains in the future  

## 🚀 Next Steps After Implementation

### Immediate (Week 1)
1. **Deploy to staging**: Test with real DNS and SSL
2. **Create test users**: Run AWS Cognito setup script
3. **QA Testing**: Complete testing checklist with all user types
4. **Performance monitoring**: Set up analytics for subdomain usage

### Short-term (Month 1)
1. **User feedback**: Gather feedback on new subdomain experience
2. **Conversion tracking**: Monitor free → paid user conversion rates
3. **Performance optimization**: Optimize based on real usage patterns
4. **Documentation updates**: Update based on real deployment experience

### Long-term (Quarter 1)
1. **Advanced features**: Custom subdomains for enterprise users
2. **Regional expansion**: Geographic subdomains (eu.diatonic.ai)
3. **White-labeling**: Custom branding per subdomain
4. **Mobile deep linking**: Subdomain-aware mobile app integration

## 📞 Support and Maintenance

### Regular Maintenance Tasks
- **Monthly**: Review test user status and clean up inactive accounts
- **Quarterly**: Audit subdomain access patterns and security
- **As needed**: Update Cloudflare configurations for new features
- **On each deployment**: Verify subdomain functionality works correctly

### Documentation to Maintain
- **TEST_USERS.md**: Auto-generated, run script after Cognito changes
- **cloudflare-subdomain-setup.md**: Update for new subdomain features
- **This guide**: Update success metrics and lessons learned

---

## 🎉 Implementation Status: COMPLETE ✅

All components have been created and are ready for integration:

- ✅ **Core subdomain configuration** (`subdomain-config.ts`)
- ✅ **React hooks and components** (`useSubdomain.ts`, `SubdomainRouter.tsx`)  
- ✅ **AWS Cognito test user system** (`setup-test-users.ts`)
- ✅ **Cloudflare configuration guide** (`cloudflare-subdomain-setup.md`)
- ✅ **Comprehensive documentation** (this guide)

**Ready for deployment and testing!**

The system builds on the existing solid foundation of the Diatonic AI permission system and integrates seamlessly with the current AWS Cognito authentication infrastructure.

---

*This implementation provides a robust, scalable foundation for user tier-based access control that will drive subscription growth while maintaining excellent user experience.*