# 🌐 Custom Domain Setup Guide for AWS Amplify

Configure your custom domain to point to your Diatonic AI Workbench deployment.

**Current Amplify App**: `ddfry2y14h2zr.amplifyapp.com`  
**App ID**: `ddfry2y14h2zr`  

---

## 🚀 Quick Start (Automated Setup)

If you have your domain ready, use our automated setup script:

```bash
# Run the automated setup script
./scripts/setup-domain.sh yourdomain.com

# Example:
./scripts/setup-domain.sh diatonic-ai.com
```

This script will:
- ✅ Check if your domain is in AWS Route 53
- ✅ Configure subdomains for all environments
- ✅ Set up SSL certificates automatically
- ✅ Provide manual DNS instructions if needed

---

## 📋 Manual Setup Instructions

### **Option 1: Domain in AWS Route 53 (Recommended)**

If your domain is managed by AWS Route 53, setup is fully automated:

```bash
# Add custom domain with AWS CLI
aws amplify create-domain-association \
  --app-id ddfry2y14h2zr \
  --domain-name yourdomain.com \
  --sub-domain-settings '[
    {
      "prefix": "www",
      "branchName": "main"
    },
    {
      "prefix": "dev", 
      "branchName": "develop"
    }
  ]' \
  --enable-auto-sub-domain
```

**What happens automatically:**
- 🎯 DNS records created in Route 53
- 🔒 SSL certificate provisioned via ACM
- 🚀 Domain verification completed
- ⏱️ **Setup time**: 10-15 minutes

### **Option 2: External Domain Provider (Manual DNS)**

If your domain is managed elsewhere (GoDaddy, Namecheap, Cloudflare, etc.):

#### **Step 1: Create Domain Association**
```bash
aws amplify create-domain-association \
  --app-id ddfry2y14h2zr \
  --domain-name yourdomain.com \
  --sub-domain-settings '[
    {
      "prefix": "www",
      "branchName": "main" 
    },
    {
      "prefix": "dev",
      "branchName": "develop"
    }
  ]'
```

#### **Step 2: Configure DNS Records**
Add these records to your domain provider's DNS settings:

| Type  | Name | Value                         | TTL  |
|-------|------|-------------------------------|------|
| CNAME | www  | ddfry2y14h2zr.amplifyapp.com | 3600 |
| CNAME | dev  | ddfry2y14h2zr.amplifyapp.com | 3600 |

**For root domain (@):**
- **If ALIAS supported**: ALIAS @ → ddfry2y14h2zr.amplifyapp.com  
- **If only A records**: Use Amplify's IP (get from AWS support)
- **Alternative**: Redirect @ to www.yourdomain.com

#### **Step 3: Wait for Propagation**
- **DNS Propagation**: 1-24 hours typically
- **SSL Certificate**: Additional 24-48 hours
- **Check status**: `dig yourdomain.com` or online DNS checker

---

## 🌟 Environment-Specific Subdomains

Your setup will create these URLs automatically:

### **Production Environment**
- **URL**: https://www.yourdomain.com
- **Branch**: `main`
- **Use**: Live production site

### **Development Environment**
- **URL**: https://dev.yourdomain.com  
- **Branch**: `develop`
- **Use**: Development testing and demos

### **Staging Environment** (if staging branch exists)
- **URL**: https://staging.yourdomain.com
- **Branch**: `staging` 
- **Use**: Pre-production testing

---

## 🔍 Monitoring and Status Checking

### **Check Domain Status**
```bash
# Get current domain association status
aws amplify get-domain-association \
  --app-id ddfry2y14h2zr \
  --domain-name yourdomain.com

# List all domain associations
aws amplify list-domain-associations \
  --app-id ddfry2y14h2zr
```

### **Domain Status Meanings**
- ✅ **AVAILABLE**: Domain is ready and working
- 🔄 **PENDING_VERIFICATION**: Waiting for DNS/SSL setup
- ⏳ **IN_PROGRESS**: AWS is configuring the domain
- ❌ **FAILED**: Configuration failed (check DNS settings)
- 🔄 **CREATING**: Initial setup in progress

### **SSL Certificate Status**
```bash
# Check certificate details
aws amplify get-domain-association \
  --app-id ddfry2y14h2zr \
  --domain-name yourdomain.com \
  --query 'domainAssociation.certificateVerificationDNSRecord'
```

---

## 🛠️ Popular Domain Providers Instructions

### **GoDaddy**
1. Login to GoDaddy Domain Manager
2. Find your domain → DNS Management
3. Add CNAME records as specified above
4. TTL: 1 Hour (3600 seconds)

### **Namecheap**
1. Login to Namecheap Account
2. Domain List → Manage → Advanced DNS
3. Add CNAME Records as specified
4. TTL: Automatic or 1 hour

### **Cloudflare** 
1. Cloudflare Dashboard → DNS
2. Add CNAME records (ensure proxy is OFF initially)
3. After SSL is working, you can enable proxy
4. TTL: Auto

