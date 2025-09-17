/**
 * Diatonic AI - Billing & Subscription Types
 * Comprehensive TypeScript types for Stripe integration
 */

import type { BillingInterval, PlanId } from '@/lib/pricing';

// ============================================================================
// CHECKOUT & PAYMENT TYPES
// ============================================================================

export interface CheckoutPayload {
  planId: PlanId;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResponse {
  id: string; // Stripe session ID
  url?: string; // Redirect URL (optional, fallback to redirectToCheckout)
  customerId: string;
  priceId: string;
  mode: 'subscription' | 'payment';
  status: 'open' | 'complete' | 'expired';
}

export interface BillingPortalResponse {
  url: string; // Stripe Customer Portal URL
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT TYPES
// ============================================================================

export type SubscriptionStatus = 
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'
  | 'none'; // No subscription

export interface SubscriptionRecord {
  // Core subscription info
  subscriptionId: string | null;
  customerId: string | null;
  status: SubscriptionStatus;
  
  // Plan details
  planId: PlanId;
  priceId: string | null;
  interval: BillingInterval;
  
  // Billing dates
  currentPeriodStart: string | null; // ISO date
  currentPeriodEnd: string | null; // ISO date
  trialEnd: string | null; // ISO date
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null; // ISO date
  
  // Usage and limits (from local database)
  usage?: SubscriptionUsage;
  limits?: SubscriptionLimits;
}

export interface SubscriptionUsage {
  agentsUsed: number;
  storageUsed: number; // in bytes
  apiCallsUsed: number;
  teamMembers: number;
  period: {
    start: string; // ISO date
    end: string; // ISO date
  };
}

export interface SubscriptionLimits {
  agents: number | 'unlimited';
  storage: number | 'unlimited'; // in bytes
  apiCalls: number | 'unlimited';
  teamMembers: number | 'unlimited';
  features: string[]; // Enabled feature flags
}

// ============================================================================
// STRIPE WEBHOOK TYPES
// ============================================================================

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  api_version: string;
  created: number;
  livemode: boolean;
}

export interface StripeCustomer {
  id: string;
  email: string | null;
  name: string | null;
  created: number;
  metadata: Record<string, string>;
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status: SubscriptionStatus;
  current_period_start: number;
  current_period_end: number;
  trial_end: number | null;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        unit_amount: number;
        currency: string;
        recurring: {
          interval: BillingInterval;
          interval_count: number;
        } | null;
      };
      quantity: number;
    }>;
  };
  metadata: Record<string, string>;
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

export interface BillingError {
  code: string;
  message: string;
  param?: string;
  type: 'card_error' | 'invalid_request_error' | 'api_error' | 'authentication_error' | 'rate_limit_error';
}

export interface APIError {
  error: {
    message: string;
    code?: string;
    param?: string;
    type?: string;
  };
  statusCode: number;
  requestId?: string;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface BillingUIState {
  // Loading states
  isLoadingSubscription: boolean;
  isLoadingCheckout: boolean;
  isLoadingPortal: boolean;
  
  // Error states
  subscriptionError: string | null;
  checkoutError: string | null;
  portalError: string | null;
  
  // Data
  subscription: SubscriptionRecord | null;
  
  // UI preferences
  selectedInterval: BillingInterval;
  showYearlyDiscount: boolean;
}

// ============================================================================
// FEATURE FLAGS & ENTITLEMENTS
// ============================================================================

export interface FeatureEntitlements {
  // Core features
  canCreateAgents: boolean;
  canUseAdvancedBuilder: boolean;
  canAccessTeamCollaboration: boolean;
  canUseCustomIntegrations: boolean;
  
  // Usage limits
  maxAgents: number | 'unlimited';
  maxStorage: number | 'unlimited'; // in bytes
  maxAPIRequests: number | 'unlimited';
  maxTeamMembers: number | 'unlimited';
  
  // Support level
  supportLevel: 'community' | 'email' | 'priority' | '24/7' | 'dedicated';
  
  // Additional features
  hasAnalytics: boolean;
  hasVersionControl: boolean;
  hasCustomBranding: boolean;
  hasOnPremiseDeployment: boolean;
  hasSLA: boolean;
}

// ============================================================================
// PAYMENT METHOD TYPES
// ============================================================================

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
  };
  billing_details: {
    address?: {
      city?: string;
      country?: string;
      line1?: string;
      line2?: string;
      postal_code?: string;
      state?: string;
    };
    email?: string;
    name?: string;
    phone?: string;
  };
  created: number;
}

// ============================================================================
// INVOICE & BILLING HISTORY TYPES
// ============================================================================

export interface Invoice {
  id: string;
  number: string | null;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  total: number; // in cents
  subtotal: number; // in cents
  tax: number | null; // in cents
  currency: string;
  created: number;
  due_date: number | null;
  paid_at: number | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  period_start: number;
  period_end: number;
  lines: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  description: string | null;
  amount: number; // in cents
  quantity: number;
  period: {
    start: number;
    end: number;
  };
  price?: {
    id: string;
    unit_amount: number | null;
    currency: string;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type BillingAction = 
  | 'upgrade'
  | 'downgrade' 
  | 'cancel'
  | 'reactivate'
  | 'change_payment_method'
  | 'view_invoices'
  | 'contact_support';

export interface BillingAnalytics {
  // Conversion tracking
  pageViews: number;
  checkoutStarted: number;
  checkoutCompleted: number;
  conversionRate: number;
  
  // Plan popularity
  planSelections: Record<PlanId, number>;
  intervalSelections: Record<BillingInterval, number>;
  
  // Revenue metrics (if permitted)
  monthlyRecurringRevenue?: number;
  averageRevenuePerUser?: number;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface BillingConfig {
  stripePublicKey: string;
  apiBaseUrl: string;
  enablePromotionCodes: boolean;
  enableTaxCalculation: boolean;
  defaultCurrency: string;
  supportedCurrencies: string[];
  
  // Feature flags
  enableYearlyBilling: boolean;
  enableTrialPeriods: boolean;
  enableCustomerPortal: boolean;
  
  // UI customization
  theme: {
    primaryColor: string;
    logoUrl?: string;
    brandName: string;
  };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isValidPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && 
    ['free', 'basic', 'pro', 'extreme', 'enterprise'].includes(value);
}

export function isValidBillingInterval(value: unknown): value is BillingInterval {
  return typeof value === 'string' && 
    ['monthly', 'yearly'].includes(value);
}

export function isValidSubscriptionStatus(value: unknown): value is SubscriptionStatus {
  return typeof value === 'string' && 
    ['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused', 'none'].includes(value);
}

// ============================================================================
// UTILITY TYPE HELPERS
// ============================================================================

export type RequiredBillingFields<T> = Required<Pick<T, keyof T>>;
export type OptionalBillingFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type SubscriptionWithUsage = SubscriptionRecord & {
  usage: SubscriptionUsage;
  limits: SubscriptionLimits;
};

export type BillingAPIResponse<T> = {
  success: true;
  data: T;
  message?: string;
} | {
  success: false;
  error: APIError;
  data?: never;
};
