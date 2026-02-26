import { EventBridgeHandler, Context } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommand, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import Stripe from 'stripe';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-2',
});

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-2',
});

const eventBridgeClient = new EventBridgeClient({
  region: process.env.AWS_REGION || 'us-east-2',
});

// Stripe client (initialized on first use)
let stripe: Stripe | null = null;

interface BillingEvent {
  type: string;
  tenantId?: string;
  customerId?: string;
  subscriptionId?: string;
  planId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  eventTimestamp: string;
  metadata?: Record<string, unknown>;
}

interface TenantBillingInfo {
  tenantId: string;
  customerId: string;
  subscriptionId?: string;
  plan: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  lastPayment?: {
    amount: number;
    currency: string;
    status: string;
    date: string;
  };
}

/**
 * Billing processor Lambda for handling Stripe webhooks and subscription events
 */
export const handler: EventBridgeHandler<string, BillingEvent, void> = async (
  event,
  context: Context
): Promise<void> => {
  console.log('Billing processor triggered', {
    requestId: context.awsRequestId,
    source: event.source,
    detailType: event['detail-type'],
    time: event.time,
  });

  try {
    const billingEvent = event.detail;
    
    console.log('Processing billing event', {
      type: billingEvent.type,
      tenantId: billingEvent.tenantId,
      customerId: billingEvent.customerId,
      subscriptionId: billingEvent.subscriptionId,
    });

    // Initialize Stripe client if not already done
    if (!stripe) {
      stripe = await initializeStripe();
    }

    // Route event based on type
    switch (billingEvent.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(billingEvent);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(billingEvent);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(billingEvent);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(billingEvent);
        break;
        
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(billingEvent);
        break;
        
      case 'customer.created':
        await handleCustomerCreated(billingEvent);
        break;
        
      default:
        console.log(`Unhandled billing event type: ${billingEvent.type}`);
        break;
    }

    console.log('Billing event processed successfully', {
      type: billingEvent.type,
      tenantId: billingEvent.tenantId,
    });

  } catch (error) {
    console.error('Billing processing error:', {
      error: error.message,
      stack: error.stack,
      event: event.detail,
    });
    
    // Re-throw for DLQ processing
    throw error;
  }
};

/**
 * Initialize Stripe client with secrets from AWS Secrets Manager
 */
async function initializeStripe(): Promise<Stripe> {
  const command = new GetSecretValueCommand({
    SecretId: process.env.STRIPE_SECRET_NAME,
  });

  const response = await secretsClient.send(command);
  const secrets = JSON.parse(response.SecretString || '{}');
  
  if (!secrets.secret_key) {
    throw new Error('Stripe secret key not found in secrets manager');
  }

  console.log('Stripe client initialized');
  
  return new Stripe(secrets.secret_key, {
    apiVersion: '2023-10-16',
  });
}

/**
 * Handle subscription creation or update events
 */
