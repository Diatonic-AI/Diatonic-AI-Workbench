/**
 * useSubdomain Hook
 * 
 * Custom React hook for managing subdomain-based routing and access control.
 * Integrates with the permission system to provide subdomain-aware functionality.
 */

import { useMemo, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { usePermissions } from './usePermissions';
import SubdomainUtils, { 
  SubdomainId, 
  SubdomainConfig, 
  SUBDOMAIN_CONFIGS,
  SUBDOMAINS 
} from '@/lib/subdomain-config';

export interface UseSubdomainReturn {
  // Current subdomain information
  subdomain: SubdomainId;
  subdomainConfig: SubdomainConfig;
  
  // Access control
  canAccessCurrentSubdomain: boolean;
  canAccessRoute: (route: string) => boolean;
  
  // Navigation helpers
  getSubdomainUrl: (targetSubdomain: SubdomainId, path?: string) => string;
  getAccessDeniedRedirect: (route: string) => string;
  getSuggestedRedirect: (intendedFeature?: 'toolset' | 'lab' | 'observatory' | 'education' | 'community') => string | null;
  
  // Theme and branding
  theme: {
    primaryColor: string;
    logoPath: string;
    brandName: string;
  };
  
  // CTA helpers
  getSubdomainCTA: (targetSubdomain: SubdomainId) => {
    text: string;
    href: string;
    variant: 'default' | 'outline' | 'secondary';
  };
  
  // Test users for current subdomain
  testUsers: Array<{
    email: string;
    role: import('@/lib/permissions').UserRole;
    description: string;
  }>;
  
  // Route validation
  isCurrentRouteAllowed: boolean;
  restrictedMessage?: string;
}

/**
 * Custom hook for subdomain-based functionality
 */
export const useSubdomain = (): UseSubdomainReturn => {
  const location = useLocation();
  const { role } = usePermissions();
  const [hostname, setHostname] = useState('');

  // Update hostname on client-side (to handle SSR)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHostname(window.location.hostname);
    }
  }, []);

  // Get current subdomain configuration
  const subdomain = useMemo((): SubdomainId => {
    if (!hostname) return 'main';
    return SubdomainUtils.getSubdomainFromHostname(hostname);
  }, [hostname]);

  const subdomainConfig = useMemo((): SubdomainConfig => {
    return SUBDOMAIN_CONFIGS[subdomain];
  }, [subdomain]);

  // Check if user can access current subdomain
  const canAccessCurrentSubdomain = useMemo((): boolean => {
    return SubdomainUtils.canAccessSubdomain(subdomain, role);
  }, [subdomain, role]);

  // Check if current route is allowed on current subdomain
  const isCurrentRouteAllowed = useMemo((): boolean => {
    return SubdomainUtils.canAccessRoute(location.pathname, subdomain, role);
  }, [location.pathname, subdomain, role]);

  // Get theme configuration for current subdomain
  const theme = useMemo(() => {
    return SubdomainUtils.getSubdomainTheme(subdomain);
  }, [subdomain]);

  // Get test users for current subdomain
  const testUsers = useMemo(() => {
    return SubdomainUtils.getTestUsersForSubdomain(subdomain);
  }, [subdomain]);

  // Create helper functions
  const canAccessRoute = useMemo(() => {
    return (route: string): boolean => {
      return SubdomainUtils.canAccessRoute(route, subdomain, role);
    };
  }, [subdomain, role]);

  const getSubdomainUrl = useMemo(() => {
    return (targetSubdomain: SubdomainId, path: string = ''): string => {
      return SubdomainUtils.generateSubdomainUrl(targetSubdomain, path);
    };
  }, []);

  const getAccessDeniedRedirect = useMemo(() => {
    return (route: string): string => {
      return SubdomainUtils.getAccessDeniedRedirect(route, subdomain);
    };
  }, [subdomain]);

  const getSuggestedRedirect = useMemo(() => {
    return (intendedFeature?: 'toolset' | 'lab' | 'observatory' | 'education' | 'community'): string | null => {
      return SubdomainUtils.getSuggestedSubdomainRedirect(subdomain, role, intendedFeature);
    };
  }, [subdomain, role]);

  const getSubdomainCTA = useMemo(() => {
    return (targetSubdomain: SubdomainId) => {
      return SubdomainUtils.getSubdomainCTA(targetSubdomain, role);
    };
  }, [role]);

  return {
    // Current subdomain information
    subdomain,
    subdomainConfig,
    
    // Access control
    canAccessCurrentSubdomain,
    canAccessRoute,
    
    // Navigation helpers
    getSubdomainUrl,
    getAccessDeniedRedirect,
    getSuggestedRedirect,
    
    // Theme and branding
    theme,
    
    // CTA helpers
    getSubdomainCTA,
    
    // Test users
    testUsers,
    
    // Route validation
    isCurrentRouteAllowed,
    restrictedMessage: subdomainConfig.restrictedMessage
  };
};

