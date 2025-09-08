/**
 * Stripe SDK Integration with Lazy Secret Loading
 * AI Nexus Workbench - Diatonicvisuals Tenant
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import Stripe from 'stripe';

import { logger } from './logging';

// Stripe instance cache to avoid re-initialization
let stripeInstance: Stripe | null = null;
let secretsClient: SecretsManagerClient | null = null;

/**
 * Get Secrets Manager client (cached)
 */
function getSecretsClient(): SecretsManagerClient {
  if (!secretsClient) {
    secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-2',
    });
  }
  return secretsClient;
}

/**
 * Fetch secret from AWS Secrets Manager
 */
async function getSecretValue(secretArn: string): Promise<string> {
  try {
    const client = getSecretsClient();
    const command = new GetSecretValueCommand({
      SecretId: secretArn,
    });
    
    const response = await client.send(command);
    
    if (!response.SecretString) {
      throw new Error(`Secret string not found for ARN: ${secretArn}`);
    }
    
    return response.SecretString;
  } catch (error) {
    logger.error('Failed to fetch secret from Secrets Manager', {
      secretArn,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Initialize Stripe instance with secret from AWS Secrets Manager
 * Cached to avoid multiple secret fetches
 */
export async function getStripeInstance(): Promise<Stripe> {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretArn = process.env.STRIPE_SECRET_ARN;
  if (!secretArn) {
    throw new Error('STRIPE_SECRET_ARN environment variable not set');
  }

  try {
    logger.info('Initializing Stripe instance', { secretArn });
    
    const apiKey = await getSecretValue(secretArn);
    
    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2025-02-24.acacia', // Pin API version for consistency
      typescript: true,
      telemetry: false, // Disable telemetry for Lambda
      maxNetworkRetries: 3,
      timeout: 10000, // 10 second timeout
      appInfo: {
        name: 'AI Nexus Workbench',
        version: '1.0.0',
        url: 'https://ai-nexus.diatonicvisuals.com',
      },
    });

    logger.info('Stripe instance initialized successfully');
    return stripeInstance;
  } catch (error) {
    logger.error('Failed to initialize Stripe instance', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Verify Stripe webhook signature
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookSecretArn: string
): Promise<Stripe.Event> {
  try {
    const webhookSecret = await getSecretValue(webhookSecretArn);
    const stripe = await getStripeInstance();
    
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    
    logger.info('Webhook signature verified successfully', {
      eventType: event.type,
      eventId: event.id,
    });
    
    return event;
  } catch (error) {
    logger.error('Webhook signature verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Create Stripe customer with tenant metadata
 */
export async function createStripeCustomer(params: {
  email: string;
  userId: string;
  tenantId: string;
  name?: string;
  phone?: string;
}): Promise<Stripe.Customer> {
  const stripe = await getStripeInstance();
  
  try {
    const customer = await stripe.customers.create({
      email: params.email,
      name: params.name,
      phone: params.phone,
      metadata: {
        tenant_id: params.tenantId,
        user_id: params.userId,
        app: 'ai-nexus-workbench',
      },
    });
    
    logger.info('Stripe customer created', {
      customerId: customer.id,
      userId: params.userId,
      tenantId: params.tenantId,
    });
    
    return customer;
  } catch (error) {
    logger.error('Failed to create Stripe customer', {
      userId: params.userId,
      tenantId: params.tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get or create Stripe customer
 */
export async function getOrCreateStripeCustomer(params: {
  email: string;
  userId: string;
  tenantId: string;
  name?: string;
  phone?: string;
}): Promise<Stripe.Customer> {
  const stripe = await getStripeInstance();
  
  try {
    // First, try to find existing customer by email and metadata
    const existingCustomers = await stripe.customers.list({
      email: params.email,
      limit: 1,
    });
    
    // Check if any existing customer has matching tenant metadata
    const existingCustomer = existingCustomers.data.find(
      customer => customer.metadata?.tenant_id === params.tenantId &&
                   customer.metadata?.user_id === params.userId
    );
    
    if (existingCustomer) {
      logger.info('Found existing Stripe customer', {
        customerId: existingCustomer.id,
        userId: params.userId,
        tenantId: params.tenantId,
      });
      return existingCustomer;
    }
    
    // Create new customer if none found
    return await createStripeCustomer(params);
  } catch (error) {
    logger.error('Failed to get or create Stripe customer', {
      userId: params.userId,
      tenantId: params.tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Create checkout session with tenant metadata
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
  tenantId: string;
  trialPeriodDays?: number;
  allowPromotionCodes?: boolean;
  automaticTax?: boolean;
}): Promise<Stripe.Checkout.Session> {
  const stripe = await getStripeInstance();
  
  try {
    const session = await stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      line_items: [{
        price: params.priceId,
        quantity: 1,
      }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.userId,
      subscription_data: {
        trial_period_days: params.trialPeriodDays,
        metadata: {
          tenant_id: params.tenantId,
          user_id: params.userId,
          app: 'ai-nexus-workbench',
        },
      },
      allow_promotion_codes: params.allowPromotionCodes ?? true,
      automatic_tax: params.automaticTax ? { enabled: true } : undefined,
      metadata: {
        tenant_id: params.tenantId,
        user_id: params.userId,
        app: 'ai-nexus-workbench',
      },
    });
    
    logger.info('Checkout session created', {
      sessionId: session.id,
      customerId: params.customerId,
      priceId: params.priceId,
      userId: params.userId,
      tenantId: params.tenantId,
    });
    
    return session;
  } catch (error) {
    logger.error('Failed to create checkout session', {
      customerId: params.customerId,
      priceId: params.priceId,
      userId: params.userId,
      tenantId: params.tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Create billing portal session
 */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const stripe = await getStripeInstance();
  
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
    
    logger.info('Billing portal session created', {
      sessionId: session.id,
      customerId: params.customerId,
    });
    
    return session;
  } catch (error) {
    logger.error('Failed to create billing portal session', {
      customerId: params.customerId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Create setup intent for payment method collection
 */
export async function createSetupIntent(params: {
  customerId: string;
  usage?: 'off_session' | 'on_session';
}): Promise<Stripe.SetupIntent> {
  const stripe = await getStripeInstance();
  
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: params.customerId,
      usage: params.usage ?? 'off_session',
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    logger.info('Setup intent created', {
      setupIntentId: setupIntent.id,
      customerId: params.customerId,
    });
    
    return setupIntent;
  } catch (error) {
    logger.error('Failed to create setup intent', {
      customerId: params.customerId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Validate tenant metadata on Stripe object
 */
export function validateTenantMetadata(
  metadata: { [key: string]: string } | null | undefined,
  expectedTenantId: string
): boolean {
  return (
    metadata?.tenant_id === expectedTenantId &&
    metadata?.app === 'ai-nexus-workbench'
  );
}

/**
 * Format amount for display (cents to dollars)
 */
export function formatAmount(amountInCents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amountInCents / 100);
}

/**
 * Extract user ID from Stripe metadata with validation
 */
export function extractUserIdFromMetadata(
  metadata: { [key: string]: string } | null | undefined
): string | null {
  if (!metadata?.user_id || !metadata?.tenant_id) {
    return null;
  }
  
  return metadata.user_id;
}
