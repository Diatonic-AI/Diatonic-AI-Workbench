# 🚨 Infrastructure Migration Plan: CloudFront/S3 → Amplify

## **Current State Analysis**

**Domain**: `diatonic.ai`
**Migration**: CloudFront/S3 → AWS Amplify
**Risk Level**: HIGH (Production system in use)

---

## 🔍 **Discovered Infrastructure**

### **CloudFront Distributions**
1. **Production Distribution**: `d1bw1xopa9byqn.cloudfront.net`
   - 🌐 **Domains**: `diatonic.ai`, `www.diatonic.ai`, `app.diatonic.ai`
   - 📊 **Status**: Deployed and Active
   - ⚠️ **Risk**: PRIMARY PRODUCTION SYSTEM

2. **Development Distribution**: `d34iz6fjitwuax.cloudfront.net`
   - 🌐 **Domains**: `dev.diatonic.ai`, `www.dev.diatonic.ai`, `app.dev.diatonic.ai`, `admin.dev.diatonic.ai`, `api.dev.diatonic.ai`
   - 📊 **Status**: Deployed and Active
   - ⚠️ **Risk**: Development system with multiple subdomains

### **S3 Buckets (Production System)**
- `diatonic-prod-frontend-bnhhi105` - **Primary Frontend**
- `diatonic-prod-application-production-kkfasrcr` - Application Data
- `diatonic-prod-backup-production-kkfasrcr` - Backup Storage
- `diatonic-prod-compliance-production-kkfasrcr` - Compliance Data
- `diatonic-prod-data-lake-production-kkfasrcr` - Data Lake
- `diatonic-prod-logs-production-kkfasrcr` - Logging
- `diatonic-prod-static-assets-production-kkfasrcr` - Static Assets

### **SSL Certificates**
- 2 ACM Certificates for `dev.diatonic.ai` (both ISSUED)
- CloudFront distributions likely using additional certificates

### **Amplify Apps**
- `ddfry2y14h2zr` - New development app (not yet domain-connected)

---

## 🎯 **Migration Strategy: Zero-Downtime Blue-Green**

### **Phase 1: Backup & Analysis (CRITICAL - DO FIRST)**

#### **1.1 Document Current URLs and Test All Functionality**
```bash
# Test all current URLs
curl -I https://diatonic.ai
curl -I https://www.diatonic.ai
curl -I https://app.diatonic.ai
curl -I https://dev.diatonic.ai
curl -I https://www.dev.diatonic.ai
curl -I https://app.dev.diatonic.ai
curl -I https://admin.dev.diatonic.ai
curl -I https://api.dev.diatonic.ai
```

#### **1.2 Backup Route 53 Records (if they exist)**
```bash
# Check Route 53 hosted zones
aws route53 list-hosted-zones

# If hosted zone exists for diatonic.ai, backup all records
aws route53 list-resource-record-sets --hosted-zone-id ZXXXXXXXXXXXXX > route53-backup-$(date +%Y%m%d).json
```

#### **1.3 Document CloudFront Configuration**
```bash
# Get detailed CloudFront configs
aws cloudfront get-distribution --id d1bw1xopa9byqn > cloudfront-prod-backup.json
aws cloudfront get-distribution --id d34iz6fjitwuax > cloudfront-dev-backup.json
```

### **Phase 2: Prepare New Amplify Environment**

#### **2.1 Create Staging Amplify Apps**
```bash
# Create staging branch first
git checkout -b staging
git push origin staging

# This will trigger staging deployment via our CI/CD
```

#### **2.2 Set up Temporary Subdomains**
Use different subdomains initially to avoid conflicts:
- `new.diatonic.ai` → New Amplify production
- `staging.diatonic.ai` → New Amplify staging  
- `newdev.diatonic.ai` → New Amplify development

### **Phase 3: Domain Migration (High Risk - Requires Coordination)**

#### **3.1 Migrate Development First (Lower Risk)**
```bash
# Step 1: Configure new dev subdomain
aws amplify create-domain-association \
  --app-id ddfry2y14h2zr \
  --domain-name diatonic.ai \
  --sub-domain-settings '[
    {
      "prefix": "newdev",
      "branchName": "develop"
    }
  ]'

# Step 2: Test thoroughly
# Step 3: Update DNS to point dev.diatonic.ai to Amplify
# Step 4: Disable old CloudFront distribution
```

#### **3.2 Migrate Production (Highest Risk - Plan Carefully)**
```bash
# Step 1: Setup new production subdomain
aws amplify create-domain-association \
  --app-id [PRODUCTION_APP_ID] \
  --domain-name diatonic.ai \
  --sub-domain-settings '[
    {
      "prefix": "www",
      "branchName": "main"
    }
  ]'

# Step 2: Coordinate DNS switchover during maintenance window
# Step 3: Monitor and rollback if issues
```

---

## ⚠️ **CRITICAL SAFETY MEASURES**

