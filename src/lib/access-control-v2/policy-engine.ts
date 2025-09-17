/**
 * Policy Engine v2 - Core Authorization Decision Engine
 * 
 * This module implements the central policy evaluation engine that:
 * - Evaluates access requests against tenant-scoped RBAC+ABAC policies
 * - Enforces subscription tier limits and quota constraints
 * - Provides detailed decision reasoning and upgrade paths
 * - Supports feature flagged rollout and audit logging
 */

import {
  TenantRole,
  TenantMembership,
  TenantMembershipContext,
  TenantSubscription,
  TenantUsage,
  AuditLogEntry,
  AuditLogAction,
  createAuditLogEntry
} from './tenancy';

import {
  ExtendedPermission,
  TenantScopedPermission,
  AccessRequest,
  AccessDecision,
  QuotaCheckResult,
  FeatureFlags,
  getFeatureFlags,
  getRequiredTierForPermission,
  tierMeetsRequirement,
  getEffectivePermissions,
  hasPermissionInTenant,
  getQuotaStatus,
  getFeatureAvailability,
  getUpgradeRecommendations,
  validateResourceAccess
} from './permissions-v2';

import { UserRole, SubscriptionTier, SubscriptionLimits } from '../permissions';

// ==============================================================================
// POLICY CONTEXT
// ==============================================================================

/**
 * Full context required for policy evaluation
 */
export interface PolicyContext {
  /** User making the request */
  userId: string;
  
  /** User's internal system role (if any) */
  internalRole?: UserRole;
  
  /** Tenant membership context */
  membership: TenantMembershipContext;
  
  /** Current tenant usage */
  usage: TenantUsage;
  
  /** Feature flags */
  featureFlags: FeatureFlags;
  
  /** Request metadata */
  metadata?: {
    sessionId?: string;
    ip?: string;
    userAgent?: string;
    timestamp?: Date;
  };
}

/**
 * Policy evaluation result with full context
 */
export interface PolicyEvaluationResult {
  /** Final access decision */
  decision: AccessDecision;
  
  /** Detailed evaluation steps */
  evaluation: {
    /** Steps taken during evaluation */
    steps: PolicyEvaluationStep[];
    
    /** Final reasoning */
    reasoning: string;
    
    /** Duration of evaluation in ms */
    durationMs: number;
  };
  
  /** Audit log entry for this decision */
  auditEntry: AuditLogEntry;
  
  /** Quota status checked (if applicable) */
  quotaChecks?: QuotaCheckResult[];
}

/**
 * Individual evaluation step
 */
export interface PolicyEvaluationStep {
  /** Step identifier */
  step: string;
  
  /** Step description */
  description: string;
  
  /** Result of this step */
  result: 'pass' | 'fail' | 'skip';
  
  /** Additional details */
  details?: any;
  
  /** Duration of this step */
  durationMs?: number;
}

// ==============================================================================
// POLICY ENGINE CLASS
// ==============================================================================

/**
 * Core policy evaluation engine
 */
export class PolicyEngine {
  private featureFlags: FeatureFlags;
  private auditLogs: AuditLogEntry[] = [];

  constructor(featureFlags?: FeatureFlags) {
    this.featureFlags = featureFlags || getFeatureFlags();
  }

  /**
   * Evaluate an access request against all policies
   */
  async evaluateAccess(
    request: AccessRequest,
    context: PolicyContext
  ): Promise<PolicyEvaluationResult> {
    const startTime = Date.now();
    const steps: PolicyEvaluationStep[] = [];
    
    // Step 1: Feature flag check
    const featureFlagStep = await this.evaluateFeatureFlags(request, context);
    steps.push(featureFlagStep);
    
    if (featureFlagStep.result === 'fail') {
      return this.createFailureResult(request, context, steps, 'Feature not enabled', startTime);
    }

    // Step 2: Authentication check
    const authStep = await this.evaluateAuthentication(request, context);
    steps.push(authStep);
    
    if (authStep.result === 'fail') {
      return this.createFailureResult(request, context, steps, 'Authentication failed', startTime);
    }

    // Step 3: Tenant membership check
    const membershipStep = await this.evaluateTenantMembership(request, context);
    steps.push(membershipStep);
    
    if (membershipStep.result === 'fail') {
      return this.createFailureResult(request, context, steps, 'Invalid tenant membership', startTime);
    }

    // Step 4: Role-based permission check (RBAC)
    const rbacStep = await this.evaluateRBAC(request, context);
    steps.push(rbacStep);
    
    if (rbacStep.result === 'fail') {
      return this.createFailureResult(request, context, steps, 'Insufficient role permissions', startTime);
    }

    // Step 5: Subscription tier check
    const subscriptionStep = await this.evaluateSubscriptionTier(request, context);
    steps.push(subscriptionStep);
    
    if (subscriptionStep.result === 'fail') {
      return this.createUpgradeRequiredResult(request, context, steps, startTime);
    }

    // Step 6: Quota enforcement
    const quotaStep = await this.evaluateQuotas(request, context);
    steps.push(quotaStep);
    
    if (quotaStep.result === 'fail') {
      return this.createQuotaExceededResult(request, context, steps, startTime);
    }

    // Step 7: Resource-specific validation (ABAC)
    const abacStep = await this.evaluateABAC(request, context);
    steps.push(abacStep);
    
    if (abacStep.result === 'fail') {
      return this.createFailureResult(request, context, steps, 'Resource access denied', startTime);
    }

    // All checks passed
    return this.createSuccessResult(request, context, steps, startTime);
  }

