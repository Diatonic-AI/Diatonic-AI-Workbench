/**
 * Comprehensive Permission System for Diatonic AI
 * 
 * This module defines the complete permission system including:
 * - Internal roles (dev, admin, manager, etc.)
 * - Subscription tiers (free, basic, pro, extreme, enterprise)
 * - Granular permissions for each feature area
 * - Role-to-permission mappings with subscription constraints
 * - Utility functions for permission and subscription checking
 */

// Internal role types (for team members and special access)
export type InternalRole = 
  | 'internal_dev'           // Internal developers
  | 'internal_admin'         // Internal administrators
  | 'internal_manager'       // Internal managers
  | 'internal_anon_test'     // Internal anonymous testing
  | 'internal_basic_user'    // Internal basic user testing
  | 'internal_pro_user'      // Internal pro user testing
  | 'internal_extreme_user'  // Internal extreme user testing
  | 'internal_enterprise_user'; // Internal enterprise user testing

// Subscription tier types (for paying customers)
export type SubscriptionTier = 
  | 'free'        // Free tier - $0/month
  | 'basic'       // Basic tier - $29/month  
  | 'pro'         // Pro tier - $99/month
  | 'extreme'     // Extreme tier - $299/month
  | 'enterprise'; // Enterprise tier - Custom pricing

// Combined user role type
export type UserRole = InternalRole | SubscriptionTier | 'anonymous';

// Subscription limits interface
export interface SubscriptionLimits {
  aiAgentsPerMonth: number | 'unlimited';
  teamMembers: number | 'unlimited';
  cloudStorageGB: number | 'unlimited';
  apiCallsPerDay: number | 'unlimited';
  executionTimeMinutes: number | 'unlimited';
  customTemplates: boolean;
  prioritySupport: boolean;
  dedicatedSupport: boolean;
  onPremisesDeployment: boolean;
  customBranding: boolean;
  slaGuarantees: boolean;
}

// Define comprehensive permissions for all feature areas
export type Permission = 
  // Education Hub permissions
  | 'education.view_courses'
  | 'education.view_premium_courses'
  | 'education.track_progress'
  | 'education.download_materials'
  | 'education.offline_access'
  | 'education.custom_learning_paths'
  | 'education.team_training_programs'
  | 'education.enterprise_training'
  
  // Studio (Toolset) permissions - Agent Builder
  | 'studio.view_templates'
  | 'studio.use_basic_templates'
  | 'studio.use_premium_templates'
  | 'studio.create_agents'
  | 'studio.save_agents'
  | 'studio.export_agents'
  | 'studio.share_agents_public'
  | 'studio.share_agents_private'
  | 'studio.basic_visual_builder'
  | 'studio.advanced_visual_builder'
  | 'studio.professional_builder_suite'
  | 'studio.enterprise_builder_platform'
  | 'studio.debug_mode'
  | 'studio.version_control'
  | 'studio.git_integration'
  | 'studio.enterprise_git_integration'
  | 'studio.custom_integrations'
  | 'studio.advanced_integrations'
  | 'studio.white_label_export'
  | 'studio.custom_branding'
  
  // Team collaboration permissions
  | 'team.collaborate_basic'
  | 'team.collaborate_advanced'
  | 'team.invite_members'
  | 'team.manage_permissions'
  | 'team.unlimited_members'
  
  // Lab (Experimentation) permissions
  | 'lab.run_basic_experiments'
  | 'lab.run_advanced_experiments'
  | 'lab.save_experiments'
  | 'lab.export_results'
  | 'lab.multi_format_export'
  | 'lab.custom_model_training'
  | 'lab.dedicated_model_training'
  | 'lab.basic_execution_time'
  | 'lab.extended_execution_time'
  | 'lab.maximum_execution_time'
  | 'lab.unlimited_execution_time'
  | 'lab.basic_analytics'
  | 'lab.advanced_analytics'
  | 'lab.real_time_analytics'
  | 'lab.enterprise_analytics'
  | 'lab.ab_testing'
  | 'lab.enterprise_testing_suite'
  
  // Community (Nexus) permissions
  | 'community.view_public_content'
  | 'community.create_posts'
  | 'community.join_public_groups'
  | 'community.join_private_groups'
  | 'community.create_groups'
  | 'community.moderate_content'
  | 'community.advanced_moderation'
  
  // Observatory (Analytics) permissions
  | 'observatory.basic_analytics'
  | 'observatory.advanced_insights'
  | 'observatory.real_time_dashboard'
  | 'observatory.enterprise_analytics'
  | 'observatory.custom_dashboards'
  | 'observatory.data_export'
  | 'observatory.advanced_reporting'
  
  // API Access permissions
  | 'api.basic_access'
  | 'api.standard_access'
  | 'api.unlimited_access'
  | 'api.enterprise_access'
  
  // Storage permissions
  | 'storage.basic_quota'
  | 'storage.standard_quota'
  | 'storage.extended_quota'
  | 'storage.unlimited_quota'
  
  // Support permissions
  | 'support.community'
  | 'support.email'
  | 'support.priority'
  | 'support.dedicated_team'
  | 'support.sla_guarantees'
  
  // Security permissions
  | 'security.basic_features'
  | 'security.advanced_features'
  | 'security.enterprise_compliance'
  | 'security.custom_policies'
  
  // General access permissions
  | 'dashboard.access'
  | 'profile.manage'
  | 'profile.billing'
  
  // Internal admin permissions
  | 'internal.content_management'
  | 'internal.user_management'
  | 'internal.system_administration'
  | 'internal.billing_management'
  | 'internal.analytics_full_access'
  | 'internal.debug_all_users'
  | 'internal.impersonate_users'
  | 'internal.feature_flags'
  | 'internal.system_monitoring'
  | 'internal.database_access';