### **Google Domains**
1. Google Domains → DNS
2. Custom records section
3. Add CNAME records as specified
4. TTL: 3600

---

## 🔧 Advanced Configuration

### **Add More Environments**
```bash
# Add staging subdomain (if staging branch exists)
aws amplify update-domain-association \
  --app-id ddfry2y14h2zr \
  --domain-name yourdomain.com \
  --sub-domain-settings '[
    {
      "prefix": "www",
      "branchName": "main"
    },
    {
      "prefix": "staging", 
      "branchName": "staging"
    },
    {
      "prefix": "dev",
      "branchName": "develop" 
    }
  ]'
```

### **Redirect Root Domain**
If you want `yourdomain.com` (without www) to redirect to `www.yourdomain.com`:

```bash
# Enable root domain redirect
aws amplify update-domain-association \
  --app-id ddfry2y14h2zr \
  --domain-name yourdomain.com \
  --enable-auto-sub-domain
```

### **Custom SSL Certificate** 
If you have your own SSL certificate:

```bash
aws amplify create-domain-association \
  --app-id ddfry2y14h2zr \
  --domain-name yourdomain.com \
  --certificate-arn "arn:aws:acm:region:account:certificate/certificate-id"
```

---

## 🚨 Troubleshooting

### **Common Issues and Solutions**

#### **DNS Not Resolving**
```bash
# Check DNS propagation
nslookup www.yourdomain.com
dig www.yourdomain.com

# Should return: ddfry2y14h2zr.amplifyapp.com
```

**Solutions:**
- Wait longer (DNS can take 24-48 hours)
- Clear DNS cache: `sudo systemctl flush-dns` or `ipconfig /flushdns`
- Check DNS settings with domain provider

#### **SSL Certificate Issues**
- Ensure DNS is resolving correctly first
- SSL certificates require valid DNS resolution
- Check certificate status in Amplify Console
- May take up to 72 hours for full SSL provisioning

#### **Domain Shows "Not Found"**
1. Verify branch deployments are working
2. Check subdomain configuration matches branch names
3. Ensure main/staging/develop branches have successful deployments

#### **Reset Domain Configuration**
```bash
# Remove domain association
aws amplify delete-domain-association \
  --app-id ddfry2y14h2zr \
  --domain-name yourdomain.com

# Wait 5 minutes, then re-add
./scripts/setup-domain.sh yourdomain.com
```

---

## 📊 Verification Checklist

After setup, verify these work:

- [ ] **DNS Resolution**: `nslookup www.yourdomain.com` returns Amplify domain
- [ ] **HTTPS Access**: https://www.yourdomain.com loads without certificate errors
- [ ] **Development**: https://dev.yourdomain.com shows develop branch deployment  
- [ ] **SSL Certificate**: Valid and trusted (check browser lock icon)
- [ ] **Redirects**: Root domain redirects to www (if configured)

### **Test Commands**
```bash
# Test DNS resolution
curl -I https://www.yourdomain.com

# Check SSL certificate 
openssl s_client -servername www.yourdomain.com -connect www.yourdomain.com:443

# Test all environments
curl -I https://dev.yourdomain.com
curl -I https://staging.yourdomain.com  # if exists
curl -I https://www.yourdomain.com
```

---

## 🎯 Best Practices

### **DNS Configuration**
- Use short TTL (3600s) during setup for faster changes
- Increase TTL (86400s) once everything is working  
- Always test DNS changes in incognito/private browser

### **SSL Certificates**
- Let AWS handle SSL certificates (free and auto-renewing)
- Don't use custom certificates unless specifically required
- Monitor certificate expiration in AWS Console

### **Multiple Environments**
- Use consistent subdomain naming: dev, staging, prod
- Align subdomain names with branch names
- Document environment URLs for team members

---

## 🔗 Quick Links

- **🌐 Current App**: https://main.ddfry2y14h2zr.amplifyapp.com
- **📊 AWS Amplify Console**: https://console.aws.amazon.com/amplify/
- **🔍 DNS Checker**: https://dnschecker.org/
- **🔒 SSL Test**: https://www.ssllabs.com/ssltest/

---

## 📞 Support

If you need help:

1. **Check Status**: Run domain setup script with your domain
2. **AWS Support**: If using Route 53, AWS support can help
3. **DNS Provider**: Contact your domain provider for DNS issues
4. **Community**: AWS Amplify GitHub discussions

---

**📝 Example Complete Setup:**

```bash
# 1. Run setup script
./scripts/setup-domain.sh mydomain.com

# 2. Wait for completion
aws amplify get-domain-association --app-id ddfry2y14h2zr --domain-name mydomain.com

# 3. Test your new URLs
curl -I https://www.mydomain.com
curl -I https://dev.mydomain.com

# 4. Celebrate! 🎉
```

Your custom domain will be ready in 15 minutes (Route 53) to 48 hours (external providers).