  /**
   * Feature flag evaluation
   */
  private async evaluateFeatureFlags(
    request: AccessRequest,
    context: PolicyContext
  ): Promise<PolicyEvaluationStep> {
    const stepStart = Date.now();
    
    // If authorization v2 is disabled, fall back to legacy system
    if (!this.featureFlags.FEATURE_AUTHZ_V2) {
      return {
        step: 'feature_flags',
        description: 'Authorization v2 system disabled',
        result: 'fail',
        details: { reason: 'FEATURE_AUTHZ_V2 disabled' },
        durationMs: Date.now() - stepStart
      };
    }
    
    // Check specific feature requirements
    const permission = request.permission;
    
    if (permission.startsWith('tenant.') && !this.featureFlags.FEATURE_TENANT_SCOPED_PERMISSIONS) {
      return {
        step: 'feature_flags',
        description: 'Tenant-scoped permissions disabled',
        result: 'fail',
        details: { reason: 'FEATURE_TENANT_SCOPED_PERMISSIONS disabled', permission },
        durationMs: Date.now() - stepStart
      };
    }
    
    if (permission.startsWith('support.') && !this.featureFlags.FEATURE_SUPPORT_MODE) {
      return {
        step: 'feature_flags',
        description: 'Support mode disabled',
        result: 'fail',
        details: { reason: 'FEATURE_SUPPORT_MODE disabled', permission },
        durationMs: Date.now() - stepStart
      };
    }
    
    return {
      step: 'feature_flags',
      description: 'Feature flags validated',
      result: 'pass',
      details: { enabledFlags: Object.entries(this.featureFlags).filter(([_, v]) => v).map(([k]) => k) },
      durationMs: Date.now() - stepStart
    };
  }

  /**
   * Authentication evaluation
   */
  private async evaluateAuthentication(
    request: AccessRequest,
    context: PolicyContext
  ): Promise<PolicyEvaluationStep> {
    const stepStart = Date.now();
    
    if (!context.userId) {
      return {
        step: 'authentication',
        description: 'User not authenticated',
        result: 'fail',
        details: { reason: 'Missing userId' },
        durationMs: Date.now() - stepStart
      };
    }
    
    if (!context.membership) {
      return {
        step: 'authentication',
        description: 'No tenant membership found',
        result: 'fail',
        details: { reason: 'Missing membership context' },
        durationMs: Date.now() - stepStart
      };
    }
    
    return {
      step: 'authentication',
      description: 'User authenticated',
      result: 'pass',
      details: { 
        userId: context.userId,
        tenantId: request.tenantId,
        membershipStatus: context.membership.membership.status
      },
      durationMs: Date.now() - stepStart
    };
  }

  /**
   * Tenant membership evaluation
   */
  private async evaluateTenantMembership(
    request: AccessRequest,
    context: PolicyContext
  ): Promise<PolicyEvaluationStep> {
    const stepStart = Date.now();
    
    const membership = context.membership.membership;
    
    // Check if user belongs to the requested tenant
    if (membership.tenantId !== request.tenantId) {
      return {
        step: 'tenant_membership',
        description: 'User not member of requested tenant',
        result: 'fail',
        details: { 
          userTenantId: membership.tenantId,
          requestedTenantId: request.tenantId
        },
        durationMs: Date.now() - stepStart
      };
    }
    
    // Check membership status
    if (membership.status !== 'active') {
      return {
        step: 'tenant_membership',
        description: 'Tenant membership not active',
        result: 'fail',
        details: { 
          status: membership.status,
          reason: 'Membership must be active'
        },
        durationMs: Date.now() - stepStart
      };
    }
    
    return {
      step: 'tenant_membership',
      description: 'Tenant membership validated',
      result: 'pass',
      details: {
        tenantId: membership.tenantId,
        role: membership.tenantRole,
        status: membership.status
      },
      durationMs: Date.now() - stepStart
    };
  }

