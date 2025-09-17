/**
 * Subdomain-Based Platform Configuration for Diatonic.ai
 * 
 * This module defines the routing and access control for each subdomain:
 * - app.diatonic.ai: Premium AI tools (Toolset, Lab, Observatory) - Requires payment
 * - edu.diatonic.ai: Education platform - Free access
 * - fam.diatonic.ai: Community platform - Free access
 * - diatonic.ai: Main landing page with all features
 */

import { Permission, UserRole, PERMISSIONS, PermissionUtils } from './permissions';
import { PlanId } from './pricing';

// Subdomain identifiers
export type SubdomainId = 'main' | 'app' | 'edu' | 'fam';

// Subdomain configuration interface
export interface SubdomainConfig {
  id: SubdomainId;
  domain: string;
  name: string;
  description: string;
  primaryColor: string;
  logoPath: string;
  allowedRoutes: string[];
  requiredPermissions: Permission[];
  minimumRole?: UserRole;
  features: string[];
  accessType: 'free' | 'paid' | 'mixed';
  defaultRoute: string;
  redirectUnauthenticated?: string;
  restrictedMessage?: string;
}

// Subdomain configurations
export const SUBDOMAIN_CONFIGS: Record<SubdomainId, SubdomainConfig> = {
  main: {
    id: 'main',
    domain: 'diatonic.ai',
    name: 'Diatonic AI Platform',
    description: 'Complete AI development ecosystem',
    primaryColor: '#6366f1', // Indigo
    logoPath: '/logo-main.svg',
    allowedRoutes: ['*'], // All routes allowed on main domain
    requiredPermissions: [],
    features: [
      'Complete platform access',
      'All AI tools and services',
      'Education hub',
      'Community features',
      'Premium tools (with subscription)',
      'Analytics and insights'
    ],
    accessType: 'mixed',
    defaultRoute: '/',
    redirectUnauthenticated: '/auth/signin'
  },

  app: {
    id: 'app',
    domain: 'app.diatonic.ai',
    name: 'AI Application Suite',
    description: 'Premium AI tools for professionals',
    primaryColor: '#8b5cf6', // Purple
    logoPath: '/logo-app.svg',
    allowedRoutes: [
      '/dashboard',
      '/toolset',
      '/toolset/*',
      '/lab',
      '/lab/*',
      '/observatory',
      '/observatory/*',
      '/auth/*',
      '/pricing',
      '/support',
      '/documentation',
      '/api-reference'
    ],
    requiredPermissions: [
      PERMISSIONS.STUDIO_CREATE_AGENTS,
      PERMISSIONS.LAB_RUN_BASIC,
      'observatory.basic_analytics'
    ],
    minimumRole: 'basic',
    features: [
      'AI Agent Builder (Toolset)',
      'AI Laboratory experiments',
      'Analytics Observatory',
      'Advanced debugging tools',
      'Team collaboration',
      'API access',
      'Premium support'
    ],
    accessType: 'paid',
    defaultRoute: '/dashboard',
    redirectUnauthenticated: '/auth/signin?redirect=dashboard',
    restrictedMessage: 'Premium AI tools require a subscription. Upgrade to access the full suite of professional AI development tools.'
  },

  edu: {
    id: 'edu',
    domain: 'edu.diatonic.ai',
    name: 'AI Education Hub',
    description: 'Learn AI development and automation',
    primaryColor: '#10b981', // Green
    logoPath: '/logo-edu.svg',
    allowedRoutes: [
      '/',
      '/education',
      '/education/*',
      '/tutorials',
      '/tutorials/*',
      '/documentation',
      '/documentation/*',
      '/auth/*',
      '/support',
      '/community',
      '/about'
    ],
    requiredPermissions: [
      'education.view_courses'
    ],
    features: [
      'Free AI courses and tutorials',
      'Interactive learning modules',
      'Progress tracking',
      'Community discussions',
      'Practice projects',
      'Certification paths',
      'Beginner to advanced content'
    ],
    accessType: 'free',
    defaultRoute: '/education'
  },

  fam: {
    id: 'fam',
    domain: 'fam.diatonic.ai',
    name: 'AI Community',
    description: 'Connect with the AI development community',
    primaryColor: '#f59e0b', // Amber
    logoPath: '/logo-fam.svg',
    allowedRoutes: [
      '/',
      '/community',
      '/community/*',
      '/education',
      '/tutorials',
      '/documentation',
      '/auth/*',
      '/support',
      '/about',
      '/contact'
    ],
    requiredPermissions: [
      PERMISSIONS.COMMUNITY_VIEW
    ],
    features: [
      'Community forums and discussions',
      'Project sharing and collaboration',
      'AI news and updates',
      'Expert Q&A sessions',
      'User-generated content',
      'Networking opportunities',
      'Community challenges and contests'
    ],
    accessType: 'free',
    defaultRoute: '/community'
  }
};

