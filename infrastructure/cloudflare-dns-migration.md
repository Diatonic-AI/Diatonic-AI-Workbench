# Cloudflare DNS Migration Plan for diatonic.ai

## Overview
This document outlines the complete migration strategy from AWS Route 53 to Cloudflare DNS for enhanced performance, security, and global CDN capabilities.

## Current AWS Route 53 Configuration

### Existing DNS Records:
```
diatonic.ai.                → ALIAS → d34iz6fjitwuax.cloudfront.net
www.diatonic.ai.            → ALIAS → d34iz6fjitwuax.cloudfront.net
app.diatonic.ai.            → ALIAS → d34iz6fjitwuax.cloudfront.net
dev.diatonic.ai.            → ALIAS → d34iz6fjitwuax.cloudfront.net
app.dev.diatonic.ai.        → ALIAS → d34iz6fjitwuax.cloudfront.net
admin.dev.diatonic.ai.      → ALIAS → d34iz6fjitwuax.cloudfront.net
www.dev.diatonic.ai.        → ALIAS → d34iz6fjitwuax.cloudfront.net
```

## Phase 1: Cloudflare Zone Setup (Manual)

### Step 1.1: Add Domain to Cloudflare
1. Login to https://dash.cloudflare.com
2. Click "Add Site"
3. Enter: `diatonic.ai`
4. Select plan: **Business** (recommended for advanced features)
5. Skip automatic DNS import - we'll configure manually

### Step 1.2: Get Nameservers
Cloudflare will assign nameservers like:
- `lola.ns.cloudflare.com`
- `kirk.ns.cloudflare.com`

## Phase 2: DNS Record Configuration

### Step 2.1: Configure DNS Records in Cloudflare

**🎯 Records to Create:**

#### Production Records:
```
Type: A/AAAA
Name: diatonic.ai (root/apex)
Content: [Cloudflare will provide proxy IPs]
Proxy Status: ✅ Proxied (orange cloud)
TTL: Auto
```

```
Type: CNAME  
Name: www
Content: diatonic.ai
Proxy Status: ✅ Proxied (orange cloud)
TTL: Auto
```

```
Type: CNAME
Name: app
Content: diatonic.ai
Proxy Status: ✅ Proxied (orange cloud)
TTL: Auto
```

#### Development Records:
```
Type: CNAME
Name: dev
Content: diatonic.ai
Proxy Status: ✅ Proxied (orange cloud)
TTL: Auto
```

```
Type: CNAME
Name: app.dev
Content: diatonic.ai
Proxy Status: ✅ Proxied (orange cloud)
TTL: Auto
```

```
Type: CNAME
Name: admin.dev
Content: diatonic.ai
Proxy Status: ✅ Proxied (orange cloud)
TTL: Auto
```

```
Type: CNAME
Name: www.dev
Content: diatonic.ai
Proxy Status: ✅ Proxied (orange cloud)
TTL: Auto
```

#### API Record (from Terraform):
```
Type: CNAME
Name: api
Content: [API Gateway custom domain]
Proxy Status: ❌ DNS Only (grey cloud) - for AWS ACM validation
TTL: Auto
```

## Phase 3: SSL/TLS Configuration

### Step 3.1: SSL/TLS Settings
1. **SSL/TLS Mode**: Full (Strict)
2. **Edge Certificates**: 
   - Universal SSL: ✅ Enabled
   - Advanced certificates: Order for specific needs
3. **Origin Certificates**: Create Cloudflare origin certificate for backend

### Step 3.2: Advanced Certificate (Optional)
For maximum control, order Advanced Certificate:
- **Hostnames**: `*.diatonic.ai, diatonic.ai`
- **Validation Method**: HTTP
- **Certificate Authority**: Let's Encrypt
- **Validity Period**: 90 days (auto-renewal)

## Phase 4: Performance & Security Configuration

### Step 4.1: Performance Settings
- **Auto Minify**: ✅ HTML, CSS, JS
- **Brotli Compression**: ✅ Enabled  
- **Polish**: Lossless
- **Mirage**: ✅ Enabled
- **Rocket Loader**: ✅ Enabled

