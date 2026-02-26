# AWS IAM Change Plan - Diatonic AI Workbench Backend Access

**Generated:** 2025-09-17T07:38:47Z  
**Account:** 313476888312  
**Region:** us-east-2  
**Scope:** DEV and PROD environments

## 📋 CHANGE SUMMARY

### **Goal**
Create least-privilege IAM users for Amplify backend "pull" operations to enable functioning DEV and PROD backend environments.

### **Approach**
- **Read-only IAM users** with restricted permissions boundaries
- **Secure credential storage** in AWS Secrets Manager + SSM Parameter Store
- **Smart cost center tagging** for expense tracking and compliance
- **GitHub Actions integration** for CI/CD workflows

---

## 🎯 PROPOSED CHANGES (No Deletions)

### **IAM Policies (3 New)**
1. **`DiatonicUserPermissionsBoundary`** - Shared boundary policy
   - Denies writes and restricts to us-east-2 region only
   - Applies to both dev and prod users

2. **`DiatonicAmplifyBackendReadOnly-dev`** - DEV environment policy  
   - Read-only access to Amplify app `d3ddhluaptuu35`, DEV backend environment
   - CloudFormation describe access for stack `amplify-ainexusworkbench-dev-*`

3. **`DiatonicAmplifyBackendReadOnly-prod`** - PROD environment policy
   - Read-only access to Amplify app `d3ddhluaptuu35`, PROD backend environment  
   - CloudFormation describe access for stack `amplify-diatonicaiworkbench-prod-*`

### **IAM Users (2 New)**
1. **`diatonic-workbench-cli-dev`** - Programmatic access only
   - Permissions boundary: `DiatonicUserPermissionsBoundary`
   - Attached policy: `DiatonicAmplifyBackendReadOnly-dev`

2. **`diatonic-workbench-cli-prod`** - Programmatic access only  
   - Permissions boundary: `DiatonicUserPermissionsBoundary`
   - Attached policy: `DiatonicAmplifyBackendReadOnly-prod`

### **Access Keys (2 New)**
- **DEV user:** 1 active access key (stored securely, never logged)
- **PROD user:** 1 active access key (stored securely, never logged)

### **Secrets (4 New)**
- **AWS Secrets Manager:**
  - `diatonic/workbench/dev/ci/aws` - DEV credentials + region
  - `diatonic/workbench/prod/ci/aws` - PROD credentials + region
- **SSM Parameter Store:**
  - `/diatonic/workbench/dev/ci/AWS_ACCESS_KEY_ID`
  - `/diatonic/workbench/dev/ci/AWS_SECRET_ACCESS_KEY`
  - `/diatonic/workbench/prod/ci/AWS_ACCESS_KEY_ID` 
  - `/diatonic/workbench/prod/ci/AWS_SECRET_ACCESS_KEY`

---

## 🏷️ TAGGING STRATEGY

### **Applied Tags (ALL RESOURCES)**

| Tag Key | DEV Value | PROD Value | Shared Value |
|---------|-----------|------------|--------------|
| `Project` | `DiatonicAI` | `DiatonicAI` | `DiatonicAI` |
| `Owner` | `root-313476888312` | `root-313476888312` | `root-313476888312` |
| `Environment` | `dev` | `prod` | `shared` |
| `Service` | `workbench` | `workbench` | `security` |
| `CostCenter` | `DIAAI-PLT-WB-DEV` | `DIAAI-PLT-WB-PRD` | `DIAAI-PLT-IAM-SHR` |

### **Cost Center Definitions**
- **`DIAAI-PLT-WB-DEV`** - Platform Workbench Development environment
- **`DIAAI-PLT-WB-PRD`** - Platform Workbench Production environment  
- **`DIAAI-PLT-IAM-SHR`** - Platform IAM shared resources (policies, boundaries)

---

## 🛡️ SECURITY DESIGN

### **Permissions Boundary Enforcement**
All users restricted to:
- ✅ **Read-only operations** on AWS services
- ✅ **us-east-2 region only** (geo-restricted)
- ❌ **No IAM permissions** (cannot escalate privileges)
- ❌ **No write/delete operations** (cannot break production)

### **Least-Privilege Scope**
- **Amplify:** Read app/branch/backend environment status only
- **CloudFormation:** Describe stacks related to Amplify backend only
- **S3:** Read Amplify deployment artifacts only (prefix-restricted)
- **DynamoDB/Lambda/Cognito:** List/describe metadata only
- **No data plane access** (cannot read actual user data)

### **Credential Security**
- **No console access** (programmatic only)
- **Stored encrypted** in AWS Secrets Manager with KMS
- **Mirrored in SSM** Parameter Store for CI flexibility
- **Never logged** or committed to version control

---

## 📊 ROLLBACK PLAN

### **Non-Destructive Guarantee**
- ✅ **No existing resources modified**
- ✅ **No data deleted or moved** 
- ✅ **No production services affected**
- ✅ **All changes are additive only**

### **Rollback Procedures**
```bash
# Level 1: Detach policies (immediate)
aws iam detach-user-policy --user-name diatonic-workbench-cli-dev --policy-arn <DEV_POLICY_ARN>
aws iam detach-user-policy --user-name diatonic-workbench-cli-prod --policy-arn <PROD_POLICY_ARN>

# Level 2: Remove permissions boundaries
aws iam delete-user-permissions-boundary --user-name diatonic-workbench-cli-dev
aws iam delete-user-permissions-boundary --user-name diatonic-workbench-cli-prod

# Level 3: Deactivate and delete access keys
aws iam update-access-key --user-name diatonic-workbench-cli-dev --access-key-id <KEY_ID> --status Inactive
aws iam delete-access-key --user-name diatonic-workbench-cli-dev --access-key-id <KEY_ID>

# Level 4: Schedule secrets deletion (30-day recovery window)
aws secretsmanager delete-secret --secret-id diatonic/workbench/dev/ci/aws --recovery-window-in-days 30
```

---

## ✅ APPROVAL REQUIRED

**This plan requires explicit approval to proceed with DEV environment first.**

### **Questions for Confirmation:**
1. ✅ Tags and cost centers look appropriate?
2. ✅ Read-only access scope is sufficient for Amplify backend pulls?
3. ✅ GitHub repository for Actions secrets: `diatonic-ai/diatonic-ai-workbench`?
4. ✅ Proceed with DEV first, then PROD after DEV validation?

### **Next Steps After Approval:**
1. **Apply DEV changes** (policies, user, keys, secrets)
2. **Test Amplify pull** with DEV credentials locally  
3. **Update GitHub Actions** with DEV secrets
4. **Validate DEV workflow** works end-to-end
5. **Apply PROD changes** after DEV validation
6. **Update Amplify build** to use backend pull
7. **Verify PROD deployment** succeeds

---

**Ready to proceed with DEV environment creation?** (Y/N)