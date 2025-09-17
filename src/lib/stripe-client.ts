/**
 * Diatonic AI - Stripe Client
 * Lazy-loaded Stripe instance with environment validation
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

// Cached Stripe promise to avoid multiple initializations
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Initialize and return Stripe client instance
 * Lazy loads Stripe.js and validates environment variables
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    // Get Stripe public key from environment
    const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    
    if (!stripePublicKey) {
      console.error('VITE_STRIPE_PUBLIC_KEY environment variable is not set');
      // Return a rejected promise to maintain Promise<Stripe | null> type
      stripePromise = Promise.resolve(null);
      return stripePromise;
    }

    // Validate the key format
    if (!stripePublicKey.startsWith('pk_')) {
      console.error('Invalid Stripe public key format. Must start with "pk_"');
      stripePromise = Promise.resolve(null);
      return stripePromise;
    }

    // Initialize Stripe with configuration
    stripePromise = loadStripe(stripePublicKey, {
      // Optional Stripe.js configuration
      apiVersion: '2024-06-20', // Pin API version for consistency
      stripeAccount: undefined, // Use default account unless specified
      locale: 'en', // Set locale for error messages
    }).catch(error => {
      console.error('Failed to load Stripe.js:', error);
      return null;
    });
  }

  return stripePromise;
};

/**
 * Check if Stripe is properly configured
 * Useful for feature flags and conditional rendering
 */
export const isStripeConfigured = (): boolean => {
  const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  return Boolean(stripePublicKey && stripePublicKey.startsWith('pk_'));
};

/**
 * Get Stripe environment (test/live) from public key
 */
export const getStripeEnvironment = (): 'test' | 'live' | 'unknown' => {
  const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  
  if (!stripePublicKey) return 'unknown';
  
  if (stripePublicKey.startsWith('pk_test_')) return 'test';
  if (stripePublicKey.startsWith('pk_live_')) return 'live';
  
  return 'unknown';
};

/**
 * Validate Stripe configuration and return status
 */
export const validateStripeConfig = (): {
  isValid: boolean;
  environment: 'test' | 'live' | 'unknown';
  errors: string[];
} => {
  const errors: string[] = [];
  const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  
  if (!stripePublicKey) {
    errors.push('Missing VITE_STRIPE_PUBLIC_KEY environment variable');
  } else if (!stripePublicKey.startsWith('pk_')) {
    errors.push('Invalid Stripe public key format');
  }
  
  return {
    isValid: errors.length === 0,
    environment: getStripeEnvironment(),
    errors
  };
};

/**
 * Safe wrapper for Stripe operations with error handling
 * Usage: await withStripe(stripe => stripe.redirectToCheckout({ sessionId }))
 */
export const withStripe = async <T>(
  operation: (stripe: Stripe) => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> => {
  try {
    const stripe = await getStripe();
    
    if (!stripe) {
      return {
        success: false,
        error: 'Stripe is not properly configured. Please check your environment variables.'
      };
    }
    
    const result = await operation(stripe);
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Stripe error occurred';
    console.error('Stripe operation failed:', error);
    
    return {
      success: false,
      error: message
    };
  }
};

/**
 * Redirect to Stripe Checkout with error handling
 */
export const redirectToCheckout = async (sessionId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  const result = await withStripe(stripe => 
    stripe.redirectToCheckout({ sessionId })
  );
  
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  // Check for Stripe-specific errors
  const { error } = result.data;
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
};

/**
 * Create payment element (for custom checkout flows)
 * Note: This requires @stripe/react-stripe-js if implementing custom checkout
 */
export const createPaymentElement = async (clientSecret: string): Promise<{
  success: boolean;
  stripe?: Stripe;
  error?: string;
}> => {
  const result = await withStripe(async stripe => {
    // Return Stripe instance for use with Elements
    return stripe;
  });
  
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  return { success: true, stripe: result.data };
};

/**
 * Format Stripe errors for user display
 */
export const formatStripeError = (error: any): string => {
  // Handle Stripe-specific error types
  if (error?.type) {
    switch (error.type) {
      case 'card_error':
        return error.message || 'Your card was declined. Please try a different payment method.';
      case 'validation_error':
        return error.message || 'Please check your card details and try again.';
      case 'api_connection_error':
        return 'Network error occurred. Please check your internet connection and try again.';
      case 'rate_limit_error':
        return 'Too many requests. Please wait a moment and try again.';
      case 'authentication_error':
        return 'Authentication failed. Please refresh the page and try again.';
      case 'invalid_request_error':
        return 'Invalid request. Please contact support if this issue persists.';
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }
  
  // Handle generic errors
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Development helper: log Stripe configuration status
 */
if (import.meta.env.DEV) {
  const config = validateStripeConfig();
  console.log('🔧 Stripe Configuration:', {
    isValid: config.isValid,
    environment: config.environment,
    errors: config.errors
  });
}

// Export types for use in components
export type StripeError = {
  type?: string;
  message?: string;
  code?: string;
  param?: string;
};

export type StripeRedirectResult = {
  error?: StripeError;
};
