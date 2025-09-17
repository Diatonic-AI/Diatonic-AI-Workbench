# 🏗️ Infrastructure Integration Plan
## Diatonic AI - Main Infrastructure + Comprehensive Backend

**Status**: Implementation Ready
**Updated**: 2025-01-07 20:31 UTC

---

## 🎯 Current Architecture Analysis

### 1. **Main Core Infrastructure** (`/AWS-DevOps/infrastructure/terraform/core/`)
- ✅ VPC with public/private subnets
- ✅ S3 buckets with proper CORS and lifecycle management
- ✅ API Gateway (`ai_nexus_api`) with basic endpoints (user-data, files, sessions)
- ✅ ECS-based web application hosting
- ✅ CloudWatch logging and monitoring

### 2. **AI Nexus App Infrastructure** (`/apps/diatonic-ai-platform/infrastructure/`)
- ✅ CloudFront distribution (EB3GDEPQ1RC9T) serving dev.diatonic.ai
- ✅ Cognito User Pool with proper auth configuration
- ✅ Lambda functions for basic user management
- ✅ S3 static website hosting integration

### 3. **New Comprehensive Schema** (`/apps/diatonic-ai-platform/infra/`)
- ✅ Complete DynamoDB tables (Projects, Agents, Lab, Education, Community, etc.)
- ✅ Multi-tenant IAM policies with proper isolation
- ❌ **MISSING**: Integration with existing API Gateway
- ❌ **MISSING**: Lambda functions for comprehensive CRUD operations
- ❌ **MISSING**: Terraform variable alignment between directories

---

## 🔧 Integration Strategy

### Phase 1: **Infrastructure Alignment** (PRIORITY 1)

#### 1.1 Create Variables Bridge File
Create `/apps/diatonic-ai-platform/infra/variables.tf` that imports from main infrastructure

#### 1.2 Create Main Integration File  
Create `/apps/diatonic-ai-platform/infra/main.tf` that references core infrastructure outputs

#### 1.3 DynamoDB Integration
- Move comprehensive schema into main core infrastructure OR
- Create data sources in comprehensive schema to reference existing resources

### Phase 2: **API Gateway Extension** (PRIORITY 2)

#### 2.1 Extend Existing API Gateway
- Add new resource endpoints for comprehensive backend (projects, agents, education, etc.)
- Maintain existing endpoints (user-data, files, sessions)

#### 2.2 Lambda Function Architecture
```
/lambda/
├── projects-api/          # Project management CRUD
├── agents-api/            # Agent builder operations
├── education-api/         # Education vertical end-to-end
├── lab-api/              # Lab/experiments management
├── community-api/        # Community platform
├── notifications-api/    # Notification system
└── shared/               # Common utilities, middleware
```

#### 2.3 Integration Points
- Existing Cognito authorizer for all new endpoints
- Shared CloudWatch log groups
- Common CORS configuration
- Environment-specific configuration (dev/staging/prod)

### Phase 3: **S3 Backend Integration** (PRIORITY 3)

#### 3.1 Tenant-Isolated S3 Architecture
```
s3://bucket-name/
├── organizations/
│   └── {org_id}/
│       ├── projects/
│       ├── agents/
│       ├── datasets/
│       └── assets/
└── public/
    ├── templates/
    └── resources/
```

#### 3.2 Presigned URL Strategy
- Lambda functions generate tenant-scoped presigned URLs
- Frontend uploads directly to S3 with proper prefixes
- Backend validates and processes after upload

---

## 📋 Implementation Tasks

### ✅ **COMPLETED**
- [x] Comprehensive DynamoDB schema design
- [x] Multi-tenant IAM policies
- [x] Frontend deployment pipeline (dev environment)
- [x] Basic API Gateway structure
- [x] Cognito integration with proper user groups

### 🚧 **IN PROGRESS**
- [ ] **Integration variables and data sources**
- [ ] **API Gateway resource extensions** 
- [ ] **Education vertical end-to-end implementation**

