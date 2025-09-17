/**
 * Diatonic AI - Pricing Data Model
 * Single source of truth for all pricing tiers, features, and Stripe price IDs
 */

import { Star, Zap, Crown, Building2, Rocket } from 'lucide-react';

export type BillingInterval = 'monthly' | 'yearly';
export type PlanId = 'free' | 'basic' | 'pro' | 'extreme' | 'enterprise';
export type CTAType = 'free' | 'checkout' | 'contact';

export interface PricingInfo {
  amount: number;
  currency: 'usd';
  stripePriceId?: string;
  originalAmount?: number; // For showing discounts
}

export interface PlanTier {
  id: PlanId;
  name: string;
  description: string;
  icon: typeof Star; // Lucide icon component
  features: string[];
  notIncluded?: string[];
  highlight?: boolean; // "Most Popular" badge
  enterprise?: boolean; // "Premium" badge
  cta: CTAType;
  price: Record<BillingInterval, PricingInfo>;
  limits?: Record<string, number | string>;
  metadata?: Record<string, any>;
}

/**
 * Centralized pricing configuration
 * 
 * ⚠️ IMPORTANT: Update Stripe price IDs for each environment:
 * - Development: Use Stripe test mode price IDs (price_test_xxx)
 * - Production: Use Stripe live mode price IDs (price_xxx)
 * 
 * To create price IDs in Stripe Dashboard:
 * 1. Products → Create product for each tier
 * 2. Add pricing for monthly/yearly intervals
 * 3. Copy price IDs and update below
 */
export const PRICING: Record<PlanId, PlanTier> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started with AI',
    icon: Star,
    cta: 'free',
    price: {
      monthly: { amount: 0, currency: 'usd' },
      yearly: { amount: 0, currency: 'usd' }
    },
    features: [
      '3 AI agents per month',
      'Basic visual builder',
      'Community support',
      'Public project sharing',
      'Basic templates library',
      '1 GB cloud storage',
      'Standard execution time'
    ],
    notIncluded: [
      'Advanced AI models',
      'Team collaboration',
      'Priority support'
    ],
    limits: {
      agents: 3,
      storage: '1GB',
      support: 'community'
    }
  },

  basic: {
    id: 'basic',
    name: 'Basic',
    description: 'Ideal for individual developers and hobbyists',
    icon: Zap,
    cta: 'checkout',
    price: {
      monthly: { 
        amount: 29, 
        currency: 'usd',
        stripePriceId: import.meta.env.VITE_PRICE_STARTER_MONTHLY || 'price_1QRTestBasicMonthly'
      },
      yearly: { 
        amount: 290, 
        currency: 'usd',
        originalAmount: 348, // Show $58 savings
        stripePriceId: import.meta.env.VITE_PRICE_STARTER_ANNUAL || 'price_1QRTestBasicYearly'
      }
    },
    features: [
      '25 AI agents per month',
      'Advanced visual builder',
      'Email support',
      'Private projects',
      'Premium templates library',
      '10 GB cloud storage',
      'Extended execution time',
      'Basic analytics',
      'Export functionality',
      'API access (100 calls/day)'
    ],
    notIncluded: [
      'Team collaboration',
      'Custom integrations'
    ],
    limits: {
      agents: 25,
      storage: '10GB',
      support: 'email',
      api_calls: 100
    }
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Best for professionals and small teams',
    icon: Crown,
    cta: 'checkout',
    highlight: true, // Most Popular
    price: {
      monthly: { 
        amount: 99, 
        currency: 'usd',
        stripePriceId: import.meta.env.VITE_PRICE_PREMIUM_MONTHLY || 'price_1QRTestProMonthly'
      },
      yearly: { 
        amount: 990, 
        currency: 'usd',
        originalAmount: 1188, // Show $198 savings
        stripePriceId: import.meta.env.VITE_PRICE_PREMIUM_ANNUAL || 'price_1QRTestProYearly'
      }
    },
    features: [
      '100 AI agents per month',
      'Full visual builder suite',
      'Priority support',
      'Team collaboration (5 members)',
      'Custom templates',
      '100 GB cloud storage',
      'Maximum execution time',
      'Advanced analytics & insights',
      'Multi-format export',
      'API access (1,000 calls/day)',
      'Custom integrations',
      'Version control',
      'Advanced debugging tools'
    ],
    limits: {
      agents: 100,
      storage: '100GB',
      support: 'priority',
      team_members: 5,
      api_calls: 1000
    }
  },

  extreme: {
    id: 'extreme',
    name: 'Extreme',
    description: 'For power users and growing teams',
    icon: Rocket,
    cta: 'checkout',
    price: {
      monthly: { 
        amount: 299, 
        currency: 'usd',
        stripePriceId: import.meta.env.VITE_PRICE_ENTERPRISE_MONTHLY || 'price_1QRTestExtremeMonthly'
      },
      yearly: { 
        amount: 2990, 
        currency: 'usd',
        originalAmount: 3588, // Show $598 savings
        stripePriceId: import.meta.env.VITE_PRICE_ENTERPRISE_ANNUAL || 'price_1QRTestExtremeYearly'
      }
    },
    features: [
      'Unlimited AI agents',
      'Professional builder suite',
      '24/7 priority support',
      'Team collaboration (20 members)',
      'Custom template creation',
      '500 GB cloud storage',
      'Unlimited execution time',
      'Real-time analytics dashboard',
      'White-label export options',
      'Unlimited API access',
      'Advanced integrations',
      'Git integration',
      'Professional debugging suite',
      'Custom model training',
      'A/B testing capabilities',
      'Advanced security features'
    ],
    limits: {
      agents: 'unlimited',
      storage: '500GB',
      support: '24/7',
      team_members: 20,
      api_calls: 'unlimited'
    }
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Tailored for large organizations',
    icon: Building2,
    cta: 'contact',
    enterprise: true, // Premium badge
    price: {
      monthly: { amount: 0, currency: 'usd' }, // Custom pricing
      yearly: { amount: 0, currency: 'usd' }
    },
    features: [
      'Unlimited everything',
      'Enterprise builder platform',
      'Dedicated support team',
      'Unlimited team members',
      'Custom development',
      'Unlimited cloud storage',
      'On-premises deployment',
      'Enterprise analytics',
      'Custom branding & export',
      'Enterprise API access',
      'Custom integrations',
      'Enterprise Git integration',
      'Enterprise debugging suite',
      'Dedicated model training',
      'Enterprise testing suite',
      'Enterprise security & compliance',
      'SLA guarantees',
      'Custom training & onboarding',
      'Dedicated account manager'
    ],
    limits: {
      agents: 'unlimited',
      storage: 'unlimited',
      support: 'dedicated',
      team_members: 'unlimited',
      api_calls: 'unlimited'
    }
  }
};

