# 🚀 Infrastructure Migration: Execution Plan

**Domain**: `diatonic.ai`  
**Date**: September 8, 2025  
**Approach**: Destroy old infrastructure and set up clean Amplify deployment  

---

## 🎯 **Execution Steps**

### **Phase 1: Infrastructure Cleanup (Now)**
```bash
# 1. Clean up old CloudFront distributions and ACM certificates
./scripts/cleanup-old-infrastructure.sh

# This will:
# - Delete CloudFront distribution d1bw1xopa9byqn (diatonic.ai, www.diatonic.ai, app.diatonic.ai)
# - Delete CloudFront distribution d34iz6fjitwuax (dev.diatonic.ai, *.dev.diatonic.ai)
# - Delete 2 ACM certificates for dev.diatonic.ai
# - Create backup files for recovery
```

### **Phase 2: Create Staging Environment**
```bash
# 2. Create staging branch and trigger deployment
git checkout -b staging
git push origin staging

# This will:
# - Trigger GitHub Actions workflow for staging environment
# - Create new Amplify app for staging: diatonic-ai-workbench-staging
# - Generate staging URL: https://main.[APP_ID].amplifyapp.com
```

### **Phase 3: Configure Domain with Amplify**
```bash
# 3. Set up diatonic.ai domain with Amplify
./scripts/setup-domain.sh diatonic.ai

# This will:
# - Check if diatonic.ai is in Route 53 (likely not initially)
# - Configure subdomains: www, dev, staging
# - Provide DNS configuration instructions
# - Set up SSL certificates automatically via Amplify
```

### **Phase 4: DNS Configuration (Manual)**
Since `diatonic.ai` may not be in Route 53 initially, you'll need to:

1. **Add CNAME records** to your DNS provider:
   ```
   CNAME www    ddfry2y14h2zr.amplifyapp.com
   CNAME dev    ddfry2y14h2zr.amplifyapp.com  
   CNAME staging [STAGING_APP_ID].amplifyapp.com
   ```

2. **Root domain** (diatonic.ai):
   - ALIAS record (if supported): `ddfry2y14h2zr.amplifyapp.com`
   - Or redirect to `www.diatonic.ai`

---

## 🌐 **Resulting URL Structure**

After migration completion:

### **Production Environment (main branch)**
- **https://diatonic.ai** → Redirects to www
- **https://www.diatonic.ai** → Production deployment
- **Note**: `app.diatonic.ai` will be discontinued (consolidate into main app)

### **Staging Environment (staging branch)** 
- **https://staging.diatonic.ai** → Staging deployment

### **Development Environment (develop branch)**
- **https://dev.diatonic.ai** → Development deployment
- **Note**: Old subdomains (www.dev, app.dev, admin.dev, api.dev) consolidated

---

## 📊 **Migration Benefits**

### **Simplified Architecture**
- ✅ **Reduced complexity**: No more CloudFront + S3 management
- ✅ **Automated deployments**: GitHub Actions → Amplify
- ✅ **Simplified SSL**: Amplify handles certificates automatically
- ✅ **Better performance**: Amplify's global CDN

### **Cost Optimization**
- ✅ **Lower costs**: Amplify pricing simpler than CloudFront + S3 + ACM
- ✅ **No infrastructure management**: AWS manages the hosting
- ✅ **Built-in monitoring**: Amplify includes metrics and logging

### **Operational Benefits**
- ✅ **Faster deployments**: ~90 seconds vs manual S3 uploads
- ✅ **Environment consistency**: Same deployment process for dev/staging/prod
- ✅ **Rollback capabilities**: Instant rollbacks to previous deployments
- ✅ **Branch-based deployments**: Auto-deploy on git push

---

## ⚠️ **Important Notes**

### **Subdomain Consolidation**
The old complex subdomain structure will be simplified:
- **Old**: `app.diatonic.ai`, `admin.dev.diatonic.ai`, `api.dev.diatonic.ai`
- **New**: Single-page applications with routing for different sections

### **S3 Buckets (Keep for Now)**
- Production S3 buckets (`diatonic-prod-*`) are **NOT** being deleted
- These may contain important data/backups
- Review and clean up separately after confirming not needed

### **DNS Propagation**
- DNS changes may take 1-48 hours to propagate globally
- Test from different locations/networks
- Use incognito/private browsing to avoid cache issues

---

## 🔍 **Monitoring & Verification**

### **After Each Phase**
```bash
# Check CloudFront cleanup
aws cloudfront list-distributions --query "DistributionList.Items[?contains(Aliases.Items[0], 'diatonic')]"

# Check Amplify apps
aws amplify list-apps --query "apps[].{Name:name,AppId:appId,DefaultDomain:defaultDomain}"

# Check domain associations
aws amplify list-domain-associations --app-id ddfry2y14h2zr

# Test DNS resolution
nslookup www.diatonic.ai
nslookup dev.diatonic.ai
nslookup staging.diatonic.ai
```

### **Final Verification Checklist**
- [ ] **Old CloudFront distributions deleted**
- [ ] **ACM certificates cleaned up**
- [ ] **Amplify apps deployed for all environments**
- [ ] **DNS records configured and propagating**
- [ ] **HTTPS working on all domains**
- [ ] **Application functionality verified**
- [ ] **GitHub Actions workflows successful**

---

## 🚨 **Emergency Rollback (If Needed)**

If something goes wrong, the backup files can restore the old infrastructure:

```bash
# Restore CloudFront distribution from backup
aws cloudfront create-distribution --distribution-config file://backup-cloudfront-production-[TIMESTAMP].json

# Request new ACM certificates
aws acm request-certificate --domain-name dev.diatonic.ai --validation-method DNS
```

---

## 📞 **Ready to Execute**

**Status**: ✅ Ready to start  
**Duration**: ~2-3 hours total (mostly waiting for DNS propagation)  
**Risk**: Low (old infrastructure can be restored from backups)

**To begin:**
```bash
./scripts/cleanup-old-infrastructure.sh
```

Type `DESTROY` when prompted to confirm infrastructure deletion.

---

**🎯 Let's execute this plan step by step!**