### 📝 **NEXT ACTIONS** (Priority Order)

#### 1. **Immediate (Today)**
- [ ] Create integration variables bridge
- [ ] Extend API Gateway with comprehensive endpoints
- [ ] Implement Education API Lambda functions (end-to-end vertical)
- [ ] Test Education vertical: frontend → API → DynamoDB → response

#### 2. **Short-term (This Week)**  
- [ ] Implement Projects API (project management CRUD)
- [ ] Implement Agent Builder API (basic agent operations)
- [ ] S3 tenant isolation and presigned URL system
- [ ] Frontend API client integration (React Query)

#### 3. **Medium-term (Next Week)**
- [ ] Complete all remaining verticals (Lab, Community, Notifications)
- [ ] Implement WebSocket for real-time features
- [ ] Production deployment configuration
- [ ] Comprehensive testing and validation

---

## 🏗️ **Recommended Architecture Pattern**

### **Option A: Extended Integration** (RECOMMENDED)
```
Main Core Infrastructure
├── VPC, S3, Base API Gateway (existing)
└── Extended AI Nexus Resources
    ├── Comprehensive DynamoDB Tables
    ├── Extended API Gateway Resources  
    ├── Lambda Functions (all verticals)
    └── IAM Policies (multi-tenant)

AI Nexus App Infrastructure  
├── CloudFront + S3 Website (existing)
├── Cognito Integration (existing)
└── Environment Configuration
```

**Benefits**: 
- Single deployment unit
- Consistent resource naming
- Simplified dependency management
- Easier environment promotion

### **Option B: Separate Backend Module** (Alternative)
Keep comprehensive backend as separate Terraform module that references main infrastructure outputs.

**Benefits**:
- Clear separation of concerns
- Independent deployment cycles
- Easier testing and development

---

## 🚀 **Quick Start: Education Vertical Implementation**

### 1. Variables Integration
```hcl
# /apps/diatonic-ai-platform/infra/variables.tf
variable "project_name" {
  description = "Project name from main infrastructure"
  type        = string
  default     = "aws-devops"
}

variable "environment" {
  description = "Environment from main infrastructure" 
  type        = string
  default     = "dev"
}

# Reference main infrastructure outputs
data "terraform_remote_state" "core" {
  backend = "local"
  config = {
    path = "../../infrastructure/terraform.tfstate"
  }
}
```

### 2. API Gateway Integration
```hcl
# Extend existing API Gateway
data "aws_api_gateway_rest_api" "existing" {
  name = "${var.project_name}-${var.environment}-ai-nexus-api"
}

# Add education endpoints
resource "aws_api_gateway_resource" "education" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  parent_id   = data.aws_api_gateway_rest_api.existing.root_resource_id
  path_part   = "education"
}
```

### 3. Education Lambda Implementation
```javascript
// /lambda/education-api/index.js
exports.handler = async (event) => {
  // Extract tenant from JWT claims
  const organizationId = event.requestContext.authorizer.claims['custom:organization_id'];
  
  // Route to appropriate CRUD operation
  switch (event.httpMethod) {
    case 'GET':
      return await getCourses(organizationId, event.pathParameters);
    case 'POST': 
      return await createCourse(organizationId, JSON.parse(event.body));
    // ... other operations
  }
};
```

---

## 🎯 **Success Criteria**

1. **Education Vertical Working End-to-End**:
   - Frontend can list/create/update courses
   - Multi-tenant data isolation verified
   - Proper error handling and validation

2. **Infrastructure Integration Complete**:
   - Single `terraform apply` deploys all resources
   - No resource naming conflicts
   - Environment variables properly configured

3. **API Consistency**:
   - All endpoints follow same patterns
   - CORS configured properly
   - Authentication working for all routes

---

**Next Step**: Choose integration approach (A or B) and implement Education vertical end-to-end.

Would you like me to proceed with **Option A (Extended Integration)** and start with the Education vertical implementation?
