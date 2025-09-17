/**
 * Tenancy Types and Models for Authorization v2
 * 
 * This module defines the core tenant-based data model including:
 * - Tenant management (individual/business accounts)
 * - Tenant membership and roles
 * - Subscription management per tenant
 * - Usage tracking and quota enforcement
 * - Audit logging
 */

import { UserRole, SubscriptionTier, SubscriptionLimits } from '../permissions';

// ==============================================================================
// TENANCY CORE TYPES
// ==============================================================================

/**
 * Tenant Account Types
 */
export type TenantAccountType = 'individual' | 'business';

/**
 * Tenant Status
 */
export type TenantStatus = 'active' | 'suspended' | 'pending' | 'archived';

/**
 * Tenant Role (application-level, not Cognito groups)
 */
export type TenantRole = 'tenant_admin' | 'tenant_user' | 'tenant_viewer';

/**
 * Membership Status
 */
export type MembershipStatus = 'active' | 'pending' | 'suspended' | 'removed';

/**
 * Subscription Status
 */
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';

/**
 * Subscription Provider
 */
export type SubscriptionProvider = 'stripe' | 'manual' | 'internal';

// ==============================================================================
// TENANT DATA MODEL
// ==============================================================================

/**
 * Core Tenant Information
 * DynamoDB: PK: TENANT#{tenantId}, SK: META#TENANT
 */
export interface Tenant {
  /** Primary tenant identifier (ULID) */
  tenantId: string;
  
  /** Display name for the tenant */
  name: string;
  
  /** Account type - individual or business */
  accountType: TenantAccountType;
  
  /** Original owner/creator of the tenant */
  ownerUserId: string;
  
  /** Current status of the tenant */
  status: TenantStatus;
  
  /** When the tenant was created */
  createdAt: string;
  
  /** Last time tenant was updated */
  updatedAt: string;
  
  /** Optional tenant settings */
  settings?: {
    /** Custom domain if applicable */
    customDomain?: string;
    /** Branding settings */
    branding?: {
      logoUrl?: string;
      primaryColor?: string;
      companyName?: string;
    };
    /** Timezone preference */
    timezone?: string;
    /** Default permissions for new members */
    defaultMemberRole?: TenantRole;
  };
  
  /** Tenant metadata */
  metadata?: Record<string, any>;
}

/**
 * Tenant Membership
 * DynamoDB: PK: TENANT#{tenantId}, SK: MEMBER#{userId}
 */
export interface TenantMember {
  /** Tenant identifier */
  tenantId: string;
  
  /** User identifier */
  userId: string;
  
  /** Role within this tenant */
  tenantRole: TenantRole;
  
  /** Membership status */
  status: MembershipStatus;
  
  /** Who invited this member */
  invitedBy?: string;
  
  /** When the invitation was sent */
  invitedAt?: string;
  
  /** When the member joined */
  joinedAt?: string;
  
  /** When membership was last updated */
  updatedAt: string;
  
  /** Custom permissions specific to this member (if any) */
  customPermissions?: string[];
  
  /** Member-specific settings */
  settings?: {
    /** Email notifications enabled */
    emailNotifications?: boolean;
    /** Last login to this tenant */
    lastLoginAt?: string;
  };
}

/**
 * Tenant Subscription
 * DynamoDB: PK: TENANT#{tenantId}, SK: SUBSCRIPTION#active
 */
export interface TenantSubscription {
  /** Tenant identifier */
  tenantId: string;
  
  /** Subscription tier */
  tier: SubscriptionTier;
  
  /** Subscription status */
  status: SubscriptionStatus;
  
  /** Provider managing the subscription */
  provider: SubscriptionProvider;
  
  /** External customer ID (e.g., Stripe customer ID) */
  externalCustomerId?: string;
  
  /** External subscription ID */
  externalSubscriptionId?: string;
  
  /** External price ID */
  externalPriceId?: string;
  
  /** Current billing period start */
  periodStart: string;
  
  /** Current billing period end */
  periodEnd: string;
  
  /** When subscription was created */
  createdAt: string;
  
  /** Last time subscription was updated */
  updatedAt: string;
  
  /** Trial information if applicable */
  trial?: {
    isTrialing: boolean;
    trialStart?: string;
    trialEnd?: string;
    trialDaysRemaining?: number;
  };
  
  /** Billing information */
  billing?: {
    /** Next billing date */
    nextBillingDate?: string;
    /** Last payment amount */
    lastPaymentAmount?: number;
    /** Currency */
    currency?: string;
    /** Payment method summary */
    paymentMethod?: string;
  };
}