// Route mapping for subdomain restrictions
export const ROUTE_SUBDOMAIN_MAP: Record<string, SubdomainId[]> = {
  '/': ['main', 'edu', 'fam'],
  '/dashboard': ['main', 'app'],
  '/toolset': ['main', 'app'],
  '/lab': ['main', 'app'],
  '/observatory': ['main', 'app'],
  '/education': ['main', 'edu', 'fam'],
  '/community': ['main', 'fam', 'edu'],
  '/pricing': ['main', 'app'],
  '/auth/signin': ['main', 'app', 'edu', 'fam'],
  '/auth/signup': ['main', 'app', 'edu', 'fam'],
  '/documentation': ['main', 'app', 'edu', 'fam'],
  '/tutorials': ['main', 'edu', 'fam'],
  '/support': ['main', 'app', 'edu', 'fam'],
  '/about': ['main', 'edu', 'fam'],
  '/contact': ['main', 'edu', 'fam']
};

// Access control rules for each subdomain
export interface SubdomainAccessRule {
  subdomain: SubdomainId;
  route: string;
  allowAnonymous: boolean;
  requiredRole?: UserRole;
  requiredPermissions?: Permission[];
  redirectOnDenied?: string;
}

export const SUBDOMAIN_ACCESS_RULES: SubdomainAccessRule[] = [
  // App subdomain - premium features
  {
    subdomain: 'app',
    route: '/dashboard',
    allowAnonymous: false,
    requiredRole: 'basic',
    redirectOnDenied: '/pricing'
  },
  {
    subdomain: 'app',
    route: '/toolset',
    allowAnonymous: false,
    requiredPermissions: [PERMISSIONS.STUDIO_CREATE_AGENTS],
    redirectOnDenied: '/pricing'
  },
  {
    subdomain: 'app',
    route: '/lab',
    allowAnonymous: false,
    requiredPermissions: [PERMISSIONS.LAB_RUN_BASIC],
    redirectOnDenied: '/pricing'
  },
  {
    subdomain: 'app',
    route: '/observatory',
    allowAnonymous: false,
    requiredPermissions: ['observatory.basic_analytics'],
    redirectOnDenied: '/pricing'
  },

  // Education subdomain - free access
  {
    subdomain: 'edu',
    route: '/education',
    allowAnonymous: true
  },
  {
    subdomain: 'edu',
    route: '/tutorials',
    allowAnonymous: true
  },

  // Community subdomain - free access
  {
    subdomain: 'fam',
    route: '/community',
    allowAnonymous: true
  }
];

// Utility class for subdomain management
export class SubdomainUtils {
  /**
   * Extract subdomain from hostname
   */
  static getSubdomainFromHostname(hostname: string): SubdomainId {
    // Handle localhost and development environments
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      const subdomain = new URLSearchParams(window.location.search).get('subdomain');
      return (subdomain as SubdomainId) || 'main';
    }

