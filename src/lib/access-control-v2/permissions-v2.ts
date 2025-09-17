/**
 * Enhanced Permissions v2 with Tenant Support
 * 
 * This module extends the existing permissions system to support:
 * - Tenant-scoped permissions
 * - Subscription-based feature gating
 * - Enhanced role-based access control (RBAC)
 * - Attribute-based access control (ABAC)
 * - Quota and usage enforcement
 */

import { 
  Permission, 
  UserRole, 
  SubscriptionTier, 
  SubscriptionLimits, 
  SUBSCRIPTION_LIMITS,
  FeatureArea,
  FEATURE_AREAS,
  PermissionUtils
} from '../permissions';

import {
  TenantRole,
  TenantAccountType,
  TenantMembershipContext,
  UserTenantContext,
  TenantSubscription,
  TenantUsage,
  getTenantRolePermissions,
  getInternalRolePermissions
} from './tenancy';

// ==============================================================================
// EXTENDED PERMISSION TYPES
// ==============================================================================

/**
 * Extended permissions for tenant-scoped operations
 */
export type TenantScopedPermission = 
  // Tenant administration
  | 'tenant.admin_console'
  | 'tenant.settings.manage'
  | 'tenant.delete'
  | 'tenant.view'
  
  // Billing permissions
  | 'billing.manage'
  | 'billing.view'
  | 'billing.export'
  
  // Organization/Member management
  | 'org.manage_members'
  | 'org.invite_members'
  | 'org.remove_members'
  | 'org.view_members'
  
  // Data permissions (tenant-scoped)
  | 'data.read'
  | 'data.write'
  | 'data.export'
  | 'data.delete'
  
  // Support mode permissions
  | 'support.impersonate'
  | 'support.audit_view'
  | 'support.elevated_access';

/**
 * Combined permission type
 */
export type ExtendedPermission = Permission | TenantScopedPermission;

// ==============================================================================
// SUBSCRIPTION TO PERMISSION MAPPING
// ==============================================================================

/**
 * Feature to minimum subscription tier mapping
 * This determines what subscription level is required for each permission
 */
