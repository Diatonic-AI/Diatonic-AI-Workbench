/**
 * Authorization v2 System - Main Export File
 * 
 * This module provides a unified interface to the authorization v2 system,
 * including tenant management, permission checking, policy evaluation, and
 * subscription-based access control.
 * 
 * Key Features:
 * - Tenant-scoped RBAC + ABAC authorization
 * - Subscription tier and quota enforcement
 * - Policy engine with detailed evaluation steps
 * - Audit logging and compliance tracking
 * - Feature flagged rollout support
 */

// ==============================================================================
// CORE EXPORTS
// ==============================================================================

// Tenancy data models and utilities
export {
  // Types
  TenantAccount,
  TenantAccountType,
  TenantMembership,
  TenantMembershipStatus,
  TenantRole,
  TenantSubscription,
  TenantUsage,
  AuditLogEntry,
  AuditLogAction,
  UserTenantContext,
  TenantMembershipContext,
  
  // Factory functions
  createTenantAccount,
  createTenantMembership,
  createTenantSubscription,
  createTenantUsage,
  createAuditLogEntry,
  
  // Utilities
  getTenantRolePermissions,
  getInternalRolePermissions,
  validateTenantId,
  validateUserId,
} from './tenancy';

// Enhanced permissions and feature gating
export {
  // Types
  TenantScopedPermission,
  ExtendedPermission,
  AccessRequest,
  AccessDecision,
  QuotaCheckResult,
  FeatureFlags,
  
  // Constants
  FEATURE_TO_TIER_MAP,
  DEFAULT_FEATURE_FLAGS,
  
  // Utilities
  getRequiredTierForPermission,
  tierMeetsRequirement,
  getEffectivePermissions,
  hasPermissionInTenant,
  getQuotaStatus,
  getFeatureAvailability,
  getUpgradeRecommendations,
  validateResourceAccess,
  getFeatureFlags,
} from './permissions-v2';

// Policy engine
export {
  // Types
  PolicyContext,
  PolicyEvaluationResult,
  PolicyEvaluationStep,
  
  // Main class
  PolicyEngine,
  
  // Factory functions
  createPolicyEngine,
  checkAccess,
} from './policy-engine';

// Data access layer
export {
  // Types
  DynamoConfig,
  PaginationOptions,
  PaginatedResult,
  TenantQueryFilters,
  MembershipQueryFilters,
  AuditLogQueryFilters,
  
  // Main class
  TenantDataAccess,
  
  // Error types
  TenantDataError,
  TenantNotFoundError,
  MembershipNotFoundError,
  DuplicateTenantError,
  DuplicateMembershipError,
  
  // Factory functions
  createTenantDataAccess,
  DEFAULT_CONFIG as DEFAULT_DYNAMO_CONFIG,
} from './data-access';

// ==============================================================================
// CONVENIENCE INTERFACES
// ==============================================================================

/**
 * Complete authorization system configuration
 */
export interface AuthorizationV2Config {
  /** DynamoDB configuration */
  dynamo: {
    client: import('@aws-sdk/client-dynamodb').DynamoDBClient;
    tables?: {
      tenants?: string;
      auditLogs?: string;
    };
    indexes?: {
      userMemberships?: string;
      tenantMemberships?: string;
      auditByTenant?: string;
      auditByUser?: string;
    };
  };
  
  /** Feature flags */
  features?: Partial<FeatureFlags>;
  
  /** Environment configuration */
  environment?: {
    /** Environment name (dev, staging, prod) */
    name: string;
    /** Base billing URL */
    billingUrl?: string;
  };
}

/**
 * Complete authorization context for a request
 */
export interface AuthorizationContext {
  /** User ID */
  userId: string;
  
  /** Tenant ID for the request */
  tenantId: string;
  
  /** User's internal role (if any) */
  internalRole?: import('../permissions').UserRole;
  
  /** Request metadata */
  metadata?: {
    sessionId?: string;
    ip?: string;
    userAgent?: string;
    timestamp?: Date;
  };
}

/**
 * Authorization result with full context
 */
export interface AuthorizationResult extends AccessDecision {
  /** Policy evaluation details */
  evaluation?: {
    steps: PolicyEvaluationStep[];
    reasoning: string;
    durationMs: number;
  };
  
  /** Audit entry (if enabled) */
  auditEntry?: AuditLogEntry;
}

// ==============================================================================
// MAIN AUTHORIZATION SERVICE
// ==============================================================================

/**
 * Main authorization service that coordinates all components
 */
export class AuthorizationV2Service {
  private dataAccess: TenantDataAccess;
  private policyEngine: PolicyEngine;
  private config: AuthorizationV2Config;

  constructor(config: AuthorizationV2Config) {
    this.config = config;
    
    // Initialize data access
    this.dataAccess = createTenantDataAccess(
      config.dynamo.client,
      {
        tables: config.dynamo.tables,
        indexes: config.dynamo.indexes,
      }
    );
    
    // Initialize policy engine
    this.policyEngine = createPolicyEngine(config.features);
  }

