/**
 * Enhanced Protected Route Component
 * 
 * Provides comprehensive route protection including:
 * - Basic authentication requirements
 * - Permission-based access control
 * - Role-based access control
 * - Feature area access control
 * - Custom fallback components
 * - Loading states
 * - Redirect capabilities
 */

import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, AlertTriangle, Home, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission, UserRole, FeatureArea } from '@/lib/permissions';

// Base protected route props
interface BaseProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  preserveUrl?: boolean; // Preserve current URL for post-auth redirect
}

// Authentication-only protection
interface AuthProtectedRouteProps extends BaseProtectedRouteProps {
  requireAuth: true;
  requiredPermission?: never;
  requiredRole?: never;
  featureArea?: never;
}

// Permission-based protection
interface PermissionProtectedRouteProps extends BaseProtectedRouteProps {
  requireAuth?: boolean;
  requiredPermission: Permission;
  requiredRole?: never;
  featureArea?: never;
}

// Role-based protection
interface RoleProtectedRouteProps extends BaseProtectedRouteProps {
  requireAuth?: boolean;
  requiredPermission?: never;
  requiredRole: UserRole;
  requireExactRole?: boolean;
  featureArea?: never;
}

// Feature area protection
interface FeatureProtectedRouteProps extends BaseProtectedRouteProps {
  requireAuth?: boolean;
  requiredPermission?: never;
  requiredRole?: never;
  featureArea: FeatureArea;
}

// Combined props type
type ProtectedRouteProps = 
  | AuthProtectedRouteProps 
  | PermissionProtectedRouteProps 
  | RoleProtectedRouteProps 
  | FeatureProtectedRouteProps;

/**
 * Loading Component
 */
const LoadingScreen: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

/**
 * Access Denied Component
 */
