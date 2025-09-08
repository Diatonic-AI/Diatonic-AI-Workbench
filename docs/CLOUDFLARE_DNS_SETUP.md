# Cloudflare DNS Integration with AWS Amplify

This guide provides step-by-step instructions for setting up Cloudflare DNS to work with AWS Amplify hosting for the Diatonic AI Workbench.

## Overview

We'll configure Cloudflare to handle DNS for your custom domain while AWS Amplify hosts the application. This setup provides:

- **Cloudflare CDN**: Global edge caching and performance optimization
- **SSL/TLS**: Automatic SSL certificates and security features
- **DNS Management**: Advanced DNS features and analytics
- **DDoS Protection**: Built-in security and rate limiting
- **AWS Integration**: Seamless integration with Amplify hosting

## Prerequisites

- Cloudflare account with your domain added
- AWS Amplify app created and deployed
- Domain ownership verified in both Cloudflare and AWS
- GitHub repository secrets configured (see `GITHUB_SECRETS_SETUP.md`)

## DNS Record Configuration

### 1. Primary Domain Configuration

#### Main Application Domain
```bash
# Primary domain pointing to Amplify
Type: CNAME
Name: @  (or diatonic.ai)
Target: main.d1234567890123.amplifyapp.com
TTL: Auto (or 300 seconds)
Proxy Status: ☑️ Proxied (orange cloud)
```

#### WWW Subdomain
```bash
# WWW redirect to main domain
Type: CNAME  
Name: www
Target: diatonic.ai
TTL: Auto
Proxy Status: ☑️ Proxied
```

### 2. Environment-Specific Subdomains

#### Staging Environment
```bash
Type: CNAME
Name: staging
Target: develop.d1234567890123.amplifyapp.com
TTL: Auto
Proxy Status: ☑️ Proxied
```

#### Development Environment  
```bash
Type: CNAME
Name: dev
Target: dev.d1234567890123.amplifyapp.com
TTL: Auto
Proxy Status: ☑️ Proxied
```

#### API Subdomain
```bash
Type: CNAME
Name: api
Target: your-api-gateway-domain.execute-api.us-east-2.amazonaws.com
TTL: Auto
Proxy Status: ☑️ Proxied
```

### 3. Additional Service Subdomains

#### Authentication Service
```bash
Type: CNAME
Name: auth
Target: your-cognito-domain.auth.us-east-2.amazoncognito.com
TTL: Auto
Proxy Status: ☑️ Proxied
```

#### Status Page
```bash
Type: CNAME
Name: status
Target: status-page-service.herokuapp.com
TTL: Auto
Proxy Status: ☐ DNS Only (gray cloud)
```

## Cloudflare Page Rules

Configure page rules for optimal performance and security:

### 1. API Caching Rule
```
URL Pattern: api.diatonic.ai/*
Settings:
- Cache Level: Bypass
- Security Level: Medium
- Browser Integrity Check: On
```

### 2. Static Assets Caching
```
URL Pattern: *.diatonic.ai/assets/*
Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 month
```

### 3. Root Domain Redirect
```
URL Pattern: diatonic.ai/*
Settings:
- Always Use HTTPS: On
- Automatic HTTPS Rewrites: On
```

## SSL/TLS Configuration

### 1. SSL/TLS Encryption Mode
- Go to **Cloudflare Dashboard** → **SSL/TLS** → **Overview**
- Set encryption mode to **"Full (strict)"**
- This ensures end-to-end encryption between visitors, Cloudflare, and AWS

### 2. Edge Certificates
- **Universal SSL**: Should be automatically enabled
- **Always Use HTTPS**: Enable to redirect HTTP to HTTPS
- **HTTP Strict Transport Security (HSTS)**: Enable with these settings:
  - Max Age Header: 6 months
  - Include subdomains: Yes
  - Preload: Yes

### 3. Origin Certificates
Generate an origin certificate for AWS Amplify:

1. Go to **SSL/TLS** → **Origin Server** → **Create Certificate**
2. Select **"Let Cloudflare generate a private key and a CSR"**
3. Hostnames: `*.diatonic.ai, diatonic.ai`
4. Certificate Validity: 15 years
5. Download the certificate and key
6. Configure in AWS Amplify custom domain settings

## Security Configuration

### 1. Security Level
- Set to **"Medium"** for balanced protection
- Can be increased to **"High"** if needed

### 2. Web Application Firewall (WAF)
Enable managed rules:
- **Cloudflare Core Ruleset**: On
- **Cloudflare WordPress**: Off (not applicable)
- **Cloudflare Rate Limiting**: Configure as needed

### 3. Bot Management
- **Bot Fight Mode**: Enable for basic protection
- **Super Bot Fight Mode**: Consider upgrading for advanced protection

### 4. DDoS Protection
- Automatic DDoS protection is included
- Monitor **Security** → **Events** for attack patterns

## Performance Optimization

### 1. Speed Settings
```
Auto Minify:
- JavaScript: ☑️ On
- CSS: ☑️ On  
- HTML: ☑️ On

Brotli Compression: ☑️ On
Early Hints: ☑️ On (if available)
```

### 2. Caching Rules
```bash
# Static Assets (High Cache)
URL Pattern: *.diatonic.ai/assets/*
Cache TTL: 1 month
Browser Cache TTL: 1 month

# HTML Files (Short Cache)
URL Pattern: *.diatonic.ai/*.html
Cache TTL: 2 hours  
Browser Cache TTL: 4 hours

# API Endpoints (No Cache)
URL Pattern: api.diatonic.ai/*
Cache TTL: Bypass
```

