# Pricing Page and Stripe Checkout Integration Analysis

**Generated**: 2025-01-16 18:56:34 UTC  
**Project**: AI Nexus Workbench - Diatonic AI Platform  

---

## Current Implementation Status

### ✅ What We Have Configured

#### Frontend Components
- **Pricing Page** (`/src/pages/Pricing.tsx`):
  - Uses centralized `PRICING` model from `/src/lib/pricing.ts` 
  - 5 plan tiers: Free, Basic ($29-290), Pro ($99-990), Extreme ($299-2990), Enterprise (Custom)
  - Monthly/yearly billing toggle with savings calculation
  - `PlanCard` component with dynamic CTA buttons
  - `useStripeCheckout` and `useBillingPortal` hooks integration
  - Current button actions: Free → `/auth/signup`, Paid → Direct Stripe checkout, Enterprise → `/contact`

#### Authentication System
- **AWS Cognito Integration**: Full setup with sign up, sign in, confirmation flows
- **Auth Components**: `SignUpForm`, `SignInForm`, `ConfirmSignUpForm` with AWS Amplify
- **Current Registration Fields**: Username, email, password, confirm password
- **User Groups**: BasicUsers, Development, OrgUsers, Testing (from Terraform state)

#### Backend Infrastructure
- **Billing Lambda Handlers**: `createCheckoutSession`, `createPortalSession`, `getSubscriptionStatus`, `updateSubscription`
- **Stripe Integration**: Secret key from AWS Secrets Manager, customer creation/reuse
- **DynamoDB Schema**: Multi-entity single table pattern with `PK: TENANT#{tenantId}` and `SK` namespaces
- **Existing Tables**: Comprehensive user permissions system with 10+ specialized tables

#### Infrastructure (AWS)
- **DynamoDB Tables**: Users, permissions, roles, organizations, billing, quotas, etc.
- **Cognito Setup**: User pools, identity pools, domain, groups configured
- **API Gateway**: Billing endpoints deployed (`y8t99woj1d.execute-api.us-east-2.amazonaws.com`)
- **Lambda Functions**: User registration, profile management, auth post-processing

### ❌ What's Missing (Critical Gaps)

#### User Registration & Onboarding Flow
- **No registration wizard**: Direct signup only collects basic auth info
- **No account type segmentation**: Cannot differentiate individual vs company users
- **No company registration form**: No fields for company name, domain, size, role, etc.
- **No individual extended form**: Missing country, phone, use case fields
- **No review/confirmation step**: Users go directly from signup to checkout

#### Lead Capture System
- **Contact page exists** but doesn't capture leads in database
- **No leads table**: Form submissions aren't stored or processed
- **No sales integration**: No notifications to sales team for enterprise inquiries
- **No UTM tracking**: Missing attribution data for marketing campaigns

#### Stripe Webhook Integration
- **No webhook endpoint**: Subscription states not synced after payment
- **No event handlers**: checkout.session.completed, subscription.created not processed
- **No role assignment**: Users don't get proper permissions after payment
- **No quota initialization**: Subscription limits not set after activation

#### Database Schema Gaps
- **Missing core entities table**: Billing lambda expects single-table pattern not found in Terraform
- **No leads storage**: Contact sales submissions have nowhere to go
- **No tenant/organization linking**: Individual vs company distinction not stored

---

## Required Implementation Plan

### Phase 1: Onboarding Wizard (High Priority)

#### 1.1 Routing & State Management
```typescript
// New routes needed
/onboarding                 // Entry point with plan/interval from query
/onboarding/account-type    // Individual vs Company selection  
/onboarding/individual      // Individual user form
/onboarding/company         // Company registration form
/onboarding/review          // Plan review and consent
/onboarding/checkout        // Stripe redirect and polling
/onboarding/success         // Post-activation success page
```

#### 1.2 Registration Forms
**Individual Form Fields**:
- First name, last name, email, password
- Country, phone (optional)
- What will you be using our platform for?
- How did you hear about us? (marketing attribution)

**Company Form Fields**:  
- Company name, domain, size, industry
- First name, last name, email, password, phone
- Position/role, team size
- What will your team be using our platform for?
- How did you hear about us?

#### 1.3 State Management
- `OnboardingContext` provider with sessionStorage persistence
- Track: planId, interval, accountType, formData, tenantId, progress
- Survive page refresh and browser navigation