/**
 * Usage Tracking
 * DynamoDB: PK: TENANT#{tenantId}, SK: USAGE#{YYYYMMDD}
 */
export interface TenantUsage {
  /** Tenant identifier */
  tenantId: string;
  
  /** Usage date (YYYY-MM-DD format) */
  date: string;
  
  /** AI agents created this period */
  aiAgentsCreated: number;
  
  /** API calls made this day */
  apiCalls: number;
  
  /** Execution time used in minutes */
  executionMinutes: number;
  
  /** Storage used in GB */
  storageGB: number;
  
  /** Team members active this day */
  activeMembers: number;
  
  /** Custom model training sessions */
  modelTrainingSessions?: number;
  
  /** Data export operations */
  dataExports?: number;
  
  /** Last updated timestamp */
  updatedAt: string;
  
  /** Usage metadata */
  metadata?: Record<string, number>;
}

/**
 * Audit Log Entry
 * DynamoDB: PK: TENANT#{tenantId}, SK: AUDIT#{timestamp}#{uuid}
 */
export interface AuditLogEntry {
  /** Tenant identifier */
  tenantId: string;
  
  /** Unique audit entry ID */
  auditId: string;
  
  /** Action being audited */
  action: string;
  
  /** User performing the action */
  actor: string;
  
  /** Reason for action (especially for support mode) */
  reason?: string;
  
  /** Whether this was a support-mode session */
  supportMode: boolean;
  
  /** Access decision result */
  result: 'allow' | 'deny';
  
  /** Resource being accessed */
  resource?: {
    type: string;
    id?: string;
    tenantId?: string;
  };
  
  /** Request context */
  context?: {
    /** IP address */
    ip?: string;
    /** User agent */
    userAgent?: string;
    /** Session ID */
    sessionId?: string;
  };
  
  /** When the action occurred */
  timestamp: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

// ==============================================================================
// HELPER TYPES AND INTERFACES
// ==============================================================================

/**
 * Complete tenant context for a user
 */
export interface TenantMembershipContext {
  /** The tenant */
  tenant: Tenant;
  
  /** User's membership in this tenant */
  membership: TenantMember;
  
  /** Active subscription for this tenant */
  subscription?: TenantSubscription;
  
  /** Current usage for this tenant */
  currentUsage?: TenantUsage;
  
  /** Effective permissions in this tenant */
  permissions: string[];
}

/**
 * User's complete multi-tenant context
 */
export interface UserTenantContext {
  /** User ID */
  userId: string;
  
  /** Internal role from Cognito groups */
  internalRole?: UserRole;
  
  /** All tenant memberships */
  memberships: TenantMembershipContext[];
  
  /** Default/preferred tenant */
  defaultTenantId?: string;
  
  /** Support mode session info */
  supportMode?: {
    active: boolean;
    targetTenantId?: string;
    reason?: string;
    expiresAt?: string;
  };
}

/**
 * Tenant creation request
 */
export interface CreateTenantRequest {
  /** Display name for the tenant */
  name: string;
  
  /** Account type */
  accountType: TenantAccountType;
  
  /** Owner user ID */
  ownerUserId: string;
  
  /** Initial subscription tier */
  initialTier?: SubscriptionTier;
  
  /** Optional settings */
  settings?: Tenant['settings'];
}

/**
 * Member invitation request
 */
export interface InviteMemberRequest {
  /** Tenant ID */
  tenantId: string;
  
  /** Email address to invite */
  email: string;
  
  /** Role to assign */
  tenantRole: TenantRole;
  
  /** Who is sending the invitation */
  invitedBy: string;
  
  /** Optional custom message */
  message?: string;
}

/**
 * Usage increment request
 */
export interface UsageIncrementRequest {
  /** Tenant ID */
  tenantId: string;
  
  /** Usage type */
  usageType: keyof Omit<TenantUsage, 'tenantId' | 'date' | 'updatedAt' | 'metadata'>;
  
  /** Amount to increment */
  amount: number;
  
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Subscription limits with usage
 */
export interface TenantSubscriptionWithUsage extends TenantSubscription {
  /** Current subscription limits */
  limits: SubscriptionLimits;
  