/**
 * Hook for checking access to a specific subdomain
 */
export const useSubdomainAccess = (targetSubdomain: SubdomainId) => {
  const { role } = usePermissions();
  
  const canAccess = useMemo(() => {
    return SubdomainUtils.canAccessSubdomain(targetSubdomain, role);
  }, [targetSubdomain, role]);

  const config = useMemo(() => {
    return SUBDOMAIN_CONFIGS[targetSubdomain];
  }, [targetSubdomain]);

  const cta = useMemo(() => {
    return SubdomainUtils.getSubdomainCTA(targetSubdomain, role);
  }, [targetSubdomain, role]);

  return {
    canAccess,
    config,
    cta,
    url: SubdomainUtils.generateSubdomainUrl(targetSubdomain)
  };
};

/**
 * Hook for getting all subdomain information
 */
export const useAllSubdomains = () => {
  const { role } = usePermissions();

  const subdomains = useMemo(() => {
    return Object.values(SUBDOMAINS).map(subdomainId => {
      const config = SUBDOMAIN_CONFIGS[subdomainId];
      const canAccess = SubdomainUtils.canAccessSubdomain(subdomainId, role);
      const cta = SubdomainUtils.getSubdomainCTA(subdomainId, role);
      const url = SubdomainUtils.generateSubdomainUrl(subdomainId);

      return {
        id: subdomainId,
        config,
        canAccess,
        cta,
        url,
        testUsers: SubdomainUtils.getTestUsersForSubdomain(subdomainId)
      };
    });
  }, [role]);

  return {
    subdomains,
    accessibleSubdomains: subdomains.filter(s => s.canAccess),
    restrictedSubdomains: subdomains.filter(s => !s.canAccess)
  };
};

/**
 * Hook for development/testing purposes
 */
export const useSubdomainDevelopment = () => {
  const [isDevelopment] = useState(() => {
    return process.env.NODE_ENV === 'development' || 
           window.location.hostname.includes('localhost');
  });

  const switchSubdomain = useMemo(() => {
    return (targetSubdomain: SubdomainId) => {
      if (isDevelopment) {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('subdomain', targetSubdomain);
        window.location.href = currentUrl.toString();
      } else {
        // In production, redirect to actual subdomain
        const config = SUBDOMAIN_CONFIGS[targetSubdomain];
        window.location.href = `https://${config.domain}${window.location.pathname}`;
      }
    };
  }, [isDevelopment]);

  const getAllSubdomainUrls = useMemo(() => {
    return () => {
      return Object.entries(SUBDOMAIN_CONFIGS).map(([id, config]) => ({
        id: id as SubdomainId,
        name: config.name,
        url: isDevelopment 
          ? `${window.location.origin}?subdomain=${id}`
          : `https://${config.domain}`
      }));
    };
  }, [isDevelopment]);

  return {
    isDevelopment,
    switchSubdomain,
    getAllSubdomainUrls
  };
};

export default useSubdomain;