interface AccessDeniedProps {
  reason: 'auth' | 'permission' | 'role' | 'feature';
  requiredPermission?: Permission;
  requiredRole?: UserRole;
  featureArea?: FeatureArea;
  redirectTo?: string;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({
  reason,
  requiredPermission,
  requiredRole,
  featureArea,
  redirectTo = '/'
}) => {
  const { isAnonymous, isBasicUser, roleDisplayName } = usePermissions();
  
  const getContent = () => {
    switch (reason) {
      case 'auth':
        return {
          title: 'Authentication Required',
          description: 'Please sign in to access this page.',
          icon: LogIn,
          actions: [
            { text: 'Sign In', href: '/auth/signin', variant: 'default' as const },
            { text: 'Sign Up', href: '/auth/signup', variant: 'outline' as const }
          ]
        };
      
      case 'permission':
        if (isAnonymous) {
          return {
            title: 'Premium Feature',
            description: 'This feature requires an account. Sign up to get started!',
            icon: Lock,
            actions: [
              { text: 'Sign Up', href: '/auth/signup', variant: 'default' as const },
              { text: 'Learn More', href: '/pricing', variant: 'outline' as const }
            ]
          };
        }
        
        if (isBasicUser) {
          return {
            title: 'Organization Feature',
            description: 'This feature is available to Organization members. Upgrade your account for access.',
            icon: Lock,
            actions: [
              { text: 'Upgrade', href: '/pricing', variant: 'default' as const },
              { text: 'Contact Sales', href: '/contact', variant: 'outline' as const }
            ]
          };
        }
        
        return {
          title: 'Access Restricted',
          description: 'You don\'t have permission to access this page.',
          icon: AlertTriangle,
          actions: [
            { text: 'Contact Admin', href: '/support', variant: 'outline' as const }
          ]
        };
      
      case 'role':
        return {
          title: 'Insufficient Role',
          description: `This page requires ${requiredRole} role. Your current role is ${roleDisplayName}.`,
          icon: AlertTriangle,
          actions: [
            { text: 'Contact Admin', href: '/support', variant: 'outline' as const }
          ]
        };
      
      case 'feature':
        if (isAnonymous) {
          return {
            title: 'Feature Locked',
            description: `The ${featureArea} feature requires an account.`,
            icon: Lock,
            actions: [
              { text: 'Sign Up', href: '/auth/signup', variant: 'default' as const }
            ]
          };
        }
        
        return {
          title: 'Feature Unavailable',
          description: `You don't have access to the ${featureArea} feature.`,
          icon: Lock,
          actions: [
            { text: 'Upgrade', href: '/pricing', variant: 'default' as const }
          ]
        };
      
      default:
        return {
          title: 'Access Denied',
          description: 'You don\'t have permission to access this page.',
          icon: AlertTriangle,
          actions: []
        };
    }
  };
  
  const { title, description, icon: Icon, actions } = getContent();
  
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            {actions.map((action, index) => (
              <Button key={index} asChild variant={action.variant} className="w-full">
                <Link to={action.href}>{action.text}</Link>
              </Button>
            ))}
            {actions.length > 0 && (
              <Button asChild variant="ghost" className="w-full">
                <Link to={redirectTo}>
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Enhanced Protected Route Component
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = (props) => {
  const { children, fallback, redirectTo, preserveUrl = true } = props;
  const location = useLocation();
  const {
    isAuthenticated,
    isLoading,
    hasPermission,
    role,
    isRoleAtLeast,
    canAccessFeatureArea
  } = usePermissions();
  
  // Show loading screen while authentication state is being determined
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  // Check authentication requirement
  const requiresAuth = 'requireAuth' in props && props.requireAuth;
  if (requiresAuth && !isAuthenticated) {
    if (redirectTo) {
      const redirectUrl = preserveUrl ? `${redirectTo}?redirect=${encodeURIComponent(location.pathname)}` : redirectTo;
      return <Navigate to={redirectUrl} replace />;
    }
    
    return fallback || <AccessDenied reason="auth" redirectTo={redirectTo} />;
  }
  
  // Check permission requirement
  if ('requiredPermission' in props && props.requiredPermission) {
    if (!hasPermission(props.requiredPermission)) {
      if (redirectTo) {
        return <Navigate to={redirectTo} replace />;
      }
      
      return fallback || (
        <AccessDenied 
          reason="permission" 
          requiredPermission={props.requiredPermission}
          redirectTo={redirectTo}
        />
      );
    }
  }
  
  // Check role requirement
  if ('requiredRole' in props && props.requiredRole) {
    const requireExact = 'requireExactRole' in props && props.requireExactRole;
    const hasRequiredRole = requireExact 
      ? role === props.requiredRole 
      : isRoleAtLeast(props.requiredRole);
      
    if (!hasRequiredRole) {
      if (redirectTo) {
        return <Navigate to={redirectTo} replace />;
      }
      
      return fallback || (
        <AccessDenied 
          reason="role" 
          requiredRole={props.requiredRole}
          redirectTo={redirectTo}
        />
      );
    }
  }
  
  // Check feature area requirement
  if ('featureArea' in props && props.featureArea) {
    if (!canAccessFeatureArea(props.featureArea)) {
      if (redirectTo) {
        return <Navigate to={redirectTo} replace />;
      }
      
      return fallback || (
        <AccessDenied 
          reason="feature" 
          featureArea={props.featureArea}
          redirectTo={redirectTo}
        />
      );
    }
  }
  
  // All checks passed - render children
  return <>{children}</>;
};

/**
 * Development Route Component
 * Restricts access to development/testing users only
 */
interface DevRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const DevRoute: React.FC<DevRouteProps> = ({ children, fallback }) => (
  <ProtectedRoute 
    requiredRole="development"
    fallback={fallback}
  >
    {children}
  </ProtectedRoute>
);

/**
 * Organization Route Component  
 * Restricts access to organization members and above
 */
export const OrgRoute: React.FC<DevRouteProps> = ({ children, fallback }) => (
  <ProtectedRoute 
    requiredRole="org"
    fallback={fallback}
  >
    {children}
  </ProtectedRoute>
);

/**
 * Public Route Component
 * Always renders children (useful for explicit public routes)
 */
export const PublicRoute: React.FC<{ children: ReactNode }> = ({ children }) => (
  <>{children}</>
);

/**
 * Conditional Route Component
 * Renders different content based on authentication status
 */
interface ConditionalRouteProps {
  authenticatedComponent: ReactNode;
  anonymousComponent: ReactNode;
}

export const ConditionalRoute: React.FC<ConditionalRouteProps> = ({
  authenticatedComponent,
  anonymousComponent
}) => {
  const { isAuthenticated } = usePermissions();
  return isAuthenticated ? <>{authenticatedComponent}</> : <>{anonymousComponent}</>;
};

export default ProtectedRoute;
