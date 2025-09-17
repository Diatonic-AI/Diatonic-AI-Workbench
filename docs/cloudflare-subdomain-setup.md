# Cloudflare Subdomain Configuration for diatonic.ai

This document provides step-by-step instructions for configuring Cloudflare DNS records and routing rules to enable subdomain-based user tier access control for the Diatonic AI platform.

## 🌐 Subdomain Architecture

The platform uses four primary subdomains with specific access control:

| Subdomain | URL | Purpose | Access Level |
|-----------|-----|---------|--------------|
| **Main** | `diatonic.ai` | Primary landing and full platform | Mixed (free + paid) |
| **App** | `app.diatonic.ai` | Premium AI tools suite | Paid (Basic+) |
| **Education** | `edu.diatonic.ai` | AI learning platform | Free |
| **Community** | `fam.diatonic.ai` | Community discussions | Free |

## 📋 Prerequisites

1. **Cloudflare Account**: Domain must be managed through Cloudflare
2. **AWS Amplify or Hosting**: The React application must be deployed
3. **SSL Certificate**: Cloudflare provides automatic SSL
4. **Environment Variables**: AWS Cognito configuration must be set up

## 🔧 Cloudflare DNS Configuration

### Step 1: Basic DNS Records

Set up the following DNS records in your Cloudflare dashboard:

#### A Records (if using AWS Amplify)
```
Type: A
Name: diatonic.ai
Content: [AWS Amplify IP]
Proxy status: Proxied (orange cloud)

Type: CNAME
Name: app
Content: diatonic.ai
Proxy status: Proxied (orange cloud)

Type: CNAME
Name: edu
Content: diatonic.ai
Proxy status: Proxied (orange cloud)

Type: CNAME
Name: fam
Content: diatonic.ai
Proxy status: Proxied (orange cloud)
```

#### CNAME Records (if using custom hosting)
```
Type: CNAME
Name: diatonic.ai
Content: [your-hosting-provider.com]
Proxy status: Proxied (orange cloud)

Type: CNAME
Name: app
Content: [your-hosting-provider.com]
Proxy status: Proxied (orange cloud)

Type: CNAME
Name: edu
Content: [your-hosting-provider.com]
Proxy status: Proxied (orange cloud)

Type: CNAME
Name: fam
Content: [your-hosting-provider.com]
Proxy status: Proxied (orange cloud)
```

### Step 2: Page Rules (Legacy Method)

If using Page Rules (older Cloudflare accounts):

```
# Rule 1: App Subdomain
URL Pattern: app.diatonic.ai/*
Settings: Forward URL (301 Redirect to main with subdomain parameter)
Target: https://diatonic.ai/$1?subdomain=app

# Rule 2: Education Subdomain  
URL Pattern: edu.diatonic.ai/*
Settings: Forward URL (301 Redirect to main with subdomain parameter)
Target: https://diatonic.ai/$1?subdomain=edu

# Rule 3: Community Subdomain
URL Pattern: fam.diatonic.ai/*
Settings: Forward URL (301 Redirect to main with subdomain parameter)  
Target: https://diatonic.ai/$1?subdomain=fam
```

### Step 3: Transform Rules (Recommended Modern Method)

For newer Cloudflare accounts, use Transform Rules > Modify Request Header:

#### Rule 1: App Subdomain Header
```
Rule Name: App Subdomain Detection
Expression: (http.host eq "app.diatonic.ai")
Action: Modify Request Header
Header Name: X-Subdomain
Value: app
```

#### Rule 2: Education Subdomain Header
```
Rule Name: Education Subdomain Detection  
Expression: (http.host eq "edu.diatonic.ai")
Action: Modify Request Header
Header Name: X-Subdomain
Value: edu
```

#### Rule 3: Community Subdomain Header
```
Rule Name: Community Subdomain Detection
Expression: (http.host eq "fam.diatonic.ai")
Action: Modify Request Header
Header Name: X-Subdomain
Value: fam
```

## 🚀 Advanced Configuration with Workers

For more sophisticated routing, create a Cloudflare Worker:

### Worker Script: subdomain-router.js

```javascript
/**
 * Cloudflare Worker for Subdomain Routing
 * Handles subdomain detection and routing for diatonic.ai platform
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
    // Extract subdomain
    const parts = hostname.split('.');
    let subdomain = 'main';
    
    if (parts.length >= 3 && parts[0] !== 'www') {
      subdomain = parts[0];
    }
    
    // Validate subdomain
    const validSubdomains = ['main', 'app', 'edu', 'fam'];
    if (!validSubdomains.includes(subdomain)) {
      subdomain = 'main';
    }
    
    // For subdomains, modify the request
    if (subdomain !== 'main') {
      // Option 1: Add subdomain as query parameter
      url.searchParams.set('subdomain', subdomain);
      url.hostname = 'diatonic.ai'; // Always route to main domain
      
      // Option 2: Add custom header (alternative approach)
      const modifiedRequest = new Request(url.toString(), {
        method: request.method,
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          'X-Subdomain': subdomain,
          'X-Original-Host': hostname
        },
        body: request.body
      });
      
      return fetch(modifiedRequest);
    }
    
    // For main domain, pass through normally
    return fetch(request);
  }
};
```

### Worker Route Configuration

Set up the following routes for the worker:

```
app.diatonic.ai/*
edu.diatonic.ai/*
fam.diatonic.ai/*
```

## 📊 SSL and Security Configuration

### SSL/TLS Settings
```
SSL/TLS encryption mode: Full (strict)
Always Use HTTPS: On
Minimum TLS Version: 1.2
Automatic HTTPS Rewrites: On
```

