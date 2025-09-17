/**
 * Diatonic AI - Billing Validation Schemas
 * Zod schemas for type-safe API validation and TypeScript inference
 */

import { z } from 'zod';

// ============================================================================
// BASIC VALIDATION SCHEMAS
// ============================================================================

export const PlanIdSchema = z.enum(['free', 'basic', 'pro', 'extreme', 'enterprise']);
export const BillingIntervalSchema = z.enum(['monthly', 'yearly']);
export const SubscriptionStatusSchema = z.enum([
  'active', 'trialing', 'past_due', 'canceled', 
  'unpaid', 'incomplete', 'incomplete_expired', 'paused', 'none'
]);

export const CurrencySchema = z.enum(['usd', 'eur', 'gbp', 'cad', 'aud']);

// ============================================================================
// CHECKOUT & PAYMENT SCHEMAS
// ============================================================================

export const CheckoutPayloadSchema = z.object({
  planId: PlanIdSchema,
  interval: BillingIntervalSchema,
  successUrl: z.string().url('Invalid success URL'),
  cancelUrl: z.string().url('Invalid cancel URL'),
  metadata: z.record(z.string()).optional().default({}),
  // Additional optional fields
  trialPeriodDays: z.number().min(1).max(365).optional(),
  allowPromotionCodes: z.boolean().optional().default(true),
  automaticTax: z.boolean().optional().default(false),
}).strict();

export const CheckoutSessionResponseSchema = z.object({
  id: z.string().min(1, 'Session ID is required'),
  url: z.string().url().optional(),
  customerId: z.string().min(1, 'Customer ID is required'),
  priceId: z.string().min(1, 'Price ID is required'),
  mode: z.enum(['subscription', 'payment']),
  status: z.enum(['open', 'complete', 'expired']),
}).strict();

export const BillingPortalRequestSchema = z.object({
  returnUrl: z.string().url().optional(),
}).strict();

export const BillingPortalResponseSchema = z.object({
  url: z.string().url('Invalid portal URL'),
}).strict();

// ============================================================================
// SUBSCRIPTION SCHEMAS
// ============================================================================

export const SubscriptionUsageSchema = z.object({
  agentsUsed: z.number().min(0),
  storageUsed: z.number().min(0),
  apiCallsUsed: z.number().min(0),
  teamMembers: z.number().min(0),
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
}).strict();

export const SubscriptionLimitsSchema = z.object({
  agents: z.union([z.number().min(0), z.literal('unlimited')]),
  storage: z.union([z.number().min(0), z.literal('unlimited')]),
  apiCalls: z.union([z.number().min(0), z.literal('unlimited')]),
  teamMembers: z.union([z.number().min(0), z.literal('unlimited')]),
  features: z.array(z.string()),
}).strict();

export const SubscriptionRecordSchema = z.object({
  // Core subscription info
  subscriptionId: z.string().nullable(),
  customerId: z.string().nullable(),
  status: SubscriptionStatusSchema,
  
  // Plan details
  planId: PlanIdSchema,
  priceId: z.string().nullable(),
  interval: BillingIntervalSchema,
  
  // Billing dates
  currentPeriodStart: z.string().datetime().nullable(),
  currentPeriodEnd: z.string().datetime().nullable(),
  trialEnd: z.string().datetime().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.string().datetime().nullable(),
  
  // Usage and limits (optional from local database)
  usage: SubscriptionUsageSchema.optional(),
  limits: SubscriptionLimitsSchema.optional(),
}).strict();

// ============================================================================
// STRIPE WEBHOOK SCHEMAS
// ============================================================================

export const StripeWebhookEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.object({
    object: z.any(),
  }),
  api_version: z.string(),
  created: z.number().positive(),
  livemode: z.boolean(),
}).strict();

export const StripeCustomerSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().nullable(),
  name: z.string().nullable(),
  created: z.number().positive(),
  metadata: z.record(z.string()),
}).strict();

export const StripeSubscriptionItemSchema = z.object({
  id: z.string(),
  price: z.object({
    id: z.string(),
    unit_amount: z.number().nonnegative(),
    currency: z.string().length(3),
    recurring: z.object({
      interval: BillingIntervalSchema,
      interval_count: z.number().positive(),
    }).nullable(),
  }),
  quantity: z.number().positive(),
}).strict();

