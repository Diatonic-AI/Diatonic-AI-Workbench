# 🚀 Quick Cloudflare Setup Guide for diatonic.ai

## Current Status ✅
- ✅ Domain added to Cloudflare (Zone ID: `2ce1478eaf8042eaa3bee715d34301b9`)
- ✅ Free plan active
- ✅ Automation scripts ready

## Next Steps

### 1. Get Your Cloudflare API Token
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token" 
3. Use "Custom token" template
4. Configure permissions:
   - **Zone:Zone:Read** (all zones)
   - **Zone:DNS:Edit** (all zones) 
   - **Zone:Zone Settings:Edit** (all zones)
5. Set Zone Resources to "Include All zones"
6. Copy the token and save it securely

### 2. Configure DNS Records (Choose One Method)

#### Option A: Using the Automation Script (Recommended)
```bash
# Set environment variables
export CLOUDFLARE_API_TOKEN="your_token_here"
export CLOUDFLARE_ZONE_ID="2ce1478eaf8042eaa3bee715d34301b9"

# Navigate to the infrastructure directory
cd /home/daclab-ai/dev/AWS-DevOps/apps/ai-nexus-workbench/infrastructure

# Check prerequisites and current status
./cloudflare-automation.sh check

# Create all DNS records and configure settings
./cloudflare-automation.sh configure-all

# Test DNS propagation
./cloudflare-automation.sh test-dns
```

#### Option B: Using Terraform
```bash
# Set environment variables
export CLOUDFLARE_API_TOKEN="your_token_here"
export TF_VAR_cloudflare_api_token="your_token_here"

# Initialize Terraform (first time only)
terraform init

# Plan the changes
terraform plan -var="cloudflare_api_token=$CLOUDFLARE_API_TOKEN"

# Apply the configuration
terraform apply -var="cloudflare_api_token=$CLOUDFLARE_API_TOKEN"
```

### 3. DNS Records That Will Be Created

All records will be **Proxied** (orange cloud) except the API record:

| Name | Type | Value | Proxied | Purpose |
|------|------|-------|---------|---------|
| diatonic.ai | CNAME | d34iz6fjitwuax.cloudfront.net | ✅ | Apex domain |
| www | CNAME | diatonic.ai | ✅ | WWW subdomain |
| app | CNAME | diatonic.ai | ✅ | App subdomain |
| dev | CNAME | diatonic.ai | ✅ | Development |
| app.dev | CNAME | diatonic.ai | ✅ | Dev app |
| admin.dev | CNAME | diatonic.ai | ✅ | Dev admin |
| www.dev | CNAME | diatonic.ai | ✅ | Dev www |
| api | CNAME | d34iz6fjitwuax.cloudfront.net | ❌ | API (DNS only) |

### 4. Settings That Will Be Configured

#### SSL/TLS Settings:
- **SSL Mode**: Full (Strict)
- **Always Use HTTPS**: On
- **Minimum TLS Version**: 1.2
- **Automatic HTTPS Rewrites**: On

#### Performance Settings:
- **Brotli Compression**: On
- **Auto Minify**: HTML, CSS, JS
- **Rocket Loader**: On
- **Cache Level**: Aggressive
- **Browser Cache TTL**: 4 hours

#### Security Settings:
- **Security Level**: Medium
- **Bot Fight Mode**: On
- **Browser Integrity Check**: On
- **Email Obfuscation**: On

### 5. Update Nameservers (Critical Step)

After DNS records are created, you need to update your domain's nameservers:

1. **Check current nameservers**:
```bash
./cloudflare-automation.sh settings | grep -A10 "nameservers"
```

2. **Update at your registrar** (appears to be GoDaddy via GoogleRegistry):
   - Login to your domain registrar
   - Find DNS/Nameserver settings
   - Replace current nameservers with Cloudflare's assigned ones
   - Typical Cloudflare nameservers look like:
     - `lola.ns.cloudflare.com`
     - `kirk.ns.cloudflare.com`

### 6. Verification and Testing

After nameserver update (allow 24-48 hours for full propagation):

```bash
# Test DNS propagation
./cloudflare-automation.sh test-dns

# Check zone analytics
./cloudflare-automation.sh analytics

# List all DNS records
./cloudflare-automation.sh list
```

### 7. Advanced Configuration (Optional)

#### Enable Additional Features:
- **Page Rules**: Already configured for static assets and API bypass
- **Firewall Rules**: Bot protection configured
- **Rate Limiting**: API protection (100 requests/minute)
- **Workers**: Can be added for edge computing

#### Upgrade Considerations:
The Free plan includes:
- ✅ Unmetered DDoS mitigation
- ✅ Global CDN
- ✅ SSL certificate
- ✅ 3 Page Rules
- ✅ 5 Firewall Rules

Consider **Pro Plan** ($25/month) for:
- 📈 Web Application Firewall (WAF)
- 📊 Advanced Analytics
- 🔄 Image Optimization
- 📱 Mobile Optimization
- 🛡️ Advanced DDoS Protection

### 8. Monitoring and Maintenance

#### Regular Tasks:
1. **Monitor SSL Certificate**: Auto-renews with Cloudflare
2. **Check Analytics**: Track performance improvements
3. **Update Page Rules**: Optimize caching as needed
4. **Security Review**: Monitor firewall events

#### Performance Monitoring:
```bash
# Check current performance
curl -w "@curl-format.txt" -o /dev/null -s "https://diatonic.ai"

# Test from multiple locations
for location in us-east eu-west asia-pacific; do
  echo "Testing from $location..."
  curl -H "CF-IPCountry: $location" -I "https://diatonic.ai"
done
```

### 9. Rollback Plan (If Issues Occur)

If you encounter issues after nameserver change:

1. **Immediate Rollback**:
   - Revert nameservers to Route 53:
     - `ns-1632.awsdns-12.co.uk`
     - `ns-710.awsdns-24.net`
     - `ns-1432.awsdns-51.org`
     - `ns-45.awsdns-05.com`

2. **Troubleshoot**:
   - Check DNS propagation: `dig diatonic.ai`
   - Verify SSL: `openssl s_client -connect diatonic.ai:443`
   - Check Cloudflare status: https://www.cloudflarestatus.com/

### 10. Expected Performance Improvements

After successful migration:
- **Global Performance**: 20-40% faster globally
- **SSL/TLS**: Improved handshake performance
- **Compression**: Automatic Brotli/Gzip
- **Caching**: Edge caching for static assets
- **Security**: DDoS protection and WAF
- **SEO**: Better Core Web Vitals scores

## Quick Commands Reference

```bash
# Environment setup
export CLOUDFLARE_API_TOKEN="your_token_here"
export CLOUDFLARE_ZONE_ID="2ce1478eaf8042eaa3bee715d34301b9"

# One-command setup
./cloudflare-automation.sh configure-all

# Individual commands
./cloudflare-automation.sh check          # Check status
./cloudflare-automation.sh list           # List DNS records  
./cloudflare-automation.sh create-dns     # Create DNS records only
./cloudflare-automation.sh configure-ssl  # Configure SSL only
./cloudflare-automation.sh configure-perf # Configure performance
./cloudflare-automation.sh configure-sec  # Configure security
./cloudflare-automation.sh analytics      # View analytics
./cloudflare-automation.sh test-dns       # Test DNS propagation
```

## Support and Resources

- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **API Documentation**: https://developers.cloudflare.com/api/
- **Community Forum**: https://community.cloudflare.com/
- **Status Page**: https://www.cloudflarestatus.com/

---
**Ready to proceed?** Get your API token and run `./cloudflare-automation.sh configure-all`!
