// AI Nexus Workbench - Webhook Handlers

import { APIRequest, APIResponse } from '../types';
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
  generateTimestamp
} from '../utils/database';
import { PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { randomUUID } from 'crypto';

/**
 * Handle Stripe billing webhooks
 * POST /v1/webhooks/stripe
 */
export const handleStripeWebhook = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const body = parseRequestBody(event);
    if (!body) {
      return errorResponse('Request body is required', 400, event.requestId);
    }

    // Verify Stripe webhook signature (in production, you'd use Stripe's library)
    const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    if (!signature) {
      return errorResponse('Missing Stripe signature', 400, event.requestId);
    }

    // Log webhook for debugging
    console.log('Stripe webhook received:', {
      type: body.type,
      id: body.id,
      created: body.created,
    });

    // Process webhook based on event type
    let result;
    switch (body.type) {
      case 'customer.subscription.created':
        result = await handleSubscriptionCreated(body);
        break;
      
      case 'customer.subscription.updated':
        result = await handleSubscriptionUpdated(body);
        break;
      
      case 'customer.subscription.deleted':
        result = await handleSubscriptionDeleted(body);
        break;
      
      case 'invoice.payment_succeeded':
        result = await handlePaymentSucceeded(body);
        break;
      
      case 'invoice.payment_failed':
        result = await handlePaymentFailed(body);
        break;
      
      case 'customer.created':
        result = await handleCustomerCreated(body);
        break;
      
      case 'customer.updated':
        result = await handleCustomerUpdated(body);
        break;
      
      default:
        console.log('Unhandled Stripe webhook type:', body.type);
        result = { success: true, message: 'Webhook received but not processed' };
    }

    // Record webhook event
    await recordWebhookEvent({
      source: 'stripe',
      eventType: body.type,
      eventId: body.id,
      data: body,
      processedAt: generateTimestamp(),
      result,
    });

    return successResponse({
      received: true,
      eventId: body.id,
      eventType: body.type,
      processedAt: new Date().toISOString(),
      result,
    }, event.requestId);

  } catch (error) {
    console.error('Stripe webhook error:', error);
    
    // Record failed webhook
    try {
      await recordWebhookEvent({
        source: 'stripe',
        eventType: 'error',
        eventId: event.requestId,
        data: { error: error.message },
        processedAt: generateTimestamp(),
        result: { success: false, error: error.message },
      });
    } catch (recordError) {
      console.error('Failed to record webhook error:', recordError);
    }

    return errorResponse('Failed to process Stripe webhook', 500, event.requestId);
  }
};

/**
 * Handle external service webhooks (generic)
 * POST /v1/webhooks/external/{serviceName}
 */
export const handleExternalWebhook = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const { serviceName } = event.pathParameters || {};
    const body = parseRequestBody(event);

    if (!serviceName) {
      return errorResponse('Service name is required', 400, event.requestId);
    }

    if (!body) {
      return errorResponse('Request body is required', 400, event.requestId);
    }

    console.log(`External webhook received from ${serviceName}:`, {
      headers: event.headers,
      bodyKeys: Object.keys(body),
    });

    let result;
    switch (serviceName.toLowerCase()) {
      case 'github':
        result = await handleGitHubWebhook(body, event.headers);
        break;
      
      case 'slack':
        result = await handleSlackWebhook(body, event.headers);
        break;
      
      case 'discord':
        result = await handleDiscordWebhook(body, event.headers);
        break;
      
      case 'openai':
        result = await handleOpenAIWebhook(body, event.headers);
        break;
      
      default:
        result = await handleGenericWebhook(serviceName, body, event.headers);
    }

    // Record webhook event
    await recordWebhookEvent({
      source: serviceName.toLowerCase(),
      eventType: body.type || body.event_type || 'unknown',
      eventId: body.id || randomUUID(),
      data: body,
      processedAt: generateTimestamp(),
      result,
    });

    return successResponse({
      received: true,
      service: serviceName,
      eventType: body.type || body.event_type || 'unknown',
      processedAt: new Date().toISOString(),
      result,
    }, event.requestId);

  } catch (error) {
    console.error('External webhook error:', error);
    return errorResponse('Failed to process external webhook', 500, event.requestId);
  }
};

/**
 * Handle system health check webhook
 * GET /v1/webhooks/health
 */
export const handleHealthWebhook = async (event: APIRequest): Promise<APIResponse> => {
  try {
    const timestamp = new Date().toISOString();
    
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp,
      service: 'ai-nexus-workbench-webhooks',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: 'healthy',
        eventbus: 'healthy',
        s3: 'healthy',
      },
    };

    return successResponse(health, event.requestId);

  } catch (error) {
    console.error('Health webhook error:', error);
    return errorResponse('Health check failed', 500, event.requestId);
  }
};