export const StripeSubscriptionSchema = z.object({
  id: z.string().min(1),
  customer: z.string().min(1),
  status: SubscriptionStatusSchema,
  current_period_start: z.number().positive(),
  current_period_end: z.number().positive(),
  trial_end: z.number().positive().nullable(),
  cancel_at_period_end: z.boolean(),
  canceled_at: z.number().positive().nullable(),
  items: z.object({
    data: z.array(StripeSubscriptionItemSchema),
  }),
  metadata: z.record(z.string()),
}).strict();

// ============================================================================
// ERROR HANDLING SCHEMAS
// ============================================================================

export const BillingErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  param: z.string().optional(),
  type: z.enum(['card_error', 'invalid_request_error', 'api_error', 'authentication_error', 'rate_limit_error']),
}).strict();

export const APIErrorSchema = z.object({
  error: z.object({
    message: z.string().min(1),
    code: z.string().optional(),
    param: z.string().optional(),
    type: z.string().optional(),
  }),
  statusCode: z.number().min(100).max(599),
  requestId: z.string().optional(),
}).strict();

export const BillingAPIResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => 
  z.union([
    z.object({
      success: z.literal(true),
      data: dataSchema,
      message: z.string().optional(),
    }),
    z.object({
      success: z.literal(false),
      error: APIErrorSchema,
    })
  ]).strict();

// ============================================================================
// PAYMENT METHOD SCHEMAS
// ============================================================================

export const PaymentMethodCardSchema = z.object({
  brand: z.string(),
  last4: z.string().length(4),
  exp_month: z.number().min(1).max(12),
  exp_year: z.number().min(new Date().getFullYear()),
  funding: z.enum(['credit', 'debit', 'prepaid', 'unknown']),
}).strict();

export const PaymentMethodBillingDetailsSchema = z.object({
  address: z.object({
    city: z.string().optional(),
    country: z.string().length(2).optional(),
    line1: z.string().optional(),
    line2: z.string().optional(),
    postal_code: z.string().optional(),
    state: z.string().optional(),
  }).optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
}).strict();

export const PaymentMethodSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['card', 'bank_account']),
  card: PaymentMethodCardSchema.optional(),
  billing_details: PaymentMethodBillingDetailsSchema,
  created: z.number().positive(),
}).strict();

// ============================================================================
// INVOICE SCHEMAS
// ============================================================================

export const InvoiceLineItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().nullable(),
  amount: z.number().nonnegative(),
  quantity: z.number().positive(),
  period: z.object({
    start: z.number().positive(),
    end: z.number().positive(),
  }),
  price: z.object({
    id: z.string(),
    unit_amount: z.number().nullable(),
    currency: z.string().length(3),
  }).optional(),
}).strict();

export const InvoiceSchema = z.object({
  id: z.string().min(1),
  number: z.string().nullable(),
  status: z.enum(['draft', 'open', 'paid', 'uncollectible', 'void']),
  total: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative().nullable(),
  currency: z.string().length(3),
  created: z.number().positive(),
  due_date: z.number().positive().nullable(),
  paid_at: z.number().positive().nullable(),
  hosted_invoice_url: z.string().url().nullable(),
  invoice_pdf: z.string().url().nullable(),
  period_start: z.number().positive(),
  period_end: z.number().positive(),
  lines: z.array(InvoiceLineItemSchema),
}).strict();

// ============================================================================
// CONFIGURATION SCHEMAS
// ============================================================================

export const BillingConfigThemeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  logoUrl: z.string().url().optional(),
  brandName: z.string().min(1),
}).strict();

export const BillingConfigSchema = z.object({
  stripePublicKey: z.string().min(1, 'Stripe public key is required'),
  apiBaseUrl: z.string().url('Invalid API base URL'),
  enablePromotionCodes: z.boolean(),
  enableTaxCalculation: z.boolean(),
  defaultCurrency: CurrencySchema,
  supportedCurrencies: z.array(CurrencySchema),
  
  // Feature flags
  enableYearlyBilling: z.boolean(),
  enableTrialPeriods: z.boolean(),
  enableCustomerPortal: z.boolean(),
  
  // UI customization
  theme: BillingConfigThemeSchema,
}).strict();