### **Before ANY Changes:**
1. **📸 Full Backup**: Document all current URLs and functionality
2. **🧪 Test Environment**: Verify new Amplify apps work perfectly
3. **📞 Stakeholder Notification**: Warn all users of potential changes
4. **⏰ Maintenance Window**: Plan changes during low-traffic periods
5. **🔄 Rollback Plan**: Have exact steps to revert changes

### **Rollback Procedures:**
```bash
# Emergency rollback: Re-enable old CloudFront
aws cloudfront update-distribution --id d1bw1xopa9byqn --if-match ETAG

# Revert DNS records
aws route53 change-resource-record-sets --hosted-zone-id ZXXXXX --change-batch file://rollback-dns.json
```

---

## 🛠️ **Detailed Cleanup Scripts**

### **Safe Cleanup Script (After Migration Success)**
```bash
#!/usr/bin/env bash
# cleanup-old-infrastructure.sh
set -euo pipefail

echo "🗑️ Starting infrastructure cleanup (POST-MIGRATION ONLY)"

# Disable CloudFront distributions (DON'T DELETE immediately)
aws cloudfront get-distribution-config --id d1bw1xopa9byqn > prod-dist-config.json
aws cloudfront get-distribution-config --id d34iz6fjitwuax > dev-dist-config.json

# Update distribution to disable (set Enabled: false)
# This allows rollback but stops serving traffic

# Cleanup unused S3 buckets (BE VERY CAREFUL)
echo "⚠️ Listing S3 buckets for manual review:"
aws s3 ls | grep diatonic

# Cleanup unused ACM certificates (after confirming not in use)
echo "📜 ACM certificates (review before deletion):"
aws acm list-certificates --query "CertificateSummaryList[?contains(DomainName, 'diatonic')]"
```

---

## 📋 **Migration Checklist**

### **Pre-Migration (REQUIRED)**
- [ ] **Full functionality test** of existing sites
- [ ] **Backup all configurations** (CloudFront, S3, Route 53)
- [ ] **Document all current URLs** and their purposes
- [ ] **Verify new Amplify deployments** work perfectly
- [ ] **Identify maintenance window** (low traffic time)
- [ ] **Notify all stakeholders** of planned changes
- [ ] **Prepare rollback procedures** and test them

### **Migration Day**
- [ ] **Set up monitoring** for all URLs
- [ ] **Start with development environment** (lower risk)
- [ ] **Test thoroughly** before proceeding to production
- [ ] **Production migration** during maintenance window
- [ ] **Monitor for 24 hours** post-migration
- [ ] **Have rollback ready** throughout

### **Post-Migration**
- [ ] **Verify all functionality** working
- [ ] **Monitor performance** and errors
- [ ] **Disable old infrastructure** (don't delete immediately)
- [ ] **Plan cleanup** after 1-2 weeks of stability
- [ ] **Update documentation** with new infrastructure

---

## 🚨 **High-Risk Actions (Require Approval)**

### **NEVER Do These Without Explicit Approval:**
1. **Delete S3 buckets** - Contains production data
2. **Delete CloudFront distributions** - Breaks current production
3. **Modify Route 53 A records** for root domain - Immediate production impact
4. **Delete ACM certificates** - May break SSL

### **Safe Actions (Can Do Immediately):**
1. **Create new Amplify domain associations** with new subdomains
2. **Add new Route 53 CNAME records** for new subdomains
3. **Test new Amplify deployments** thoroughly
4. **Document current infrastructure** for rollback

---

## 🎯 **Recommended Migration Timeline**

### **Week 1: Preparation**
- Day 1-2: Full infrastructure analysis and backup
- Day 3-4: Test new Amplify environments thoroughly
- Day 5: Create migration plan and get approvals

### **Week 2: Development Migration**
- Day 1: Migrate development environment
- Day 2-3: Test and verify development works
- Day 4-5: Plan production migration

### **Week 3: Production Migration**
- Day 1: Final testing and preparation
- Day 2: Execute production migration (maintenance window)
- Day 3-7: Monitor and resolve any issues

### **Week 4: Cleanup**
- Day 1-7: Verify stability and plan old infrastructure cleanup

---

## 📞 **Next Steps - CHOOSE YOUR APPROACH**

### **Option A: Conservative (Recommended)**
1. **Keep existing production untouched**
2. **Set up new Amplify with temporary subdomains**
3. **Test thoroughly over 1-2 weeks**
4. **Plan coordinated switchover**

### **Option B: Aggressive (Higher Risk)**
1. **Backup everything immediately**
2. **Migrate development environment first**
3. **Quick production switchover**

### **Option C: Parallel (Safest but Complex)**
1. **Run both systems in parallel**
2. **Gradually migrate traffic**
3. **Monitor both systems**
4. **Switch completely only when confident**

---

**🔥 CRITICAL DECISION NEEDED:**
**Which approach do you want to take? This affects ALL your production users!**