### Security Headers
Add these security headers via Transform Rules:

```javascript
// Rule: Security Headers for All Subdomains
Expression: (http.host contains "diatonic.ai")
Action: Modify Response Header

Headers to add:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## 🔍 Testing Configuration

### 1. DNS Propagation Test
```bash
# Test DNS resolution for all subdomains
nslookup diatonic.ai 1.1.1.1
nslookup app.diatonic.ai 1.1.1.1
nslookup edu.diatonic.ai 1.1.1.1
nslookup fam.diatonic.ai 1.1.1.1
```

### 2. HTTP Response Test
```bash
# Test HTTP responses and headers
curl -I https://diatonic.ai
curl -I https://app.diatonic.ai
curl -I https://edu.diatonic.ai  
curl -I https://fam.diatonic.ai

# Test with specific paths
curl -I https://app.diatonic.ai/dashboard
curl -I https://edu.diatonic.ai/education
curl -I https://fam.diatonic.ai/community
```

### 3. Subdomain Detection Test

Create a test endpoint in your application:

```typescript
// /api/test-subdomain endpoint
export async function GET(request: Request) {
  const url = new URL(request.url);
  const hostname = url.hostname;
  const subdomainParam = url.searchParams.get('subdomain');
  const subdomainHeader = request.headers.get('X-Subdomain');
  
  return Response.json({
    hostname,
    detectedSubdomain: {
      fromHostname: hostname.split('.')[0],
      fromParameter: subdomainParam,
      fromHeader: subdomainHeader
    },
    timestamp: new Date().toISOString()
  });
}
```

## 📝 Environment-Specific Configuration

### Development Environment
```bash
# .env.local for development
NEXT_PUBLIC_MAIN_DOMAIN=localhost:8080
NEXT_PUBLIC_APP_DOMAIN=localhost:8080?subdomain=app
NEXT_PUBLIC_EDU_DOMAIN=localhost:8080?subdomain=edu
NEXT_PUBLIC_FAM_DOMAIN=localhost:8080?subdomain=fam
```

### Staging Environment
```bash
# .env.staging
NEXT_PUBLIC_MAIN_DOMAIN=staging.diatonic.ai
NEXT_PUBLIC_APP_DOMAIN=app-staging.diatonic.ai
NEXT_PUBLIC_EDU_DOMAIN=edu-staging.diatonic.ai
NEXT_PUBLIC_FAM_DOMAIN=fam-staging.diatonic.ai
```

### Production Environment
```bash
# .env.production
NEXT_PUBLIC_MAIN_DOMAIN=diatonic.ai
NEXT_PUBLIC_APP_DOMAIN=app.diatonic.ai
NEXT_PUBLIC_EDU_DOMAIN=edu.diatonic.ai
NEXT_PUBLIC_FAM_DOMAIN=fam.diatonic.ai
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Subdomain Not Resolving
**Problem**: Subdomain returns "This site can't be reached"
**Solution**: 
- Check DNS records are properly configured
- Ensure Cloudflare proxy is enabled (orange cloud)
- Wait for DNS propagation (up to 24 hours)

#### 2. Infinite Redirect Loop
**Problem**: Page keeps redirecting between subdomains
**Solution**:
- Check Page Rules for conflicting redirects
- Ensure Worker script doesn't create redirect loops
- Verify subdomain detection logic

#### 3. SSL Certificate Errors
**Problem**: "Your connection is not private" error
**Solution**:
- Set SSL mode to "Full (strict)"
- Enable "Always Use HTTPS"
- Check that origin server supports SSL

#### 4. CORS Issues
**Problem**: API calls fail from subdomains
**Solution**:
```typescript
// Add to your API routes
const allowedOrigins = [
  'https://diatonic.ai',
  'https://app.diatonic.ai',
  'https://edu.diatonic.ai',
  'https://fam.diatonic.ai'
];

const origin = request.headers.get('origin');
if (allowedOrigins.includes(origin)) {
  response.headers.set('Access-Control-Allow-Origin', origin);
}
```

## 📊 Monitoring and Analytics

### Cloudflare Analytics Setup
1. **Traffic Analytics**: Monitor subdomain traffic patterns
2. **Security Events**: Track security threats per subdomain
3. **Performance**: Monitor Core Web Vitals per subdomain

### Custom Analytics Events
```javascript
// Track subdomain usage
gtag('event', 'subdomain_access', {
  subdomain: currentSubdomain,
  user_role: userRole,
  access_granted: canAccess
});
```

## 🔄 Rollback Plan

If issues occur, follow this rollback sequence:

1. **Disable Workers**: Remove worker routes
2. **Revert DNS**: Change CNAME records back to single domain
3. **Remove Page Rules**: Delete subdomain-specific rules
4. **Update Application**: Deploy version without subdomain routing

## 📚 Additional Resources

- [Cloudflare DNS Documentation](https://developers.cloudflare.com/dns/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [SSL/TLS Configuration Guide](https://developers.cloudflare.com/ssl/)
- [Page Rules Documentation](https://developers.cloudflare.com/rules/page-rules/)

---

## ✅ Configuration Checklist

- [ ] DNS records created for all subdomains
- [ ] SSL certificates properly configured
- [ ] Worker script deployed (if using Workers)
- [ ] Page Rules or Transform Rules configured
- [ ] Security headers implemented
- [ ] CORS policies updated
- [ ] Environment variables set
- [ ] Testing completed for all subdomains
- [ ] Monitoring and analytics configured
- [ ] Rollback plan documented

---

*This configuration enables seamless subdomain-based user tier access control while maintaining optimal performance and security.*