// Subscription limits for each tier
export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    aiAgentsPerMonth: 3,
    teamMembers: 1,
    cloudStorageGB: 1,
    apiCallsPerDay: 0,
    executionTimeMinutes: 30,
    customTemplates: false,
    prioritySupport: false,
    dedicatedSupport: false,
    onPremisesDeployment: false,
    customBranding: false,
    slaGuarantees: false
  },
  basic: {
    aiAgentsPerMonth: 25,
    teamMembers: 1,
    cloudStorageGB: 10,
    apiCallsPerDay: 100,
    executionTimeMinutes: 120,
    customTemplates: false,
    prioritySupport: false,
    dedicatedSupport: false,
    onPremisesDeployment: false,
    customBranding: false,
    slaGuarantees: false
  },
  pro: {
    aiAgentsPerMonth: 100,
    teamMembers: 5,
    cloudStorageGB: 100,
    apiCallsPerDay: 1000,
    executionTimeMinutes: 240,
    customTemplates: true,
    prioritySupport: true,
    dedicatedSupport: false,
    onPremisesDeployment: false,
    customBranding: false,
    slaGuarantees: false
  },
  extreme: {
    aiAgentsPerMonth: 'unlimited',
    teamMembers: 20,
    cloudStorageGB: 500,
    apiCallsPerDay: 'unlimited',
    executionTimeMinutes: 'unlimited',
    customTemplates: true,
    prioritySupport: true,
    dedicatedSupport: false,
    onPremisesDeployment: false,
    customBranding: true,
    slaGuarantees: false
  },
  enterprise: {
    aiAgentsPerMonth: 'unlimited',
    teamMembers: 'unlimited',
    cloudStorageGB: 'unlimited',
    apiCallsPerDay: 'unlimited',
    executionTimeMinutes: 'unlimited',
    customTemplates: true,
    prioritySupport: true,
    dedicatedSupport: true,
    onPremisesDeployment: true,
    customBranding: true,
    slaGuarantees: true
  }
};

// Define permissions for each subscription tier
const FREE_PERMISSIONS: Permission[] = [
  // Basic access
  'dashboard.access',
  'profile.manage',
  
  // Education
  'education.view_courses',
  
  // Studio
  'studio.view_templates',
  'studio.use_basic_templates',
  'studio.create_agents',
  'studio.share_agents_public',
  'studio.basic_visual_builder',
  
  // Community
  'community.view_public_content',
  'community.create_posts',
  'support.community',
  
  // Storage & API
  'storage.basic_quota',
  
  // Security
  'security.basic_features'
];