### 3. Image Optimization
- **Polish**: Lossless or Lossy (based on preference)
- **Mirage**: On (for mobile optimization)
- **WebP**: On (automatic WebP conversion)

## AWS Amplify Configuration

### 1. Custom Domain Setup in Amplify
1. Go to **AWS Amplify Console** → Your App → **Domain management**
2. Click **"Add domain"**
3. Enter your domain: `diatonic.ai`
4. Select branches to map:
   - `main` → `diatonic.ai`
   - `develop` → `staging.diatonic.ai`  
   - `dev` → `dev.diatonic.ai`

### 2. SSL Certificate in Amplify
1. Amplify will automatically provision SSL certificates
2. Wait for DNS validation (this can take 15-30 minutes)
3. Verify certificate is active before updating DNS

### 3. Redirects and Rewrites
Add to your `amplify.yml` file:
```yaml
customHeaders:
  - pattern: '**/*'
    headers:
      - key: 'X-Frame-Options'
        value: 'DENY'
      - key: 'X-XSS-Protection'  
        value: '1; mode=block'
      - key: 'Referrer-Policy'
        value: 'strict-origin-when-cross-origin'
```

## Testing and Validation

### 1. DNS Propagation
```bash
# Check DNS resolution
nslookup diatonic.ai 8.8.8.8
dig diatonic.ai @8.8.8.8

# Check SSL certificate
openssl s_client -connect diatonic.ai:443 -servername diatonic.ai
```

### 2. Performance Testing
- **GTmetrix**: Analyze page speed and optimization
- **WebPageTest**: Detailed performance metrics
- **Cloudflare Analytics**: Monitor traffic and performance

### 3. Security Testing  
- **SSL Labs**: Test SSL configuration (ssllabs.com/ssltest)
- **Security Headers**: Check security headers (securityheaders.com)
- **Cloudflare Security Events**: Monitor for attacks and blocks

## Monitoring and Maintenance

### 1. Analytics Setup
- **Cloudflare Analytics**: Built-in traffic and security analytics
- **Google Analytics**: Add tracking to your React application
- **AWS CloudWatch**: Monitor Amplify application metrics

### 2. Alerts and Notifications
Set up alerts for:
- **Traffic spikes**: Unusual traffic patterns
- **Security events**: Attack attempts and blocks
- **SSL certificate expiry**: Certificate renewal reminders
- **Origin server errors**: AWS Amplify issues

### 3. Regular Maintenance
- **Monthly**: Review analytics and performance metrics
- **Quarterly**: Update security rules and configurations
- **Annually**: Renew certificates and review DNS settings

## Troubleshooting

### Common Issues

1. **DNS Not Resolving**
   - Check DNS record configuration
   - Verify TTL settings (lower for testing)
   - Wait for propagation (up to 48 hours)

2. **SSL Certificate Errors**
   - Ensure Cloudflare is set to "Full (strict)" mode
   - Verify origin certificate is properly configured
   - Check certificate expiry dates

3. **502/503 Errors**
   - Verify AWS Amplify app is deployed and running
   - Check origin server configuration
   - Review Cloudflare cache settings

4. **Slow Performance**
   - Review caching rules and TTL settings
   - Check image optimization settings
   - Analyze Cloudflare analytics for bottlenecks

### Debug Commands
```bash
# Check DNS from different locations
curl -H "Host: diatonic.ai" http://1.1.1.1/dns-query?name=diatonic.ai&type=A

# Test SSL handshake
curl -vI https://diatonic.ai

# Check response headers
curl -I https://diatonic.ai
```

## Advanced Configuration

### 1. Load Balancing
For high availability, consider setting up:
- **Geographic load balancing**: Route traffic based on visitor location
- **Health checks**: Monitor origin server health
- **Failover rules**: Automatic failover to backup origins

### 2. Workers (Serverless Functions)
Use Cloudflare Workers for:
- **A/B testing**: Route traffic to different versions
- **Authentication**: Custom authentication logic
- **API proxying**: Custom API middleware and routing

### 3. Stream and Images
For media-heavy applications:
- **Cloudflare Images**: Optimize and deliver images
- **Cloudflare Stream**: Video hosting and delivery

## Cost Considerations

### Free Plan Limitations
- 100,000 requests/month
- Basic DDoS protection
- Shared SSL certificate
- Limited page rules (3)

### Pro Plan Benefits ($20/month)
- Enhanced security features
- Advanced analytics
- 20 page rules
- Image optimization

### Business Plan Benefits ($200/month)  
- Priority support
- Advanced security
- Custom SSL certificates
- Load balancing

## Next Steps

1. **Configure all DNS records** as specified above
2. **Set up SSL certificates** in both Cloudflare and AWS
3. **Test all environments** (production, staging, development)
4. **Configure monitoring** and alerting
5. **Optimize performance** based on analytics
6. **Set up backup procedures** and disaster recovery

---

For additional help, refer to:
- [Cloudflare Documentation](https://developers.cloudflare.com/)
- [AWS Amplify Custom Domains Guide](https://docs.aws.amazon.com/amplify/latest/userguide/custom-domains.html)
- [SSL/TLS Best Practices](https://developers.cloudflare.com/ssl/)
