# AI Nexus to Diatonic AI Table Migration Plan

**Generated:** 2025-09-17T02:42:00Z  
**Operation:** Table Rename via Create + Migrate + Decommission  
**Scope:** 4 tables, 8 Lambda functions, Development environment only  

---

## 🎯 Migration Overview

### Current State
- **Tables:** 4 AI Nexus Stripe tables (all empty, 0 items)
- **Dependencies:** 8 Lambda functions with hard-coded table names in environment variables
- **Risk Level:** LOW-MEDIUM (dev environment, but has active Lambda dependencies)

### Target State
- **New Tables:** `diatonic-ai-stripe-*` naming convention
- **Zero Downtime:** Lambda functions updated to use new table names
- **Data Preservation:** All existing data migrated (currently 0 items, so easy)

---

## 📋 Migration Steps Summary

### Phase 1: Pre-Migration (5 minutes)
1. ✅ **Discovery Complete** - All dependencies identified
2. ✅ **Collision Check** - All new names available  
3. 🔄 **Backup Strategy** - Enable PITR, create snapshots
4. 🔄 **Schema Synthesis** - Generate new table specs

### Phase 2: Table Creation (10 minutes)  
5. 🔄 **Create New Tables** - Identical schema to original
6. 🔄 **Verification** - Confirm tables created successfully

### Phase 3: Zero-Downtime Migration (15 minutes)
7. 🔄 **Data Copy** - Copy existing data (0 items = instant)
8. 🔄 **Lambda Environment Update** - Update all 8 functions
9. 🔄 **Validation** - Test all Lambda functions

### Phase 4: Cleanup (After 7 days)
10. 🔄 **Decommission** - Delete old tables after observation period

---

## 📊 Detailed Analysis

### Tables to Migrate

| Old Table Name | New Table Name | Size | Items | Dependencies | Risk |
|---|---|---|---|---|---|
| `ai-nexus-dev-stripe-customers` | `diatonic-ai-stripe-customers` | 0 bytes | 0 | 6 Lambdas | HIGH |  
| `ai-nexus-dev-stripe-subscriptions` | `diatonic-ai-stripe-subscriptions` | 0 bytes | 0 | 5 Lambdas | HIGH |
| `ai-nexus-dev-stripe-invoices` | `diatonic-ai-stripe-invoices` | 0 bytes | 0 | 2 Lambdas | MEDIUM |
| `ai-nexus-dev-stripe-idempotency` | `diatonic-ai-stripe-idempotency` | 0 bytes | 0 | 1 Lambda | LOW |

### Lambda Functions to Update

| Function Name | Environment Variables to Change | Criticality |
|---|---|---|
| `ai-nexus-dev-stripe-stripe-webhook-handler` | 4 variables | 🚨 CRITICAL |
| `ai-nexus-dev-stripe-get-subscription-status` | 2 variables | HIGH |
| `ai-nexus-dev-stripe-update-subscription` | 2 variables | HIGH |
| `ai-nexus-dev-stripe-create-checkout-session` | 2 variables | HIGH |
| `ai-nexus-dev-stripe-create-setup-intent` | 1 variable | MEDIUM |
| `ai-nexus-dev-stripe-create-portal-session` | 1 variable | MEDIUM |
| `ai-nexus-dev-stripe-list-invoices` | 1 variable | MEDIUM |
| `ai-nexus-dev-stripe-cancel-subscription` | 1 variable | MEDIUM |

### Key Advantages for This Migration

1. **Empty Tables** - All tables have 0 items, so data migration is instant
2. **Development Environment** - No production impact 
3. **No Streams** - No DynamoDB Streams to manage
4. **Pay-per-Request** - No provisioned capacity concerns
5. **SSE Enabled** - Security settings consistent

---

## 🔧 Technical Implementation

### Migration Strategy: Environment Variable Update

Since the tables are empty, we can use the simplest strategy:

1. **Create new tables** with identical schema
2. **Update Lambda environment variables** to point to new tables  
3. **No data migration needed** (0 items)
4. **Test thoroughly** before considering old tables for deletion

### Schema Specifications

All tables use:
- **Billing Mode:** PAY_PER_REQUEST  
- **SSE:** ENABLED
- **PITR:** DISABLED (will enable during migration)
- **Streams:** DISABLED
- **Tags:** Will add proper governance tags

**Table Schemas:**
- `customers`: PK=`tenant_id`, SK=`user_id`, 1 GSI
- `subscriptions`: PK=`tenant_id`, SK=`subscription_id`, 2 GSIs  
- `invoices`: PK=`tenant_id`, SK=`invoice_id`, 1 GSI
- `idempotency`: PK=`event_id`, no SK, no GSIs

---

## ⚡ Execution Commands

### Step 1: Enable PITR on Source Tables
```bash
for T in ai-nexus-dev-stripe-customers ai-nexus-dev-stripe-idempotency ai-nexus-dev-stripe-invoices ai-nexus-dev-stripe-subscriptions; do
  echo "Enabling PITR for $T"
  aws dynamodb update-continuous-backups \
    --table-name "$T" \
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
    --output json | tee -a aws/CHANGES.log
done
```