const BASIC_PERMISSIONS: Permission[] = [
  ...FREE_PERMISSIONS,
  
  // Enhanced Education
  'education.track_progress',
  
  // Enhanced Studio
  'studio.save_agents',
  'studio.share_agents_private',
  'studio.advanced_visual_builder',
  'studio.export_agents',
  
  // Lab
  'lab.run_basic_experiments',
  'lab.save_experiments',
  'lab.basic_execution_time',
  'lab.basic_analytics',
  'lab.export_results',
  
  // Community
  'community.create_posts',
  
  // Team
  'team.collaborate_basic',
  
  // API
  'api.basic_access',
  
  // Storage
  'storage.standard_quota',
  
  // Support
  'support.email',
  
  // Billing
  'profile.billing'
];

const PRO_PERMISSIONS: Permission[] = [
  ...BASIC_PERMISSIONS,
  
  // Enhanced Education
  'education.view_premium_courses',
  'education.download_materials',
  'education.custom_learning_paths',
  
  // Enhanced Studio
  'studio.use_premium_templates',
  'studio.professional_builder_suite',
  'studio.version_control',
  'studio.custom_integrations',
  'studio.debug_mode',
  
  // Enhanced Lab
  'lab.run_advanced_experiments',
  'lab.custom_model_training',
  'lab.extended_execution_time',
  'lab.advanced_analytics',
  'lab.multi_format_export',
  
  // Enhanced Community
  'community.join_public_groups',
  'community.join_private_groups',
  
  // Enhanced Team
  'team.collaborate_advanced',
  'team.invite_members',
  
  // Observatory
  'observatory.basic_analytics',
  'observatory.advanced_insights',
  'observatory.data_export',
  
  // API
  'api.standard_access',
  
  // Storage
  'storage.extended_quota',
  
  // Support
  'support.priority',
  
  // Security
  'security.advanced_features'
];

const EXTREME_PERMISSIONS: Permission[] = [
  ...PRO_PERMISSIONS,
  
  // Enhanced Education
  'education.offline_access',
  'education.team_training_programs',
  
  // Enhanced Studio
  'studio.enterprise_builder_platform',
  'studio.git_integration',
  'studio.advanced_integrations',
  'studio.white_label_export',
  'studio.custom_branding',
  
  // Enhanced Lab
  'lab.dedicated_model_training',
  'lab.maximum_execution_time',
  'lab.real_time_analytics',
  'lab.ab_testing',
  
  // Enhanced Team
  'team.manage_permissions',
  
  // Enhanced Observatory
  'observatory.real_time_dashboard',
  'observatory.custom_dashboards',
  'observatory.advanced_reporting',
  
  // API
  'api.unlimited_access',
  
  // Storage
  'storage.unlimited_quota',
  
  // Support
  'support.dedicated_team',
  
  // Security
  'security.enterprise_compliance'
];

const ENTERPRISE_PERMISSIONS: Permission[] = [
  ...EXTREME_PERMISSIONS,
  
  // Enterprise Education
  'education.enterprise_training',
  
  // Enterprise Studio
  'studio.enterprise_git_integration',
  
  // Enterprise Lab
  'lab.unlimited_execution_time',
  'lab.enterprise_analytics',
  'lab.enterprise_testing_suite',
  
  // Enterprise Team
  'team.unlimited_members',
  
  // Enterprise Observatory
  'observatory.enterprise_analytics',
  
  // Enterprise API
  'api.enterprise_access',
  
  // Enterprise Support
  'support.sla_guarantees',
  
  // Enterprise Security
  'security.custom_policies'
];

// Internal role permissions (all get extensive access)
const INTERNAL_BASE_PERMISSIONS: Permission[] = [
  ...ENTERPRISE_PERMISSIONS,
  
  // Internal admin permissions
  'internal.content_management',
  'internal.user_management',
  'internal.system_administration',
  'internal.billing_management',
  'internal.analytics_full_access',
  'internal.feature_flags',
  'internal.system_monitoring'
];

const INTERNAL_ADVANCED_PERMISSIONS: Permission[] = [
  ...INTERNAL_BASE_PERMISSIONS,
  
  // Advanced internal permissions
  'internal.debug_all_users',
  'internal.impersonate_users',
  'internal.database_access'
];