  /**
   * Role-based access control evaluation
   */
  private async evaluateRBAC(
    request: AccessRequest,
    context: PolicyContext
  ): Promise<PolicyEvaluationStep> {
    const stepStart = Date.now();
    
    const hasPermission = hasPermissionInTenant(
      context.membership,
      request.permission,
      context.internalRole
    );
    
    if (!hasPermission) {
      const effectivePermissions = getEffectivePermissions(context.membership, context.internalRole);
      
      return {
        step: 'rbac',
        description: 'Permission not granted by role',
        result: 'fail',
        details: {
          requestedPermission: request.permission,
          userRole: context.membership.membership.tenantRole,
          internalRole: context.internalRole,
          effectivePermissions: effectivePermissions.slice(0, 10) // Limit for audit log size
        },
        durationMs: Date.now() - stepStart
      };
    }
    
    return {
      step: 'rbac',
      description: 'Role-based permission granted',
      result: 'pass',
      details: {
        permission: request.permission,
        grantedBy: context.membership.membership.tenantRole,
        internalRole: context.internalRole
      },
      durationMs: Date.now() - stepStart
    };
  }

  /**
   * Subscription tier evaluation
   */
  private async evaluateSubscriptionTier(
    request: AccessRequest,
    context: PolicyContext
  ): Promise<PolicyEvaluationStep> {
    const stepStart = Date.now();
    
    // Skip subscription checks if feature is disabled
    if (!this.featureFlags.FEATURE_SUBSCRIPTION_GATING) {
      return {
        step: 'subscription_tier',
        description: 'Subscription gating disabled',
        result: 'skip',
        durationMs: Date.now() - stepStart
      };
    }
    
    const subscription = context.membership.subscription;
    if (!subscription) {
      return {
        step: 'subscription_tier',
        description: 'No subscription found',
        result: 'fail',
        details: { reason: 'Tenant has no active subscription' },
        durationMs: Date.now() - stepStart
      };
    }
    
    const requiredTier = getRequiredTierForPermission(request.permission);
    if (!requiredTier) {
      return {
        step: 'subscription_tier',
        description: 'No subscription requirement',
        result: 'pass',
        details: { permission: request.permission },
        durationMs: Date.now() - stepStart
      };
    }
    
    const tierMeetsReq = tierMeetsRequirement(subscription.tier, request.permission);
    if (!tierMeetsReq) {
      return {
        step: 'subscription_tier',
        description: 'Subscription tier insufficient',
        result: 'fail',
        details: {
          currentTier: subscription.tier,
          requiredTier,
          permission: request.permission
        },
        durationMs: Date.now() - stepStart
      };
    }
    
    return {
      step: 'subscription_tier',
      description: 'Subscription tier sufficient',
      result: 'pass',
      details: {
        tier: subscription.tier,
        requiredTier,
        permission: request.permission
      },
      durationMs: Date.now() - stepStart
    };
  }