export const FEATURE_TO_TIER_MAP: Record<string, SubscriptionTier> = {
  // Education permissions
  'education.view_courses': 'free',
  'education.view_premium_courses': 'basic',
  'education.track_progress': 'basic',
  'education.download_materials': 'pro',
  'education.offline_access': 'extreme',
  'education.custom_learning_paths': 'pro',
  'education.team_training_programs': 'extreme',
  'education.enterprise_training': 'enterprise',

  // Studio permissions
  'studio.view_templates': 'free',
  'studio.use_basic_templates': 'free',
  'studio.use_premium_templates': 'pro',
  'studio.create_agents': 'free', // Limited by quota
  'studio.save_agents': 'basic',
  'studio.export_agents': 'basic',
  'studio.share_agents_public': 'free',
  'studio.share_agents_private': 'basic',
  'studio.basic_visual_builder': 'free',
  'studio.advanced_visual_builder': 'basic',
  'studio.professional_builder_suite': 'pro',
  'studio.enterprise_builder_platform': 'extreme',
  'studio.debug_mode': 'pro',
  'studio.version_control': 'pro',
  'studio.git_integration': 'pro',
  'studio.enterprise_git_integration': 'enterprise',
  'studio.custom_integrations': 'pro',
  'studio.advanced_integrations': 'extreme',
  'studio.white_label_export': 'extreme',
  'studio.custom_branding': 'extreme',

  // Team collaboration
  'team.collaborate_basic': 'basic',
  'team.collaborate_advanced': 'pro',
  'team.invite_members': 'pro',
  'team.manage_permissions': 'extreme',
  'team.unlimited_members': 'enterprise',

  // Lab permissions
  'lab.run_basic_experiments': 'basic',
  'lab.run_advanced_experiments': 'pro',
  'lab.save_experiments': 'basic',
  'lab.export_results': 'basic',
  'lab.multi_format_export': 'pro',
  'lab.custom_model_training': 'pro',
  'lab.dedicated_model_training': 'extreme',
  'lab.basic_execution_time': 'basic',
  'lab.extended_execution_time': 'pro',
  'lab.maximum_execution_time': 'extreme',
  'lab.unlimited_execution_time': 'enterprise',
  'lab.basic_analytics': 'basic',
  'lab.advanced_analytics': 'pro',
  'lab.real_time_analytics': 'extreme',
  'lab.enterprise_analytics': 'enterprise',
  'lab.ab_testing': 'extreme',
  'lab.enterprise_testing_suite': 'enterprise',

  // Community permissions
  'community.view_public_content': 'free',
  'community.create_posts': 'free',
  'community.join_public_groups': 'pro',
  'community.join_private_groups': 'pro',
  'community.create_groups': 'pro',
  'community.moderate_content': 'extreme',
  'community.advanced_moderation': 'enterprise',

  // Observatory permissions
  'observatory.basic_analytics': 'basic',
  'observatory.advanced_insights': 'pro',
  'observatory.real_time_dashboard': 'extreme',
  'observatory.enterprise_analytics': 'enterprise',
  'observatory.custom_dashboards': 'extreme',
  'observatory.data_export': 'pro',
  'observatory.advanced_reporting': 'extreme',

  // API Access
  'api.basic_access': 'basic',
  'api.standard_access': 'pro',
  'api.unlimited_access': 'extreme',
  'api.enterprise_access': 'enterprise',

  // Storage
  'storage.basic_quota': 'free',
  'storage.standard_quota': 'basic',
  'storage.extended_quota': 'pro',
  'storage.unlimited_quota': 'extreme',

  // Support
  'support.community': 'free',
  'support.email': 'basic',
  'support.priority': 'pro',
  'support.dedicated_team': 'extreme',
  'support.sla_guarantees': 'enterprise',

  // Security
  'security.basic_features': 'free',
  'security.advanced_features': 'pro',
  'security.enterprise_compliance': 'enterprise',
  'security.custom_policies': 'enterprise',

  // Tenant-scoped permissions
  'tenant.admin_console': 'free', // Available to tenant admins at all tiers
  'tenant.settings.manage': 'free',
  'tenant.delete': 'free',
  'tenant.view': 'free',
  'billing.manage': 'free',
  'billing.view': 'free',
  'billing.export': 'basic',
  'org.manage_members': 'basic', // Requires team features
  'org.invite_members': 'basic',
  'org.remove_members': 'basic',
  'org.view_members': 'free',
  'data.read': 'free',
  'data.write': 'free',
  'data.export': 'basic',
  'data.delete': 'pro', // More dangerous operations require higher tiers
};

// ==============================================================================
// ACCESS CONTROL INTERFACES
// ==============================================================================

/**
 * Access request context
 */
export interface AccessRequest {
  /** User making the request */
  userId: string;
  
  /** Tenant scope for the request */
  tenantId: string;
  
  /** Permission being requested */
  permission: ExtendedPermission;
  
  /** Optional resource context */
  resource?: {
    type: string;
    id?: string;
    tenantId?: string;
    tags?: Record<string, string>;
  };
  
  /** Request metadata */
  context?: {
    ip?: string;
    userAgent?: string;
    sessionId?: string;
  };
}

/**
 * Access decision result
 */
export interface AccessDecision {
  /** Whether access is allowed */
  allowed: boolean;
  
  /** Reason for the decision */
  reason: string;
  
  /** If denied due to subscription, the minimum required tier */
  minimumTier?: SubscriptionTier;
  
  /** If denied due to quota, the quota type and current usage */
  quotaInfo?: {
    type: string;
    used: number;
    limit: number | 'unlimited';
  };
  
  /** Suggested upgrade path if access is denied */
  upgradePath?: {
    /** URL to manage billing/subscription */
    billingUrl?: string;
    /** Recommended tier */
    recommendedTier?: SubscriptionTier;
    /** Expected benefits */
    benefits?: string[];
  };
  