// Comprehensive role-based permission mappings
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Anonymous users
  anonymous: [],
  
  // Subscription tiers
  free: FREE_PERMISSIONS,
  basic: BASIC_PERMISSIONS,
  pro: PRO_PERMISSIONS,
  extreme: EXTREME_PERMISSIONS,
  enterprise: ENTERPRISE_PERMISSIONS,
  
  // Internal roles
  internal_anon_test: [], // Same as anonymous for testing
  internal_basic_user: BASIC_PERMISSIONS, // Same as basic subscription
  internal_pro_user: PRO_PERMISSIONS, // Same as pro subscription
  internal_extreme_user: EXTREME_PERMISSIONS, // Same as extreme subscription
  internal_enterprise_user: ENTERPRISE_PERMISSIONS, // Same as enterprise subscription
  internal_dev: INTERNAL_ADVANCED_PERMISSIONS, // Full developer access
  internal_admin: INTERNAL_ADVANCED_PERMISSIONS, // Full admin access
  internal_manager: INTERNAL_BASE_PERMISSIONS // Management access without debug/impersonation
};

// Role hierarchy for permission inheritance checks
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  anonymous: 0,
  internal_anon_test: 0,
  free: 1,
  internal_basic_user: 2,
  basic: 2,
  internal_pro_user: 3,
  pro: 3,
  internal_extreme_user: 4,
  extreme: 4,
  internal_enterprise_user: 5,
  enterprise: 5,
  internal_manager: 8,
  internal_dev: 9,
  internal_admin: 10
};

// AWS Cognito group to role mapping (updated for new roles)
export const COGNITO_GROUP_TO_ROLE: Record<string, UserRole> = {
  // Internal roles
  'InternalDev': 'internal_dev',
  'InternalAdmin': 'internal_admin',
  'InternalManager': 'internal_manager',
  'InternalAnonTest': 'internal_anon_test',
  'InternalBasicUser': 'internal_basic_user',
  'InternalProUser': 'internal_pro_user',
  'InternalExtremeUser': 'internal_extreme_user',
  'InternalEnterpriseUser': 'internal_enterprise_user',
  
  // Subscription tiers
  'FreeTier': 'free',
  'BasicTier': 'basic',
  'ProTier': 'pro',
  'ExtremeTier': 'extreme',
  'EnterpriseTier': 'enterprise',
  
  // Legacy mappings (for backwards compatibility)
  'Testing': 'internal_dev',
  'Development': 'internal_dev',
  'OrgUsers': 'pro',
  'BasicUsers': 'basic'
};

