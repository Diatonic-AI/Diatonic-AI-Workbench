# 🎯 Stripe Webhook Events for Diatonic AI

## 💳 **Core Payment Events (Must Have)**

### Payment Processing
```
payment_intent.succeeded
payment_intent.payment_failed
payment_intent.requires_action
payment_intent.canceled
```
**Why:** Handle successful payments, failed payments, and 3D Secure authentication flows.

### Charges & Refunds
```
charge.succeeded
charge.failed  
charge.refunded
charge.dispute.created
```
**Why:** Track actual money movement and handle disputes.

---

## 🔄 **Subscription Management (Critical for SaaS)**

### Subscription Lifecycle
```
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
customer.subscription.paused
customer.subscription.resumed
```
**Why:** Manage user access levels, feature availability, and billing status.

### Trial Management
```
customer.subscription.trial_will_end
```
**Why:** Send notifications and prompt users to upgrade before trial expires.

---

## 🧾 **Invoice Management**

### Invoice Processing
```
invoice.payment_succeeded
invoice.payment_failed
invoice.finalized
invoice.upcoming
```
**Why:** Update user billing status, send notifications, and handle failed payments.

### Payment Collection
```
invoice.payment_action_required
invoice.marked_uncollectible
```
**Why:** Handle cases requiring user action (like updating payment methods).

---

## 👥 **Customer Management**

### Customer Lifecycle
```
customer.created
customer.updated
customer.deleted
```
**Why:** Sync customer data with your user profiles.

### Payment Methods
```
payment_method.attached
payment_method.detached
payment_method.automatically_updated
```
**Why:** Keep payment method status in sync with user accounts.

---

## 🏪 **Checkout & Setup**

### Checkout Sessions
```
checkout.session.completed
checkout.session.expired
```
**Why:** Handle successful purchases and abandoned checkouts.

### Setup Intents (for saving payment methods)
```
setup_intent.succeeded
setup_intent.setup_failed
```
**Why:** Manage saved payment methods for future billing.

---

## ⚠️ **Risk & Security**

### Fraud Detection
```
radar.early_fraud_warning.created
review.opened
review.closed
```
**Why:** Handle potentially fraudulent transactions and manual reviews.

---

## 🎯 **Recommended Event List for Diatonic AI**

Copy this list for your Stripe webhook configuration:

```
payment_intent.succeeded
payment_intent.payment_failed
payment_intent.requires_action
charge.succeeded
charge.failed
charge.refunded
charge.dispute.created
customer.created
customer.updated
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
customer.subscription.trial_will_end
invoice.payment_succeeded
invoice.payment_failed
invoice.finalized
invoice.upcoming
checkout.session.completed
checkout.session.expired
setup_intent.succeeded
payment_method.attached
payment_method.detached
```

## 📋 **Event Handler Priority Matrix**

| Priority | Event Category | Implementation Order |
|----------|----------------|---------------------|
| **🔴 Critical** | Payment Success/Failure | Week 1 |
| **🟡 Important** | Subscription Lifecycle | Week 2 |
| **🟢 Nice-to-Have** | Customer Management | Week 3 |
| **🔵 Advanced** | Fraud & Security | Week 4 |

---

## 💻 **Lambda Function Implementation Example**

Here's how to structure your webhook handler in the Lambda function:

```javascript
// In your main API Lambda function
const handleStripeWebhook = async (event, context) => {
  const eventType = event.type;
  const data = event.data.object;
  
  switch (eventType) {
    // 🔴 CRITICAL: Payment Success
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(data);
      break;
      
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSuccess(data);
      break;
    
    // 🔴 CRITICAL: Payment Failure  
    case 'payment_intent.payment_failed':
    case 'invoice.payment_failed':
      await handlePaymentFailure(data);
      break;
    
    // 🟡 IMPORTANT: Subscription Changes
    case 'customer.subscription.created':
      await handleSubscriptionCreated(data);
      break;
      
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(data);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(data);
      break;
    
    // 🟡 IMPORTANT: Trial Management
    case 'customer.subscription.trial_will_end':
      await handleTrialEnding(data);
      break;
    
    // 🟢 NICE-TO-HAVE: Customer Management
    case 'customer.created':
      await handleCustomerCreated(data);
      break;
      
    case 'checkout.session.completed':
      await handleCheckoutCompleted(data);
      break;
    
    default:
      console.log(`Unhandled event type: ${eventType}`);
      // Log to DynamoDB for monitoring
      await logUnhandledEvent(eventType, data);
  }
};

// Implementation functions
const handlePaymentSuccess = async (paymentIntent) => {
  // 1. Update user subscription status in DynamoDB
  // 2. Grant access to premium features  
  // 3. Send confirmation email
  // 4. Log successful payment
};

const handlePaymentFailure = async (paymentIntent) => {
  // 1. Update user status (payment failed)
  // 2. Send notification about failed payment
  // 3. Potentially restrict access
  // 4. Log failed payment for follow-up
};

const handleSubscriptionCreated = async (subscription) => {
  // 1. Update user profile with subscription details
  // 2. Activate premium features
  // 3. Send welcome email
  // 4. Update user role in Cognito
};
```

---

## 🛠️ **Implementation Strategy**

### Phase 1: Payment Processing (Week 1)
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`  
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

### Phase 2: Subscription Management (Week 2)
- ✅ `customer.subscription.*` events
- ✅ Trial management
- ✅ Feature access control

### Phase 3: Customer Experience (Week 3)  
- ✅ `checkout.session.completed`
- ✅ `customer.created`
- ✅ Payment method management

### Phase 4: Advanced Features (Week 4)
- ✅ Fraud detection events
- ✅ Dispute handling
- ✅ Advanced analytics

---

## 🔧 **Testing Your Webhook Events**

Use Stripe CLI to test events locally:

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:4242/webhook

# Trigger specific events for testing
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

---

**Start with the Critical and Important events first - they'll handle 90% of your billing needs!** 🚀