async function handleSubscriptionChange(billingEvent: BillingEvent): Promise<void> {
  if (!billingEvent.subscriptionId || !billingEvent.customerId) {
    console.error('Missing subscription or customer ID');
    return;
  }

  try {
    // Get subscription details from Stripe
    const subscription = await stripe!.subscriptions.retrieve(billingEvent.subscriptionId, {
      expand: ['customer', 'items.data.price.product'],
    });

    // Get customer to find tenant mapping
    const customer = subscription.customer as Stripe.Customer;
    const tenantId = customer.metadata.tenant_id;

    if (!tenantId) {
      console.error('Customer missing tenant_id metadata', { customerId: customer.id });
      return;
    }

    // Extract subscription details
    const subscriptionItem = subscription.items.data[0];
    const product = subscriptionItem.price.product as Stripe.Product;
    
    const billingInfo: TenantBillingInfo = {
      tenantId,
      customerId: customer.id,
      subscriptionId: subscription.id,
      plan: product.metadata.plan_id || 'unknown',
      status: mapStripeStatus(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : undefined,
    };

    // Update tenant billing information
    await updateTenantBilling(tenantId, billingInfo);

    // Update tenant plan and quotas
    await updateTenantPlan(tenantId, billingInfo.plan, billingInfo.status);

    // Emit internal billing event
    await emitBillingEvent({
      type: 'subscription_updated',
      tenantId,
      customerId: customer.id,
      subscriptionId: subscription.id,
      planId: billingInfo.plan,
      status: billingInfo.status,
      eventTimestamp: new Date().toISOString(),
      metadata: {
        previousPlan: billingEvent.metadata?.previousPlan,
        trialEnd: billingInfo.trialEnd,
        cancelAtPeriodEnd: billingInfo.cancelAtPeriodEnd,
      },
    });

    console.log('Subscription updated', {
      tenantId,
      subscriptionId: subscription.id,
      plan: billingInfo.plan,
      status: billingInfo.status,
    });

  } catch (error) {
    console.error('Error handling subscription change:', error);
    throw error;
  }
}

/**
 * Handle subscription cancellation events
 */
async function handleSubscriptionCanceled(billingEvent: BillingEvent): Promise<void> {
  if (!billingEvent.subscriptionId || !billingEvent.customerId) {
    console.error('Missing subscription or customer ID');
    return;
  }

  try {
    // Get customer to find tenant mapping
    const customer = await stripe!.customers.retrieve(billingEvent.customerId);
    const tenantId = (customer as Stripe.Customer).metadata.tenant_id;

    if (!tenantId) {
      console.error('Customer missing tenant_id metadata', { customerId: billingEvent.customerId });
      return;
    }

    // Update tenant to free plan
    await updateTenantPlan(tenantId, 'free', 'canceled');

    // Update billing information
    const billingInfo: Partial<TenantBillingInfo> = {
      tenantId,
      customerId: billingEvent.customerId,
      plan: 'free',
      status: 'canceled',
    };

    await updateTenantBilling(tenantId, billingInfo);

    // Emit internal billing event
    await emitBillingEvent({
      type: 'subscription_canceled',
      tenantId,
      customerId: billingEvent.customerId,
      subscriptionId: billingEvent.subscriptionId,
      planId: 'free',
      status: 'canceled',
      eventTimestamp: new Date().toISOString(),
    });

    console.log('Subscription canceled', {
      tenantId,
      subscriptionId: billingEvent.subscriptionId,
    });

  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
    throw error;
  }
}

/**
 * Handle successful payment events
 */
async function handlePaymentSucceeded(billingEvent: BillingEvent): Promise<void> {
  if (!billingEvent.customerId) {
    console.error('Missing customer ID');
    return;
  }

  try {
    // Get customer to find tenant mapping
    const customer = await stripe!.customers.retrieve(billingEvent.customerId);
    const tenantId = (customer as Stripe.Customer).metadata.tenant_id;

    if (!tenantId) {
      console.error('Customer missing tenant_id metadata', { customerId: billingEvent.customerId });
      return;
    }

    // Update last payment information
    const paymentInfo = {
      amount: billingEvent.amount || 0,
      currency: billingEvent.currency || 'usd',
      status: 'succeeded',
      date: new Date().toISOString(),
    };

    await updateLastPayment(tenantId, paymentInfo);

    // If tenant was past due, reactivate their plan
    const tenantInfo = await getTenantBilling(tenantId);
    if (tenantInfo && tenantInfo.status === 'past_due') {
      await updateTenantPlan(tenantId, tenantInfo.plan, 'active');
    }

    // Emit internal billing event
    await emitBillingEvent({
      type: 'payment_succeeded',
      tenantId,
      customerId: billingEvent.customerId,
      amount: billingEvent.amount,
      currency: billingEvent.currency,
      eventTimestamp: new Date().toISOString(),
    });

    console.log('Payment succeeded', {
      tenantId,
      customerId: billingEvent.customerId,
      amount: billingEvent.amount,
      currency: billingEvent.currency,
    });

  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

/**
 * Handle failed payment events
 */
async function handlePaymentFailed(billingEvent: BillingEvent): Promise<void> {
  if (!billingEvent.customerId) {
    console.error('Missing customer ID');
    return;
  }

  try {
    // Get customer to find tenant mapping
    const customer = await stripe!.customers.retrieve(billingEvent.customerId);
    const tenantId = (customer as Stripe.Customer).metadata.tenant_id;

    if (!tenantId) {
      console.error('Customer missing tenant_id metadata', { customerId: billingEvent.customerId });
      return;
    }

    // Update tenant status to past_due
    const tenantInfo = await getTenantBilling(tenantId);
    if (tenantInfo) {
      await updateTenantPlan(tenantId, tenantInfo.plan, 'past_due');
    }

    // Emit internal billing event for notifications
    await emitBillingEvent({
      type: 'payment_failed',
      tenantId,
      customerId: billingEvent.customerId,
      amount: billingEvent.amount,
      currency: billingEvent.currency,
      eventTimestamp: new Date().toISOString(),
      metadata: {
        requiresAction: true,
      },
    });

    console.log('Payment failed', {
      tenantId,
      customerId: billingEvent.customerId,
      amount: billingEvent.amount,
    });

  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
}

/**
 * Handle trial ending soon events
 */
async function handleTrialWillEnd(billingEvent: BillingEvent): Promise<void> {
  if (!billingEvent.customerId || !billingEvent.subscriptionId) {
    console.error('Missing customer or subscription ID');
    return;
  }

  try {
    // Get customer to find tenant mapping
    const customer = await stripe!.customers.retrieve(billingEvent.customerId);
    const tenantId = (customer as Stripe.Customer).metadata.tenant_id;

    if (!tenantId) {
      console.error('Customer missing tenant_id metadata', { customerId: billingEvent.customerId });
      return;
    }

    // Emit internal billing event for notifications
    await emitBillingEvent({
      type: 'trial_ending_soon',
      tenantId,
      customerId: billingEvent.customerId,
      subscriptionId: billingEvent.subscriptionId,
      eventTimestamp: new Date().toISOString(),
      metadata: {
        requiresAction: true,
        trialEnd: billingEvent.metadata?.trialEnd,
      },
    });

    console.log('Trial will end notification', {
      tenantId,
      subscriptionId: billingEvent.subscriptionId,
    });

  } catch (error) {
    console.error('Error handling trial will end:', error);
    throw error;
  }
}

/**
 * Handle customer creation events
 */
async function handleCustomerCreated(billingEvent: BillingEvent): Promise<void> {
  if (!billingEvent.customerId) {
    console.error('Missing customer ID');
    return;
  }

  try {
    // Get customer details from Stripe
    const customer = await stripe!.customers.retrieve(billingEvent.customerId);
    const tenantId = (customer as Stripe.Customer).metadata.tenant_id;

    if (!tenantId) {
      console.log('Customer created without tenant_id metadata', { customerId: billingEvent.customerId });
      return;
    }

    // Initialize tenant billing information
    const billingInfo: Partial<TenantBillingInfo> = {
      tenantId,
      customerId: billingEvent.customerId,
      plan: 'free',
      status: 'active',
    };

    await updateTenantBilling(tenantId, billingInfo);

    // Emit internal billing event
    await emitBillingEvent({
      type: 'customer_created',
      tenantId,
      customerId: billingEvent.customerId,
      planId: 'free',
      status: 'active',
      eventTimestamp: new Date().toISOString(),
    });

    console.log('Customer created and linked', {
      tenantId,
      customerId: billingEvent.customerId,
    });

  } catch (error) {
    console.error('Error handling customer creation:', error);
    throw error;
  }
}

/**
 * Update tenant billing information in database
 */
async function updateTenantBilling(tenantId: string, billingInfo: Partial<TenantBillingInfo>): Promise<void> {
  const key = {
    PK: `TENANT#${tenantId}`,
    SK: 'BILLING',
  };

  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, unknown> = {};
  
  if (billingInfo.customerId) {
    updateExpressions.push('customerId = :customerId');
    expressionAttributeValues[':customerId'] = billingInfo.customerId;
  }
  
  if (billingInfo.subscriptionId) {
    updateExpressions.push('subscriptionId = :subscriptionId');
    expressionAttributeValues[':subscriptionId'] = billingInfo.subscriptionId;
  }
  
  if (billingInfo.plan) {
    updateExpressions.push('plan = :plan');
    expressionAttributeValues[':plan'] = billingInfo.plan;
  }
  
  if (billingInfo.status) {
    updateExpressions.push('#status = :status');
    expressionAttributeValues[':status'] = billingInfo.status;
  }
  
  if (billingInfo.currentPeriodStart) {
    updateExpressions.push('currentPeriodStart = :periodStart');
    expressionAttributeValues[':periodStart'] = billingInfo.currentPeriodStart;
  }
  
  if (billingInfo.currentPeriodEnd) {
    updateExpressions.push('currentPeriodEnd = :periodEnd');
    expressionAttributeValues[':periodEnd'] = billingInfo.currentPeriodEnd;
  }

  updateExpressions.push('lastUpdated = :lastUpdated');
  expressionAttributeValues[':lastUpdated'] = new Date().toISOString();

  const command = new UpdateItemCommand({
    TableName: process.env.TENANTS_TABLE_NAME,
    Key: marshall(key),
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: updateExpressions.some(expr => expr.includes('#status')) ? { '#status': 'status' } : undefined,
    ExpressionAttributeValues: marshall(expressionAttributeValues),
  });

  await dynamoClient.send(command);
}

/**
 * Update tenant plan and associated quotas
 */
async function updateTenantPlan(tenantId: string, plan: string, status: string): Promise<void> {
  // Update main tenant record
  const key = {
    PK: `TENANT#${tenantId}`,
    SK: 'CONFIG',
  };

  const quotas = getPlanQuotas(plan);
  const features = getPlanFeatures(plan);

  const command = new UpdateItemCommand({
    TableName: process.env.TENANTS_TABLE_NAME,
    Key: marshall(key),
    UpdateExpression: 'SET plan = :plan, #status = :status, quotas = :quotas, features = :features, lastUpdated = :lastUpdated',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: marshall({
      ':plan': plan,
      ':status': status,
      ':quotas': quotas,
      ':features': features,
      ':lastUpdated': new Date().toISOString(),
    }),
  });

  await dynamoClient.send(command);

  console.log('Tenant plan updated', { tenantId, plan, status });
}

/**
 * Update last payment information
 */
async function updateLastPayment(tenantId: string, paymentInfo: TenantBillingInfo['lastPayment']): Promise<void> {
  const key = {
    PK: `TENANT#${tenantId}`,
    SK: 'BILLING',
  };

  const command = new UpdateItemCommand({
    TableName: process.env.TENANTS_TABLE_NAME,
    Key: marshall(key),
    UpdateExpression: 'SET lastPayment = :payment, lastUpdated = :lastUpdated',
    ExpressionAttributeValues: marshall({
      ':payment': paymentInfo,
      ':lastUpdated': new Date().toISOString(),
    }),
  });

  await dynamoClient.send(command);
}

/**
 * Get tenant billing information
 */
async function getTenantBilling(tenantId: string): Promise<TenantBillingInfo | null> {
  const key = {
    PK: `TENANT#${tenantId}`,
    SK: 'BILLING',
  };

  const command = new GetItemCommand({
    TableName: process.env.TENANTS_TABLE_NAME,
    Key: marshall(key),
  });

  const response = await dynamoClient.send(command);
  
  if (!response.Item) {
    return null;
  }

  return unmarshall(response.Item) as TenantBillingInfo;
}

/**
 * Emit internal billing event to EventBridge
 */
async function emitBillingEvent(billingEvent: BillingEvent): Promise<void> {
  const event = {
    Source: 'diatonic-ai.billing',
    DetailType: 'Billing Event',
    Detail: JSON.stringify(billingEvent),
  };

  const command = new PutEventsCommand({
    Entries: [event],
  });

  await eventBridgeClient.send(command);
}

/**
 * Map Stripe subscription status to internal status
 */
function mapStripeStatus(stripeStatus: string): TenantBillingInfo['status'] {
  const statusMap: Record<string, TenantBillingInfo['status']> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    incomplete: 'unpaid',
    incomplete_expired: 'canceled',
  };

  return statusMap[stripeStatus] || 'unpaid';
}

/**
 * Get quotas for a specific plan
 */
function getPlanQuotas(plan: string): Record<string, number> {
  const quotas: Record<string, Record<string, number>> = {
    free: {
      monthlyRequests: 1000,
      monthlyTokens: 100000,
      agents: 5,
      projects: 3,
      experiments: 10,
      datasets: 5,
      storageGB: 1,
    },
    basic: {
      monthlyRequests: 10000,
      monthlyTokens: 1000000,
      agents: 25,
      projects: 10,
      experiments: 50,
      datasets: 25,
      storageGB: 10,
    },
    pro: {
      monthlyRequests: 100000,
      monthlyTokens: 10000000,
      agents: 100,
      projects: 50,
      experiments: 200,
      datasets: 100,
      storageGB: 100,
    },
    enterprise: {
      monthlyRequests: 1000000,
      monthlyTokens: 100000000,
      agents: 1000,
      projects: 500,
      experiments: 2000,
      datasets: 1000,
      storageGB: 1000,
    },
  };

  return quotas[plan] || quotas.free;
}

/**
 * Get features for a specific plan
 */
function getPlanFeatures(plan: string): string[] {
  const features: Record<string, string[]> = {
    free: [
      'basic_agents',
      'community_support',
    ],
    basic: [
      'basic_agents',
      'advanced_datasets',
      'email_support',
    ],
    pro: [
      'basic_agents',
      'advanced_agents',
      'advanced_datasets',
      'advanced_analytics',
      'priority_support',
      'api_access',
    ],
    enterprise: [
      'basic_agents',
      'advanced_agents',
      'custom_agents',
      'advanced_datasets',
      'advanced_analytics',
      'custom_analytics',
      'priority_support',
      'api_access',
      'white_label',
      'sso',
      'custom_integrations',
    ],
  };

  return features[plan] || features.free;
}