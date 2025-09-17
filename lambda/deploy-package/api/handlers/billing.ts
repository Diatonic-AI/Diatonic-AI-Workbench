// AI Nexus Workbench - Billing Handlers
// Stripe integration for subscription management

import { 
  APIRequest, 
  APIResponse, 
  StripeInstance, 
  StripeInvoice,
  StripeProduct,
  StripePaymentMethod
} from '../types';
import { 
  successResponse, 
  errorResponse,
  parseRequestBody
} from '../utils/api';
import { 
  updateItem,
  getItem,
  createItem,
  generateId,
  generateTimestamp,
  queryItems
} from '../utils/database';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { randomUUID } from 'crypto';

// Initialize Stripe SDK (lazy loading)
let stripeInstance: StripeInstance | null = null;

/**
 * Initialize Stripe client with secret key from AWS Secrets Manager
 */
const initializeStripe = async (): Promise<StripeInstance> => {
  if (stripeInstance) {
    return stripeInstance;
  }

  try {
    // Get Stripe secret key from AWS Secrets Manager
    const secretsClient = new SecretsManagerClient({ 
      region: process.env.AWS_REGION || 'us-east-2' 
    });

    const command = new GetSecretValueCommand({
      SecretId: '/ai-nexus/diatonicvisuals/stripe/secret_key'
    });

    const secret = await secretsClient.send(command);
    const stripeKey = secret.SecretString;

    if (!stripeKey) {
      throw new Error('Stripe secret key not found in Secrets Manager');
    }

    // Dynamically import Stripe
    const { default: Stripe } = await import('stripe');
    stripeInstance = new Stripe(stripeKey, {
      apiVersion: '2024-06-20',
      typescript: true,
    });

    return stripeInstance;
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    throw new Error('Stripe initialization failed');
  }
};

/**
 * Create a checkout session for subscription
 * POST /v1/tenants/{tenantId}/billing/checkout
 */
export const createCheckoutSession = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId } = event.pathParameters || {};
    const body = parseRequestBody(event);

    if (!tenantId) {
      return errorResponse('Tenant ID is required', 400, event.requestId);
    }

    if (!body || !body.priceId) {
      return errorResponse('Price ID is required', 400, event.requestId);
    }

    const { priceId, successUrl, cancelUrl, metadata = {} } = body;

    // Initialize Stripe
    const stripe = await initializeStripe();

    // Check if customer exists or create new one
    let stripeCustomerId: string;
    const existingCustomer = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `BILLING#CUSTOMER`,
    });

    if (existingCustomer?.stripeCustomerId) {
      stripeCustomerId = existingCustomer.stripeCustomerId;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        metadata: {
          tenantId,
          app: 'ai-nexus-workbench',
          environment: process.env.NODE_ENV || 'development',
          ...metadata
        }
      });

      stripeCustomerId = customer.id;

      // Save customer to DynamoDB
      await createItem({
        PK: `TENANT#${tenantId}`,
        SK: `BILLING#CUSTOMER`,
        entityType: 'BILLING_CUSTOMER',
        tenantId,
        stripeCustomerId: customer.id,
        createdAt: generateTimestamp(),
        updatedAt: generateTimestamp(),
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.APP_BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.APP_BASE_URL}/billing/cancelled`,
      metadata: {
        tenantId,
        ...metadata
      },
      allow_promotion_codes: process.env.ENABLE_PROMOTION_CODES === 'true',
      billing_address_collection: 'required',
      ...(process.env.ENABLE_TAX === 'true' && {
        automatic_tax: { enabled: true },
      }),
    });

    // Record checkout session
    await createItem({
      PK: `TENANT#${tenantId}`,
      SK: `CHECKOUT#${session.id}`,
      entityType: 'CHECKOUT_SESSION',
      tenantId,
      sessionId: session.id,
      stripeCustomerId,
      priceId,
      status: 'pending',
      createdAt: generateTimestamp(),
    });

    return successResponse({
      sessionId: session.id,
      url: session.url,
      customerId: stripeCustomerId,
    }, event.requestId);

  } catch (error) {
    console.error('Create checkout session error:', error);
    return errorResponse('Failed to create checkout session', 500, event.requestId);
  }
};

/**
 * Create customer portal session
 * POST /v1/tenants/{tenantId}/billing/portal
 */
export const createPortalSession = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId } = event.pathParameters || {};
    const body = parseRequestBody(event);

    if (!tenantId) {
      return errorResponse('Tenant ID is required', 400, event.requestId);
    }

    const { returnUrl } = body || {};

    // Get customer from DynamoDB
    const customer = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `BILLING#CUSTOMER`,
    });

    if (!customer?.stripeCustomerId) {
      return errorResponse('Customer not found', 404, event.requestId);
    }

    // Initialize Stripe and create portal session
    const stripe = await initializeStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: returnUrl || `${process.env.APP_BASE_URL}/billing`,
    });

    return successResponse({
      url: session.url,
    }, event.requestId);

  } catch (error) {
    console.error('Create portal session error:', error);
    return errorResponse('Failed to create portal session', 500, event.requestId);
  }
};