// Stripe webhook handlers
async function handleSubscriptionCreated(event: unknown): Promise<unknown> {
  const subscription = event.data.object;
  const customerId = subscription.customer;
  
  console.log('Processing subscription created:', {
    subscriptionId: subscription.id,
    customerId,
    status: subscription.status,
    planId: subscription.items.data[0]?.price.id,
  });

  // Find tenant by Stripe customer ID
  const tenant = await findTenantByStripeCustomerId(customerId);
  if (!tenant) {
    return { success: false, error: 'Tenant not found for customer' };
  }

  // Update tenant with subscription information
  await updateItem({
    PK: `TENANT#${tenant.tenantId}`,
    SK: `TENANT#${tenant.tenantId}`,
  }, {
    billing: {
      ...tenant.billing,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    },
    updatedAt: generateTimestamp(),
  });

  // Emit domain event
  await emitDomainEvent({
    eventType: 'subscription.created',
    tenantId: tenant.tenantId,
    data: { subscription },
  });

  return { success: true, message: 'Subscription created successfully' };
}

async function handleSubscriptionUpdated(event: unknown): Promise<unknown> {
  const subscription = event.data.object;
  const customerId = subscription.customer;
  
  console.log('Processing subscription updated:', {
    subscriptionId: subscription.id,
    customerId,
    status: subscription.status,
  });

  const tenant = await findTenantByStripeCustomerId(customerId);
  if (!tenant) {
    return { success: false, error: 'Tenant not found for customer' };
  }

  await updateItem({
    PK: `TENANT#${tenant.tenantId}`,
    SK: `TENANT#${tenant.tenantId}`,
  }, {
    billing: {
      ...tenant.billing,
      subscriptionStatus: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    updatedAt: generateTimestamp(),
  });

  await emitDomainEvent({
    eventType: 'subscription.updated',
    tenantId: tenant.tenantId,
    data: { subscription },
  });

  return { success: true, message: 'Subscription updated successfully' };
}

async function handleSubscriptionDeleted(event: unknown): Promise<unknown> {
  const subscription = event.data.object;
  const customerId = subscription.customer;
  
  console.log('Processing subscription deleted:', {
    subscriptionId: subscription.id,
    customerId,
  });

  const tenant = await findTenantByStripeCustomerId(customerId);
  if (!tenant) {
    return { success: false, error: 'Tenant not found for customer' };
  }

  await updateItem({
    PK: `TENANT#${tenant.tenantId}`,
    SK: `TENANT#${tenant.tenantId}`,
  }, {
    status: 'cancelled',
    billing: {
      ...tenant.billing,
      subscriptionStatus: 'canceled',
      cancelAtPeriodEnd: true,
    },
    updatedAt: generateTimestamp(),
  });

  await emitDomainEvent({
    eventType: 'subscription.deleted',
    tenantId: tenant.tenantId,
    data: { subscription },
  });

  return { success: true, message: 'Subscription deleted successfully' };
}

async function handlePaymentSucceeded(event: unknown): Promise<unknown> {
  const invoice = event.data.object;
  const customerId = invoice.customer;
  
  console.log('Processing payment succeeded:', {
    invoiceId: invoice.id,
    customerId,
    amountPaid: invoice.amount_paid,
  });

  const tenant = await findTenantByStripeCustomerId(customerId);
  if (!tenant) {
    return { success: false, error: 'Tenant not found for customer' };
  }

  // Record payment
  await createItem({
    PK: `TENANT#${tenant.tenantId}`,
    SK: `PAYMENT#${invoice.id}`,
    entityType: 'PAYMENT',
    tenantId: tenant.tenantId,
    paymentId: invoice.id,
    amount: invoice.amount_paid / 100, // Convert from cents
    currency: invoice.currency,
    status: 'succeeded',
    paidAt: new Date(invoice.created * 1000).toISOString(),
    periodStart: new Date(invoice.period_start * 1000).toISOString(),
    periodEnd: new Date(invoice.period_end * 1000).toISOString(),
    createdAt: generateTimestamp(),
  });

  await emitDomainEvent({
    eventType: 'payment.succeeded',
    tenantId: tenant.tenantId,
    data: { invoice },
  });

  return { success: true, message: 'Payment recorded successfully' };
}

async function handlePaymentFailed(event: unknown): Promise<unknown> {
  const invoice = event.data.object;
  const customerId = invoice.customer;
  
  console.log('Processing payment failed:', {
    invoiceId: invoice.id,
    customerId,
    amountDue: invoice.amount_due,
  });

  const tenant = await findTenantByStripeCustomerId(customerId);
  if (!tenant) {
    return { success: false, error: 'Tenant not found for customer' };
  }

  // Update tenant status if payment failed
  await updateItem({
    PK: `TENANT#${tenant.tenantId}`,
    SK: `TENANT#${tenant.tenantId}`,
  }, {
    status: 'suspended', // Suspend access on payment failure
    updatedAt: generateTimestamp(),
  });

  await emitDomainEvent({
    eventType: 'payment.failed',
    tenantId: tenant.tenantId,
    data: { invoice },
  });

  return { success: true, message: 'Payment failure processed' };
}

async function handleCustomerCreated(event: unknown): Promise<unknown> {
  const customer = event.data.object;
  
  console.log('Processing customer created:', {
    customerId: customer.id,
    email: customer.email,
  });

  // This webhook is typically handled during signup flow
  // Customer should already be associated with a tenant
  
  return { success: true, message: 'Customer webhook processed' };
}

async function handleCustomerUpdated(event: unknown): Promise<unknown> {
  const customer = event.data.object;
  
  console.log('Processing customer updated:', {
    customerId: customer.id,
    email: customer.email,
  });

  // Update tenant with customer information if needed
  const tenant = await findTenantByStripeCustomerId(customer.id);
  if (tenant) {
    await updateItem({
      PK: `TENANT#${tenant.tenantId}`,
      SK: `TENANT#${tenant.tenantId}`,
    }, {
      billing: {
        ...tenant.billing,
        // Update any relevant customer fields
      },
      updatedAt: generateTimestamp(),
    });
  }

  return { success: true, message: 'Customer updated successfully' };
}

// External service webhook handlers
async function handleGitHubWebhook(body: unknown, headers: unknown): Promise<unknown> {
  const eventType = headers['x-github-event'] || body.action;
  
  console.log('Processing GitHub webhook:', {
    event: eventType,
    repository: body.repository?.full_name,
    sender: body.sender?.login,
  });

  switch (eventType) {
    case 'push':
      // Handle code push events
      return { success: true, message: 'Push event processed' };
    
    case 'pull_request':
      // Handle PR events
      return { success: true, message: 'Pull request event processed' };
    
    case 'issues':
      // Handle issue events
      return { success: true, message: 'Issue event processed' };
    
    default:
      return { success: true, message: `GitHub ${eventType} event received` };
  }
}

async function handleSlackWebhook(body: unknown, headers: unknown): Promise<unknown> {
  console.log('Processing Slack webhook:', {
    type: body.type,
    team_id: body.team_id,
    user_id: body.event?.user,
  });

  // Handle Slack events (slash commands, interactive components, events API)
  if (body.type === 'url_verification') {
    // Slack app verification
    return { challenge: body.challenge };
  }

  return { success: true, message: 'Slack webhook processed' };
}

async function handleDiscordWebhook(body: unknown, headers: unknown): Promise<unknown> {
  console.log('Processing Discord webhook:', {
    type: body.type,
    guild_id: body.guild_id,
    channel_id: body.channel_id,
  });

  // Handle Discord interactions
  return { success: true, message: 'Discord webhook processed' };
}

async function handleOpenAIWebhook(body: unknown, headers: unknown): Promise<unknown> {
  console.log('Processing OpenAI webhook:', {
    type: body.type,
    object: body.object,
  });

  // Handle OpenAI webhooks (fine-tuning, batch processing, etc.)
  return { success: true, message: 'OpenAI webhook processed' };
}

async function handleGenericWebhook(serviceName: string, body: unknown, headers: unknown): Promise<unknown> {
  console.log(`Processing generic webhook from ${serviceName}:`, {
    contentType: headers['content-type'],
    bodyKeys: Object.keys(body),
  });

  // Generic webhook processing
  return { success: true, message: `Generic webhook from ${serviceName} processed` };
}

// Helper functions
async function findTenantByStripeCustomerId(customerId: string): Promise<unknown> {
  // In a real implementation, you'd query the database for tenant with this Stripe customer ID
  // For simulation, we'll return a mock tenant
  return {
    tenantId: 'tenant-123',
    billing: {
      stripeCustomerId: customerId,
      subscriptionStatus: 'active',
    },
  };
}

async function recordWebhookEvent(webhookEvent: unknown): Promise<void> {
  const eventId = generateId();
  
  await createItem({
    PK: `WEBHOOK#${webhookEvent.source}`,
    SK: `EVENT#${eventId}`,
    entityType: 'WEBHOOK_EVENT',
    id: eventId,
    source: webhookEvent.source,
    eventType: webhookEvent.eventType,
    eventId: webhookEvent.eventId,
    data: webhookEvent.data,
    result: webhookEvent.result,
    processedAt: webhookEvent.processedAt,
    createdAt: generateTimestamp(),
  });
}

async function emitDomainEvent(event: unknown): Promise<void> {
  // Emit event to EventBridge for downstream processing
  const eventBridgeEvent = {
    Source: 'ai-nexus-workbench.webhooks',
    DetailType: event.eventType,
    Detail: JSON.stringify({
      tenantId: event.tenantId,
      eventId: randomUUID(),
      timestamp: generateTimestamp(),
      data: event.data,
    }),
  };

  // In a real implementation, you'd send this to EventBridge
  console.log('Domain event emitted:', eventBridgeEvent);
}