/**
 * Utility functions for pricing calculations and display
 */
export class PricingUtils {
  /**
   * Get plan by ID with type safety
   */
  static getPlan(planId: PlanId): PlanTier {
    const plan = PRICING[planId];
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }
    return plan;
  }

  /**
   * Format price for display
   */
  static formatPrice(amount: number, currency: string = 'USD'): string {
    if (amount === 0) return 'Free';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Calculate savings for yearly plans
   */
  static calculateYearlySavings(planId: PlanId): number {
    const plan = this.getPlan(planId);
    const monthly = plan.price.monthly.amount * 12;
    const yearly = plan.price.yearly.amount;
    return monthly - yearly;
  }

  /**
   * Get savings percentage for yearly plans
   */
  static getYearlySavingsPercent(planId: PlanId): number {
    if (planId === 'free' || planId === 'enterprise') return 0;
    
    const plan = this.getPlan(planId);
    const monthlyTotal = plan.price.monthly.amount * 12;
    const yearly = plan.price.yearly.amount;
    
    if (monthlyTotal === 0) return 0;
    return Math.round(((monthlyTotal - yearly) / monthlyTotal) * 100);
  }

  /**
   * Check if plan has Stripe price ID for given interval
   */
  static hasStripePrice(planId: PlanId, interval: BillingInterval): boolean {
    const plan = this.getPlan(planId);
    return Boolean(plan.price[interval].stripePriceId);
  }

  /**
   * Get Stripe price ID for plan and interval
   */
  static getStripePriceId(planId: PlanId, interval: BillingInterval): string | null {
    const plan = this.getPlan(planId);
    return plan.price[interval].stripePriceId || null;
  }

  /**
   * Get all plans that require checkout (have Stripe price IDs)
   */
  static getCheckoutPlans(): PlanTier[] {
    return Object.values(PRICING).filter(plan => plan.cta === 'checkout');
  }

  /**
   * Validate pricing configuration
   */
  static validatePricing(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    Object.entries(PRICING).forEach(([planId, plan]) => {
      // Check that checkout plans have Stripe price IDs
      if (plan.cta === 'checkout') {
        ['monthly', 'yearly'].forEach(interval => {
          const priceInfo = plan.price[interval as BillingInterval];
          if (priceInfo.amount > 0 && !priceInfo.stripePriceId) {
            errors.push(`${planId} ${interval} plan missing Stripe price ID`);
          }
        });
      }

      // Check required fields
      if (!plan.name || !plan.description || !plan.features.length) {
        errors.push(`${planId} plan missing required fields`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Default billing interval (can be overridden by URL params or localStorage)
 */
// Export alias for backward compatibility
export const PRICING_TIERS = PRICING;

export const DEFAULT_BILLING_INTERVAL: BillingInterval = 'monthly';

/**
 * Feature categories for better organization in UI
 */
export const FEATURE_CATEGORIES = {
  USAGE: 'Usage & Limits',
  FEATURES: 'Features',
  SUPPORT: 'Support',
  COLLABORATION: 'Collaboration',
  INTEGRATION: 'Integration & API',
  SECURITY: 'Security & Compliance'
} as const;

export type FeatureCategory = typeof FEATURE_CATEGORIES[keyof typeof FEATURE_CATEGORIES];