  /** Additional context */
  metadata?: Record<string, any>;
}

/**
 * Quota check result
 */
export interface QuotaCheckResult {
  /** Whether the quota allows the operation */
  allowed: boolean;
  
  /** Current usage */
  used: number;
  
  /** Current limit */
  limit: number | 'unlimited';
  
  /** Remaining quota */
  remaining: number | 'unlimited';
  
  /** Quota type */
  type: string;
}

// ==============================================================================
// UTILITY FUNCTIONS
// ==============================================================================

/**
 * Get minimum required subscription tier for a permission
 */
export function getRequiredTierForPermission(permission: string): SubscriptionTier | null {
  return FEATURE_TO_TIER_MAP[permission] || null;
}

/**
 * Check if a subscription tier meets the requirement for a permission
 */
export function tierMeetsRequirement(
  userTier: SubscriptionTier, 
  permission: string
): boolean {
  const requiredTier = getRequiredTierForPermission(permission);
  if (!requiredTier) return true; // No tier requirement
  
  const tierLevels: Record<SubscriptionTier, number> = {
    free: 0,
    basic: 1,
    pro: 2,
    extreme: 3,
    enterprise: 4,
  };
  
  return tierLevels[userTier] >= tierLevels[requiredTier];
}

/**
 * Get effective permissions for a user in a tenant context
 */
export function getEffectivePermissions(
  membership: TenantMembershipContext,
  internalRole?: UserRole
): string[] {
  const permissions = new Set<string>();
  
  // Add tenant role permissions
  const tenantPermissions = getTenantRolePermissions(membership.membership.tenantRole);
  tenantPermissions.forEach(p => permissions.add(p));
  
  // Add custom member permissions
  if (membership.membership.customPermissions) {
    membership.membership.customPermissions.forEach(p => permissions.add(p));
  }
  
  // Add internal role permissions (if applicable)
  if (internalRole && internalRole.startsWith('internal_')) {
    const internalPermissions = getInternalRolePermissions(internalRole);
    internalPermissions.forEach(p => permissions.add(p));
  }
  
  // Filter permissions based on subscription tier
  const subscription = membership.subscription;
  if (subscription) {
    const filteredPermissions = Array.from(permissions).filter(permission => 
      tierMeetsRequirement(subscription.tier, permission)
    );
    return filteredPermissions;
  }
  
  // If no subscription, only allow free tier permissions
  return Array.from(permissions).filter(permission => 
    tierMeetsRequirement('free', permission)
  );
}

/**
 * Check if user has a specific permission in a tenant
 */
export function hasPermissionInTenant(
  membership: TenantMembershipContext,
  permission: ExtendedPermission,
  internalRole?: UserRole
): boolean {
  const effectivePermissions = getEffectivePermissions(membership, internalRole);
  return effectivePermissions.includes(permission);
}

/**
 * Get usage quota status for a tenant
 */
export function getQuotaStatus(
  subscription: TenantSubscription,
  usage: TenantUsage,
  quotaType: keyof SubscriptionLimits
): QuotaCheckResult {
  const limits = SUBSCRIPTION_LIMITS[subscription.tier];
  const limit = limits[quotaType];
  
  let used: number;
  let type: string;
  
  switch (quotaType) {
    case 'aiAgentsPerMonth':
      used = usage.aiAgentsCreated;
      type = 'aiAgents';
      break;
    case 'apiCallsPerDay':
      used = usage.apiCalls;
      type = 'apiCalls';
      break;
    case 'executionTimeMinutes':
      used = usage.executionMinutes;
      type = 'executionTime';
      break;
    case 'cloudStorageGB':
      used = usage.storageGB;
      type = 'storage';
      break;
    case 'teamMembers':
      used = usage.activeMembers;
      type = 'teamMembers';
      break;
    default:
      return {
        allowed: true,
        used: 0,
        limit: 'unlimited',
        remaining: 'unlimited',
        type: quotaType as string,
      };
  }
  
  if (limit === 'unlimited') {
    return {
      allowed: true,
      used,
      limit: 'unlimited',
      remaining: 'unlimited',
      type,
    };
  }
  
  const numericLimit = limit as number;
  const remaining = Math.max(0, numericLimit - used);
  
  return {
    allowed: used < numericLimit,
    used,
    limit: numericLimit,
    remaining,
    type,
  };
}

