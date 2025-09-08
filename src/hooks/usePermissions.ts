/**
 * usePermissions Hook
 * 
 * Custom React hook for managing user permissions and roles.
 * Integrates with AWS Cognito groups via AuthContext and provides
 * comprehensive permission checking capabilities.
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  UserRole, 
  Permission, 
  PermissionUtils,
  FEATURE_AREAS,
  type FeatureArea 
} from '@/lib/permissions';

export interface UsePermissionsReturn {
  // Core permission data
  role: UserRole;
  permissions: Permission[];
  
  // Authentication status
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Permission checking functions
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  
  // Role checking functions
  isRole: (role: UserRole) => boolean;
  isRoleAtLeast: (requiredRole: UserRole) => boolean;
  
  // Feature area helpers
  canAccessFeatureArea: (featureArea: FeatureArea) => boolean;
  getFeatureAreaPermissions: (featureArea: FeatureArea) => Permission[];
  
  // Utility functions
  getRoleDisplayName: () => string;
  isAnonymous: boolean;
  isBasicUser: boolean;
  isOrgUser: boolean;
  isDevelopmentUser: boolean;
  isTestingUser: boolean;
}

/**
 * Custom hook for managing user permissions throughout the application
 * 
 * @returns Object containing permission checking functions and role information
 */
export const usePermissions = (): UsePermissionsReturn => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Determine user role based on Cognito groups
  const role = useMemo((): UserRole => {
    if (!isAuthenticated || !user) {
      return 'anonymous';
    }
    
    return PermissionUtils.mapCognitoGroupsToRole(user.groups || []);
  }, [isAuthenticated, user]);
  
  // Get all permissions for the current role
  const permissions = useMemo((): Permission[] => {
    return PermissionUtils.getRolePermissions(role);
  }, [role]);
  
  // Core permission checking functions
  const hasPermission = useMemo(() => {
    return (permission: Permission): boolean => {
      return PermissionUtils.hasPermission(role, permission);
    };
  }, [role]);
  
  const hasAnyPermission = useMemo(() => {
    return (permissionList: Permission[]): boolean => {
      return PermissionUtils.hasAnyPermission(role, permissionList);
    };
  }, [role]);
  
  const hasAllPermissions = useMemo(() => {
    return (permissionList: Permission[]): boolean => {
      return PermissionUtils.hasAllPermissions(role, permissionList);
    };
  }, [role]);
  
  // Role checking functions
  const isRole = useMemo(() => {
    return (targetRole: UserRole): boolean => {
      return role === targetRole;
    };
  }, [role]);
  
  const isRoleAtLeast = useMemo(() => {
    return (requiredRole: UserRole): boolean => {
      return PermissionUtils.isRoleAtLeast(role, requiredRole);
    };
  }, [role]);
  
  // Feature area helpers
  const canAccessFeatureArea = useMemo(() => {
    return (featureArea: FeatureArea): boolean => {
      const featurePermissions = FEATURE_AREAS[featureArea].permissions;
      return hasAnyPermission(featurePermissions);
    };
  }, [hasAnyPermission]);
  
  const getFeatureAreaPermissions = useMemo(() => {
    return (featureArea: FeatureArea): Permission[] => {
      return FEATURE_AREAS[featureArea].permissions;
    };
  }, []);
  
  // Utility functions
  const getRoleDisplayName = useMemo(() => {
    return (): string => {
      return PermissionUtils.getRoleDisplayName(role);
    };
  }, [role]);
  
  // Convenience role checks
  const isAnonymous = useMemo(() => role === 'anonymous', [role]);
  const isBasicUser = useMemo(() => role === 'basic', [role]);
  const isOrgUser = useMemo(() => role === 'org', [role]);
  const isDevelopmentUser = useMemo(() => role === 'development', [role]);
  const isTestingUser = useMemo(() => role === 'testing', [role]);
  
  return {
    // Core permission data
    role,
    permissions,
    
    // Authentication status
    isAuthenticated,
    isLoading,
    
    // Permission checking functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Role checking functions
    isRole,
    isRoleAtLeast,
    
    // Feature area helpers
    canAccessFeatureArea,
    getFeatureAreaPermissions,
    
    // Utility functions
    getRoleDisplayName,
    isAnonymous,
    isBasicUser,
    isOrgUser,
    isDevelopmentUser,
    isTestingUser
  };
};

/**
 * Hook for checking a specific permission
 * Useful for components that only need to check one permission
 * 
 * @param permission The permission to check
 * @returns Boolean indicating if the user has the permission
 */
export const useHasPermission = (permission: Permission): boolean => {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
};

/**
 * Hook for checking multiple permissions
 * 
 * @param permissions Array of permissions to check
 * @param requireAll Whether all permissions are required (default: false = any)
 * @returns Boolean indicating if the user meets the permission criteria
 */
export const useHasPermissions = (
  permissions: Permission[], 
  requireAll: boolean = false
): boolean => {
  const { hasAnyPermission, hasAllPermissions } = usePermissions();
  return requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
};

/**
 * Hook for checking if user has access to a feature area
 * 
 * @param featureArea The feature area to check access for
 * @returns Boolean indicating if the user can access the feature area
 */
export const useCanAccessFeature = (featureArea: FeatureArea): boolean => {
  const { canAccessFeatureArea } = usePermissions();
  return canAccessFeatureArea(featureArea);
};

/**
 * Hook for getting role-based styling or conditional content
 * 
 * @returns Object with role-based boolean flags and styling utilities
 */
export const useRoleBasedContent = () => {
  const { 
    role, 
    isAnonymous, 
    isBasicUser, 
    isOrgUser, 
    isDevelopmentUser, 
    isTestingUser,
    getRoleDisplayName 
  } = usePermissions();
  
  // Role-based CSS classes for conditional styling
  const getRoleClass = (prefix: string = 'role'): string => {
    return `${prefix}-${role}`;
  };
  
  // Get appropriate call-to-action based on role
  const getUpgradeMessage = (): string | null => {
    if (isAnonymous) {
      return "Sign up to unlock premium features and start building AI projects!";
    }
    if (isBasicUser) {
      return "Upgrade to Organization membership for advanced tools and team collaboration!";
    }
    return null; // No upgrade needed for org, development, or testing users
  };
  
  return {
    role,
    roleDisplayName: getRoleDisplayName(),
    isAnonymous,
    isBasicUser,
    isOrgUser,
    isDevelopmentUser,
    isTestingUser,
    getRoleClass,
    getUpgradeMessage
  };
};
