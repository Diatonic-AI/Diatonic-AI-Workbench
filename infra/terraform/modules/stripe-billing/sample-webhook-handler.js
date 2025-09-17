/**
 * Stripe Webhook Handler with EventBridge Integration
 * Supports both snapshot (full) and thin payload processing
 * 
 * This is a sample implementation showing how to:
 * 1. Verify Stripe webhook signatures
 * 2. Process webhook events
 * 3. Publish events to EventBridge for downstream processing
 * 4. Handle both snapshot and thin payload styles
 */

const stripe = require('stripe');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { DynamoDBClient, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');

// Environment configuration
const TENANT_ID = process.env.TENANT_ID || 'diatonicvisuals';
const ENABLE_EVENTBRIDGE = process.env.ENABLE_EVENTBRIDGE === 'true';
const EVENTBRIDGE_BUS_NAME = process.env.EVENTBRIDGE_BUS_NAME;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Initialize AWS clients
const eventBridgeClient = new EventBridgeClient({});
const secretsClient = new SecretsManagerClient({});
const dynamoClient = new DynamoDBClient({});

let stripeClient = null;
let webhookSecret = null;

/**
 * Initialize Stripe client with secret from Secrets Manager
 */
async function initializeStripe() {
  if (stripeClient && webhookSecret) return;

  try {
    // Get Stripe secret key
    const secretKeyCommand = new GetSecretValueCommand({
      SecretId: process.env.STRIPE_SECRET_ARN
    });
    const secretKeyResponse = await secretsClient.send(secretKeyCommand);
    const stripeSecretKey = JSON.parse(secretKeyResponse.SecretString);

    // Get webhook secret
    const webhookSecretCommand = new GetSecretValueCommand({
      SecretId: process.env.STRIPE_WEBHOOK_SECRET_ARN
    });
    const webhookSecretResponse = await secretsClient.send(webhookSecretCommand);
    webhookSecret = JSON.parse(webhookSecretResponse.SecretString).webhook_signing_secret;

    // Initialize Stripe
    stripeClient = stripe(stripeSecretKey.secret_key);
    
    console.log(`[${LOG_LEVEL}] Stripe client initialized for tenant: ${TENANT_ID}`);
  } catch (error) {
    console.error('[ERROR] Failed to initialize Stripe client:', error);
    throw new Error('Failed to initialize Stripe client');
  }
}

/**
 * Verify Stripe webhook signature
 */
function verifyWebhookSignature(body, signature) {
  try {
    const event = stripeClient.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`[${LOG_LEVEL}] Webhook signature verified for event: ${event.type}`);
    return event;
  } catch (error) {
    console.error('[ERROR] Webhook signature verification failed:', error.message);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Check for event idempotency using DynamoDB
 */
async function checkIdempotency(eventId) {
  try {
    const command = new GetItemCommand({
      TableName: process.env.TABLE_IDEMPOTENCY,
      Key: {
        event_id: { S: eventId },
        tenant_id: { S: TENANT_ID }
      }
    });

    const result = await dynamoClient.send(command);
    return result.Item !== undefined;
  } catch (error) {
    console.error('[ERROR] Failed to check idempotency:', error);
    return false;
  }
}

/**
 * Record processed event for idempotency
 */
async function recordProcessedEvent(eventId, eventType) {
  try {
    const command = new PutItemCommand({
      TableName: process.env.TABLE_IDEMPOTENCY,
      Item: {
        event_id: { S: eventId },
        tenant_id: { S: TENANT_ID },
        event_type: { S: eventType },
        processed_at: { S: new Date().toISOString() },
        ttl: { N: Math.floor((Date.now() + (30 * 24 * 60 * 60 * 1000)) / 1000).toString() } // 30 days TTL
      }
    });

    await dynamoClient.send(command);
    console.log(`[${LOG_LEVEL}] Event recorded for idempotency: ${eventId}`);
  } catch (error) {
    console.error('[ERROR] Failed to record processed event:', error);
  }
}

/**
 * Create snapshot payload (full event object)
 */
function createSnapshotPayload(stripeEvent) {
  return {
    id: stripeEvent.id,
    object: stripeEvent.object,
    api_version: stripeEvent.api_version,
    created: stripeEvent.created,
    data: stripeEvent.data,
    livemode: stripeEvent.livemode,
    pending_webhooks: stripeEvent.pending_webhooks,
    request: stripeEvent.request,
    type: stripeEvent.type,
    // Add additional metadata
    tenant_id: TENANT_ID,
    processed_at: new Date().toISOString(),
    payload_style: 'snapshot'
  };
}

/**
 * Create thin payload (essential information only)
 */
function createThinPayload(stripeEvent) {
  const basePayload = {
    id: stripeEvent.id,
    type: stripeEvent.type,
    created: stripeEvent.created,
    livemode: stripeEvent.livemode,
    tenant_id: TENANT_ID,
    processed_at: new Date().toISOString(),
    payload_style: 'thin'
  };

  // Add event-specific essential data
  if (stripeEvent.data && stripeEvent.data.object) {
    const obj = stripeEvent.data.object;
    
    // Common object properties
    basePayload.object_id = obj.id;
    
    // Event-specific properties
    switch (stripeEvent.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        basePayload.customer_id = obj.customer;
        basePayload.status = obj.status;
        basePayload.current_period_start = obj.current_period_start;
        basePayload.current_period_end = obj.current_period_end;
        break;
        
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        basePayload.customer_id = obj.customer;
        basePayload.amount_due = obj.amount_due;
        basePayload.currency = obj.currency;
        basePayload.status = obj.status;
        break;
        
      case 'checkout.session.completed':
        basePayload.customer_id = obj.customer;
        basePayload.amount_total = obj.amount_total;
        basePayload.currency = obj.currency;
        basePayload.payment_status = obj.payment_status;
        break;
        
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
        basePayload.customer_id = obj.customer;
        basePayload.amount = obj.amount;
        basePayload.currency = obj.currency;
        basePayload.status = obj.status;
        break;
        
      default:
        // For other events, include basic object info
        if (obj.customer) basePayload.customer_id = obj.customer;
        if (obj.amount !== undefined) basePayload.amount = obj.amount;
        if (obj.currency) basePayload.currency = obj.currency;
        if (obj.status) basePayload.status = obj.status;
    }
  }

  return basePayload;
}

/**
 * Publish event to EventBridge
 */
async function publishToEventBridge(stripeEvent) {
  if (!ENABLE_EVENTBRIDGE || !EVENTBRIDGE_BUS_NAME) {
    console.log(`[${LOG_LEVEL}] EventBridge not enabled, skipping event publication`);
    return;
  }

  try {
    // Create both payload types
    const snapshotPayload = createSnapshotPayload(stripeEvent);
    const thinPayload = createThinPayload(stripeEvent);

    // Create EventBridge events
    const events = [
      // Snapshot payload event
      {
        Source: 'stripe.webhook',
        DetailType: 'Stripe Webhook Event',
        Detail: JSON.stringify({
          ...snapshotPayload,
          payload_type: 'snapshot'
        }),
        EventBusName: EVENTBRIDGE_BUS_NAME,
        Resources: [`arn:aws:lambda:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT}:function:${process.env.AWS_LAMBDA_FUNCTION_NAME}`],
        Time: new Date()
      },
      // Thin payload event  
      {
        Source: 'stripe.webhook',
        DetailType: 'Stripe Webhook Event',
        Detail: JSON.stringify({
          ...thinPayload,
          payload_type: 'thin'
        }),
        EventBusName: EVENTBRIDGE_BUS_NAME,
        Resources: [`arn:aws:lambda:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT}:function:${process.env.AWS_LAMBDA_FUNCTION_NAME}`],
        Time: new Date()
      }
    ];

    const command = new PutEventsCommand({ Entries: events });
    const result = await eventBridgeClient.send(command);

    if (result.FailedEntryCount > 0) {
      console.error('[ERROR] Some EventBridge events failed:', result.Entries);
    } else {
      console.log(`[${LOG_LEVEL}] Successfully published ${events.length} events to EventBridge for ${stripeEvent.type}`);
    }

  } catch (error) {
    console.error('[ERROR] Failed to publish to EventBridge:', error);
    // Don't throw here - webhook processing should continue even if EventBridge fails
  }
}

/**
 * Process specific webhook event types
 */
async function processWebhookEvent(stripeEvent) {
  const { type, data } = stripeEvent;
  
  console.log(`[${LOG_LEVEL}] Processing webhook event: ${type}`);

  switch (type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(data.object);
      break;
      
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionChanged(data.object);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(data.object);
      break;
      
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(data.object);
      break;
      
    case 'invoice.payment_failed':
      await handlePaymentFailed(data.object);
      break;
      
    default:
      console.log(`[${LOG_LEVEL}] Unhandled event type: ${type}`);
  }
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(session) {
  console.log(`[${LOG_LEVEL}] Processing checkout completion for customer: ${session.customer}`);
  
  // Update customer record in DynamoDB
  try {
    const command = new PutItemCommand({
      TableName: process.env.TABLE_CUSTOMERS,
      Item: {
        tenant_id: { S: TENANT_ID },
        stripe_customer_id: { S: session.customer },
        user_id: { S: session.metadata?.user_id || 'unknown' },
        email: { S: session.customer_details?.email || '' },
        subscription_status: { S: 'active' },
        updated_at: { S: new Date().toISOString() }
      }
    });
    
    await dynamoClient.send(command);
    console.log(`[${LOG_LEVEL}] Customer record updated: ${session.customer}`);
    
  } catch (error) {
    console.error('[ERROR] Failed to update customer record:', error);
  }
}

/**
 * Handle subscription changes
 */
async function handleSubscriptionChanged(subscription) {
  console.log(`[${LOG_LEVEL}] Processing subscription change: ${subscription.id}`);
  
  try {
    const command = new PutItemCommand({
      TableName: process.env.TABLE_SUBSCRIPTIONS,
      Item: {
        tenant_id: { S: TENANT_ID },
        stripe_subscription_id: { S: subscription.id },
        stripe_customer_id: { S: subscription.customer },
        status: { S: subscription.status },
        current_period_start: { N: subscription.current_period_start.toString() },
        current_period_end: { N: subscription.current_period_end.toString() },
        updated_at: { S: new Date().toISOString() }
      }
    });
    
    await dynamoClient.send(command);
    console.log(`[${LOG_LEVEL}] Subscription record updated: ${subscription.id}`);
    
  } catch (error) {
    console.error('[ERROR] Failed to update subscription record:', error);
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancelled(subscription) {
  console.log(`[${LOG_LEVEL}] Processing subscription cancellation: ${subscription.id}`);
  await handleSubscriptionChanged(subscription); // Same logic, different status
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
  console.log(`[${LOG_LEVEL}] Processing successful payment: ${invoice.id}`);
  
  try {
    const command = new PutItemCommand({
      TableName: process.env.TABLE_INVOICES,
      Item: {
        tenant_id: { S: TENANT_ID },
        stripe_invoice_id: { S: invoice.id },
        stripe_customer_id: { S: invoice.customer },
        amount_paid: { N: invoice.amount_paid.toString() },
        currency: { S: invoice.currency },
        status: { S: invoice.status },
        created_at: { S: new Date(invoice.created * 1000).toISOString() },
        updated_at: { S: new Date().toISOString() }
      }
    });
    
    await dynamoClient.send(command);
    console.log(`[${LOG_LEVEL}] Invoice record created: ${invoice.id}`);
    
  } catch (error) {
    console.error('[ERROR] Failed to create invoice record:', error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  console.log(`[${LOG_LEVEL}] Processing failed payment: ${invoice.id}`);
  await handlePaymentSucceeded(invoice); // Same logic, different status
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log(`[${LOG_LEVEL}] Stripe webhook handler started`);
  
  try {
    // Initialize Stripe client
    await initializeStripe();
    
    // Parse the request
    const body = event.body;
    const signature = event.headers['Stripe-Signature'] || event.headers['stripe-signature'];
    
    if (!body || !signature) {
      console.error('[ERROR] Missing body or signature');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing body or signature' })
      };
    }
    
    // Verify webhook signature and construct event
    const stripeEvent = verifyWebhookSignature(body, signature);
    
    // Check for idempotency
    const isAlreadyProcessed = await checkIdempotency(stripeEvent.id);
    if (isAlreadyProcessed) {
      console.log(`[${LOG_LEVEL}] Event already processed: ${stripeEvent.id}`);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Event already processed' })
      };
    }
    
    // Process the webhook event
    await processWebhookEvent(stripeEvent);
    
    // Publish to EventBridge for downstream processing
    await publishToEventBridge(stripeEvent);
    
    // Record event for idempotency
    await recordProcessedEvent(stripeEvent.id, stripeEvent.type);
    
    console.log(`[${LOG_LEVEL}] Webhook processing completed: ${stripeEvent.type}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Webhook processed successfully',
        eventId: stripeEvent.id,
        eventType: stripeEvent.type,
        eventBridgeEnabled: ENABLE_EVENTBRIDGE
      })
    };
    
  } catch (error) {
    console.error('[ERROR] Webhook processing failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Webhook processing failed',
        message: error.message
      })
    };
  }
};