/**
 * Get subscription status
 * GET /v1/tenants/{tenantId}/billing/subscription
 */
export const getSubscriptionStatus = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId } = event.pathParameters || {};

    if (!tenantId) {
      return errorResponse('Tenant ID is required', 400, event.requestId);
    }

    // Get subscription from DynamoDB
    const subscription = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `BILLING#SUBSCRIPTION`,
    });

    if (!subscription) {
      return successResponse({
        hasSubscription: false,
        status: 'none',
        plan: 'free',
      }, event.requestId);
    }

    // Get additional subscription details from Stripe if needed
    const stripe = await initializeStripe();
    let stripeSubscription = null;
    
    if (subscription.stripeSubscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
      } catch (error) {
        console.warn('Failed to retrieve Stripe subscription:', error);
      }
    }

    return successResponse({
      hasSubscription: true,
      subscriptionId: subscription.stripeSubscriptionId,
      status: subscription.status || 'unknown',
      plan: subscription.planName || 'unknown',
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
      trialEnd: subscription.trialEnd,
      ...(stripeSubscription && {
        stripeStatus: stripeSubscription.status,
        items: stripeSubscription.items.data.map((item) => ({
          id: item.id,
          priceId: item.price.id,
          quantity: item.quantity,
        })),
      }),
    }, event.requestId);

  } catch (error) {
    console.error('Get subscription status error:', error);
    return errorResponse('Failed to get subscription status', 500, event.requestId);
  }
};

/**
 * Update subscription (change plan, quantity, etc.)
 * PUT /v1/tenants/{tenantId}/billing/subscription
 */
export const updateSubscription = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId } = event.pathParameters || {};
    const body = parseRequestBody(event);

    if (!tenantId) {
      return errorResponse('Tenant ID is required', 400, event.requestId);
    }

    if (!body) {
      return errorResponse('Request body is required', 400, event.requestId);
    }

    const { priceId, quantity = 1, prorationBehavior = 'create_prorations' } = body;

    // Get existing subscription
    const subscription = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `BILLING#SUBSCRIPTION`,
    });

    if (!subscription?.stripeSubscriptionId) {
      return errorResponse('No active subscription found', 404, event.requestId);
    }

    // Initialize Stripe and update subscription
    const stripe = await initializeStripe();
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

    if (!stripeSubscription) {
      return errorResponse('Stripe subscription not found', 404, event.requestId);
    }

    // Update subscription
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: priceId,
            quantity: quantity,
          },
        ],
        proration_behavior: prorationBehavior,
      }
    );

    // Update local record
    await updateItem({
      PK: `TENANT#${tenantId}`,
      SK: `BILLING#SUBSCRIPTION`,
    }, {
      status: updatedSubscription.status,
      currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
      updatedAt: generateTimestamp(),
    });

    return successResponse({
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
    }, event.requestId);

  } catch (error) {
    console.error('Update subscription error:', error);
    return errorResponse('Failed to update subscription', 500, event.requestId);
  }
};

/**
 * Cancel subscription
 * DELETE /v1/tenants/{tenantId}/billing/subscription
 */
export const cancelSubscription = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId } = event.pathParameters || {};
    const { atPeriodEnd = true } = event.queryStringParameters || {};

    if (!tenantId) {
      return errorResponse('Tenant ID is required', 400, event.requestId);
    }

    // Get existing subscription
    const subscription = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `BILLING#SUBSCRIPTION`,
    });

    if (!subscription?.stripeSubscriptionId) {
      return errorResponse('No active subscription found', 404, event.requestId);
    }

    // Initialize Stripe and cancel subscription
    const stripe = await initializeStripe();
    
    let cancelledSubscription;
    if (atPeriodEnd === 'true') {
      // Cancel at period end
      cancelledSubscription = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );
    } else {
      // Cancel immediately
      cancelledSubscription = await stripe.subscriptions.cancel(
        subscription.stripeSubscriptionId
      );
    }

    // Update local record
    await updateItem({
      PK: `TENANT#${tenantId}`,
      SK: `BILLING#SUBSCRIPTION`,
    }, {
      status: cancelledSubscription.status,
      cancelAtPeriodEnd: cancelledSubscription.cancel_at_period_end,
      updatedAt: generateTimestamp(),
    });

    return successResponse({
      subscriptionId: cancelledSubscription.id,
      status: cancelledSubscription.status,
      cancelAtPeriodEnd: cancelledSubscription.cancel_at_period_end,
      currentPeriodEnd: new Date(cancelledSubscription.current_period_end * 1000).toISOString(),
    }, event.requestId);

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return errorResponse('Failed to cancel subscription', 500, event.requestId);
  }
};

/**
 * Get billing history (invoices)
 * GET /v1/tenants/{tenantId}/billing/invoices
 */