  /**
   * Quota evaluation
   */
  private async evaluateQuotas(
    request: AccessRequest,
    context: PolicyContext
  ): Promise<PolicyEvaluationStep> {
    const stepStart = Date.now();
    
    // Skip quota checks if feature is disabled
    if (!this.featureFlags.FEATURE_QUOTA_ENFORCEMENT) {
      return {
        step: 'quotas',
        description: 'Quota enforcement disabled',
        result: 'skip',
        durationMs: Date.now() - stepStart
      };
    }
    
    const subscription = context.membership.subscription;
    if (!subscription) {
      return {
        step: 'quotas',
        description: 'No subscription for quota check',
        result: 'pass', // Skip if no subscription
        durationMs: Date.now() - stepStart
      };
    }
    
    // Check relevant quotas based on permission
    const quotaChecks: QuotaCheckResult[] = [];
    const permission = request.permission;
    
    // AI Agent creation quotas
    if (permission === 'studio.create_agents') {
      const quotaCheck = getQuotaStatus(subscription, context.usage, 'aiAgentsPerMonth');
      quotaChecks.push(quotaCheck);
      
      if (!quotaCheck.allowed) {
        return {
          step: 'quotas',
          description: 'AI agent creation quota exceeded',
          result: 'fail',
          details: {
            quotaType: 'aiAgentsPerMonth',
            used: quotaCheck.used,
            limit: quotaCheck.limit,
            permission
          },
          durationMs: Date.now() - stepStart
        };
      }
    }
    
    // API call quotas
    if (permission.startsWith('api.')) {
      const quotaCheck = getQuotaStatus(subscription, context.usage, 'apiCallsPerDay');
      quotaChecks.push(quotaCheck);
      
      if (!quotaCheck.allowed) {
        return {
          step: 'quotas',
          description: 'API call quota exceeded',
          result: 'fail',
          details: {
            quotaType: 'apiCallsPerDay',
            used: quotaCheck.used,
            limit: quotaCheck.limit,
            permission
          },
          durationMs: Date.now() - stepStart
        };
      }
    }
    
    // Storage quotas
    if (permission.startsWith('storage.') || permission === 'data.write') {
      const quotaCheck = getQuotaStatus(subscription, context.usage, 'cloudStorageGB');
      quotaChecks.push(quotaCheck);
      
      if (!quotaCheck.allowed) {
        return {
          step: 'quotas',
          description: 'Storage quota exceeded',
          result: 'fail',
          details: {
            quotaType: 'cloudStorageGB',
            used: quotaCheck.used,
            limit: quotaCheck.limit,
            permission
          },
          durationMs: Date.now() - stepStart
        };
      }
    }
    
    return {
      step: 'quotas',
      description: 'Quota limits satisfied',
      result: 'pass',
      details: {
        quotaChecks: quotaChecks.map(q => ({
          type: q.type,
          used: q.used,
          limit: q.limit,
          remaining: q.remaining
        }))
      },
      durationMs: Date.now() - stepStart
    };
  }

  /**
   * Attribute-based access control evaluation
   */
  private async evaluateABAC(
    request: AccessRequest,
    context: PolicyContext
  ): Promise<PolicyEvaluationStep> {
    const stepStart = Date.now();
    
    // Skip ABAC checks if feature is disabled
    if (!this.featureFlags.FEATURE_ABAC_VALIDATION) {
      return {
        step: 'abac',
        description: 'ABAC validation disabled',
        result: 'skip',
        durationMs: Date.now() - stepStart
      };
    }
    
    const resourceValidation = validateResourceAccess(request, context.membership);
    
    if (!resourceValidation.allowed) {
      return {
        step: 'abac',
        description: 'Resource access denied',
        result: 'fail',
        details: {
          reason: resourceValidation.reason,
          resource: request.resource
        },
        durationMs: Date.now() - stepStart
      };
    }
    
    return {
      step: 'abac',
      description: 'Resource access validated',
      result: 'pass',
      details: { resource: request.resource },
      durationMs: Date.now() - stepStart
    };
  }

  /**
   * Create success result
   */
  private createSuccessResult(
    request: AccessRequest,
    context: PolicyContext,
    steps: PolicyEvaluationStep[],
    startTime: number
  ): PolicyEvaluationResult {
    const durationMs = Date.now() - startTime;
    
    const decision: AccessDecision = {
      allowed: true,
      reason: 'Access granted - all policy checks passed',
      metadata: {
        evaluationSteps: steps.length,
        durationMs
      }
    };
    
    const auditEntry = createAuditLogEntry(
      request.tenantId,
      context.userId,
      'access_granted' as AuditLogAction,
      'policy_engine',
      undefined,
      {
        permission: request.permission,
        resource: request.resource,
        evaluation: {
          steps: steps.map(s => ({ step: s.step, result: s.result })),
          durationMs
        }
      },
      context.metadata?.ip
    );
    
    return {
      decision,
      evaluation: {
        steps,
        reasoning: 'All authorization checks passed successfully',
        durationMs
      },
      auditEntry
    };
  }

  /**
   * Create failure result
   */
  private createFailureResult(
    request: AccessRequest,
    context: PolicyContext,
    steps: PolicyEvaluationStep[],
    reason: string,
    startTime: number
  ): PolicyEvaluationResult {
    const durationMs = Date.now() - startTime;
    
    const decision: AccessDecision = {
      allowed: false,
      reason,
      metadata: {
        evaluationSteps: steps.length,
        durationMs,
        failedStep: steps.find(s => s.result === 'fail')?.step
      }
    };
    
    const auditEntry = createAuditLogEntry(
      request.tenantId,
      context.userId,
      'access_denied' as AuditLogAction,
      'policy_engine',
      undefined,
      {
        permission: request.permission,
        resource: request.resource,
        reason,
        evaluation: {
          steps: steps.map(s => ({ step: s.step, result: s.result })),
          durationMs
        }
      },
      context.metadata?.ip
    );
    
    return {
      decision,
      evaluation: {
        steps,
        reasoning: reason,
        durationMs
      },
      auditEntry
    };
  }

