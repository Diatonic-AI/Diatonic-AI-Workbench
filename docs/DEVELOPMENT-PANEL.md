# Development Panel

The Development Panel is a powerful testing utility for the Diatonic AI platform that allows developers to simulate different pricing tiers, user roles, and tenant contexts during development.

## Overview

The Development Panel provides:
- **Pricing Tier Switching**: Test all five tiers (Free, Basic, Pro, Extreme, Enterprise)
- **User Role Management**: Switch between Admin, User, and Viewer roles
- **Mock Subscription Data**: Realistic usage limits and feature availability
- **Cache Management**: Clear and refresh React Query caches
- **Real-time Updates**: See changes reflected immediately across the app

## Location and Visibility

- **Position**: Fixed bottom-right corner of the screen
- **Visibility**: Only shows in development mode (`NODE_ENV=development`)
- **State**: Can be collapsed/expanded for minimal interference
- **Z-index**: High priority overlay (z-50)

## Features

### 1. Pricing Tier Switching

Switch between all five pricing tiers to test feature availability and limits:

```typescript
// Available tiers
- free: $0/month - 3 agents, basic features
- basic: $29/month - 25 agents, email support  
- pro: $99/month - 100 agents, team collaboration
- extreme: $299/month - Unlimited agents, advanced features
- enterprise: Custom pricing - Full enterprise features
```

Each tier switch:
- Updates user subscription data
- Applies appropriate usage limits
- Enables/disables tier-specific features
- Updates tenant context

### 2. User Role Management

Test different permission levels:

```typescript
// Available roles
- admin: Full system access, all permissions
- user: Standard user access, limited permissions  
- viewer: Read-only access, minimal permissions
```

### 3. Mock Data Generation

The panel generates realistic mock data for each tier:

```typescript
// Example Pro tier data
{
  plan_id: 'pro',
  subscription: {
    usage: {
      agents: 75,        // Realistic usage below limit
      api_calls: 750,    // 75% of daily limit
      storage_used: '67GB' // Realistic storage usage
    },
    limits: {
      agents: 100,
      api_calls: 1000,
      storage: '100GB'
    }
  }
}
```

### 4. Development Tools

- **Auto-refresh**: Automatically invalidate queries every 30 seconds
- **Refresh**: Manual cache invalidation for content queries
- **Clear**: Complete React Query cache clearing

## Integration

### In App.tsx
```typescript
import DevelopmentPanel from "@/components/dev/DevelopmentPanel";

// In development mode
if (isDevelopment) {
  return (
    <DevAuthProvider mockAuth={true}>
      {children}
      <DevAuthStatus />
      <DevelopmentPanel defaultCollapsed={true} />
    </DevAuthProvider>
  );
}
```

### In Components
```typescript
import { useDevAuth } from '@/contexts/DevAuthContext';

function MyComponent() {
  const { user } = useDevAuth();
  
  // Access current plan
  const currentPlan = user?.plan_id;
  const subscription = user?.subscription;
  
  // Check usage limits
  const agentLimit = subscription?.limits?.agents;
  const currentAgents = subscription?.usage?.agents;
}
```

## Testing Workflows

### 1. Feature Flag Testing
1. Start with Free tier
2. Navigate to a premium feature
3. Verify appropriate blocking/paywall
4. Switch to Pro tier
5. Verify feature is now accessible

### 2. Usage Limit Testing
1. Switch to Basic tier (25 agent limit)
2. Check usage display: "18 / 25"
3. Test behavior when approaching limits
4. Switch to Extreme tier (unlimited)
5. Verify "150 / ∞" display

### 3. Role Permission Testing
1. Set role to Viewer
2. Try to access admin features
3. Verify appropriate restrictions
4. Switch to Admin role  
5. Verify full access granted

## API Integration

The panel integrates with:
- **DevAuthContext**: User and authentication state
- **useTenantContent**: Cache management utilities
- **PRICING library**: Plan definitions and utilities
- **React Query**: Cache invalidation and refresh

## Customization

The panel accepts props for customization:

```typescript
interface DevelopmentPanelProps {
  className?: string;
  defaultCollapsed?: boolean;
}

// Usage
<DevelopmentPanel 
  className="custom-styles" 
  defaultCollapsed={false}
/>
```

## Development Commands

```bash
# Start dev server with panel enabled
npm run dev

# Build for production (panel automatically hidden)
npm run build

# Type checking
npm run type-check
```

## Troubleshooting

### Panel Not Showing
- Verify `NODE_ENV=development` or `import.meta.env.DEV`
- Check console for JavaScript errors
- Ensure component is imported in App.tsx

### Tier Switching Not Working
- Check DevAuthContext implementation
- Verify simulateLogin function calls
- Monitor console logs for tier switch events

### Usage Data Not Updating
- Check subscription data generation
- Verify user state updates
- Test React Query cache invalidation

## Future Enhancements

Planned additions:
- **Feature Flag Editor**: Visual editing of feature flags
- **Mock Data Generator**: Custom test data creation
- **API Response Simulator**: Mock different API responses
- **Performance Profiler**: Development performance monitoring
- **Error Simulator**: Test error handling scenarios

## Related Files

```
src/
├── components/dev/
│   ├── DevelopmentPanel.tsx
│   └── index.ts
├── contexts/
│   └── DevAuthContext.tsx
├── hooks/
│   └── useTenantContent.ts
├── lib/
│   └── pricing.ts
└── pages/
    └── TestPage.tsx (demonstration)
```