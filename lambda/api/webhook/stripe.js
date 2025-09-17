// AI Nexus Workbench - Comprehensive Stripe Webhook Handler
// This handler processes all Stripe webhook events for sophisticated billing and checkout

const AWS = require('aws-sdk');
const crypto = require('crypto');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const secretsManager = new AWS.SecretsManager();

const SYSTEM_LOGS_TABLE = process.env.SYSTEM_LOGS_TABLE;
const USER_PROFILES_TABLE = process.env.USER_PROFILES_TABLE;
const USER_SESSIONS_TABLE = process.env.USER_SESSIONS_TABLE;

/**
 * Main Stripe webhook handler
 * @param {Object} event - API Gateway event
 * @param {Object} context - Lambda context
 * @returns {Object} HTTP response
 */
exports.handler = async (event, context) => {
  console.log('Stripe webhook received:', JSON.stringify(event.headers, null, 2));
  
  try {
    // Verify webhook signature
    const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    if (!signature) {
      console.error('No Stripe signature found');
      return createResponse(400, { error: 'No signature provided' });
    }

    const webhookSecret = await getWebhookSecret();
    const payload = event.body;
    
    // Verify the webhook signature
    if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return createResponse(400, { error: 'Invalid signature' });
    }

    // Parse the Stripe event
    const stripeEvent = JSON.parse(payload);
    console.log(`Processing Stripe event: ${stripeEvent.type}`);

    // Log the webhook event
    await logWebhookEvent(stripeEvent);

    // Route to appropriate handler
    const result = await routeWebhookEvent(stripeEvent);
    
    return createResponse(200, { 
      message: 'Webhook processed successfully',
      eventType: stripeEvent.type,
      processed: true
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Log the error for debugging
    await logWebhookError(error, event);
    
    return createResponse(500, { 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
};

/**
 * Route webhook events to appropriate handlers
 */
async function routeWebhookEvent(stripeEvent) {
  const { type, data } = stripeEvent;
  const object = data.object;

  // Group events by category for organized handling
  switch (true) {
    // 💳 PAYMENT PROCESSING
    case type.startsWith('payment_intent.'):
      return await handlePaymentIntentEvents(type, object, stripeEvent);
    
    case type.startsWith('charge.'):
      return await handleChargeEvents(type, object, stripeEvent);

    // 🔄 SUBSCRIPTION MANAGEMENT
    case type.startsWith('customer.subscription'):
      return await handleSubscriptionEvents(type, object, stripeEvent);

    // 🧾 INVOICE & BILLING
    case type.startsWith('invoice.'):
      return await handleInvoiceEvents(type, object, stripeEvent);

    // 👥 CUSTOMER MANAGEMENT
    case type.startsWith('customer.'):
      return await handleCustomerEvents(type, object, stripeEvent);

    // 🏪 CHECKOUT & SETUP
    case type.startsWith('checkout.session'):
      return await handleCheckoutEvents(type, object, stripeEvent);

    case type.startsWith('setup_intent.'):
      return await handleSetupIntentEvents(type, object, stripeEvent);

    // 💳 PAYMENT METHODS
    case type.startsWith('payment_method.'):
      return await handlePaymentMethodEvents(type, object, stripeEvent);

    // ⚠️ RISK & SECURITY
    case type.startsWith('radar.') || type.startsWith('review.'):
      return await handleSecurityEvents(type, object, stripeEvent);

    // 🏷️ PRODUCT & PRICING
    case type.startsWith('product.') || type.startsWith('price.') || type.startsWith('plan.'):
      return await handleProductEvents(type, object, stripeEvent);

    // 🎫 COUPONS & PROMOTIONS
    case type.startsWith('coupon.') || type.startsWith('promotion_code.'):
      return await handlePromotionEvents(type, object, stripeEvent);

    // 💰 PAYOUTS & TRANSFERS
    case type.startsWith('payout.') || type.startsWith('transfer.'):
      return await handlePayoutEvents(type, object, stripeEvent);

    // 🔮 BILLING PORTAL & QUOTES
    case type.startsWith('billing_portal.') || type.startsWith('quote.'):
      return await handleBillingPortalEvents(type, object, stripeEvent);

    // 🌡️ CLIMATE & TAX
    case type.startsWith('climate.') || type.startsWith('tax'):
      return await handleClimateAndTaxEvents(type, object, stripeEvent);

    // 🏦 FINANCIAL CONNECTIONS
    case type.startsWith('financial_connections.'):
      return await handleFinancialConnectionsEvents(type, object, stripeEvent);

    // 🆔 IDENTITY VERIFICATION
    case type.startsWith('identity.'):
      return await handleIdentityEvents(type, object, stripeEvent);

    // 💳 ISSUING (Cards)
    case type.startsWith('issuing_'):
      return await handleIssuingEvents(type, object, stripeEvent);

    // 🧪 TEST HELPERS
    case type.startsWith('test_helpers.'):
      return await handleTestEvents(type, object, stripeEvent);

    default:
      console.log(`Unhandled event type: ${type}`);
      return await logUnhandledEvent(type, object, stripeEvent);
  }
}

// =============================================================================
// 💳 PAYMENT PROCESSING HANDLERS
// =============================================================================

async function handlePaymentIntentEvents(type, paymentIntent, stripeEvent) {
  switch (type) {
    case 'payment_intent.succeeded':
      return await processPaymentSuccess(paymentIntent, stripeEvent);
    
    case 'payment_intent.payment_failed':
      return await processPaymentFailure(paymentIntent, stripeEvent);
    
    case 'payment_intent.requires_action':
      return await processPaymentActionRequired(paymentIntent, stripeEvent);
    
    case 'payment_intent.canceled':
      return await processPaymentCanceled(paymentIntent, stripeEvent);
    
    case 'payment_intent.created':
      return await processPaymentCreated(paymentIntent, stripeEvent);

    default:
      return await logEvent('payment_intent_other', { type, paymentIntent });
  }
}

async function handleChargeEvents(type, charge, stripeEvent) {
  switch (type) {
    case 'charge.succeeded':
      return await processChargeSuccess(charge, stripeEvent);
    
    case 'charge.failed':
      return await processChargeFailed(charge, stripeEvent);
    
    case 'charge.refunded':
      return await processChargeRefunded(charge, stripeEvent);
    
    case 'charge.dispute.created':
      return await processDisputeCreated(charge, stripeEvent);

    default:
      return await logEvent('charge_other', { type, charge });
  }
}

// =============================================================================
// 🔄 SUBSCRIPTION MANAGEMENT HANDLERS
// =============================================================================

async function handleSubscriptionEvents(type, subscription, stripeEvent) {
  switch (type) {
    case 'customer.subscription.created':
      return await processSubscriptionCreated(subscription, stripeEvent);
    
    case 'customer.subscription.updated':
      return await processSubscriptionUpdated(subscription, stripeEvent);
    
    case 'customer.subscription.deleted':
      return await processSubscriptionCanceled(subscription, stripeEvent);
    
    case 'customer.subscription.trial_will_end':
      return await processTrialEnding(subscription, stripeEvent);
    
    case 'customer.subscription.paused':
      return await processSubscriptionPaused(subscription, stripeEvent);
    
    case 'customer.subscription.resumed':
      return await processSubscriptionResumed(subscription, stripeEvent);

    default:
      return await logEvent('subscription_other', { type, subscription });
  }
}

// =============================================================================
// 🧾 INVOICE & BILLING HANDLERS
// =============================================================================

async function handleInvoiceEvents(type, invoice, stripeEvent) {
  switch (type) {
    case 'invoice.payment_succeeded':
      return await processInvoicePaymentSuccess(invoice, stripeEvent);
    
    case 'invoice.payment_failed':
      return await processInvoicePaymentFailed(invoice, stripeEvent);
    
    case 'invoice.finalized':
      return await processInvoiceFinalized(invoice, stripeEvent);
    
    case 'invoice.upcoming':
      return await processInvoiceUpcoming(invoice, stripeEvent);
    
    case 'invoice.payment_action_required':
      return await processInvoiceActionRequired(invoice, stripeEvent);

    default:
      return await logEvent('invoice_other', { type, invoice });
  }
}

// =============================================================================
// 👥 CUSTOMER MANAGEMENT HANDLERS
// =============================================================================

async function handleCustomerEvents(type, customer, stripeEvent) {
  // Skip subscription events (handled separately)
  if (type.includes('subscription')) {
    return await handleSubscriptionEvents(type, customer, stripeEvent);
  }

  switch (type) {
    case 'customer.created':
      return await processCustomerCreated(customer, stripeEvent);
    
    case 'customer.updated':
      return await processCustomerUpdated(customer, stripeEvent);
    
    case 'customer.deleted':
      return await processCustomerDeleted(customer, stripeEvent);

    default:
      return await logEvent('customer_other', { type, customer });
  }
}

// =============================================================================
// 🏪 CHECKOUT & SETUP HANDLERS
// =============================================================================

async function handleCheckoutEvents(type, session, stripeEvent) {
  switch (type) {
    case 'checkout.session.completed':
      return await processCheckoutCompleted(session, stripeEvent);
    
    case 'checkout.session.expired':
      return await processCheckoutExpired(session, stripeEvent);

    default:
      return await logEvent('checkout_other', { type, session });
  }
}

async function handleSetupIntentEvents(type, setupIntent, stripeEvent) {
  switch (type) {
    case 'setup_intent.succeeded':
      return await processSetupIntentSuccess(setupIntent, stripeEvent);
    
    case 'setup_intent.setup_failed':
      return await processSetupIntentFailed(setupIntent, stripeEvent);

    default:
      return await logEvent('setup_intent_other', { type, setupIntent });
  }
}

// =============================================================================
// CORE PROCESSING FUNCTIONS
// =============================================================================

async function processPaymentSuccess(paymentIntent, stripeEvent) {
  console.log(`Payment succeeded: ${paymentIntent.id} for $${paymentIntent.amount / 100}`);
  
  // Update user subscription status
  if (paymentIntent.customer) {
    await updateUserPaymentStatus(paymentIntent.customer, 'payment_succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      paymentMethod: paymentIntent.payment_method
    });
  }

  // Log successful payment
  await logEvent('payment_succeeded', {
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency
  });

  return { processed: true, action: 'payment_success' };
}

async function processPaymentFailure(paymentIntent, stripeEvent) {
  console.log(`Payment failed: ${paymentIntent.id}`);
  
  if (paymentIntent.customer) {
    await updateUserPaymentStatus(paymentIntent.customer, 'payment_failed', {
      paymentIntentId: paymentIntent.id,
      lastPaymentError: paymentIntent.last_payment_error,
      amount: paymentIntent.amount
    });
  }

  await logEvent('payment_failed', {
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    error: paymentIntent.last_payment_error
  });

  return { processed: true, action: 'payment_failure' };
}

async function processSubscriptionCreated(subscription, stripeEvent) {
  console.log(`Subscription created: ${subscription.id} for customer ${subscription.customer}`);
  
  await updateUserSubscription(subscription.customer, 'subscription_created', {
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
    trialEnd: subscription.trial_end,
    items: subscription.items?.data || []
  });

  await logEvent('subscription_created', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status
  });

  return { processed: true, action: 'subscription_created' };
}

async function processCheckoutCompleted(session, stripeEvent) {
  console.log(`Checkout completed: ${session.id}`);
  
  await updateUserPaymentStatus(session.customer, 'checkout_completed', {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    currency: session.currency,
    mode: session.mode,
    subscriptionId: session.subscription
  });

  await logEvent('checkout_completed', {
    sessionId: session.id,
    customerId: session.customer,
    mode: session.mode,
    amountTotal: session.amount_total
  });

  return { processed: true, action: 'checkout_completed' };
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

async function updateUserPaymentStatus(customerId, eventType, eventData) {
  try {
    // Find user by Stripe customer ID
    const user = await findUserByCustomerId(customerId);
    if (!user) {
      console.log(`No user found for customer ID: ${customerId}`);
      return;
    }

    // Update user profile with payment status
    await dynamodb.update({
      TableName: USER_PROFILES_TABLE,
      Key: { user_id: user.user_id },
      UpdateExpression: 'SET billing_status = :status, last_payment_event = :event, updated_at = :timestamp',
      ExpressionAttributeValues: {
        ':status': eventType,
        ':event': eventData,
        ':timestamp': new Date().toISOString()
      }
    });

    console.log(`Updated payment status for user ${user.user_id}: ${eventType}`);
  } catch (error) {
    console.error('Error updating user payment status:', error);
  }
}

async function updateUserSubscription(customerId, eventType, subscriptionData) {
  try {
    const user = await findUserByCustomerId(customerId);
    if (!user) {
      console.log(`No user found for customer ID: ${customerId}`);
      return;
    }

    await dynamodb.update({
      TableName: USER_PROFILES_TABLE,
      Key: { user_id: user.user_id },
      UpdateExpression: 'SET subscription_status = :status, subscription_data = :data, updated_at = :timestamp',
      ExpressionAttributeValues: {
        ':status': eventType,
        ':data': subscriptionData,
        ':timestamp': new Date().toISOString()
      }
    });

    console.log(`Updated subscription for user ${user.user_id}: ${eventType}`);
  } catch (error) {
    console.error('Error updating user subscription:', error);
  }
}

async function findUserByCustomerId(customerId) {
  try {
    const result = await dynamodb.scan({
      TableName: USER_PROFILES_TABLE,
      FilterExpression: 'stripe_customer_id = :customerId',
      ExpressionAttributeValues: {
        ':customerId': customerId
      }
    });

    return result.Items?.[0] || null;
  } catch (error) {
    console.error('Error finding user by customer ID:', error);
    return null;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

async function getWebhookSecret() {
  try {
    const result = await secretsManager.getSecretValue({
      SecretId: process.env.STRIPE_WEBHOOK_SECRET_PATH
    });
    
    return result.SecretString;
  } catch (error) {
    console.error('Error retrieving webhook secret:', error);
    throw new Error('Unable to retrieve webhook secret');
  }
}

function verifyWebhookSignature(payload, signature, secret) {
  try {
    const elements = signature.split(',');
    const timestamp = elements.find(el => el.startsWith('t=')).split('t=')[1];
    const signatures = elements.filter(el => el.startsWith('v1='));

    const signedPayload = `${timestamp}.${payload}`;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    return signatures.some(sig => {
      const providedSignature = sig.split('v1=')[1];
      return crypto.timingSafeEqual(
        Buffer.from(computedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
    });
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

async function logWebhookEvent(stripeEvent) {
  try {
    await dynamodb.put({
      TableName: SYSTEM_LOGS_TABLE,
      Item: {
        log_id: `stripe_${stripeEvent.id}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        event_type: 'stripe_webhook',
        details: `Stripe event: ${stripeEvent.type}`,
        metadata: {
          stripeEventId: stripeEvent.id,
          stripeEventType: stripeEvent.type,
          apiVersion: stripeEvent.api_version,
          created: stripeEvent.created,
          livemode: stripeEvent.livemode
        },
        date: new Date().toISOString().split('T')[0],
        expires_at: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
      }
    });
  } catch (error) {
    console.error('Error logging webhook event:', error);
  }
}

async function logEvent(eventType, data) {
  try {
    await dynamodb.put({
      TableName: SYSTEM_LOGS_TABLE,
      Item: {
        log_id: `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        event_type: eventType,
        details: `Processed ${eventType}`,
        metadata: data,
        date: new Date().toISOString().split('T')[0],
        expires_at: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
      }
    });
  } catch (error) {
    console.error('Error logging event:', error);
  }
}

async function logWebhookError(error, event) {
  try {
    await dynamodb.put({
      TableName: SYSTEM_LOGS_TABLE,
      Item: {
        log_id: `webhook_error_${Date.now()}`,
        timestamp: new Date().toISOString(),
        event_type: 'webhook_error',
        details: `Webhook processing error: ${error.message}`,
        metadata: {
          error: error.message,
          stack: error.stack,
          headers: event.headers
        },
        date: new Date().toISOString().split('T')[0],
        expires_at: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
      }
    });
  } catch (logError) {
    console.error('Error logging webhook error:', logError);
  }
}

async function logUnhandledEvent(type, object, stripeEvent) {
  console.log(`Unhandled Stripe event: ${type}`);
  
  await logEvent('unhandled_stripe_event', {
    eventType: type,
    stripeEventId: stripeEvent.id,
    objectId: object.id,
    objectType: object.object
  });

  return { processed: true, action: 'logged_unhandled' };
}

function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

// =============================================================================
// PLACEHOLDER HANDLERS FOR ALL OTHER EVENT TYPES
// =============================================================================

// These handlers log events and can be expanded based on your needs
async function handlePaymentMethodEvents(type, paymentMethod, stripeEvent) {
  return await logEvent(`payment_method_${type.split('.').pop()}`, { paymentMethod });
}

async function handleSecurityEvents(type, object, stripeEvent) {
  return await logEvent(`security_${type.split('.').pop()}`, { object });
}

async function handleProductEvents(type, object, stripeEvent) {
  return await logEvent(`product_${type.split('.').pop()}`, { object });
}

async function handlePromotionEvents(type, object, stripeEvent) {
  return await logEvent(`promotion_${type.split('.').pop()}`, { object });
}

async function handlePayoutEvents(type, object, stripeEvent) {
  return await logEvent(`payout_${type.split('.').pop()}`, { object });
}

async function handleBillingPortalEvents(type, object, stripeEvent) {
  return await logEvent(`billing_portal_${type.split('.').pop()}`, { object });
}

async function handleClimateAndTaxEvents(type, object, stripeEvent) {
  return await logEvent(`climate_tax_${type.split('.').pop()}`, { object });
}

async function handleFinancialConnectionsEvents(type, object, stripeEvent) {
  return await logEvent(`financial_${type.split('.').pop()}`, { object });
}

async function handleIdentityEvents(type, object, stripeEvent) {
  return await logEvent(`identity_${type.split('.').pop()}`, { object });
}

async function handleIssuingEvents(type, object, stripeEvent) {
  return await logEvent(`issuing_${type.split('.').pop()}`, { object });
}

async function handleTestEvents(type, object, stripeEvent) {
  return await logEvent(`test_${type.split('.').pop()}`, { object });
}