### Step 4.2: Security Settings
- **Security Level**: Medium
- **Bot Fight Mode**: ✅ Enabled
- **WAF**: Configure custom rules as needed
- **DDoS Protection**: Automatic (included)

### Step 4.3: Caching Settings
- **Browser Cache TTL**: 4 hours
- **Cloudflare Cache TTL**: 2 hours
- **Always Online**: ✅ Enabled
- **Cache Level**: Standard

## Phase 5: CloudFront Integration Strategy

### Option A: Hybrid Approach (Recommended)
- Keep CloudFront for AWS-specific services
- Use Cloudflare as primary CDN for web content
- Route `api.diatonic.ai` directly to AWS API Gateway

### Option B: Full Cloudflare Migration
- Replace CloudFront entirely with Cloudflare
- Configure origin servers to point to AWS ALB/ELB
- Update all DNS records to use Cloudflare proxy

## Phase 6: Nameserver Migration

### Step 6.1: Gradual Migration (Recommended)
1. **Test Phase**: 
   - Set low TTL (300s) on Route 53 NS records
   - Test Cloudflare configuration thoroughly
   
2. **Migration Phase**:
   - Update nameservers at registrar
   - Monitor DNS propagation

### Step 6.2: Nameserver Update
Update at your domain registrar:
```
Old NS:
ns-1632.awsdns-12.co.uk
ns-710.awsdns-24.net
ns-1432.awsdns-51.org
ns-45.awsdns-05.com

New NS:
[Cloudflare assigned nameservers]
lola.ns.cloudflare.com
kirk.ns.cloudflare.com
```

## Phase 7: Testing & Validation

### Step 7.1: Pre-Migration Testing
```bash
# Test DNS resolution
dig @1.1.1.1 diatonic.ai
dig @8.8.8.8 www.diatonic.ai

# Test SSL/TLS
openssl s_client -connect diatonic.ai:443 -servername diatonic.ai

# Test HTTP headers
curl -I https://diatonic.ai
```

### Step 7.2: Post-Migration Validation
```bash
# Check propagation
nslookup diatonic.ai
nslookup www.diatonic.ai

# Test all subdomains
for subdomain in www app dev app.dev admin.dev www.dev; do
  echo "Testing $subdomain.diatonic.ai"
  curl -sI https://$subdomain.diatonic.ai | head -1
done
```

## Phase 8: Monitoring & Optimization

### Step 8.1: Analytics Setup
- Enable Cloudflare Analytics
- Configure Real User Monitoring (RUM)
- Set up alerts for downtime

### Step 8.2: Performance Monitoring
- Monitor Core Web Vitals
- Track cache hit ratios
- Monitor SSL/TLS certificate renewal

## Rollback Plan

### Emergency Rollback Procedure
1. **Immediate**: Revert nameservers to Route 53
2. **Verify**: All services functioning normally
3. **Investigate**: Root cause of issues
4. **Plan**: Corrective actions before retry

### Rollback Commands
```bash
# Export current Cloudflare DNS (before migration)
# [API commands to be added]

# Restore Route 53 nameservers at registrar
# [Registrar-specific instructions]
```

## Success Metrics

### Performance Improvements Expected:
- **Global Performance**: 20-40% faster load times globally
- **Cache Hit Ratio**: 85%+ for static content
- **SSL Performance**: Improved handshake times
- **DDoS Protection**: Automatic mitigation

### Security Enhancements:
- **WAF Protection**: Advanced threat detection
- **Bot Mitigation**: Reduced malicious traffic
- **SSL/TLS**: Enhanced cipher suites
- **Analytics**: Detailed security insights

## Next Steps After Manual Zone Creation

Once you've manually created the zone in Cloudflare:
1. Run the MCP tool commands to configure Workers/R2/D1 as needed
2. Use the Cloudflare API for advanced configurations
3. Set up monitoring and alerting
4. Plan the nameserver migration timing

## Support Resources

- **Cloudflare Support**: Available for Business+ plans
- **Documentation**: https://developers.cloudflare.com/
- **Community**: https://community.cloudflare.com/
- **Status Page**: https://www.cloudflarestatus.com/
