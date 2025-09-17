# DynamoDB Table Rename Approvals

## Operation: AI Nexus to Diatonic AI Table Rename

**Date:** 2025-09-17  
**Requested By:** daclab-ai  
**Operation Type:** Table Rename (Create New + Migrate + Decommission Old)  
**Environment:** Development only  
**Account:** 313476888312  
**Region:** us-east-2  

### Scope
**Tables in Scope (4 total):**
1. `ai-nexus-dev-stripe-customers` → `diatonic-ai-stripe-customers`
2. `ai-nexus-dev-stripe-idempotency` → `diatonic-ai-stripe-idempotency` 
3. `ai-nexus-dev-stripe-invoices` → `diatonic-ai-stripe-invoices`
4. `ai-nexus-dev-stripe-subscriptions` → `diatonic-ai-stripe-subscriptions`

**Business Justification:**
- Consolidating naming convention from `ai-nexus-dev-*` to `diatonic-ai-*`
- Aligning with project rebrand to Diatonic AI platform
- Development environment only - no production impact

### Risk Assessment
- **Risk Level:** LOW (development environment only)
- **Production Impact:** NONE (no production tables involved)
- **Downtime:** Minimal (can use zero-downtime migration strategy)
- **Rollback:** Available (keep old tables during migration)

### Approval Status

**✅ APPROVED** - Development Environment Table Rename  
**Approved By:** daclab-ai  
**Approval Date:** 2025-09-17 02:40 UTC  
**Conditions:**
- Development environment only
- Use zero-downtime migration strategy
- Keep old tables for 7 days after successful migration
- Full backup before any changes

### Change Window
- **Start:** 2025-09-17 02:45 UTC
- **Duration:** 2-3 hours estimated
- **Maintenance Required:** No (zero-downtime approach)

### Excluded from Scope
- All other tables (66 tables) remain unchanged
- Production tables (`diatonic-prod-*`) not touched
- Infrastructure tables (`aws-devops-terraform-state-lock`) not touched

---

**Status:** APPROVED FOR EXECUTION  
**Next Action:** Proceed with comprehensive discovery and migration planning