/**
 * Get feature availability for a tenant
 */
export function getFeatureAvailability(
  subscription: TenantSubscription,
  permission: ExtendedPermission
): {
  available: boolean;
  requiredTier?: SubscriptionTier;
  upgradeMessage?: string;
} {
  const requiredTier = getRequiredTierForPermission(permission);
  
  if (!requiredTier) {
    return { available: true };
  }
  
  const available = tierMeetsRequirement(subscription.tier, permission);
  
  if (available) {
    return { available: true };
  }
  
  const tierNames = {
    free: 'Free',
    basic: 'Basic ($29/month)',
    pro: 'Pro ($99/month)',
    extreme: 'Extreme ($299/month)',
    enterprise: 'Enterprise (Custom)',
  };
  
  return {
    available: false,
    requiredTier,
    upgradeMessage: `This feature requires ${tierNames[requiredTier]} plan or higher.`,
  };
}

/**
 * Generate upgrade recommendations
 */
export function getUpgradeRecommendations(
  currentTier: SubscriptionTier,
  deniedPermissions: string[]
): {
  recommendedTier: SubscriptionTier;
  benefits: string[];
  estimatedCost?: number;
} {
  // Find the minimum tier that would grant all denied permissions
  const requiredTiers = deniedPermissions
    .map(p => getRequiredTierForPermission(p))
    .filter(Boolean) as SubscriptionTier[];
  
  if (requiredTiers.length === 0) {
    return {
      recommendedTier: currentTier,
      benefits: [],
    };
  }
  
  const tierLevels: Record<SubscriptionTier, number> = {
    free: 0,
    basic: 1,
    pro: 2,
    extreme: 3,
    enterprise: 4,
  };
  
  const maxRequiredLevel = Math.max(...requiredTiers.map(t => tierLevels[t]));
  const recommendedTier = Object.keys(tierLevels).find(
    tier => tierLevels[tier as SubscriptionTier] === maxRequiredLevel
  ) as SubscriptionTier;
  
  // Get benefits for the recommended tier
  const benefits: string[] = [];
  const recommendedLimits = SUBSCRIPTION_LIMITS[recommendedTier];
  
  if (recommendedLimits.aiAgentsPerMonth === 'unlimited') {
    benefits.push('Unlimited AI agent creation');
  } else if (typeof recommendedLimits.aiAgentsPerMonth === 'number') {
    benefits.push(`${recommendedLimits.aiAgentsPerMonth} AI agents per month`);
  }
  
  if (recommendedLimits.customTemplates) {
    benefits.push('Custom templates and branding');
  }
  
  if (recommendedLimits.prioritySupport) {
    benefits.push('Priority customer support');
  }
  
  if (recommendedLimits.dedicatedSupport) {
    benefits.push('Dedicated support team');
  }
  
  // Estimate cost difference
  const pricing = {
    free: 0,
    basic: 29,
    pro: 99,
    extreme: 299,
    enterprise: undefined, // Custom pricing
  };
  
  const currentCost = pricing[currentTier];
  const newCost = pricing[recommendedTier];
  const estimatedCost = currentCost !== undefined && newCost !== undefined 
    ? newCost - currentCost 
    : undefined;
  
  return {
    recommendedTier,
    benefits,
    estimatedCost,
  };
}

/**
 * Validate resource access (ABAC)
 */