export const getBillingHistory = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId } = event.pathParameters || {};
    const { limit = '10', startingAfter } = event.queryStringParameters || {};

    if (!tenantId) {
      return errorResponse('Tenant ID is required', 400, event.requestId);
    }

    // Get customer information
    const customer = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `BILLING#CUSTOMER`,
    });

    if (!customer?.stripeCustomerId) {
      return successResponse({
        invoices: [],
        hasMore: false,
      }, event.requestId);
    }

    // Initialize Stripe and get invoices
    const stripe = await initializeStripe();
    const invoices = await stripe.invoices.list({
      customer: customer.stripeCustomerId,
      limit: parseInt(limit, 10),
      ...(startingAfter && { starting_after: startingAfter }),
    });

    const formattedInvoices = invoices.data.map((invoice: StripeInvoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      total: invoice.total / 100, // Convert from cents
      currency: invoice.currency,
      created: new Date(invoice.created * 1000).toISOString(),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      paidAt: invoice.status_transitions?.paid_at ? 
        new Date(invoice.status_transitions.paid_at * 1000).toISOString() : null,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      periodStart: new Date(invoice.period_start * 1000).toISOString(),
      periodEnd: new Date(invoice.period_end * 1000).toISOString(),
      lines: invoice.lines.data.map((line) => ({
        description: line.description,
        amount: line.amount / 100,
        quantity: line.quantity,
        priceId: line.price?.id,
        period: {
          start: new Date(line.period.start * 1000).toISOString(),
          end: new Date(line.period.end * 1000).toISOString(),
        },
      })),
    }));

    return successResponse({
      invoices: formattedInvoices,
      hasMore: invoices.has_more,
    }, event.requestId);

  } catch (error) {
    console.error('Get billing history error:', error);
    return errorResponse('Failed to get billing history', 500, event.requestId);
  }
};

/**
 * Get available pricing plans
 * GET /v1/billing/plans
 */
export const getPricingPlans = async (event: APIRequest): Promise<APIResponse> => {
  try {
    // Initialize Stripe
    const stripe = await initializeStripe();

    // Get active products and prices
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    const plans = await Promise.all(
      products.data.map(async (product: StripeProduct) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
        });

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          metadata: product.metadata,
            prices: prices.data.map((price) => ({
            id: price.id,
            currency: price.currency,
            amount: price.unit_amount ? price.unit_amount / 100 : null,
            interval: price.recurring?.interval,
            intervalCount: price.recurring?.interval_count,
            type: price.type,
            trialPeriodDays: price.recurring?.trial_period_days,
          })),
        };
      })
    );

    return successResponse({
      plans: plans.filter(plan => plan.prices.length > 0),
    }, event.requestId);

  } catch (error) {
    console.error('Get pricing plans error:', error);
    return errorResponse('Failed to get pricing plans', 500, event.requestId);
  }
};

/**
 * Create setup intent for payment method
 * POST /v1/tenants/{tenantId}/billing/setup-intent
 */
export const createSetupIntent = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId } = event.pathParameters || {};

    if (!tenantId) {
      return errorResponse('Tenant ID is required', 400, event.requestId);
    }

    // Get or create customer
    let customer = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `BILLING#CUSTOMER`,
    });

    const stripe = await initializeStripe();

    if (!customer?.stripeCustomerId) {
      // Create new customer
      const stripeCustomer = await stripe.customers.create({
        metadata: {
          tenantId,
          app: 'ai-nexus-workbench',
        },
      });

      await createItem({
        PK: `TENANT#${tenantId}`,
        SK: `BILLING#CUSTOMER`,
        entityType: 'BILLING_CUSTOMER',
        tenantId,
        stripeCustomerId: stripeCustomer.id,
        createdAt: generateTimestamp(),
      });

      customer = { stripeCustomerId: stripeCustomer.id };
    }

    // Create setup intent
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });

    return successResponse({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    }, event.requestId);

  } catch (error) {
    console.error('Create setup intent error:', error);
    return errorResponse('Failed to create setup intent', 500, event.requestId);
  }
};

/**
 * Get customer payment methods
 * GET /v1/tenants/{tenantId}/billing/payment-methods
 */
export const getPaymentMethods = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { tenantId } = event.pathParameters || {};

    if (!tenantId) {
      return errorResponse('Tenant ID is required', 400, event.requestId);
    }

    // Get customer
    const customer = await getItem({
      PK: `TENANT#${tenantId}`,
      SK: `BILLING#CUSTOMER`,
    });

    if (!customer?.stripeCustomerId) {
      return successResponse({
        paymentMethods: [],
      }, event.requestId);
    }

    // Get payment methods from Stripe
    const stripe = await initializeStripe();
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.stripeCustomerId,
      type: 'card',
    });

    const formattedMethods = paymentMethods.data.map((pm: StripePaymentMethod) => ({
      id: pm.id,
      type: pm.type,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      } : null,
      created: new Date(pm.created * 1000).toISOString(),
    }));

    return successResponse({
      paymentMethods: formattedMethods,
    }, event.requestId);

  } catch (error) {
    console.error('Get payment methods error:', error);
    return errorResponse('Failed to get payment methods', 500, event.requestId);
  }
};
