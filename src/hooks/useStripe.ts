import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PlanId, PricingUtils, BillingInterval } from '@/lib/pricing';

interface StripeCheckoutOptions {
  planId: PlanId;
  billingInterval: BillingInterval;
  successUrl?: string;
  cancelUrl?: string;
  feature?: string; // For tracking which feature triggered the upgrade
}

interface StripeCheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
}

/**
 * Hook for Stripe billing integration
 * 
 * Provides functions to initiate Stripe Checkout sessions
 * and handle subscription management.
 */
export function useStripe() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Create a Stripe Checkout session for subscription upgrade
   */
  const createCheckoutSession = useCallback(async (options: StripeCheckoutOptions): Promise<StripeCheckoutResult> => {
    const { planId, billingInterval, successUrl, cancelUrl, feature } = options;
    
    setLoading(true);
    setError(null);
    
    try {
      // Validate plan has Stripe price ID
      if (!PricingUtils.hasStripePrice(planId, billingInterval)) {
        throw new Error(`No Stripe price ID configured for ${planId} ${billingInterval}`);
      }
      
      const priceId = PricingUtils.getStripePriceId(planId, billingInterval);
      if (!priceId) {
        throw new Error('Invalid price configuration');
      }
      
      // Prepare checkout data
      const checkoutData = {
        priceId,
        planId,
        billingInterval,
        userId: user?.id,
        userEmail: user?.email,
        successUrl: successUrl || `${window.location.origin}/dashboard?checkout=success&plan=${planId}`,
        cancelUrl: cancelUrl || `${window.location.origin}/pricing?checkout=cancelled&plan=${planId}`,
        metadata: {
          feature: feature || 'direct_upgrade',
          originalUrl: window.location.href
        }
      };
      
      // Call your backend API to create Stripe Checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}` // Adjust based on your auth implementation
        },
        body: JSON.stringify(checkoutData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create checkout session');
      }
      
      const { checkoutUrl } = await response.json();
      
      return {
        success: true,
        checkoutUrl
      };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  /**
   * Redirect to Stripe Checkout for immediate upgrade
   */
  const redirectToCheckout = useCallback(async (options: StripeCheckoutOptions) => {
    const result = await createCheckoutSession(options);
    
    if (result.success && result.checkoutUrl) {
      // Redirect to Stripe Checkout
      window.location.href = result.checkoutUrl;
    } else {
      // Handle error - could show a toast or error message
      console.error('Checkout failed:', result.error);
    }
  }, [createCheckoutSession]);
  
  /**
   * Quick upgrade function for direct plan selection
   */
  const upgradeToplan = useCallback(async (
    planId: PlanId, 
    billingInterval: BillingInterval = 'monthly',
    feature?: string
  ) => {
    await redirectToCheckout({
      planId,
      billingInterval,
      feature
    });
  }, [redirectToCheckout]);
  
  /**
   * Get customer portal URL for managing existing subscription
   */
  const getCustomerPortalUrl = useCallback(async (): Promise<string | null> => {
    if (!user?.id) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          userId: user.id,
          returnUrl: `${window.location.origin}/dashboard`
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create customer portal session');
      }
      
      const { portalUrl } = await response.json();
      return portalUrl;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  /**
   * Open customer portal in new tab
   */
  const openCustomerPortal = useCallback(async () => {
    const portalUrl = await getCustomerPortalUrl();
    if (portalUrl) {
      window.open(portalUrl, '_blank');
    }
  }, [getCustomerPortalUrl]);
  
  return {
    // State
    loading,
    error,
    
    // Functions
    createCheckoutSession,
    redirectToCheckout,
    upgradeToplan,
    getCustomerPortalUrl,
    openCustomerPortal,
    
    // Utilities
    clearError: () => setError(null)
  };
}

export default useStripe;