# Diatonic AI - AWS Resource Tagging Strategy

**Generated:** 2025-09-17T07:38:47Z  
**Account:** 313476888312  
**Region:** us-east-2  

## Required Tags (ALL RESOURCES)

All AWS resources MUST include these mandatory tags:

| Tag Key | Example Value | Description |
|---------|---------------|-------------|
| `Project` | `DiatonicAI` | Fixed project identifier |
| `Owner` | `root-313476888312` | AWS account root identifier |
| `Environment` | `dev` \| `prod` \| `shared` | Environment classification |
| `Service` | `workbench` \| `security` \| `networking` | Service category |
| `CostCenter` | `DIAAI-PLT-WB-DEV` | Hierarchical cost center |

## Cost Center Hierarchy

### Format: `DIAAI-<CATEGORY>-<FUNCTION>-<ENV>`

- **DIAAI**: Diatonic AI brand prefix
- **CATEGORY**: Major cost category (PLT=Platform, APP=Application)  
- **FUNCTION**: Specific function (WB=Workbench, IAM=Identity, etc.)
- **ENV**: Environment (DEV, PRD, SHR=Shared)

### Defined Cost Centers

#### Platform (Infrastructure)
- `DIAAI-PLT-WB-DEV` - Workbench Development Environment
- `DIAAI-PLT-WB-PRD` - Workbench Production Environment  
- `DIAAI-PLT-IAM-SHR` - Identity & Access Management (shared)
- `DIAAI-PLT-SEC-SHR` - Security Services (shared)
- `DIAAI-PLT-NET-SHR` - Networking Infrastructure (shared)

#### Application (Services)
- `DIAAI-APP-FE-PRD` - Frontend Services (Amplify, CloudFront)
- `DIAAI-APP-BE-PRD` - Backend Services (API Gateway, Lambda)
- `DIAAI-APP-AI-PRD` - AI/ML Services (Bedrock, SageMaker)

#### Data (Storage & Analytics)
- `DIAAI-DAT-STG-PRD` - Storage Services (S3, DynamoDB)
- `DIAAI-DAT-ETL-PRD` - ETL & Analytics (Glue, EMR)

## Tag Application by Resource Type

### IAM Resources
```bash
--tags Key=Project,Value=DiatonicAI \
       Key=Owner,Value=root-313476888312 \
       Key=Environment,Value=shared \
       Key=Service,Value=security \
       Key=CostCenter,Value=DIAAI-PLT-IAM-SHR
```

### Amplify Applications
```bash
--tags Key=Project,Value=DiatonicAI \
       Key=Owner,Value=root-313476888312 \
       Key=Environment,Value=prod \
       Key=Service,Value=workbench \
       Key=CostCenter,Value=DIAAI-APP-FE-PRD
```

### Secrets Manager
```bash
--tags Key=Project,Value=DiatonicAI \
       Key=Owner,Value=root-313476888312 \
       Key=Environment,Value=dev \
       Key=Service,Value=security \
       Key=CostCenter,Value=DIAAI-PLT-SEC-SHR
```

## Cost Allocation Strategy

### Monthly Cost Reports by:
1. **Environment** (dev vs prod spend)
2. **Service** (workbench vs security vs networking)
3. **CostCenter** (granular service cost tracking)
4. **Owner** (accountability to root account)

### Budget Alerts
- DEV environments: $100/month threshold
- PROD environments: $500/month threshold  
- Shared services: $200/month threshold

### Cost Optimization Targets
- **IAM/Security**: <5% of total AWS spend
- **Frontend (Amplify/CDN)**: 15-25% of total spend
- **Backend (Compute/DB)**: 60-70% of total spend
- **AI/ML Services**: 10-20% of total spend

## Tag Compliance

### Automated Enforcement
- Use AWS Config rules to detect untagged resources
- Lambda function to auto-tag resources with Project=DiatonicAI
- Cost and Usage Reports filtered by required tags

### Manual Verification
```bash
# Find untagged resources
aws resourcegroupstaggingapi get-resources --resource-type-filters="iam" --tag-filters="Key=Project,Values=DiatonicAI"

# Cost report by cost center
aws ce get-cost-and-usage --time-period Start=2025-09-01,End=2025-09-30 --granularity MONTHLY --group-by Type=TAG,Key=CostCenter
```

## Next Steps

1. Apply tags to existing IAM resources
2. Update Amplify app tags via console or CLI
3. Set up Cost and Usage Reports with tag dimensions
4. Create budget alerts for each cost center
5. Implement automated tag compliance monitoring

---
**Effective Date:** 2025-09-17  
**Review Cycle:** Quarterly  
**Contact:** AWS Account Root User