export function validateResourceAccess(
  request: AccessRequest,
  membership: TenantMembershipContext
): { allowed: boolean; reason?: string } {
  const { resource } = request;
  
  if (!resource) {
    return { allowed: true };
  }
  
  // Ensure resource belongs to the requested tenant
  if (resource.tenantId && resource.tenantId !== request.tenantId) {
    return {
      allowed: false,
      reason: 'Resource does not belong to the requested tenant',
    };
  }
  
  // Check resource-specific security tags
  if (resource.tags) {
    const securityLevel = resource.tags['security.level'];
    if (securityLevel) {
      const userRole = membership.membership.tenantRole;
      
      // Only tenant_admin can access high-security resources
      if (securityLevel === 'high' && userRole !== 'tenant_admin') {
        return {
          allowed: false,
          reason: 'Insufficient security clearance for this resource',
        };
      }
      
      // Tenant_viewer cannot access confidential resources
      if (securityLevel === 'confidential' && userRole === 'tenant_viewer') {
        return {
          allowed: false,
          reason: 'Viewer role cannot access confidential resources',
        };
      }
    }
  }
  
  return { allowed: true };
}

// ==============================================================================
// FEATURE FLAGS
// ==============================================================================

/**
 * Feature flags for gradual rollout
 */
export interface FeatureFlags {
  /** Enable authorization v2 system */
  FEATURE_AUTHZ_V2: boolean;
  
  /** Enable tenant-scoped permissions */
  FEATURE_TENANT_SCOPED_PERMISSIONS: boolean;
  
  /** Enable subscription-based feature gating */
  FEATURE_SUBSCRIPTION_GATING: boolean;
  
  /** Enable quota enforcement */
  FEATURE_QUOTA_ENFORCEMENT: boolean;
  
  /** Enable ABAC resource validation */
  FEATURE_ABAC_VALIDATION: boolean;
  
  /** Enable support mode impersonation */
  FEATURE_SUPPORT_MODE: boolean;
}

/**
 * Default feature flags (conservative defaults)
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  FEATURE_AUTHZ_V2: false, // Disabled by default
  FEATURE_TENANT_SCOPED_PERMISSIONS: false,
  FEATURE_SUBSCRIPTION_GATING: false,
  FEATURE_QUOTA_ENFORCEMENT: false,
  FEATURE_ABAC_VALIDATION: false,
  FEATURE_SUPPORT_MODE: false,
};

/**
 * Get feature flags from environment or defaults
 */
export function getFeatureFlags(): FeatureFlags {
  if (typeof window !== 'undefined') {
    // Browser environment - check localStorage or window object
    const flags = (window as any).__FEATURE_FLAGS__;
    if (flags) {
      return { ...DEFAULT_FEATURE_FLAGS, ...flags };
    }
  }
  
  if (typeof process !== 'undefined') {
    // Node.js environment - check environment variables
    return {
      FEATURE_AUTHZ_V2: process.env.FEATURE_AUTHZ_V2 === 'true',
      FEATURE_TENANT_SCOPED_PERMISSIONS: process.env.FEATURE_TENANT_SCOPED_PERMISSIONS === 'true',
      FEATURE_SUBSCRIPTION_GATING: process.env.FEATURE_SUBSCRIPTION_GATING === 'true',
      FEATURE_QUOTA_ENFORCEMENT: process.env.FEATURE_QUOTA_ENFORCEMENT === 'true',
      FEATURE_ABAC_VALIDATION: process.env.FEATURE_ABAC_VALIDATION === 'true',
      FEATURE_SUPPORT_MODE: process.env.FEATURE_SUPPORT_MODE === 'true',
    };
  }
  
  return DEFAULT_FEATURE_FLAGS;
}

export default {
  FEATURE_TO_TIER_MAP,
  getRequiredTierForPermission,
  tierMeetsRequirement,
  getEffectivePermissions,
  hasPermissionInTenant,
  getQuotaStatus,
  getFeatureAvailability,
  getUpgradeRecommendations,
  validateResourceAccess,
  getFeatureFlags,
  DEFAULT_FEATURE_FLAGS,
};