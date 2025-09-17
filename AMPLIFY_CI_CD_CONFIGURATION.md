# 🚀 AMPLIFY CI/CD CONFIGURATION FOR DIATONIC-AI-WORKBENCH

## 📋 Complete Configuration Settings

### **App Settings**
```
App name: diatonic-ai-workbench
```

### **Build Settings**

**Auto-detected framework:** React (Vite)

**Frontend build command:**
```bash
npm ci && npm run build && echo "/* /index.html 200" > dist/_redirects
```

**Build output directory:**
```
dist
```

### **Backend Environment**
```
Backend environment: prod
App ID: d3ddhluaptuu35
```

### **Enable Full-Stack Deploys**
```
☑️ Enable full-stack deploys
```
*This allows continuous deployment of both frontend and backend changes on every code commit.*

### **Service Role**
```
Service Role ARN: arn:aws:iam::313476888312:role/diatonic-ai-amplify-service-role
Service Role Name: diatonic-ai-amplify-service-role
```

**Service Role Policies Attached:**
- `AdministratorAccess-Amplify` - Full Amplify service permissions
- `AmplifyBackendDeployFullAccess` - Backend deployment permissions

### **Advanced Settings**

#### **Build Instance Type**
```
Build instance type: Default (recommended)
```
*Uses Amplify's default build container optimized for most applications*

#### **Build Image**
```
Build image: Default Amplify build container
```
*Amplify's managed build environment with Node.js, npm, and build tools*

#### **Environment Variables**

Copy and paste these **EXACT** environment variables into the Amplify Console:

```
NODE_VERSION=18.20.0
NPM_VERSION=10.5.0
_LIVE_UPDATES=[{"pkg":"@aws-amplify/cli","type":"npm","version":"latest"}]
AMPLIFY_DIFF_DEPLOY=false

VITE_AWS_REGION=us-east-2
VITE_AWS_COGNITO_USER_POOL_ID=us-east-2_S9gdn0Gj7
VITE_AWS_COGNITO_USER_POOL_CLIENT_ID=255nrv65p74othncgirpi06e5m
VITE_AWS_COGNITO_IDENTITY_POOL_ID=us-east-2:a2e34991-8c53-4a48-82ad-3e6cac24bf6e

VITE_API_GATEWAY_URL=https://api.diatonic.ai
VITE_API_GATEWAY_STAGE=prod

VITE_S3_BUCKET_NAME=diatonic-ai-prod-assets
VITE_S3_REGION=us-east-2
VITE_CLOUDFRONT_DOMAIN=cdn.diatonic.ai

VITE_DYNAMODB_USER_DATA_TABLE=diatonic-ai-prod-user-data
VITE_DYNAMODB_FILES_TABLE=diatonic-ai-prod-files
VITE_DYNAMODB_SESSIONS_TABLE=diatonic-ai-prod-sessions

VITE_APP_NAME=Diatonic AI
VITE_APP_VERSION=1.0.0
VITE_APP_DOMAIN=app.diatonic.ai
VITE_APP_URL=https://app.diatonic.ai

VITE_ENABLE_FILE_UPLOAD=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_LOGGING=false
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_SUBDOMAIN_ROUTING=false

VITE_ENABLE_CSP=true
VITE_ENABLE_HSTS=true
VITE_ENABLE_SECURE_HEADERS=true

VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key_here
VITE_STRIPE_MODE=live
VITE_TENANT_ID=diatonic

VITE_PRICE_PREMIUM_MONTHLY=price_premium_monthly_id
VITE_PRICE_PREMIUM_ANNUAL=price_premium_annual_id
VITE_PRICE_ENTERPRISE=price_enterprise_id

VITE_BILLING_API_URL=https://api.diatonic.ai/billing
```

#### **Keep Cookies in Cache Key**
```
☐ Not enabled
```

#### **Live Package Updates**
```
Package: Amplify CLI
Version: latest
```

---

## 🛠️ Setup Instructions

### Step 1: Create Amplify App
1. Go to AWS Amplify Console
2. Click "Create new app"
3. Select "Deploy with GitHub"
4. Choose your repository
5. Set app name: `diatonic-ai-workbench`

### Step 2: Configure Build Settings
1. In the build settings section:
   - **Frontend build command:** `npm ci && npm run build && echo "/* /index.html 200" > dist/_redirects`
   - **Build output directory:** `dist`
2. Click "Next"

### Step 3: Add Environment Variables
1. Go to "Advanced settings" 
2. Add each environment variable from the list above
3. **Important:** Copy the variables exactly as shown

### Step 4: Configure Backend Environment  
1. Select backend environment: `prod`
2. Check "Enable full-stack deploys"

### Step 5: Configure Service Role
1. Select "Create a new service role" OR
2. Use existing role: `diatonic-ai-amplify-service-role`
   - ARN: `arn:aws:iam::313476888312:role/diatonic-ai-amplify-service-role`

### Step 6: Review and Deploy
1. Review all settings
2. Click "Save and deploy"
3. Wait for initial deployment to complete

---

## 📝 Post-Deployment Configuration

### Domain Configuration (Optional)
If you want to use a custom domain:
```
Primary domain: app.diatonic.ai
Subdomain: www (optional)
```

### Branch Configuration
```
Main branch: main
Auto-deploy: ✅ Enabled
Pull request previews: ✅ Enabled (recommended)
```

### Monitoring and Notifications
1. Enable build notifications
2. Set up CloudWatch monitoring
3. Configure access logs

---

## 🔧 Troubleshooting

### Build Issues
- **Node/NPM version conflicts:** Environment variables specify exact versions
- **Memory issues:** Default build instance should handle the build
- **Package installation failures:** `npm ci` ensures clean installation

### Environment Variable Issues
- Ensure all `VITE_` prefixed variables are set exactly as shown
- Check that Cognito IDs match the new Diatonic AI pools we created
- Verify AWS region consistency across all variables

### Backend Deployment Issues  
- Service role must have proper permissions (already configured)
- Backend environment must be properly linked
- Check CloudFormation stack status in AWS Console

---

## ✅ Configuration Checklist

- [ ] App name set to `diatonic-ai-workbench`
- [ ] Build command configured correctly
- [ ] Build output directory set to `dist`
- [ ] All environment variables added
- [ ] Backend environment `dev` selected  
- [ ] Full-stack deploys enabled
- [ ] Service role configured
- [ ] Repository connected to GitHub
- [ ] Auto-deploy enabled for main branch
- [ ] Initial deployment successful

---

## 🎯 Expected URLs After Deployment

- **App URL:** `https://main.d3ddhluaptuu35.amplifyapp.com`
- **Branch URL:** `https://dev.d3ddhluaptuu35.amplifyapp.com` (if dev branch exists)
- **Admin Console:** AWS Amplify Console for your app