// Utility functions for permission and subscription checking
export const PermissionUtils = {
  /**
   * Check if a role has a specific permission
   */
  hasPermission: (role: UserRole, permission: Permission): boolean => {
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
  },

  /**
   * Check if a role has any of the given permissions
   */
  hasAnyPermission: (role: UserRole, permissions: Permission[]): boolean => {
    return permissions.some(permission => 
      PermissionUtils.hasPermission(role, permission)
    );
  },

  /**
   * Check if a role has all of the given permissions
   */
  hasAllPermissions: (role: UserRole, permissions: Permission[]): boolean => {
    return permissions.every(permission => 
      PermissionUtils.hasPermission(role, permission)
    );
  },

  /**
   * Get all permissions for a role
   */
  getRolePermissions: (role: UserRole): Permission[] => {
    return ROLE_PERMISSIONS[role] || [];
  },

  /**
   * Get subscription limits for a role
   */
  getSubscriptionLimits: (role: UserRole): SubscriptionLimits | null => {
    // Check if this is a subscription tier
    if (role in SUBSCRIPTION_LIMITS) {
      return SUBSCRIPTION_LIMITS[role as SubscriptionTier];
    }
    // Internal roles get enterprise limits
    if (role.startsWith('internal_')) {
      return SUBSCRIPTION_LIMITS.enterprise;
    }
    return null;
  },

  /**
   * Check if role is internal (team member)
   */
  isInternalRole: (role: UserRole): boolean => {
    return role.startsWith('internal_');
  },

  /**
   * Check if role is subscription tier
   */
  isSubscriptionRole: (role: UserRole): role is SubscriptionTier => {
    return ['free', 'basic', 'pro', 'extreme', 'enterprise'].includes(role as SubscriptionTier);
  },

  /**
   * Map Cognito groups to user role
   */
  mapCognitoGroupsToRole: (groups: string[]): UserRole => {
    // Check groups in priority order (highest hierarchy first)
    const sortedGroups = groups.sort((a, b) => {
      const roleA = COGNITO_GROUP_TO_ROLE[a];
      const roleB = COGNITO_GROUP_TO_ROLE[b];
      if (!roleA) return 1;
      if (!roleB) return -1;
      return ROLE_HIERARCHY[roleB] - ROLE_HIERARCHY[roleA];
    });

    for (const group of sortedGroups) {
      if (COGNITO_GROUP_TO_ROLE[group]) {
        return COGNITO_GROUP_TO_ROLE[group];
      }
    }

    return 'free'; // Default for authenticated users with no specific groups
  },

  /**
   * Check if a role is at least a certain level
   */
  isRoleAtLeast: (currentRole: UserRole, requiredRole: UserRole): boolean => {
    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
  },

  /**
   * Get user-friendly role name
   */
  getRoleDisplayName: (role: UserRole): string => {
    const displayNames: Record<UserRole, string> = {
      anonymous: 'Visitor',
      free: 'Free User',
      basic: 'Basic User',
      pro: 'Pro User',
      extreme: 'Extreme User',
      enterprise: 'Enterprise User',
      internal_dev: 'Internal Developer',
      internal_admin: 'Internal Administrator',
      internal_manager: 'Internal Manager',
      internal_anon_test: 'Internal Test (Anonymous)',
      internal_basic_user: 'Internal Test (Basic)',
      internal_pro_user: 'Internal Test (Pro)',
      internal_extreme_user: 'Internal Test (Extreme)',
      internal_enterprise_user: 'Internal Test (Enterprise)'
    };
    return displayNames[role] || role;
  },

  /**
   * Get role color for UI display
   */
  getRoleColor: (role: UserRole): string => {
    const colors: Record<UserRole, string> = {
      anonymous: 'text-gray-500',
      free: 'text-green-500',
      basic: 'text-blue-500',
      pro: 'text-purple-500',
      extreme: 'text-orange-500',
      enterprise: 'text-red-500',
      internal_dev: 'text-cyan-500',
      internal_admin: 'text-pink-500',
      internal_manager: 'text-indigo-500',
      internal_anon_test: 'text-gray-400',
      internal_basic_user: 'text-blue-400',
      internal_pro_user: 'text-purple-400',
      internal_extreme_user: 'text-orange-400',
      internal_enterprise_user: 'text-red-400'
    };
    return colors[role] || 'text-gray-500';
  },

  /**
   * Check if user can create more AI agents
   */
  canCreateMoreAgents: (role: UserRole, currentCount: number): boolean => {
    const limits = PermissionUtils.getSubscriptionLimits(role);
    if (!limits) return false;
    if (limits.aiAgentsPerMonth === 'unlimited') return true;
    return currentCount < (limits.aiAgentsPerMonth as number);
  },

  /**
   * Get remaining AI agent quota
   */
  getRemainingAgentQuota: (role: UserRole, currentCount: number): number | 'unlimited' => {
    const limits = PermissionUtils.getSubscriptionLimits(role);
    if (!limits) return 0;
    if (limits.aiAgentsPerMonth === 'unlimited') return 'unlimited';
    return Math.max(0, (limits.aiAgentsPerMonth as number) - currentCount);
  }
};