### Step 2: Create New Tables (Generated from Discovery)
```bash
# Will be generated based on describe-table outputs
aws dynamodb create-table --cli-input-json file://aws/PLANS/table-specs/diatonic-ai-stripe-customers.json
aws dynamodb create-table --cli-input-json file://aws/PLANS/table-specs/diatonic-ai-stripe-subscriptions.json  
aws dynamodb create-table --cli-input-json file://aws/PLANS/table-specs/diatonic-ai-stripe-invoices.json
aws dynamodb create-table --cli-input-json file://aws/PLANS/table-specs/diatonic-ai-stripe-idempotency.json
```

### Step 3: Update Lambda Environment Variables
```bash
# Update each Lambda function with new table names
aws lambda update-function-configuration \
  --function-name "ai-nexus-dev-stripe-stripe-webhook-handler" \
  --environment Variables='{
    "TABLE_CUSTOMERS": "diatonic-ai-stripe-customers",
    "TABLE_SUBSCRIPTIONS": "diatonic-ai-stripe-subscriptions", 
    "TABLE_INVOICES": "diatonic-ai-stripe-invoices",
    "TABLE_IDEMPOTENCY": "diatonic-ai-stripe-idempotency",
    "EVENTBRIDGE_BUS_NAME": "ai-nexus-dev-stripe-event-bus"
  }' --output json | tee -a aws/CHANGES.log

# Repeat for other 7 functions...
```

---

## 🛡️ Safety Measures

### Pre-Migration Checklist
- [x] All new table names available (no collisions)
- [x] Source tables are empty (0 items each)  
- [x] All dependencies identified (8 Lambda functions)
- [ ] PITR enabled on source tables
- [ ] Backup snapshots created
- [ ] New table specs generated

### During Migration Checklist  
- [ ] New tables created successfully
- [ ] All tables show ACTIVE status
- [ ] Lambda functions updated successfully
- [ ] Test events executed successfully on each Lambda
- [ ] No errors in CloudWatch Logs

### Post-Migration Checklist
- [ ] All Lambda functions working correctly
- [ ] Source tables remain untouched (safety buffer)
- [ ] CloudWatch alarms not triggered  
- [ ] Application functionality verified

### Rollback Plan
If issues occur:
1. **Revert Lambda environment variables** to original table names
2. **Original tables remain intact** (no data loss possible)
3. **Delete new tables** if necessary
4. **Root cause analysis** before retry

---

## ⏱️ Timeline

| Phase | Duration | Actions |
|---|---|---|
| **Phase 1: Preparation** | 10 minutes | Enable PITR, create backups, generate specs |
| **Phase 2: Table Creation** | 15 minutes | Create 4 new tables, wait for ACTIVE status |  
| **Phase 3: Lambda Updates** | 20 minutes | Update 8 Lambda functions, test each one |
| **Phase 4: Validation** | 15 minutes | End-to-end testing, monitoring checks |
| **Total Downtime** | 0 minutes | Zero-downtime migration |
| **Total Duration** | 60 minutes | Including validation and safety checks |

---

## 📈 Success Criteria

### Immediate Success (within 1 hour)
- ✅ All 4 new tables created and ACTIVE  
- ✅ All 8 Lambda functions updated successfully
- ✅ Test invocations work on all Lambda functions
- ✅ No CloudWatch errors or alarms

### 7-Day Success (after observation period)
- ✅ No production issues reported
- ✅ All applications functioning normally  
- ✅ No unexpected AWS costs
- ✅ Ready to decommission old tables

---

## 🚨 Risk Mitigation

### High Priority Risks
1. **Lambda Function Failure** - Webhook handler is critical
   - *Mitigation:* Test with Stripe test webhooks
   - *Rollback:* Immediate environment variable revert

2. **Missing Permissions** - New tables may have different IAM requirements
   - *Mitigation:* Lambda execution roles should work (same account)
   - *Rollback:* Original tables remain accessible

3. **Schema Mismatch** - Generated schema might be incorrect
   - *Mitigation:* Double-check all GSI configurations  
   - *Rollback:* Delete new tables, fix specs, retry

### Medium Priority Risks  
1. **Monitoring Gaps** - CloudWatch dashboards may reference old names
2. **Documentation** - README/docs may reference old table names
3. **Local Development** - Developer environments may break

---

## 📝 Next Actions

**To proceed with this migration:**

1. **Review and approve this plan**
2. **Generate table creation specs** (next step)
3. **Execute Phase 1** (preparation)
4. **Execute Phase 2** (table creation) 
5. **Execute Phase 3** (Lambda updates)
6. **Monitor for 7 days**
7. **Decommission old tables**

---

**Status:** PLAN READY FOR EXECUTION  
**Approval Required:** Review technical details and confirm go/no-go  
**Estimated Completion:** 2025-09-17 04:00 UTC (1.5 hours from now)