/**
 * SubdomainRouter Component
 * 
 * Handles subdomain-based routing and access control.
 * Integrates with the existing ProtectedRoute system to provide
 * comprehensive access control based on subdomain configuration.
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Lock, AlertTriangle, ExternalLink, Home, Crown, ChevronUp, ChevronDown, User, Shield, Star, Zap, Rocket, Building } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSubdomain, useAllSubdomains } from '@/hooks/useSubdomain';
import { usePermissions } from '@/hooks/usePermissions';
import { useDevAuth } from '@/contexts/DevAuthContext';
import { PRICING, PlanId, PricingUtils } from '@/lib/pricing';
import { SubdomainId } from '@/lib/subdomain-config';

interface SubdomainRouterProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Subdomain Access Denied Component
 */
interface SubdomainAccessDeniedProps {
  reason: 'subdomain_restricted' | 'route_not_allowed' | 'insufficient_permissions';
  subdomainName: string;
  restrictedMessage?: string;
  suggestedRedirect?: string;
}

const SubdomainAccessDenied: React.FC<SubdomainAccessDeniedProps> = ({
  reason,
  subdomainName,
  restrictedMessage,
  suggestedRedirect
}) => {
  const { accessibleSubdomains } = useAllSubdomains();
  const { role, getRoleDisplayName } = usePermissions();
  
  const getContent = () => {
    switch (reason) {
      case 'subdomain_restricted':
        return {
          title: `${subdomainName} Access Restricted`,
          description: restrictedMessage || `Access to ${subdomainName} requires a premium subscription.`,
          icon: Crown,
          variant: 'default' as const
        };
      
      case 'route_not_allowed':
        return {
          title: 'Page Not Available',
          description: `This page is not available on ${subdomainName}.`,
          icon: AlertTriangle,
          variant: 'destructive' as const
        };
      
      case 'insufficient_permissions':
        return {
          title: 'Insufficient Permissions',
          description: `Your current account level (${getRoleDisplayName()}) doesn't include access to this feature.`,
          icon: Lock,
          variant: 'default' as const
        };
      
      default:
        return {
          title: 'Access Denied',
          description: 'You don\'t have permission to access this page.',
          icon: AlertTriangle,
          variant: 'destructive' as const
        };
    }
  };
  
  const { title, description, icon: Icon, variant } = getContent();
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-2xl space-y-6">
        <Alert className={variant === 'destructive' ? 'border-destructive' : 'border-primary'}>
          <Icon className="h-4 w-4" />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription className="mt-2">
            {description}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              What can I access?
            </CardTitle>
            <CardDescription>
              Based on your account level, here are the platforms available to you:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {accessibleSubdomains.map((subdomain) => (
                <div key={subdomain.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{subdomain.config.name}</h4>
                    <p className="text-sm text-muted-foreground">{subdomain.config.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={subdomain.config.accessType === 'free' ? 'secondary' : 'default'}>
                        {subdomain.config.accessType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {subdomain.config.features.length} features
                      </span>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={subdomain.url}>
                      Visit <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>

            {accessibleSubdomains.length === 0 && (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No platforms are currently accessible with your account.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          {reason === 'subdomain_restricted' && (
            <Button asChild className="flex-1">
              <Link to="/pricing">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade Account
              </Link>
            </Button>
          )}
          
          <Button asChild variant="outline" className="flex-1">
            <Link to={suggestedRedirect || '/'}>
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Simplified Development Helper - Pricing Tier & Role Testing Panel
 */
const SubdomainDevelopmentHelper: React.FC = () => {
  const { isDevelopment } = useSubdomainDevelopment();
  const { subdomain } = useSubdomain();
  const { user, simulateLogin, switchTenant, isAuthenticated } = useDevAuth();
  
  const [isExpanded, setIsExpanded] = useState(() => {
    // Restore expanded state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dev-panel-expanded');
      return saved === 'true';
    }
    return false;
  });
  
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user' | 'viewer'>('user');

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    // Persist state to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('dev-panel-expanded', String(newState));
    }
  };

  // Mock subscription generator
  const generateMockSubscription = (planId: PlanId) => {
    const plan = PRICING[planId];
    return {
      id: `sub_dev_${planId}`,
      plan_id: planId,
      status: 'active' as const,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      limits: plan.limits,
      features: plan.features,
      usage: {
        agents: planId === 'free' ? 2 : planId === 'basic' ? 18 : planId === 'pro' ? 75 : 150,
        api_calls: planId === 'free' ? 0 : planId === 'basic' ? 85 : planId === 'pro' ? 750 : 'unlimited',
        storage_used: planId === 'free' ? '0.8GB' : planId === 'basic' ? '7.2GB' : planId === 'pro' ? '67GB' : '320GB'
      }
    };
  };

  // Role configurations
  const ROLE_CONFIGS = {
    admin: {
      label: 'Admin',
      permissions: [
        'read:all', 'write:all', 'admin:all', 'toolset:manage', 
        'experiments:manage', 'community:manage', 'education:manage'
      ],
      icon: Shield
    },
    user: {
      label: 'User',
      permissions: ['read:all', 'write:own', 'toolset:create', 'experiments:run'],
      icon: User
    },
    viewer: {
      label: 'Viewer', 
      permissions: ['read:all'],
      icon: User
    }
  } as const;

  // Handle plan switching
  const handlePlanSwitch = (planId: PlanId) => {
    setSelectedPlan(planId);
    
    const planData = PRICING[planId];
    const roleConfig = ROLE_CONFIGS[selectedRole];
    const mockSubscription = generateMockSubscription(planId);
    
    const userData = {
      id: `dev-user-${planId}-${selectedRole}`,
      email: `dev-${selectedRole}@${planId}.example.com`,
      name: `${roleConfig.label} (${planData.name} Tier)`,
      tenant_id: `tenant-${planId}`,
      role: selectedRole,
      permissions: roleConfig.permissions,
      subscription: mockSubscription,
      plan_id: planId,
      created_at: new Date().toISOString()
    };

    console.log('🎭 Switching to pricing tier:', {
      plan: planId,
      role: selectedRole,
      limits: planData.limits,
      features: planData.features.slice(0, 3),
      userData: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        tenant_id: userData.tenant_id
      }
    });

    simulateLogin(userData);
    switchTenant(`tenant-${planId}`);
    
    // Add a small delay to ensure UI updates
    setTimeout(() => {
      console.log('✅ Dev panel switch complete - current user should be:', {
        expectedRole: selectedRole,
        expectedPlan: planId
      });
    }, 100);
  };

  // Handle role switching
  const handleRoleSwitch = (role: 'admin' | 'user' | 'viewer') => {
    setSelectedRole(role);
    handlePlanSwitch(selectedPlan);
  };

  // Get plan icon
  const getPlanIcon = (planId: PlanId) => {
    const iconMap = {
      free: Star,
      basic: Zap,
      pro: Crown,
      extreme: Rocket,
      enterprise: Building
    };
    return iconMap[planId];
  };

  if (!isDevelopment) return null;

  const currentPlan = PRICING[selectedPlan];
  const PlanIcon = getPlanIcon(selectedPlan);
  const RoleIcon = ROLE_CONFIGS[selectedRole].icon;

  return (
    <div className="fixed top-4 left-4 z-50">
      <div className="bg-background border rounded-lg shadow-lg transition-all duration-200 ease-in-out max-w-xs">
        {/* Header - Always visible */}
        <div 
          className={`flex items-center justify-between p-3 cursor-pointer transition-colors duration-200 hover:bg-muted/50 ${
            isExpanded ? 'rounded-t-lg bg-muted/20' : 'rounded-lg hover:bg-muted/30'
          }`}
          onClick={toggleExpanded}
          title="Click to expand development testing panel"
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                isExpanded ? 'bg-primary' : 'bg-muted-foreground/50'
              }`} />
              <div className="text-xs font-medium text-muted-foreground">Development</div>
            </div>
            <Badge variant="outline" className="text-xs px-2 py-0">Testing</Badge>
          </div>
          <div className={`text-muted-foreground transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : 'rotate-0'
          }`}>
            <ChevronUp className="h-4 w-4" />
          </div>
        </div>
        
        {/* Expandable Content */}
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded 
              ? 'max-h-[400px] opacity-100 transform translate-y-0' 
              : 'max-h-0 opacity-0 transform -translate-y-2'
          }`}
        >
          <div className="px-3 pb-3 border-t space-y-3">
            {/* Current Status */}
            <div className="pt-2">
              <div className="text-xs text-muted-foreground mb-2">Current Test User</div>
              <div className="flex items-center gap-2 text-xs">
                {isAuthenticated ? (
                  <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                    ✓ Authenticated
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">✗ Not Auth</Badge>
                )}
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <PlanIcon className="h-3 w-3" />
                  {currentPlan.name}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  <RoleIcon className="h-3 w-3" />
                  {ROLE_CONFIGS[selectedRole].label}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Pricing Tier Testing */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Test Pricing Tier</div>
              <Select value={selectedPlan} onValueChange={(value: PlanId) => handlePlanSwitch(value)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRICING).map(([planId, plan]) => {
                    const Icon = getPlanIcon(planId as PlanId);
                    return (
                      <SelectItem key={planId} value={planId} className="text-xs">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3 w-3" />
                          <span>{plan.name}</span>
                          <span className="text-gray-500">
                            ({PricingUtils.formatPrice(plan.price.monthly.amount)}/mo)
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* User Role Testing */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Test User Role</div>
              <Select value={selectedRole} onValueChange={(value: 'admin' | 'user' | 'viewer') => handleRoleSwitch(value)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIGS).map(([role, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={role} value={role} className="text-xs">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Usage Information for Testing */}
            {user?.subscription?.usage && (
              <>
                <Separator />
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Plan Usage Limits</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Agents:</span>
                      <span className="font-mono text-blue-600">
                        {user.subscription.usage.agents} / {currentPlan.limits?.agents || '∞'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Storage:</span>
                      <span className="font-mono text-blue-600">{user.subscription.usage.storage_used}</span>
                    </div>
                    {currentPlan.limits?.api_calls && (
                      <div className="flex justify-between">
                        <span>API Calls:</span>
                        <span className="font-mono text-blue-600">
                          {user.subscription.usage.api_calls} / {currentPlan.limits.api_calls}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Quick Testing Info */}
            <div className="bg-muted/30 p-2 rounded text-xs">
              <div className="font-medium text-muted-foreground mb-1">Testing Guide:</div>
              <div className="text-muted-foreground">
                • Switch tiers to test feature access<br/>
                • Change roles to test permissions<br/>
                • Navigate to different pages<br/>
                • Check usage limits & restrictions
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Loading Component for Subdomain Resolution
 */
const SubdomainLoading: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Loading platform...</p>
    </div>
  </div>
);

/**
 * SubdomainRouter Component
 */
export const SubdomainRouter: React.FC<SubdomainRouterProps> = ({
  children,
  fallback
}) => {
  const location = useLocation();
  const {
    subdomain,
    subdomainConfig,
    canAccessCurrentSubdomain,
    isCurrentRouteAllowed,
    getSuggestedRedirect,
    theme
  } = useSubdomain();
  const { isLoading } = usePermissions();

  // Apply subdomain theme to CSS custom properties
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      // Set primary color directly (hex is supported by most CSS frameworks)
      root.style.setProperty('--primary', theme.primaryColor);
      
      // Update page title with subdomain branding
      document.title = `${theme.brandName} - AI Development Platform`;
    }
  }, [theme]);

  // Show loading while permissions are being resolved
  if (isLoading) {
    return fallback || <SubdomainLoading />;
  }

  // Check if current route is allowed on this subdomain
  if (!isCurrentRouteAllowed) {
    // Check if there's a suggested redirect
    const suggestedRedirect = getSuggestedRedirect();
    
    if (suggestedRedirect) {
      // Redirect to suggested subdomain/route
      window.location.href = suggestedRedirect;
      return <SubdomainLoading />;
    }

    // Show route not allowed error
    return (
      <SubdomainAccessDenied
        reason="route_not_allowed"
        subdomainName={subdomainConfig.name}
      />
    );
  }

  // Check if user has access to current subdomain
  if (!canAccessCurrentSubdomain) {
    return (
      <SubdomainAccessDenied
        reason="subdomain_restricted"
        subdomainName={subdomainConfig.name}
        restrictedMessage={subdomainConfig.restrictedMessage}
        suggestedRedirect={subdomainConfig.redirectUnauthenticated}
      />
    );
  }

  // All checks passed - render children with development helper
  return (
    <>
      {children}
      <SubdomainDevelopmentHelper />
    </>
  );
};

/**
 * Higher-Order Component for Subdomain Routing
 */
export const withSubdomainRouting = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const SubdomainWrappedComponent = (props: P) => (
    <SubdomainRouter>
      <Component {...props} />
    </SubdomainRouter>
  );
  
  SubdomainWrappedComponent.displayName = `withSubdomainRouting(${Component.displayName || Component.name})`;
  
  return SubdomainWrappedComponent;
};

// Import the development helper hook for local development
import { useSubdomainDevelopment } from '@/hooks/useSubdomain';

export default SubdomainRouter;