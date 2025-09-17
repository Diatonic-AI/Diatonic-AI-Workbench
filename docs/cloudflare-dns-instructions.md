# Cloudflare DNS Configuration Instructions

**Domain:** diatonic.ai  
**Cloudflare Dashboard:** https://dash.cloudflare.com/  

## Required DNS Changes

### 1. Fix Apex Domain (diatonic.ai)

**Current Status:** No A/AAAA record exists (causes "dig +short diatonic.ai" to return empty)

**Required Action:** Add CNAME record for apex domain
- **Type:** CNAME
- **Name:** @ (or diatonic.ai)
- **Target:** dxz4p4iipx5lm.cloudfront.net
- **Proxy Status:** ✅ Proxied (Orange cloud)
- **TTL:** Auto

**Alternative (Recommended):** Set up apex redirect to www
1. Create CNAME: @ → dxz4p4iipx5lm.cloudfront.net (Proxied)
2. Add Bulk Redirect: https://diatonic.ai/* → https://www.diatonic.ai/$1 (301 redirect)

### 2. Verify Existing Records Are Correct

**Current Working Records (DO NOT CHANGE):**
- ✅ `www.diatonic.ai` → CNAME → dxz4p4iipx5lm.cloudfront.net (Proxied)
- ✅ `app.diatonic.ai` → CNAME → dxz4p4iipx5lm.cloudfront.net (Proxied) 
- ✅ `social.diatonic.ai` → CNAME → dxz4p4iipx5lm.cloudfront.net (Proxied)
- ✅ `edu.diatonic.ai` → CNAME → dxz4p4iipx5lm.cloudfront.net (Proxied)
- ✅ `_6bed95c6b7b0ef39ef28da5b78620e14.diatonic.ai` → CNAME → _27bf23a2ae9afb2c30e441b33ffd4da3.xlfgrmvvlj.acm-validations.aws (DNS Only)

### 3. API Domain (Phase 4)

**Coming Next:** We'll need to add this record after creating the API Gateway custom domain:
- `api.diatonic.ai` → CNAME → [API Gateway Regional domain] (DNS Only initially, then Proxied)

## Steps to Configure

1. **Login to Cloudflare:** https://dash.cloudflare.com/
2. **Select Zone:** diatonic.ai
3. **Go to:** DNS → Records
4. **Add Record:**
   - Click "Add record"
   - Type: CNAME
   - Name: @
   - Target: dxz4p4iipx5lm.cloudfront.net
   - Proxy: ON (orange cloud)
   - Click "Save"

## Verification Commands (Run After Changes)

```bash
# Test apex domain
dig +short diatonic.ai
# Should return Cloudflare IPs

# Test redirect (if using bulk redirect)
curl -I https://diatonic.ai/
# Should return 301 redirect to https://www.diatonic.ai/

# Test web access
curl -I https://www.diatonic.ai/
# Should return 200 after Amplify domain verification completes
```

## Notes

- The apex domain issue is the main cause of the 404 on www.diatonic.ai
- Once Amplify domain verification completes (status becomes "AVAILABLE"), the website should work
- We'll add the API domain in Phase 4

## Current Amplify Status
- Domain Status: UPDATING
- Update Status: PENDING_DEPLOYMENT
- Expected completion: 5-15 minutes