### Phase 2: Database Schema Updates

#### 2.1 Core Entities Table
```sql
-- DynamoDB Single Table Design
Table: aws-devops-dev-core
PK (Hash Key) | SK (Range Key) | Attributes
TENANT#${tenantId} | PROFILE | { name, type, domain, ... }
TENANT#${tenantId} | BILLING#CUSTOMER | { stripeCustomerId, ... }
TENANT#${tenantId} | BILLING#SUBSCRIPTION | { status, planId, ... }
TENANT#${tenantId} | CHECKOUT#${sessionId} | { status, priceId, ... }
USER#${userId} | PROFILE | { email, tenantIds, ... }
ORG#${orgId} | PROFILE | { name, domain, size, ... }

-- GSIs for reverse lookups
GSI1: CUSTOMER#${stripeCustomerId} -> TENANT#${tenantId}
GSI2: SUBSCRIPTION#${stripeSubscriptionId} -> TENANT#${tenantId}
```

#### 2.2 Leads Table
```sql
Table: aws-devops-dev-leads  
Hash Key: lead_id
Attributes: email, name, company, size, phone, plan, useCase, 
           timeline, budgetRange, message, utm_source, utm_campaign,
           created_at, status, assigned_to, qualified_at

GSI1: email-index (for deduplication)
GSI2: created-at-index (for chronological queries)
GSI3: status-index (for pipeline management)
TTL: expires_at (cleanup after 2 years)
```

### Phase 3: Backend API Enhancements

#### 3.1 New Endpoints
```typescript
POST /v1/tenants
// Creates tenant (individual or organization)
// Body: { type: 'individual' | 'company', userId, orgName?, domain?, attributes }
// Returns: { tenantId, type, status }

POST /v1/leads/contact-sales  
// Captures sales leads from contact forms
// Body: { name, email, company, size, phone, plan, useCase, timeline, message, utm }
// Returns: { leadId, status, estimatedResponseTime }

POST /v1/billing/webhook
// Stripe webhook endpoint for subscription events  
// Handles: checkout.session.completed, customer.subscription.*
// Updates: subscription status, user roles, quotas

DELETE /v1/tenants/{tenantId}/billing/subscription
// Cancel subscription endpoint (missing from current implementation)
```

#### 3.2 Checkout Flow Enhancements
```typescript
// Enhanced createCheckoutSession handler
- Accept planId + interval instead of just priceId
- Server-side price resolution for security
- Include 14-day trial for eligible plans
- Rich metadata for attribution and analytics
- Customer email pre-fill for better UX
```

### Phase 4: Stripe Webhook Integration

#### 4.1 Event Handlers
```typescript
checkout.session.completed → {
  // Mark checkout complete
  // Fetch subscription from Stripe  
  // Update BILLING#SUBSCRIPTION record
  // Set user subscription_tier
  // Initialize quota limits
  // Send welcome email
}

customer.subscription.created/updated → {
  // Sync subscription status and billing period
  // Update plan mappings
  // Adjust user permissions
}

customer.subscription.deleted → {
  // Handle cancellation
  // Schedule access reduction
  // Send retention email
}

invoice.payment_failed → {
  // Update payment status
  // Send dunning email
  // Notify admin if needed
}
```

#### 4.2 Role & Quota Assignment
```typescript
// On successful subscription activation
1. Update users.subscription_tier
2. Create team_memberships record (Owner role)
3. Initialize subscription_limits with plan quotas
4. Grant appropriate permissions via role_permissions
5. Send onboarding emails with next steps
```

### Phase 5: Frontend Pricing Page Updates

#### 5.1 Button Flow Changes
```typescript
// Current vs New button actions
FREE PLAN:
- Current: → /auth/signup  
- New: → /onboarding?plan=free&interval=monthly

PAID PLANS (Basic, Pro, Extreme):
- Current: → Direct Stripe checkout
- New: → /onboarding?plan={planId}&interval={interval}

ENTERPRISE:
- Current: → /contact
- New: → /contact?plan=enterprise&source=pricing

CURRENT PLAN:
- Current: "Current Plan" (disabled) + "Manage" (billing portal)
- New: Same, but handle tenant-less users gracefully
```

#### 5.2 UI Copy Improvements
```typescript
// Add trial messaging for eligible plans
"Start your 14-day free trial" // When trial available
"Save 17% with yearly billing" // Show calculated savings
"Most popular" // Highlight Pro plan
"Contact sales for custom pricing" // Enterprise
```