// ============================================================================
// URL PARAMETER SCHEMAS
// ============================================================================

export const BillingURLParamsSchema = z.object({
  interval: BillingIntervalSchema.optional(),
  planId: PlanIdSchema.optional(),
  success: z.enum(['true', 'false']).optional(),
  session_id: z.string().optional(),
  checkout_error: z.string().optional(),
}).strict();

// ============================================================================
// FEATURE ENTITLEMENTS SCHEMAS
// ============================================================================

export const FeatureEntitlementsSchema = z.object({
  // Core features
  canCreateAgents: z.boolean(),
  canUseAdvancedBuilder: z.boolean(),
  canAccessTeamCollaboration: z.boolean(),
  canUseCustomIntegrations: z.boolean(),
  
  // Usage limits
  maxAgents: z.union([z.number().min(0), z.literal('unlimited')]),
  maxStorage: z.union([z.number().min(0), z.literal('unlimited')]),
  maxAPIRequests: z.union([z.number().min(0), z.literal('unlimited')]),
  maxTeamMembers: z.union([z.number().min(0), z.literal('unlimited')]),
  
  // Support level
  supportLevel: z.enum(['community', 'email', 'priority', '24/7', 'dedicated']),
  
  // Additional features
  hasAnalytics: z.boolean(),
  hasVersionControl: z.boolean(),
  hasCustomBranding: z.boolean(),
  hasOnPremiseDeployment: z.boolean(),
  hasSLA: z.boolean(),
}).strict();

// ============================================================================
// EXPORTED TYPE INFERENCE
// ============================================================================

// Infer TypeScript types from schemas for consistency
export type CheckoutPayload = z.infer<typeof CheckoutPayloadSchema>;
export type CheckoutSessionResponse = z.infer<typeof CheckoutSessionResponseSchema>;
export type BillingPortalRequest = z.infer<typeof BillingPortalRequestSchema>;
export type BillingPortalResponse = z.infer<typeof BillingPortalResponseSchema>;
export type SubscriptionRecord = z.infer<typeof SubscriptionRecordSchema>;
export type SubscriptionUsage = z.infer<typeof SubscriptionUsageSchema>;
export type SubscriptionLimits = z.infer<typeof SubscriptionLimitsSchema>;
export type BillingError = z.infer<typeof BillingErrorSchema>;
export type APIError = z.infer<typeof APIErrorSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type BillingConfig = z.infer<typeof BillingConfigSchema>;
export type BillingURLParams = z.infer<typeof BillingURLParamsSchema>;
export type FeatureEntitlements = z.infer<typeof FeatureEntitlementsSchema>;

// ============================================================================
// VALIDATION UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely parse and validate data with detailed error reporting
 */
export function safeParseWithDetails<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errors = result.error.errors.map(err => {
      const path = err.path.join('.');
      return `${path ? `${path}: ` : ''}${err.message}`;
    });
    
    return { success: false, errors };
  }
}

/**
 * Validate environment variables for billing configuration
 */
export function validateBillingEnvironment(): { valid: boolean; errors: string[] } {
  const requiredEnvVars = [
    'VITE_STRIPE_PUBLIC_KEY',
    'VITE_AWS_API_GATEWAY_ENDPOINT',
    'VITE_AWS_REGION',
    'VITE_APP_NAME'
  ];
  
  const missing = requiredEnvVars.filter(varName => !import.meta.env[varName]);
  
  return {
    valid: missing.length === 0,
    errors: missing.map(varName => `Missing environment variable: ${varName}`)
  };
}

/**
 * Validate URL parameters for billing pages
 */
export function parseURLParams(searchParams: URLSearchParams): BillingURLParams {
  const params = {
    interval: searchParams.get('interval'),
    planId: searchParams.get('planId'),
    success: searchParams.get('success'),
    session_id: searchParams.get('session_id'),
    checkout_error: searchParams.get('checkout_error'),
  };
  
  // Filter out null values
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== null)
  );
  
  const result = BillingURLParamsSchema.safeParse(filtered);
  return result.success ? result.data : {};
}

/**
 * Create a type-safe API response validator
 */
export function createAPIResponseValidator<T>(dataSchema: z.ZodSchema<T>) {
  return BillingAPIResponseSchema(dataSchema);
}
