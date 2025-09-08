# 🌐 Cloudflare SSL and DNS Setup Guide
## For workbench.diatonic.ai Domain

**Generated:** 2025-09-08 05:28 UTC  
**AWS Certificate ARN:** `arn:aws:acm:us-east-1:313476888312:certificate/8084809d-c4a9-469d-9cdf-034aeeb19a55`

---

## 🎯 Overview

This guide walks you through setting up SSL certificates and DNS records for `workbench.diatonic.ai` using Cloudflare DNS and AWS Certificate Manager.

## 📋 Required DNS Records for SSL Validation

To validate the SSL certificate, you need to add these **CNAME records** to Cloudflare:

### 1. Main Domain Validation
```
Name: _5abbed6b1aa68a23db4ca1f4b47a5789.workbench.diatonic.ai
Type: CNAME
Value: _f32f775f1022c4ab5d5ac5db89f88730.xlfgrmvvlj.acm-validations.aws
TTL: Auto (or 300 seconds)
```

### 2. API Subdomain Validation
```
Name: _2edd1ba6bda60afdcb0086d4a573132a.api.workbench.diatonic.ai
Type: CNAME  
Value: _2dcebc08991d18b73da4edba759d6c69.xlfgrmvvlj.acm-validations.aws
TTL: Auto (or 300 seconds)
```

## 🔧 Step-by-Step Cloudflare Setup

### Step 1: Access Cloudflare DNS Management
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Log in to your account
3. Select the `diatonic.ai` domain
4. Navigate to **DNS** > **Records**

### Step 2: Add SSL Validation Records
For **each validation record above**:

1. Click **"Add record"**
2. Select **Type:** `CNAME`
3. Enter the **Name** (exactly as shown above, including the subdomain)
4. Enter the **Target/Value** (the AWS validation domain)
5. Set **TTL:** to `Auto` or `300` seconds
6. Click **"Save"**

### Step 3: Add Application DNS Records

After SSL validation, you'll need these DNS records for your actual services:

#### Main Application (Frontend)
```
Name: workbench.diatonic.ai (or just "workbench")
Type: CNAME
Value: [Your CloudFront Distribution Domain]
TTL: Auto
Proxy status: Proxied (orange cloud)
```

#### API Gateway
```
Name: api.workbench.diatonic.ai (or "api.workbench")
Type: CNAME
Value: [Your API Gateway Domain - will get after terraform apply]
TTL: Auto
Proxy status: DNS Only (gray cloud)
```

### Step 4: Verify SSL Certificate Validation

After adding the validation records, run this command to check the certificate status:

```bash
aws acm describe-certificate \
  --certificate-arn "arn:aws:acm:us-east-1:313476888312:certificate/8084809d-c4a9-469d-9cdf-034aeeb19a55" \
  --region us-east-1 \
  --query "Certificate.Status"
```

The status should change from `PENDING_VALIDATION` to `ISSUED` (usually takes 5-15 minutes).

## 🚀 Next Steps After SSL Validation

### 1. Update Terraform Configuration
Once the certificate is validated, update your `terraform.tfvars`:

```hcl
# Domain configuration (enable after SSL validation)
domain_name = "workbench.diatonic.ai"
acm_certificate_arn = "arn:aws:acm:us-east-1:313476888312:certificate/8084809d-c4a9-469d-9cdf-034aeeb19a55"
```

### 2. Deploy Infrastructure with Custom Domain
```bash
cd infrastructure/
terraform plan --out=stripe-webhook-with-ssl.tfplan
terraform apply "stripe-webhook-with-ssl.tfplan"
```

### 3. Get API Gateway Custom Domain
After deployment, get the custom domain name:
```bash
terraform output main_api_custom_domain
```

### 4. Update Cloudflare DNS for API
Add the final DNS record:
```
Name: api.workbench.diatonic.ai
Type: CNAME
Value: [From terraform output - should be like d-xyz.execute-api.us-east-2.amazonaws.com]
TTL: Auto
Proxy status: DNS Only (gray cloud)
```

## 🔍 Validation Commands

### Check Certificate Status
```bash
aws acm describe-certificate \
  --certificate-arn "arn:aws:acm:us-east-1:313476888312:certificate/8084809d-c4a9-469d-9cdf-034aeeb19a55" \
  --region us-east-1 \
  --query "Certificate.Status" \
  --output text
```

### Test DNS Resolution
```bash
# Test main domain
nslookup workbench.diatonic.ai

# Test API subdomain
nslookup api.workbench.diatonic.ai

# Test SSL validation records
nslookup _5abbed6b1aa68a23db4ca1f4b47a5789.workbench.diatonic.ai
nslookup _2edd1ba6bda60afdcb0086d4a573132a.api.workbench.diatonic.ai
```

### Test SSL Certificate
```bash
# Test SSL once configured
openssl s_client -connect api.workbench.diatonic.ai:443 -servername api.workbench.diatonic.ai < /dev/null
```

## 📊 Expected Timeline

| Step | Duration | Status |
|------|----------|--------|
| Add DNS validation records | 2-3 minutes | ⏳ Manual |
| DNS propagation | 5-15 minutes | ⏳ Automatic |
| SSL certificate validation | 5-15 minutes | ⏳ AWS |
| Terraform deployment | 3-5 minutes | ⏳ Manual |
| Final DNS configuration | 2-3 minutes | ⏳ Manual |

**Total estimated time:** 15-40 minutes

## 🚨 Troubleshooting

### Certificate Validation Stuck
If validation takes longer than 30 minutes:
1. Double-check DNS record names and values (copy-paste exactly)
2. Ensure TTL is set to 300 seconds or Auto
3. Check DNS propagation: `dig _5abbed6b1aa68a23db4ca1f4b47a5789.workbench.diatonic.ai`

### DNS Not Resolving
1. Clear your local DNS cache: `sudo systemctl flush-dns` or `sudo dscacheutil -flushcache`
2. Try different DNS servers: `dig @8.8.8.8 workbench.diatonic.ai`
3. Check Cloudflare proxy status (should be "DNS Only" for API Gateway)

### API Gateway Domain Issues
1. Ensure certificate is in `us-east-1` region (required for API Gateway)
2. Verify certificate covers the exact domain name
3. Check API Gateway custom domain configuration

## 🎯 Final Webhook URL

Once everything is configured, your Stripe webhook URL will be:
```
https://api.workbench.diatonic.ai/v1/webhooks/stripe
```

This will provide:
- ✅ SSL encryption
- ✅ Custom branded domain
- ✅ Professional appearance
- ✅ Better security and trust

---

## 📝 Quick Action Checklist

- [ ] Add SSL validation CNAME records to Cloudflare
- [ ] Wait for certificate validation (5-15 minutes)
- [ ] Update terraform.tfvars with domain and certificate ARN
- [ ] Deploy infrastructure with custom domain support
- [ ] Add final DNS record for API Gateway
- [ ] Test webhook URL and SSL
- [ ] Update Stripe webhook endpoint URL

**Next Command to Run:**
```bash
# Check certificate status every few minutes until ISSUED
aws acm describe-certificate \
  --certificate-arn "arn:aws:acm:us-east-1:313476888312:certificate/8084809d-c4a9-469d-9cdf-034aeeb19a55" \
  --region us-east-1 \
  --query "Certificate.Status" \
  --output text
```

Once it shows `ISSUED`, you can proceed with the Terraform deployment!