  /**
   * Check if a user has permission to perform an action
   */
  async checkPermission(
    context: AuthorizationContext,
    permission: ExtendedPermission,
    resource?: {
      type: string;
      id?: string;
      tenantId?: string;
      tags?: Record<string, string>;
    }
  ): Promise<AuthorizationResult> {
    try {
      // Get user's tenant membership
      const membership = await this.dataAccess.getMembership(context.userId, context.tenantId);
      if (!membership) {
        return {
          allowed: false,
          reason: 'User is not a member of the requested tenant',
        };
      }

      // Get tenant details
      const tenant = await this.dataAccess.getTenant(context.tenantId);
      if (!tenant) {
        return {
          allowed: false,
          reason: 'Tenant not found',
        };
      }

      // Get subscription and usage
      const [subscription, usage] = await Promise.all([
        this.dataAccess.getSubscription(context.tenantId),
        this.dataAccess.getCurrentUsage(context.tenantId),
      ]);

      // Build membership context
      const membershipContext: TenantMembershipContext = {
        membership,
        tenant,
        subscription: subscription || undefined,
      };

      // Build policy context
      const policyContext: PolicyContext = {
        userId: context.userId,
        internalRole: context.internalRole,
        membership: membershipContext,
        usage: usage || {
          tenantId: context.tenantId,
          period: new Date().toISOString().substring(0, 7),
          aiAgentsCreated: 0,
          apiCalls: 0,
          executionMinutes: 0,
          storageGB: 0,
          activeMembers: 1,
          updatedAt: new Date().toISOString(),
        },
        featureFlags: this.policyEngine['featureFlags'],
        metadata: context.metadata,
      };

      // Create access request
      const accessRequest: AccessRequest = {
        userId: context.userId,
        tenantId: context.tenantId,
        permission,
        resource,
        context: context.metadata,
      };

      // Evaluate access
      const result = await this.policyEngine.evaluateAccess(accessRequest, policyContext);

      // Store audit log if enabled
      if (result.auditEntry) {
        await this.dataAccess.createAuditLogEntry(result.auditEntry);
      }

      return {
        ...result.decision,
        evaluation: result.evaluation,
        auditEntry: result.auditEntry,
      };
    } catch (error: any) {
      // Log error and return denial
      console.error('Authorization check failed:', error);
      
      return {
        allowed: false,
        reason: 'Authorization system error',
        metadata: {
          error: error.message,
          errorCode: error.code || 'UNKNOWN_ERROR',
        },
      };
    }
  }

  /**
   * Get user's memberships across all tenants
   */
  async getUserMemberships(
    userId: string,
    pagination?: PaginationOptions,
    filters?: MembershipQueryFilters
  ): Promise<PaginatedResult<TenantMembershipContext>> {
    return this.dataAccess.getUserMemberships(userId, pagination, filters);
  }

  /**
   * Create a new tenant
   */
  async createTenant(
    tenantId: string,
    name: string,
    accountType: TenantAccountType,
    ownerId: string,
    metadata?: Record<string, any>
  ): Promise<TenantAccount> {
    // Create tenant
    const tenant = await this.dataAccess.createTenant(tenantId, name, accountType, ownerId, metadata);
    
    // Create owner membership
    await this.dataAccess.createMembership(ownerId, tenantId, 'tenant_admin');
    
    return tenant;
  }

  /**
   * Add member to tenant
   */
  async addTenantMember(
    userId: string,
    tenantId: string,
    role: TenantRole,
    invitedBy?: string,
    customPermissions?: string[]
  ): Promise<TenantMembership> {
    return this.dataAccess.createMembership(userId, tenantId, role, invitedBy, customPermissions);
  }

  /**
   * Update tenant subscription
   */
  async updateSubscription(subscription: TenantSubscription): Promise<TenantSubscription> {
    return this.dataAccess.upsertSubscription(subscription);
  }

  /**
   * Update tenant usage
   */
  async updateUsage(usage: TenantUsage): Promise<TenantUsage> {
    return this.dataAccess.upsertUsage(usage);
  }

  /**
   * Get audit logs for a tenant
   */
  async getAuditLogs(
    tenantId: string,
    pagination?: PaginationOptions,
    filters?: AuditLogQueryFilters
  ): Promise<PaginatedResult<AuditLogEntry>> {
    return this.dataAccess.getAuditLogsByTenant(tenantId, pagination, filters);
  }

  /**
   * Get data access instance (for advanced operations)
   */
  getDataAccess(): TenantDataAccess {
    return this.dataAccess;
  }

  /**
   * Get policy engine instance (for advanced operations)
   */
  getPolicyEngine(): PolicyEngine {
    return this.policyEngine;
  }
}

// ==============================================================================
// FACTORY FUNCTIONS
// ==============================================================================

/**
 * Create authorization service with default configuration
 */
export function createAuthorizationV2Service(
  dynamoClient: import('@aws-sdk/client-dynamodb').DynamoDBClient,
  config?: Partial<Omit<AuthorizationV2Config, 'dynamo'>>
): AuthorizationV2Service {
  const fullConfig: AuthorizationV2Config = {
    dynamo: {
      client: dynamoClient,
      ...config?.dynamo,
    },
    features: config?.features,
    environment: config?.environment,
  };

  return new AuthorizationV2Service(fullConfig);
}

/**
 * Quick permission check function
 */
export async function quickCheckPermission(
  service: AuthorizationV2Service,
  userId: string,
  tenantId: string,
  permission: ExtendedPermission,
  resource?: {
    type: string;
    id?: string;
    tenantId?: string;
    tags?: Record<string, string>;
  }
): Promise<boolean> {
  const result = await service.checkPermission(
    { userId, tenantId },
    permission,
    resource
  );
  
  return result.allowed;
}

// ==============================================================================
// DEFAULT EXPORT
// ==============================================================================

export default AuthorizationV2Service;

// ==============================================================================
// VERSION INFO
// ==============================================================================

export const VERSION = '2.0.0';
export const BUILD_INFO = {
  version: VERSION,
  features: [
    'tenant-scoped-rbac',
    'subscription-gating',
    'quota-enforcement',
    'policy-engine',
    'audit-logging',
    'feature-flags',
  ],
  buildDate: new Date().toISOString(),
};