// Feature area groupings for UI organization
export const FEATURE_AREAS = {
  EDUCATION: {
    name: 'Education Hub',
    description: 'AI learning courses and training programs',
    permissions: [
      'education.view_courses',
      'education.view_premium_courses',
      'education.track_progress',
      'education.download_materials',
      'education.offline_access',
      'education.custom_learning_paths',
      'education.team_training_programs',
      'education.enterprise_training'
    ] as Permission[]
  },
  STUDIO: {
    name: 'AI Studio (Toolset)',
    description: 'Visual AI agent builder and templates',
    permissions: [
      'studio.view_templates',
      'studio.use_basic_templates',
      'studio.use_premium_templates',
      'studio.create_agents',
      'studio.save_agents',
      'studio.export_agents',
      'studio.share_agents_public',
      'studio.share_agents_private',
      'studio.basic_visual_builder',
      'studio.advanced_visual_builder',
      'studio.professional_builder_suite',
      'studio.enterprise_builder_platform',
      'studio.debug_mode',
      'studio.version_control',
      'studio.git_integration',
      'studio.enterprise_git_integration',
      'studio.custom_integrations',
      'studio.advanced_integrations',
      'studio.white_label_export',
      'studio.custom_branding'
    ] as Permission[]
  },
  LAB: {
    name: 'AI Laboratory',
    description: 'AI experimentation and model training',
    permissions: [
      'lab.run_basic_experiments',
      'lab.run_advanced_experiments',
      'lab.save_experiments',
      'lab.export_results',
      'lab.multi_format_export',
      'lab.custom_model_training',
      'lab.dedicated_model_training',
      'lab.basic_execution_time',
      'lab.extended_execution_time',
      'lab.maximum_execution_time',
      'lab.unlimited_execution_time',
      'lab.basic_analytics',
      'lab.advanced_analytics',
      'lab.real_time_analytics',
      'lab.enterprise_analytics',
      'lab.ab_testing',
      'lab.enterprise_testing_suite'
    ] as Permission[]
  },
  COMMUNITY: {
    name: 'Community Hub',
    description: 'Collaboration and knowledge sharing',
    permissions: [
      'community.view_public_content',
      'community.create_posts',
      'community.join_public_groups',
      'community.join_private_groups',
      'community.create_groups',
      'community.moderate_content',
      'community.advanced_moderation'
    ] as Permission[]
  },
  OBSERVATORY: {
    name: 'Analytics Observatory',
    description: 'Data analytics and insights dashboard',
    permissions: [
      'observatory.basic_analytics',
      'observatory.advanced_insights',
      'observatory.real_time_dashboard',
      'observatory.enterprise_analytics',
      'observatory.custom_dashboards',
      'observatory.data_export',
      'observatory.advanced_reporting'
    ] as Permission[]
  },
  TEAM: {
    name: 'Team Collaboration',
    description: 'Team management and collaboration tools',
    permissions: [
      'team.collaborate_basic',
      'team.collaborate_advanced',
      'team.invite_members',
      'team.manage_permissions',
      'team.unlimited_members'
    ] as Permission[]
  },
  SUPPORT: {
    name: 'Support & Billing',
    description: 'Customer support and account management',
    permissions: [
      'support.community',
      'support.email',
      'support.priority',
      'support.dedicated_team',
      'support.sla_guarantees',
      'profile.billing'
    ] as Permission[]
  },
  INTERNAL: {
    name: 'Internal Administration',
    description: 'Internal tools and administration (team only)',
    permissions: [
      'internal.content_management',
      'internal.user_management',
      'internal.system_administration',
      'internal.billing_management',
      'internal.analytics_full_access',
      'internal.debug_all_users',
      'internal.impersonate_users',
      'internal.feature_flags',
      'internal.system_monitoring',
      'internal.database_access'
    ] as Permission[]
  }
} as const;

// Export types for use in other modules
export type FeatureArea = keyof typeof FEATURE_AREAS;

// Subscription pricing information
export const SUBSCRIPTION_PRICING = {
  free: { price: 0, currency: 'USD', period: 'month' },
  basic: { price: 29, currency: 'USD', period: 'month' },
  pro: { price: 99, currency: 'USD', period: 'month' },
  extreme: { price: 299, currency: 'USD', period: 'month' },
  enterprise: { price: 'custom', currency: 'USD', period: 'month' }
} as const;

// Validation functions
export const ValidationUtils = {
  /**
   * Validate if a string is a valid permission
   */
  isValidPermission: (permission: string): permission is Permission => {
    const allPermissions: Permission[] = Object.values(ROLE_PERMISSIONS).flat();
    return allPermissions.includes(permission as Permission);
  },

  /**
   * Validate if a string is a valid role
   */
  isValidRole: (role: string): role is UserRole => {
    return Object.keys(ROLE_HIERARCHY).includes(role);
  },

  /**
   * Validate if a string is a valid internal role
   */
  isValidInternalRole: (role: string): role is InternalRole => {
    const internalRoles: InternalRole[] = [
      'internal_dev',
      'internal_admin', 
      'internal_manager',
      'internal_anon_test',
      'internal_basic_user',
      'internal_pro_user',
      'internal_extreme_user',
      'internal_enterprise_user'
    ];
    return internalRoles.includes(role as InternalRole);
  },

  /**
   * Validate if a string is a valid subscription tier
   */
  isValidSubscriptionTier: (tier: string): tier is SubscriptionTier => {
    const subscriptionTiers: SubscriptionTier[] = ['free', 'basic', 'pro', 'extreme', 'enterprise'];
    return subscriptionTiers.includes(tier as SubscriptionTier);
  },

  /**
   * Get all permissions across all roles
   */
  getAllPermissions: (): Permission[] => {
    const allPermissions = new Set<Permission>();
    Object.values(ROLE_PERMISSIONS).forEach(permissions => {
      permissions.forEach(permission => allPermissions.add(permission));
    });
    return Array.from(allPermissions).sort();
  },

  /**
   * Get permissions by feature area
   */
  getPermissionsByFeatureArea: (area: FeatureArea): Permission[] => {
    return FEATURE_AREAS[area].permissions;
  },

  /**
   * Check if a permission belongs to a specific feature area
   */
  getFeatureAreaForPermission: (permission: Permission): FeatureArea | null => {
    for (const [area, config] of Object.entries(FEATURE_AREAS)) {
      if (config.permissions.includes(permission)) {
        return area as FeatureArea;
      }
    }
    return null;
  }
};

