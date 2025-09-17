/**
 * Pricing helpers for mapping internal plan + interval -> Stripe Price IDs
 * Price IDs are injected via environment variables so infrastructure can vary per env.
 *
 * Expected environment variable naming convention (ALL UPPERCASE):
 *   STRIPE_PRICE_<PLAN>_<INTERVAL>
 *   e.g. STRIPE_PRICE_BASIC_MONTHLY, STRIPE_PRICE_PRO_YEARLY
 *
 * Supported plans / intervals should stay in sync with validation schemas & frontend pricing config.
 */

import { logger } from './logging';

export type PlanId = 'free' | 'basic' | 'pro' | 'extreme' | 'enterprise';
export type BillingInterval = 'monthly' | 'yearly';

const PLAN_IDS: PlanId[] = ['free', 'basic', 'pro', 'extreme', 'enterprise'];
const INTERVALS: BillingInterval[] = ['monthly', 'yearly'];

// Build a lazy cache of env derived price IDs
let priceCache: Record<string, string | null> | null = null;

function loadPriceCache(): Record<string, string | null> {
  if (priceCache) return priceCache;
  priceCache = {};
  for (const plan of PLAN_IDS) {
    if (plan === 'free') {
      // Free plan has no Stripe price
      for (const interval of INTERVALS) {
        priceCache[`${plan}:${interval}`] = null;
      }
      continue;
    }
    for (const interval of INTERVALS) {
      const envName = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
      priceCache[`${plan}:${interval}`] = process.env[envName] || null;
    }
  }
  return priceCache;
}

export function getPriceId(plan: PlanId, interval: BillingInterval): string | null {
  const cache = loadPriceCache();
  return cache[`${plan}:${interval}`] || null;
}

export function requirePriceId(plan: PlanId, interval: BillingInterval): string {
  const priceId = getPriceId(plan, interval);
  if (!priceId) {
    const envName = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
    logger.error('Missing Stripe price id environment variable', { plan, interval, envName });
    throw new Error(`Missing Stripe price id for ${plan} ${interval} (${envName})`);
  }
  return priceId;
}

export function isPlanUpgradable(plan: PlanId): boolean {
  return plan !== 'enterprise';
}

export function listConfiguredPrices(): Array<{ plan: PlanId; interval: BillingInterval; priceId: string | null }> {
  const cache = loadPriceCache();
  const out: Array<{ plan: PlanId; interval: BillingInterval; priceId: string | null }> = [];
  for (const plan of PLAN_IDS) {
    for (const interval of INTERVALS) {
      out.push({ plan, interval, priceId: cache[`${plan}:${interval}`] || null });
    }
  }
  return out;
}