  /**
   * Create upgrade required result
   */
  private createUpgradeRequiredResult(
    request: AccessRequest,
    context: PolicyContext,
    steps: PolicyEvaluationStep[],
    startTime: number
  ): PolicyEvaluationResult {
    const durationMs = Date.now() - startTime;
    const subscription = context.membership.subscription;
    const requiredTier = getRequiredTierForPermission(request.permission);
    
    const upgradeRecommendations = getUpgradeRecommendations(
      subscription?.tier || 'free',
      [request.permission]
    );
    
    const decision: AccessDecision = {
      allowed: false,
      reason: 'Subscription upgrade required',
      minimumTier: requiredTier || 'basic',
      upgradePath: {
        recommendedTier: upgradeRecommendations.recommendedTier,
        benefits: upgradeRecommendations.benefits,
        billingUrl: '/billing' // This would be configured per environment
      },
      metadata: {
        evaluationSteps: steps.length,
        durationMs,
        currentTier: subscription?.tier || 'free'
      }
    };
    
    const auditEntry = createAuditLogEntry(
      request.tenantId,
      context.userId,
      'access_denied_subscription' as AuditLogAction,
      'policy_engine',
      undefined,
      {
        permission: request.permission,
        currentTier: subscription?.tier || 'free',
        requiredTier,
        evaluation: {
          steps: steps.map(s => ({ step: s.step, result: s.result })),
          durationMs
        }
      },
      context.metadata?.ip
    );
    
    return {
      decision,
      evaluation: {
        steps,
        reasoning: `Subscription upgrade required: current tier '${subscription?.tier || 'free'}' insufficient for '${request.permission}'`,
        durationMs
      },
      auditEntry
    };
  }

  /**
   * Create quota exceeded result
   */
  private createQuotaExceededResult(
    request: AccessRequest,
    context: PolicyContext,
    steps: PolicyEvaluationStep[],
    startTime: number
  ): PolicyEvaluationResult {
    const durationMs = Date.now() - startTime;
    const quotaStep = steps.find(s => s.step === 'quotas' && s.result === 'fail');
    const quotaDetails = quotaStep?.details;
    
    const decision: AccessDecision = {
      allowed: false,
      reason: 'Quota limit exceeded',
      quotaInfo: quotaDetails ? {
        type: quotaDetails.quotaType,
        used: quotaDetails.used,
        limit: quotaDetails.limit
      } : undefined,
      upgradePath: {
        recommendedTier: 'pro', // Default recommendation
        benefits: ['Higher usage limits', 'Priority support'],
        billingUrl: '/billing'
      },
      metadata: {
        evaluationSteps: steps.length,
        durationMs
      }
    };
    
    const auditEntry = createAuditLogEntry(
      request.tenantId,
      context.userId,
      'access_denied_quota' as AuditLogAction,
      'policy_engine',
      undefined,
      {
        permission: request.permission,
        quotaType: quotaDetails?.quotaType,
        quotaUsed: quotaDetails?.used,
        quotaLimit: quotaDetails?.limit,
        evaluation: {
          steps: steps.map(s => ({ step: s.step, result: s.result })),
          durationMs
        }
      },
      context.metadata?.ip
    );
    
    return {
      decision,
      evaluation: {
        steps,
        reasoning: `Quota limit exceeded for ${quotaDetails?.quotaType || 'unknown quota type'}`,
        durationMs
      },
      auditEntry
    };
  }

  /**
   * Get audit logs
   */
  getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  /**
   * Clear audit logs (for testing)
   */
  clearAuditLogs(): void {
    this.auditLogs = [];
  }
}

// ==============================================================================
// CONVENIENCE FUNCTIONS
// ==============================================================================

/**
 * Create a policy engine instance with default configuration
 */
export function createPolicyEngine(featureFlags?: FeatureFlags): PolicyEngine {
  return new PolicyEngine(featureFlags);
}

/**
 * Quick access check function
 */
export async function checkAccess(
  request: AccessRequest,
  context: PolicyContext,
  policyEngine?: PolicyEngine
): Promise<AccessDecision> {
  const engine = policyEngine || createPolicyEngine();
  const result = await engine.evaluateAccess(request, context);
  return result.decision;
}

export default PolicyEngine;