// Export additional utility types
export type SubscriptionPricing = typeof SUBSCRIPTION_PRICING;
export type RoleDisplayInfo = {
  name: string;
  color: string;
  hierarchy: number;
  limits?: SubscriptionLimits;
};

// Helper to get complete role information
export const getRoleInfo = (role: UserRole): RoleDisplayInfo => {
  return {
    name: PermissionUtils.getRoleDisplayName(role),
    color: PermissionUtils.getRoleColor(role),
    hierarchy: ROLE_HIERARCHY[role],
    limits: PermissionUtils.getSubscriptionLimits(role) || undefined
  };
};

// Export constants for easy access
export const ROLES = {
  ANONYMOUS: 'anonymous' as const,
  // Subscription tiers
  FREE: 'free' as const,
  BASIC: 'basic' as const,
  PRO: 'pro' as const,
  EXTREME: 'extreme' as const,
  ENTERPRISE: 'enterprise' as const,
  // Internal roles
  INTERNAL_DEV: 'internal_dev' as const,
  INTERNAL_ADMIN: 'internal_admin' as const,
  INTERNAL_MANAGER: 'internal_manager' as const,
  INTERNAL_ANON_TEST: 'internal_anon_test' as const,
  INTERNAL_BASIC_USER: 'internal_basic_user' as const,
  INTERNAL_PRO_USER: 'internal_pro_user' as const,
  INTERNAL_EXTREME_USER: 'internal_extreme_user' as const,
  INTERNAL_ENTERPRISE_USER: 'internal_enterprise_user' as const
} as const;

// Export permission constants for common operations
export const PERMISSIONS = {
  // Core access
  DASHBOARD_ACCESS: 'dashboard.access' as const,
  PROFILE_MANAGE: 'profile.manage' as const,
  PROFILE_BILLING: 'profile.billing' as const,
  
  // Studio permissions for toolset access
  STUDIO_CREATE_AGENTS: 'studio.create_agents' as const,
  STUDIO_SAVE_AGENTS: 'studio.save_agents' as const,
  STUDIO_BASIC_BUILDER: 'studio.basic_visual_builder' as const,
  STUDIO_ADVANCED_BUILDER: 'studio.advanced_visual_builder' as const,
  STUDIO_PRO_BUILDER: 'studio.professional_builder_suite' as const,
  
  // Lab permissions for experimentation
  LAB_RUN_BASIC: 'lab.run_basic_experiments' as const,
  LAB_RUN_ADVANCED: 'lab.run_advanced_experiments' as const,
  LAB_CUSTOM_TRAINING: 'lab.custom_model_training' as const,
  
  // Observatory permissions for analytics
  OBSERVATORY_BASIC_ANALYTICS: 'observatory.basic_analytics' as const,
  OBSERVATORY_ADVANCED_INSIGHTS: 'observatory.advanced_insights' as const,
  
  // Community permissions
  COMMUNITY_VIEW: 'community.view_public_content' as const,
  COMMUNITY_CREATE_POSTS: 'community.create_posts' as const,
  
  // Internal admin permissions
  INTERNAL_USER_MANAGEMENT: 'internal.user_management' as const,
  INTERNAL_SYSTEM_ADMIN: 'internal.system_administration' as const,
  INTERNAL_DEBUG_USERS: 'internal.debug_all_users' as const
} as const;