    // Extract subdomain from hostname
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      return this.isValidSubdomain(subdomain) ? subdomain as SubdomainId : 'main';
    }

    return 'main';
  }

  /**
   * Get current subdomain configuration
   */
  static getCurrentSubdomain(): SubdomainConfig {
    const hostname = window.location.hostname;
    const subdomainId = this.getSubdomainFromHostname(hostname);
    return SUBDOMAIN_CONFIGS[subdomainId];
  }

  /**
   * Check if subdomain is valid
   */
  static isValidSubdomain(subdomain: string): boolean {
    return Object.keys(SUBDOMAIN_CONFIGS).includes(subdomain);
  }

  /**
   * Check if route is allowed on current subdomain
   */
  static isRouteAllowedOnSubdomain(route: string, subdomain: SubdomainId): boolean {
    const config = SUBDOMAIN_CONFIGS[subdomain];
    
    // If allowedRoutes includes '*', all routes are allowed
    if (config.allowedRoutes.includes('*')) {
      return true;
    }

    // Check exact matches and wildcard matches
    return config.allowedRoutes.some(allowedRoute => {
      if (allowedRoute.endsWith('/*')) {
        const basePath = allowedRoute.slice(0, -2);
        return route.startsWith(basePath);
      }
      return route === allowedRoute;
    });
  }

  /**
   * Check if user has access to subdomain
   */
  static canAccessSubdomain(subdomain: SubdomainId, userRole: UserRole): boolean {
    const config = SUBDOMAIN_CONFIGS[subdomain];

    // Free access subdomains
    if (config.accessType === 'free') {
      return true;
    }

    // Mixed access (main domain)
    if (config.accessType === 'mixed') {
      return true;
    }

    // Paid access - check minimum role and permissions
    if (config.minimumRole && !PermissionUtils.isRoleAtLeast(userRole, config.minimumRole)) {
      return false;
    }

    // Check required permissions
    if (config.requiredPermissions.length > 0) {
      return config.requiredPermissions.some(permission => 
        PermissionUtils.hasPermission(userRole, permission)
      );
    }

    return true;
  }

  /**
   * Check if user can access specific route on subdomain
   */
  static canAccessRoute(route: string, subdomain: SubdomainId, userRole: UserRole): boolean {
    // First check if route is allowed on subdomain
    if (!this.isRouteAllowedOnSubdomain(route, subdomain)) {
      return false;
    }

    // Check subdomain access rules
    const accessRule = SUBDOMAIN_ACCESS_RULES.find(rule => 
      rule.subdomain === subdomain && 
      (rule.route === route || route.startsWith(rule.route))
    );

    if (!accessRule) {
      // No specific rule - check general subdomain access
      return this.canAccessSubdomain(subdomain, userRole);
    }

    // Anonymous access allowed
    if (accessRule.allowAnonymous && userRole === 'anonymous') {
      return true;
    }

    // Check required role
    if (accessRule.requiredRole && !PermissionUtils.isRoleAtLeast(userRole, accessRule.requiredRole)) {
      return false;
    }

    // Check required permissions
    if (accessRule.requiredPermissions) {
      return accessRule.requiredPermissions.some(permission =>
        PermissionUtils.hasPermission(userRole, permission)
      );
    }

    return true;
  }

  /**
   * Get redirect URL for denied access
   */
  static getAccessDeniedRedirect(route: string, subdomain: SubdomainId): string {
    const accessRule = SUBDOMAIN_ACCESS_RULES.find(rule => 
      rule.subdomain === subdomain && rule.route === route
    );

    if (accessRule?.redirectOnDenied) {
      return accessRule.redirectOnDenied;
    }

    // Default redirects based on subdomain
    switch (subdomain) {
      case 'app':
        return '/pricing';
      case 'edu':
      case 'fam':
        return '/auth/signin';
      default:
        return '/';
    }
  }

  /**
   * Generate subdomain URL
   */
  static generateSubdomainUrl(subdomain: SubdomainId, path: string = ''): string {
    const config = SUBDOMAIN_CONFIGS[subdomain];
    
    // Handle localhost development
    if (window.location.hostname.includes('localhost')) {
      return `${window.location.origin}${path}?subdomain=${subdomain}`;
    }

    return `https://${config.domain}${path}`;
  }

  /**
   * Get appropriate CTA for subdomain and user role
   */
  static getSubdomainCTA(subdomain: SubdomainId, userRole: UserRole): {
    text: string;
    href: string;
    variant: 'default' | 'outline' | 'secondary';
  } {
    const config = SUBDOMAIN_CONFIGS[subdomain];

    if (this.canAccessSubdomain(subdomain, userRole)) {
      return {
        text: `Go to ${config.name}`,
        href: this.generateSubdomainUrl(subdomain, config.defaultRoute),
        variant: 'default'
      };
    }

    // Access denied - show upgrade CTA
    if (config.accessType === 'paid') {
      return {
        text: 'Upgrade to Access',
        href: '/pricing',
        variant: 'default'
      };
    }

    return {
      text: 'Sign Up',
      href: '/auth/signup',
      variant: 'outline'
    };
  }

  /**
   * Get test users configuration for subdomain testing
   */
  static getTestUsersForSubdomain(subdomain: SubdomainId): Array<{
    email: string;
    role: UserRole;
    description: string;
  }> {
    const testUsers = [
      {
        email: 'test.anonymous@diatonic.ai',
        role: 'anonymous' as UserRole,
        description: 'Anonymous user (not signed in)'
      },
      {
        email: 'test.free@diatonic.ai',
        role: 'free' as UserRole,
        description: 'Free tier user'
      },
      {
        email: 'test.basic@diatonic.ai',
        role: 'basic' as UserRole,
        description: 'Basic subscription user'
      },
      {
        email: 'test.pro@diatonic.ai',
        role: 'pro' as UserRole,
        description: 'Pro subscription user'
      },
      {
        email: 'test.extreme@diatonic.ai',
        role: 'extreme' as UserRole,
        description: 'Extreme subscription user'
      },
      {
        email: 'test.enterprise@diatonic.ai',
        role: 'enterprise' as UserRole,
        description: 'Enterprise subscription user'
      },
      {
        email: 'test.internal@diatonic.ai',
        role: 'internal_dev' as UserRole,
        description: 'Internal developer (full access)'
      }
    ];

    // Filter users relevant to this subdomain
    return testUsers.filter(user => 
      this.canAccessSubdomain(subdomain, user.role)
    );
  }

  /**
   * Get subdomain theme configuration
   */
  static getSubdomainTheme(subdomain: SubdomainId): {
    primaryColor: string;
    logoPath: string;
    brandName: string;
  } {
    const config = SUBDOMAIN_CONFIGS[subdomain];
    return {
      primaryColor: config.primaryColor,
      logoPath: config.logoPath,
      brandName: config.name
    };
  }

  /**
   * Check if current user should be redirected to appropriate subdomain
   */
  static getSuggestedSubdomainRedirect(
    currentSubdomain: SubdomainId,
    userRole: UserRole,
    intendedFeature?: 'toolset' | 'lab' | 'observatory' | 'education' | 'community'
  ): string | null {
    // If user is trying to access premium features but not on app subdomain
    if (intendedFeature && ['toolset', 'lab', 'observatory'].includes(intendedFeature)) {
      if (currentSubdomain !== 'app' && this.canAccessSubdomain('app', userRole)) {
        return this.generateSubdomainUrl('app', `/${intendedFeature}`);
      }
    }

    // If user is on app subdomain but doesn't have access
    if (currentSubdomain === 'app' && !this.canAccessSubdomain('app', userRole)) {
      // Redirect to education or pricing
      if (userRole === 'anonymous') {
        return this.generateSubdomainUrl('edu', '/');
      }
      return this.generateSubdomainUrl('main', '/pricing');
    }

    return null;
  }
}

