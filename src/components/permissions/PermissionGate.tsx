/**
 * Permission Gate Components
 * 
 * React components for conditionally rendering content based on user permissions.
 * These components integrate with the permission system to show/hide content,
 * display fallbacks, and provide upgrade prompts.
 */

import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, UserPlus, Crown, ArrowRight, Info } from 'lucide-react';
import { 
  usePermissions, 
  useHasPermission, 
  useHasPermissions, 
  useCanAccessFeature,
  useRoleBasedContent 
} from '@/hooks/usePermissions';
import { Permission, FeatureArea, UserRole } from '@/lib/permissions';

// Base permission gate props
interface BasePermissionGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  upgradePromptVariant?: 'card' | 'alert' | 'inline';
}

// Single permission gate props
interface SinglePermissionGateProps extends BasePermissionGateProps {
  permission: Permission;
}

// Multi permission gate props
interface MultiPermissionGateProps extends BasePermissionGateProps {
  permissions: Permission[];
  requireAll?: boolean;
}

// Role-based gate props
interface RoleGateProps extends BasePermissionGateProps {
  role: UserRole;
  requireExact?: boolean; // If true, must be exact role; if false, role or higher
}

// Feature area gate props
interface FeatureGateProps extends BasePermissionGateProps {
  featureArea: FeatureArea;
}

/**
 * Single Permission Gate Component
 * Shows children only if user has the specified permission
 */
export const PermissionGate: React.FC<SinglePermissionGateProps> = ({
  permission,
  children,
  fallback = null,
  showUpgradePrompt = false,
  upgradePromptVariant = 'card'
}) => {
  const hasPermission = useHasPermission(permission);
  
  if (hasPermission) {
    return <>{children}</>;
  }
  
  if (showUpgradePrompt) {
    return <UpgradePrompt variant={upgradePromptVariant} permission={permission} />;
  }
  
  return <>{fallback}</>;
};

/**
 * Multi Permission Gate Component
 * Shows children if user has any/all of the specified permissions
 */
export const MultiPermissionGate: React.FC<MultiPermissionGateProps> = ({
  permissions,
  requireAll = false,
  children,
  fallback = null,
  showUpgradePrompt = false,
  upgradePromptVariant = 'card'
}) => {
  const hasPermissions = useHasPermissions(permissions, requireAll);
  
  if (hasPermissions) {
    return <>{children}</>;
  }
  
  if (showUpgradePrompt) {
    return <UpgradePrompt variant={upgradePromptVariant} permissions={permissions} />;
  }
  
  return <>{fallback}</>;
};

/**
 * Role-Based Gate Component
 * Shows children only if user has the specified role (or higher)
 */
export const RoleGate: React.FC<RoleGateProps> = ({
  role,
  requireExact = false,
  children,
  fallback = null,
  showUpgradePrompt = false,
  upgradePromptVariant = 'card'
}) => {
  const { role: userRole, isRoleAtLeast } = usePermissions();
  
  const hasAccess = requireExact ? userRole === role : isRoleAtLeast(role);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (showUpgradePrompt) {
    return <UpgradePrompt variant={upgradePromptVariant} requiredRole={role} />;
  }
  
  return <>{fallback}</>;
};

/**
 * Feature Area Gate Component
 * Shows children only if user can access the feature area
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  featureArea,
  children,
  fallback = null,
  showUpgradePrompt = false,
  upgradePromptVariant = 'card'
}) => {
  const canAccess = useCanAccessFeature(featureArea);
  
  if (canAccess) {
    return <>{children}</>;
  }
  
  if (showUpgradePrompt) {
    return <UpgradePrompt variant={upgradePromptVariant} featureArea={featureArea} />;
  }
  
  return <>{fallback}</>;
};

/**
 * Authentication Gate Component
 * Shows children only if user is authenticated
 */
export const AuthGate: React.FC<BasePermissionGateProps> = ({
  children,
  fallback = null,
  showUpgradePrompt = false,
  upgradePromptVariant = 'card'
}) => {
  const { isAuthenticated } = usePermissions();
  
  if (isAuthenticated) {
    return <>{children}</>;
  }
  
  if (showUpgradePrompt) {
    return <UpgradePrompt variant={upgradePromptVariant} requiresAuth={true} />;
  }
  
  return <>{fallback}</>;
};

// Upgrade prompt component props
interface UpgradePromptProps {
  variant: 'card' | 'alert' | 'inline';
  permission?: Permission;
  permissions?: Permission[];
  requiredRole?: UserRole;
  featureArea?: FeatureArea;
  requiresAuth?: boolean;
}

/**
 * Upgrade Prompt Component
 * Shows appropriate upgrade message based on user role and required permissions
 */
const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  variant,
  permission,
  permissions,
  requiredRole,
  featureArea,
  requiresAuth = false
}) => {
  const { isAnonymous, isBasicUser, getUpgradeMessage } = useRoleBasedContent();
  
  // Generate appropriate message and action
  const getPromptContent = () => {
    if (requiresAuth && isAnonymous) {
      return {
        title: "Sign In Required",
        message: "Please sign in to access this feature.",
        action: { text: "Sign In", href: "/auth/signin", icon: UserPlus }
      };
    }
    
    if (isAnonymous) {
      return {
        title: "Premium Feature",
        message: "Sign up to unlock this feature and start building AI projects!",
        action: { text: "Sign Up", href: "/auth/signup", icon: UserPlus }
      };
    }
    
    if (isBasicUser) {
      return {
        title: "Organization Feature",
        message: "Upgrade to Organization membership for access to advanced tools and team collaboration!",
        action: { text: "Learn More", href: "/pricing", icon: Crown }
      };
    }
    
    return {
      title: "Access Restricted",
      message: "This feature requires additional permissions.",
      action: { text: "Contact Admin", href: "/support", icon: Info }
    };
  };
  
  const { title, message, action } = getPromptContent();
  
  if (variant === 'card') {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex justify-center">
            <Button asChild variant="default" className="min-w-32">
              <Link to={action.href}>
                <action.icon className="mr-2 h-4 w-4" />
                {action.text}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (variant === 'alert') {
    return (
      <Alert className="border-dashed">
        <Lock className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{message}</span>
          <Button asChild variant="outline" size="sm">
            <Link to={action.href}>
              <action.icon className="mr-2 h-4 w-4" />
              {action.text}
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  
  // Inline variant
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-sm">
      <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <Button asChild variant="ghost" size="sm">
        <Link to={action.href}>
          {action.text}
          <ArrowRight className="ml-2 h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
};

/**
 * Conditional Render Component
 * Utility component for simple conditional rendering based on permissions
 */
interface ConditionalRenderProps {
  condition: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  condition,
  children,
  fallback = null
}) => {
  return condition ? <>{children}</> : <>{fallback}</>;
};

/**
 * Permission Debug Component
 * Development tool for debugging permission issues (only shows in development)
 */
export const PermissionDebug: React.FC = () => {
  const { role, permissions, isDevelopmentUser, isTestingUser } = usePermissions();
  
  if (!isDevelopmentUser && !isTestingUser) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 max-w-sm p-3 bg-background border rounded-lg shadow-lg text-xs">
      <div className="font-semibold mb-2">Permission Debug</div>
      <div>Role: {role}</div>
      <div>Permissions: {permissions.length}</div>
      <details className="mt-2">
        <summary className="cursor-pointer hover:text-primary">View All</summary>
        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
          {permissions.map(permission => (
            <div key={permission} className="text-xs text-muted-foreground">
              {permission}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};

// Export all components
export default PermissionGate;