  /** Current usage against limits */
  usage: {
    /** Monthly usage (current month) */
    monthly: TenantUsage;
    
    /** Daily usage (today) */
    daily: TenantUsage;
    
    /** Remaining quotas */
    remaining: {
      aiAgents: number | 'unlimited';
      apiCalls: number | 'unlimited';
      executionMinutes: number | 'unlimited';
      storage: number | 'unlimited';
    };
  };
}

// ==============================================================================
// TENANT ROLE PERMISSIONS MAPPING
// ==============================================================================

/**
 * Tenant role to permissions mapping
 * These are the baseline permissions granted by tenant roles
 */
export const TENANT_ROLE_PERMISSIONS: Record<TenantRole, string[]> = {
  tenant_admin: [
    // Full tenant administration
    'tenant.admin_console',
    'tenant.settings.manage',
    'tenant.delete', // With confirmation
    
    // Member management
    'org.manage_members',
    'org.invite_members',
    'org.remove_members',
    'org.view_members',
    
    // Billing management
    'billing.manage',
    'billing.view',
    'billing.export',
    
    // Data management
    'data.read',
    'data.write',
    'data.export',
    'data.delete',
    
    // All feature permissions (gated by subscription)
    'studio.create_agents',
    'studio.save_agents',
    'studio.export_agents',
    'studio.share_agents_private',
    'studio.advanced_visual_builder',
    'studio.debug_mode',
    'studio.version_control',
    
    'lab.run_basic_experiments',
    'lab.run_advanced_experiments',
    'lab.save_experiments',
    'lab.export_results',
    'lab.custom_model_training',
    
    'observatory.basic_analytics',
    'observatory.advanced_insights',
    'observatory.data_export',
    'observatory.custom_dashboards',
    
    'community.moderate_content',
    'community.create_groups',
    
    // Support
    'support.priority',
    'support.dedicated_team',
  ],
  
  tenant_user: [
    // Basic tenant access
    'tenant.view',
    
    // Read member list
    'org.view_members',
    
    // View billing (no management)
    'billing.view',
    
    // Data access
    'data.read',
    'data.write', // Limited by subscription
    
    // Feature permissions (gated by subscription)
    'studio.create_agents',
    'studio.save_agents',
    'studio.basic_visual_builder',
    
    'lab.run_basic_experiments',
    'lab.save_experiments',
    
    'observatory.basic_analytics',
    
    'community.view_public_content',
    'community.create_posts',
    
    // Basic support
    'support.community',
    'support.email',
  ],
  
  tenant_viewer: [
    // Read-only tenant access
    'tenant.view',
    
    // View members
    'org.view_members',
    
    // Read-only data access
    'data.read',
    
    // View-only features
    'studio.view_templates',
    'lab.view_results',
    'observatory.basic_analytics',
    'community.view_public_content',
    
    // Community support only
    'support.community',
  ],
};

/**
 * Internal role permissions (for system administration)
 */
export const INTERNAL_ROLE_PERMISSIONS = {
  internal_dev: [
    ...TENANT_ROLE_PERMISSIONS.tenant_admin,
    'internal.debug_all_users',
    'internal.impersonate_users',
    'internal.feature_flags',
    'internal.system_monitoring',
    'internal.database_access',
  ],
  
  internal_admin: [
    ...TENANT_ROLE_PERMISSIONS.tenant_admin,
    'internal.content_management',
    'internal.user_management',
    'internal.system_administration',
    'internal.billing_management',
    'internal.analytics_full_access',
    'internal.debug_all_users',
    'internal.impersonate_users',
    'internal.feature_flags',
    'internal.system_monitoring',
    'internal.database_access',
  ],
  
  internal_manager: [
    ...TENANT_ROLE_PERMISSIONS.tenant_admin,
    'internal.content_management',
    'internal.user_management',
    'internal.billing_management',
    'internal.analytics_full_access',
    'internal.feature_flags',
    'internal.system_monitoring',
  ],
};

/**
 * Utility function to get effective permissions for a tenant role
 */
export function getTenantRolePermissions(role: TenantRole): string[] {
  return TENANT_ROLE_PERMISSIONS[role] || [];
}

/**
 * Utility function to get all permissions for an internal role
 */
export function getInternalRolePermissions(role: UserRole): string[] {
  if (role.startsWith('internal_')) {
    return INTERNAL_ROLE_PERMISSIONS[role as keyof typeof INTERNAL_ROLE_PERMISSIONS] || [];
  }
  return [];
}

/**
 * Check if a tenant role has a specific permission
 */
export function tenantRoleHasPermission(role: TenantRole, permission: string): boolean {
  const permissions = getTenantRolePermissions(role);
  return permissions.includes(permission);
}

export default {
  TENANT_ROLE_PERMISSIONS,
  INTERNAL_ROLE_PERMISSIONS,
  getTenantRolePermissions,
  getInternalRolePermissions,
  tenantRoleHasPermission,
};