// Export constants for easy access
export const SUBDOMAIN_KEYS = {
  MAIN: 'main' as const,
  APP: 'app' as const,
  EDU: 'edu' as const,
  FAM: 'fam' as const
} as const;

// Export array of subdomain IDs
export const SUBDOMAINS: SubdomainId[] = ['main', 'app', 'edu', 'fam'];

// Create a simplified SubdomainUtils instance for compatibility
const subdomainUtilsInstance = {
  getSubdomainFromHostname: (hostname: string): SubdomainId => {
    try {
      if (typeof window !== 'undefined') {
        const searchParam = new URLSearchParams(window.location.search).get('subdomain');
        if (searchParam && SUBDOMAINS.includes(searchParam as SubdomainId)) {
          return searchParam as SubdomainId;
        }
      }
    } catch {
      // Ignore errors and default to 'main'
    }
    return 'main';
  },

  canAccessSubdomain: (subdomain: SubdomainId, role: import('./permissions').UserRole): boolean => {
    // Simplified: allow access universally when routing is simplified
    return true;
  },

  canAccessRoute: (route: string, subdomain: SubdomainId, role: import('./permissions').UserRole): boolean => {
    // Simplified: allow all routes when subdomain routing is disabled
    return true;
  },

  generateSubdomainUrl: (targetSubdomain: SubdomainId, path: string = ''): string => {
    if (typeof window === 'undefined') return path || '/';
    const base = window.location.origin;
    return `${base}${path || '/'}`;
  },

  getAccessDeniedRedirect: (route: string, subdomain: SubdomainId): string => {
    return '/pricing';
  },

  getSuggestedSubdomainRedirect: (
    current: SubdomainId,
    role: import('./permissions').UserRole,
    intendedFeature?: 'toolset' | 'lab' | 'observatory' | 'education' | 'community'
  ): string | null => {
    return null;
  },

  getSubdomainTheme: (subdomain: SubdomainId) => {
    const config = SUBDOMAIN_CONFIGS[subdomain] || SUBDOMAIN_CONFIGS.main;
    return {
      primaryColor: config.primaryColor,
      logoPath: config.logoPath,
      brandName: config.name
    };
  },

  getTestUsersForSubdomain: (subdomain: SubdomainId) => {
    return [
      { email: 'viewer@example.com', role: 'free' as const, description: 'Default viewer' },
      { email: 'user@example.com', role: 'basic' as const, description: 'Basic user' },
      { email: 'pro@example.com', role: 'pro' as const, description: 'Pro user' }
    ];
  },

  getSubdomainCTA: (targetSubdomain: SubdomainId, role: import('./permissions').UserRole) => {
    return { 
      text: 'Open', 
      href: '/', 
      variant: 'outline' as const 
    };
  },

  // Methods that were missing from the class but referenced in the useSubdomain hook
  isRouteAllowedOnSubdomain: (route: string, subdomain: SubdomainId): boolean => {
    const config = SUBDOMAIN_CONFIGS[subdomain];
    if (config.allowedRoutes.includes('*')) {
      return true;
    }
    return config.allowedRoutes.some(allowedRoute => {
      if (allowedRoute.endsWith('/*')) {
        const basePath = allowedRoute.slice(0, -2);
        return route.startsWith(basePath);
      }
      return route === allowedRoute;
    });
  },

  isValidSubdomain: (subdomain: string): boolean => {
    return Object.keys(SUBDOMAIN_CONFIGS).includes(subdomain);
  },

  getCurrentSubdomain: (): SubdomainConfig => {
    if (typeof window === 'undefined') return SUBDOMAIN_CONFIGS.main;
    const hostname = window.location.hostname;
    const subdomainId = subdomainUtilsInstance.getSubdomainFromHostname(hostname);
    return SUBDOMAIN_CONFIGS[subdomainId];
  }
};

// Export as default for compatibility
export default subdomainUtilsInstance;