### Phase 6: Contact Sales Lead Capture

#### 6.1 Enhanced Contact Page
```typescript
// Replace current basic contact form with:
1. Tab selection: "General Inquiry" vs "Enterprise Demo"
2. Pre-fill plan if coming from pricing (?plan=enterprise)
3. Company fields: name, domain, size, industry
4. Sales-specific fields: timeline, budget range, use case
5. UTM parameter capture for attribution
6. Marketing consent checkboxes
```

#### 6.2 Lead Processing
```typescript
// On form submission:
1. Store lead in DynamoDB leads table
2. Send confirmation email to lead
3. Notify sales team via Slack/email
4. Set follow-up reminders
5. Track conversion metrics
```

---

## Implementation Priority Matrix

### 🔴 Critical (Week 1-2)
1. **Core single-table DynamoDB** - Required for billing lambda compatibility
2. **Onboarding wizard skeleton** - Routes, context, basic navigation
3. **Individual registration form** - Core signup flow improvement
4. **Stripe webhook endpoint** - Essential for subscription activation

### 🟡 High Priority (Week 3-4)  
5. **Company registration form** - Enable B2B customer acquisition
6. **Leads table and API** - Capture enterprise inquiries
7. **Enhanced contact page** - Better lead capture UX
8. **Role assignment on activation** - Proper permissions after payment

### 🟢 Medium Priority (Week 5-6)
9. **Analytics and tracking** - Conversion funnel visibility
10. **Email notifications** - Welcome, payment, cancellation flows
11. **Trial period configuration** - 14-day trial implementation
12. **Subscription management** - Cancel, upgrade, downgrade flows

---

## Database Tables Required

### New Tables Needed
1. **Core Entities** (`aws-devops-dev-core`) - Single-table pattern for billing
2. **Leads** (`aws-devops-dev-leads`) - Sales lead capture and management

### Existing Tables to Utilize
- `users` - User profiles and subscription_tier
- `team_memberships` - Organization membership and roles
- `subscription_limits` - Usage quotas per plan
- `organization_settings` - Company metadata
- `roles` & `role_permissions` - Permission system

### Page Routes to Create

#### Onboarding Flow
- `/onboarding` - Wizard entry point
- `/onboarding/account-type` - Individual vs Company
- `/onboarding/individual` - Individual user form  
- `/onboarding/company` - Company registration form
- `/onboarding/review` - Plan confirmation
- `/onboarding/checkout` - Stripe redirect
- `/onboarding/success` - Activation success

#### Existing to Enhance
- `/pricing` - Update button actions and copy
- `/contact` - Add lead capture functionality
- `/auth/signup` - May become fallback for direct registration

---

## API Endpoints Required

### New Endpoints
```typescript
POST /v1/tenants                    // Create individual/company tenant
POST /v1/leads/contact-sales        // Capture sales leads  
POST /v1/billing/webhook            // Stripe event processing
DELETE /v1/tenants/{id}/billing/subscription // Cancel subscription
```

### Existing to Enhance  
```typescript
POST /v1/tenants/{id}/billing/checkout      // Add planId support
GET  /v1/tenants/{id}/billing/subscription  // Add trial info
POST /v1/tenants/{id}/billing/portal        // Keep as-is
```

---

## Success Metrics

### Conversion Funnel
- **Pricing page visits** → Plan selection rate
- **Plan selection** → Onboarding start rate  
- **Onboarding start** → Registration completion rate
- **Registration** → Checkout initiation rate
- **Checkout initiation** → Payment success rate
- **Payment success** → Account activation rate (webhook processing)

### Lead Quality
- **Contact sales clicks** → Lead capture rate
- **Lead capture** → Sales qualification rate
- **Qualification** → Demo booking rate
- **Demo booking** → Deal closure rate

### Technical Performance
- **Webhook processing time** < 30 seconds
- **Account activation rate** > 95% within 2 minutes
- **Form completion rate** > 80% for onboarding wizard
- **Error rate** < 1% for critical flows

---

This comprehensive analysis provides the roadmap for implementing the complete pricing page integration with user segmentation, registration flows, Stripe checkout, and lead capture system. The implementation should be done in phases to minimize risk and ensure each component is thoroughly tested before moving to the next phase.