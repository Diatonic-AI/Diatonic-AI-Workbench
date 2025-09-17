# DNS Configuration Rollback Documentation

**Created:** 2025-09-09T22:19:36Z  
**Purpose:** Capture baseline state before DNS/domain configuration changes  
**Change Window:** Started Phase 0  

## Current Infrastructure State

### AWS Resources
- **Account:** 313476888312 (Root access confirmed)
- **Amplify App ID:** d3ddhluaptuu35 
- **App Name:** diatonic-ai-workbench-staging
- **Region:** us-east-2
- **Default Domain:** d3ddhluaptuu35.amplifyapp.com
- **CloudFront Distribution:** dxz4p4iipx5lm.cloudfront.net

### API Gateway Resources
- **Primary API:** c2n9uk1ovi (aws-devops-dev-api) - Created 2025-09-07
- **Alternative APIs:** 
  - 5kjhx136nd (diatonic-prod-api) - Created 2025-08-25
  - guwdd7u9v9 (aws-devops-dev-main-api) - Created 2025-09-08

### ACM Certificates (Before Changes)
**us-east-1 (CloudFront/Amplify):**
- cb8c2da5-bc07-47d5-87fd-17d9a33df5c2: dev.diatonic.ai (ISSUED)
- dc9c6366-ed4c-47d1-a39f-aaaf721f3f47: diatonic.ai (ISSUED)  
- 108aeeb9-35ed-4407-85ce-36543c6b8e15: diatonic.ai (ISSUED)
- 8084809d-c4a9-469d-9cdf-034aeeb19a55: workbench.diatonic.ai (ISSUED)

**us-east-2 (API Gateway):**
- 5241d9e1-cdee-4674-b625-3701fca53cd7: dev.diatonic.ai (ISSUED)

### DNS State (Before Changes)
**Cloudflare Nameservers:**
- jacob.ns.cloudflare.com
- miki.ns.cloudflare.com

**Current DNS Resolution:**
```bash
dig +short www.diatonic.ai
# Result: dxz4p4iipx5lm.cloudfront.net. (3.167.183.113, 3.167.183.33, 3.167.183.98, 3.167.183.80)

dig +short diatonic.ai  
# Result: No response (apex domain not configured)

dig +short api.diatonic.ai
# Result: No response (API domain not configured)
```

### Amplify Domain Status (Before Changes)
```json
{
  "domainName": "diatonic.ai",
  "enableAutoSubDomain": true,
  "domainStatus": "AVAILABLE", 
  "updateStatus": "UPDATE_COMPLETE",
  "subDomains": [
    {"prefix": "app", "branchName": "main", "verified": false},
    {"prefix": "social", "branchName": "main", "verified": false},
    {"prefix": "www", "branchName": "main", "verified": false},
    {"prefix": "edu", "branchName": "main", "verified": false}
  ]
}
```

## Rollback Instructions

### If DNS Changes Need Reverting:
1. **Access Cloudflare Dashboard** → DNS → Manage DNS
2. **Restore these baseline DNS records:**
   - www.diatonic.ai → CNAME → dxz4p4iipx5lm.cloudfront.net (Proxied: ON)
   - diatonic.ai → No A/CNAME record (no apex domain)
   - api.diatonic.ai → No CNAME record
   - app.diatonic.ai → Points to current target (check Cloudflare)
   - social.diatonic.ai → Points to current target (check Cloudflare)  
   - edu.diatonic.ai → Points to current target (check Cloudflare)

### If Amplify Domain Association Breaks:
1. **Remove Domain Association:**
   ```bash
   aws amplify delete-domain-association --app-id d3ddhluaptuu35 --domain-name diatonic.ai --region us-east-2
   ```

2. **Revert to Default Domain:**
   - Use d3ddhluaptuu35.amplifyapp.com for testing

### If API Gateway Custom Domain Fails:
1. **Remove Custom Domain Mapping:**
   ```bash
   aws apigateway delete-domain-name --domain-name api.diatonic.ai --region us-east-2
   ```

2. **Revert to Stage URL:**
   - Use direct API Gateway URL: https://c2n9uk1ovi.execute-api.us-east-2.amazonaws.com/[stage]

## Emergency Contacts
- **AWS Support:** Available via AWS Console
- **Cloudflare Support:** Available via Cloudflare Dashboard  
- **Change Window:** 60-90 minutes allocated

## Validation Commands (Post-Rollback)
```bash
# DNS Resolution Test
dig +short www.diatonic.ai
curl -I https://d3ddhluaptuu35.amplifyapp.com/

# Amplify Status Check  
aws amplify get-app --app-id d3ddhluaptuu35 --region us-east-2

# API Gateway Direct Test
aws apigateway get-rest-apis --region us-east-2 --query 'items[?id==`c2n9uk1ovi`]'
```

---
**Last Updated:** 2025-09-09T22:19:36Z
**Next Phase:** Baseline audit and evidence capture
