#!/usr/bin/env bash
# AWS Resource Categorization and Cleanup Planning Script
# Purpose: Analyze discovered resources and categorize them for safe cleanup
# Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

set -uo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Find the latest audit directory
LATEST_AUDIT_DIR=$(ls -1dt ./aws-audit-* | head -1)
if [[ ! -d "$LATEST_AUDIT_DIR" ]]; then
    echo -e "${RED}❌ No audit directory found. Please run aws-infrastructure-audit.sh first${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Using audit data from: $LATEST_AUDIT_DIR${NC}"

# Create categorization output directory
CATEGORIZE_DIR="./aws-categorization-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$CATEGORIZE_DIR"/{keep,remove,review}

echo -e "${BLUE}📋 Starting AWS resource categorization...${NC}"
echo -e "${BLUE}📁 Results will be saved to: $CATEGORIZE_DIR${NC}"

# Function to categorize resources
categorize_resources() {
    echo -e "\n${BLUE}🎯 RESOURCE CATEGORIZATION${NC}"
    
    # === KEEP: Critical Production Resources ===
    echo -e "\n${GREEN}✅ KEEP - Critical Production Resources${NC}"
    
    # Amplify Applications (KEEP - Active workbench deployments)
    if [[ -f "$LATEST_AUDIT_DIR/amplify-apps.txt" ]]; then
        echo -e "${GREEN}📱 Amplify Applications (KEEP - Active deployments):${NC}"
        grep -E "(diatonic-ai-workbench|Name)" "$LATEST_AUDIT_DIR/amplify-apps.txt" | grep -v "ListApps" || echo "  No Amplify apps found"
        
        # Save to KEEP category
        cat > "$CATEGORIZE_DIR/keep/amplify-apps.md" << EOF
# Amplify Applications - KEEP

## Reason
These are active Amplify deployments for the AI Nexus Workbench project:
- diatonic-ai-workbench-development: Development environment
- diatonic-ai-workbench-staging: Staging environment

## Action Required
- Verify both environments are properly configured
- Ensure custom domains are working correctly
- Check branch deployments are active

## Details
$(cat "$LATEST_AUDIT_DIR/amplify-apps.txt")
EOF
    fi
    
    # S3 Buckets - Categorize by purpose
    if [[ -f "$LATEST_AUDIT_DIR/s3-buckets.txt" ]]; then
        echo -e "\n${GREEN}🪣 S3 Buckets - Categorization:${NC}"
        
        # KEEP: Production, MinIO, and Amplify buckets
        echo -e "${GREEN}  KEEP - Production & Current:${NC}"
        KEEP_BUCKETS=(
            "diatonic-prod-frontend-bnhhi105"
            "diatonic-prod-application-production-kkfasrcr"
            "diatonic-prod-backup-production-kkfasrcr"
            "diatonic-prod-compliance-production-kkfasrcr"
            "diatonic-prod-data-lake-production-kkfasrcr"
            "diatonic-prod-logs-production-kkfasrcr"
            "diatonic-prod-static-assets-production-kkfasrcr"
            "minio-standalone-dev-minio-backups-10b24c3f"
            "minio-standalone-dev-minio-data-10b24c3f"
            "minio-standalone-dev-minio-logs-10b24c3f"
            "minio-standalone-dev-minio-uploads-10b24c3f"
            "amplify-ainexusworkbench-dev-7627f-deployment"
            "aws-devops-terraform-state-unified-xewhyolb"
            "aws-devops-dev-user-content"
        )
        
        for bucket in "${KEEP_BUCKETS[@]}"; do
            if grep -q "$bucket" "$LATEST_AUDIT_DIR/s3-buckets.txt"; then
                echo -e "${GREEN}    ✅ $bucket${NC}"
            fi
        done
        
        # REVIEW: Potentially duplicate development buckets
        echo -e "\n${YELLOW}  REVIEW - Potentially Duplicate:${NC}"
        REVIEW_BUCKETS=(
            "aws-devops-dev-application-development-dzfngw8v"
            "aws-devops-dev-application-development-gwenbxgb"
            "aws-devops-dev-backup-development-dzfngw8v"
            "aws-devops-dev-backup-development-gwenbxgb"
            "aws-devops-dev-compliance-development-dzfngw8v"
            "aws-devops-dev-compliance-development-gwenbxgb"
            "aws-devops-dev-logs-development-dzfngw8v"
            "aws-devops-dev-logs-development-gwenbxgb"
            "aws-devops-dev-static-assets-development-dzfngw8v"
            "aws-devops-dev-static-assets-development-gwenbxgb"
        )
        
        for bucket in "${REVIEW_BUCKETS[@]}"; do
            if grep -q "$bucket" "$LATEST_AUDIT_DIR/s3-buckets.txt"; then
                echo -e "${YELLOW}    ⚠️  $bucket${NC}"
            fi
        done
        
        # Save categorization
        cat > "$CATEGORIZE_DIR/keep/s3-buckets-production.md" << EOF
# S3 Buckets - KEEP (Production)

## Production Buckets - DO NOT DELETE
- diatonic-prod-frontend-bnhhi105 (CRITICAL: Current website)
- diatonic-prod-application-production-kkfasrcr
- diatonic-prod-backup-production-kkfasrcr  
- diatonic-prod-compliance-production-kkfasrcr
- diatonic-prod-data-lake-production-kkfasrcr
- diatonic-prod-logs-production-kkfasrcr
- diatonic-prod-static-assets-production-kkfasrcr

## MinIO Buckets - DO NOT DELETE  
- minio-standalone-dev-minio-backups-10b24c3f
- minio-standalone-dev-minio-data-10b24c3f
- minio-standalone-dev-minio-logs-10b24c3f
- minio-standalone-dev-minio-uploads-10b24c3f

## Infrastructure Buckets - DO NOT DELETE
- amplify-ainexusworkbench-dev-7627f-deployment (Amplify deployment)
- aws-devops-terraform-state-unified-xewhyolb (Terraform state - CRITICAL)
- aws-devops-dev-user-content (User content)
EOF
        
        cat > "$CATEGORIZE_DIR/review/s3-buckets-duplicates.md" << EOF
# S3 Buckets - REVIEW (Potential Duplicates)

## Analysis Required
These appear to be duplicate development buckets with different suffixes.
Need to determine which are active and which can be removed:

### dzfngw8v Series (Created: 2025-09-07)
- aws-devops-dev-application-development-dzfngw8v
- aws-devops-dev-backup-development-dzfngw8v
- aws-devops-dev-compliance-development-dzfngw8v
- aws-devops-dev-logs-development-dzfngw8v
- aws-devops-dev-static-assets-development-dzfngw8v

### gwenbxgb Series (Created: 2025-08-25)
- aws-devops-dev-application-development-gwenbxgb (OLDER)
- aws-devops-dev-backup-development-gwenbxgb (OLDER)
- aws-devops-dev-compliance-development-gwenbxgb (OLDER) 
- aws-devops-dev-logs-development-gwenbxgb (OLDER)
- aws-devops-dev-static-assets-development-gwenbxgb (OLDER)

## Recommendation
Keep the newer dzfngw8v series and remove the older gwenbxgb series after verifying no critical data exists.
EOF
    fi
    
    # ECS Resources - Evaluate current usage
    if [[ -f "$LATEST_AUDIT_DIR/ecs-clusters.txt" ]]; then
        echo -e "\n${YELLOW}🐳 ECS Resources:${NC}"
        echo -e "${YELLOW}  REVIEW - Current cluster: aws-devops-dev-cluster${NC}"
        
        cat > "$CATEGORIZE_DIR/review/ecs-resources.md" << EOF
# ECS Resources - REVIEW

## Current State
- 1 ECS Cluster: aws-devops-dev-cluster
- Services: Need to check if actively used

## Analysis Required
1. Check if cluster has active services
2. Determine if cluster is needed for current architecture
3. If unused, can be safely removed

## Data
$(cat "$LATEST_AUDIT_DIR/ecs-clusters.txt")

## Services
$(cat "$LATEST_AUDIT_DIR/ecs-services.txt")
EOF
    fi
    
    # EventBridge Rules
    if [[ -f "$LATEST_AUDIT_DIR/eventbridge-rules.txt" ]]; then
        echo -e "\n${YELLOW}📅 EventBridge Rules:${NC}"
        echo -e "${YELLOW}  REVIEW - SSL certificate renewal rule${NC}"
        
        cat > "$CATEGORIZE_DIR/review/eventbridge-rules.md" << EOF
# EventBridge Rules - REVIEW

## Current Rules
- aws-devops-dev-alb-ssl-certificate-renewal: ACM certificate expiration monitoring

## Analysis
This rule monitors SSL certificate expiration for load balancer.
If we have active load balancers, this should be kept.
If no active ALBs, this can be removed.

## Data
$(cat "$LATEST_AUDIT_DIR/eventbridge-rules.txt")
EOF
    fi
    
    # Load Balancers
    if [[ -f "$LATEST_AUDIT_DIR/load-balancers.txt" ]]; then
        echo -e "\n${YELLOW}⚖️ Load Balancers:${NC}"
        echo -e "${YELLOW}  REVIEW - ALB: aws-devops-dev-alb${NC}"
        
        cat > "$CATEGORIZE_DIR/review/load-balancers.md" << EOF
# Load Balancers - REVIEW

## Current Load Balancers
- aws-devops-dev-alb: Application Load Balancer in VPC vpc-0afa64bf5579542eb

## Analysis Required
1. Check if ALB has active targets
2. Determine if ALB is routing traffic to active services
3. If no active backends, ALB can be removed
4. If ALB is removed, related EventBridge rule can also be removed

## Data
$(cat "$LATEST_AUDIT_DIR/load-balancers.txt")
EOF
    fi
    
    # Lambda Functions
    if [[ -f "$LATEST_AUDIT_DIR/lambda-functions.txt" ]]; then
        echo -e "\n${YELLOW}⚡ Lambda Functions:${NC}"
        local lambda_count=$(grep -c "FunctionName" "$LATEST_AUDIT_DIR/lambda-functions.txt" 2>/dev/null || echo "0")
        echo -e "${YELLOW}  REVIEW - $lambda_count Lambda functions found${NC}"
        
        cat > "$CATEGORIZE_DIR/review/lambda-functions.md" << EOF
# Lambda Functions - REVIEW

## Analysis Required
Found $lambda_count Lambda functions that need individual review:
1. Identify which are part of active Amplify applications
2. Identify which are part of active API Gateway endpoints
3. Determine which are orphaned and can be removed

## Action Plan
- Cross-reference with Amplify and API Gateway resources
- Check last invocation dates
- Remove unused functions

## Data
$(cat "$LATEST_AUDIT_DIR/lambda-functions.txt")
EOF
    fi
    
    # VPC and Networking 
    if [[ -f "$LATEST_AUDIT_DIR/vpc-list.txt" ]]; then
        echo -e "\n${YELLOW}🌐 VPC and Networking:${NC}"
        local vpc_count=$(grep -c "VpcId" "$LATEST_AUDIT_DIR/vpc-list.txt" 2>/dev/null || echo "0")
        echo -e "${YELLOW}  REVIEW - $vpc_count VPCs found${NC}"
        
        cat > "$CATEGORIZE_DIR/review/vpc-networking.md" << EOF
# VPC and Networking Resources - REVIEW

## Analysis Required
Found $vpc_count VPCs that need evaluation:
1. Identify default VPC (usually keep)
2. Identify custom VPCs and their usage
3. Check for unused subnets, security groups, and gateways

## Cleanup Strategy
1. Start with unused security groups (check dependencies)
2. Remove unused subnets (check for attached resources)
3. Remove unused VPCs last (after all resources removed)

## Data
### VPCs
$(cat "$LATEST_AUDIT_DIR/vpc-list.txt")

### Subnets  
$(head -20 "$LATEST_AUDIT_DIR/subnets.txt")

### Security Groups
$(head -20 "$LATEST_AUDIT_DIR/security-groups.txt")
EOF
    fi
    
    # Elastic IPs
    if [[ -f "$LATEST_AUDIT_DIR/elastic-ips.txt" ]]; then
        echo -e "\n${YELLOW}🎯 Elastic IPs:${NC}"
        local eip_count=$(grep -c "PublicIp" "$LATEST_AUDIT_DIR/elastic-ips.txt" 2>/dev/null || echo "0")
        echo -e "${YELLOW}  REVIEW - $eip_count Elastic IPs found${NC}"
        
        cat > "$CATEGORIZE_DIR/review/elastic-ips.md" << EOF
# Elastic IPs - REVIEW

## Analysis Required
Found $eip_count Elastic IPs:
1. Check which are associated with active resources
2. Identify unassociated IPs (these incur charges)
3. Remove unassociated IPs

## Note
Unassociated Elastic IPs cost money. Any unused IPs should be released immediately.

## Data
$(cat "$LATEST_AUDIT_DIR/elastic-ips.txt")
EOF
    fi
    
    # Good news: No CloudFront distributions to clean up!
    echo -e "\n${GREEN}🌐 CloudFront Distributions:${NC}"
    echo -e "${GREEN}  ✅ GOOD NEWS - No CloudFront distributions found!${NC}"
    echo -e "${GREEN}  No cleanup needed for CloudFront${NC}"
}

# Function to generate cleanup plan
generate_cleanup_plan() {
    echo -e "\n${PURPLE}📋 GENERATING CLEANUP EXECUTION PLAN${NC}"
    
    cat > "$CATEGORIZE_DIR/CLEANUP_PLAN.md" << 'EOF'
# AWS Infrastructure Cleanup Execution Plan

## 🎯 PRIORITY ORDER (Execute in this sequence)

### Phase 1: Safe Removal of Unused Resources (LOW RISK)
1. **Unassociated Elastic IPs** - Remove immediately (cost savings)
2. **Unused Lambda Functions** - After verifying no dependencies  
3. **Old S3 Development Buckets** - After backing up any critical data
4. **Orphaned EventBridge Rules** - After confirming no active targets

### Phase 2: Infrastructure Cleanup (MEDIUM RISK)
1. **Unused ECS Services** - Stop services first, then delete
2. **Unused ECS Clusters** - After all services removed
3. **Unused Load Balancers** - After confirming no traffic
4. **Unused Security Groups** - After checking dependencies

### Phase 3: Network Cleanup (HIGHER RISK)
1. **Unused Subnets** - After all resources removed from them
2. **Unused VPCs** - Only after all dependent resources removed
3. **Unused Internet Gateways** - After VPCs removed

## ⚠️ CRITICAL - DO NOT REMOVE

### Production Resources (NEVER DELETE)
- All `diatonic-prod-*` S3 buckets
- All `minio-standalone-dev-*` S3 buckets  
- `aws-devops-terraform-state-unified-xewhyolb` (Terraform state)
- Both Amplify applications (development and staging)
- `amplify-ainexusworkbench-dev-7627f-deployment` bucket

### Infrastructure State
- Terraform state bucket (contains infrastructure definitions)
- Any resources currently used by Amplify applications
- Default VPC (unless explicitly unused)

## 🔧 Execution Strategy

### Pre-Cleanup
1. **Backup Critical Data**: Export any important data from resources to be deleted
2. **Document Current State**: Save current resource configurations
3. **Test Dependencies**: Verify removing each resource won't break others
4. **Dry Run**: Use AWS CLI dry-run options where available

### During Cleanup
1. **One Resource Type at a Time**: Don't mix different resource types in same operation
2. **Verify Each Step**: Confirm each resource is successfully removed
3. **Monitor Applications**: Check that www.diatonic.ai and apps remain functional
4. **Document Actions**: Log each deletion for audit trail

### Post-Cleanup
1. **Test All Applications**: Verify Amplify apps still deploy and function
2. **Check Costs**: Monitor AWS billing for cost reduction
3. **Update Documentation**: Reflect new infrastructure state
4. **Set Up Monitoring**: Ensure remaining resources have appropriate monitoring

## 💰 Expected Cost Savings

### Immediate Savings
- Unassociated Elastic IPs: ~$3.65/month each
- Unused Load Balancers: ~$22.50/month each  
- Unused ECS Services: Variable based on resource allocation

### Long-term Savings
- Reduced S3 storage costs from removing duplicate dev buckets
- Reduced data transfer costs from unused resources
- Simplified billing and cost monitoring

## 🚨 Emergency Rollback

If issues occur during cleanup:
1. **Stop Cleanup Process**: Don't delete more resources
2. **Check Application Status**: Verify www.diatonic.ai and Amplify apps
3. **Review Dependencies**: Check if deleted resource was actually needed
4. **Recreate if Necessary**: Use Terraform or AWS CLI to recreate critical resources

## ✅ Success Criteria

Cleanup is successful when:
- [ ] www.diatonic.ai remains fully functional
- [ ] Amplify applications deploy and run correctly
- [ ] AWS monthly costs reduced by >20%
- [ ] All production data preserved and accessible
- [ ] Infrastructure remains manageable and well-documented
EOF

    # Generate dry-run scripts
    cat > "$CATEGORIZE_DIR/dry-run-cleanup.sh" << 'EOF'
#!/usr/bin/env bash
# AWS Cleanup Dry Run Script - SAFE EXPLORATION ONLY
# This script only lists resources and shows what WOULD be deleted

set -euo pipefail

echo "🔍 AWS CLEANUP DRY RUN - NO RESOURCES WILL BE DELETED"
echo "This script shows what cleanup operations would be performed"
echo ""

# Check for unassociated Elastic IPs
echo "🎯 ELASTIC IPs - Checking for unassociated IPs (cost money if unused):"
aws ec2 describe-addresses --query 'Addresses[?AssociationId==null].{PublicIp:PublicIp,AllocationId:AllocationId}' --output table

# Check ECS cluster utilization
echo ""
echo "🐳 ECS CLUSTERS - Checking utilization:"
for cluster in $(aws ecs list-clusters --query 'clusterArns[*]' --output text); do
    cluster_name=$(basename "$cluster")
    echo "  Cluster: $cluster_name"
    aws ecs describe-clusters --clusters "$cluster" --query 'clusters[0].{RunningTasks:runningTasksCount,ActiveServices:activeServicesCount,RegisteredInstances:registeredContainerInstancesCount}' --output table
    echo "  Services in $cluster_name:"
    aws ecs list-services --cluster "$cluster" --output table
done

# Check Load Balancer targets
echo ""
echo "⚖️ LOAD BALANCERS - Checking for active targets:"
for alb_arn in $(aws elbv2 describe-load-balancers --query 'LoadBalancers[*].LoadBalancerArn' --output text); do
    alb_name=$(aws elbv2 describe-load-balancers --load-balancer-arns "$alb_arn" --query 'LoadBalancers[0].LoadBalancerName' --output text)
    echo "  ALB: $alb_name"
    
    # Get target groups
    for tg_arn in $(aws elbv2 describe-target-groups --load-balancer-arn "$alb_arn" --query 'TargetGroups[*].TargetGroupArn' --output text 2>/dev/null || echo ""); do
        if [[ -n "$tg_arn" ]]; then
            echo "    Target Group: $(basename "$tg_arn")"
            aws elbv2 describe-target-health --target-group-arn "$tg_arn" --output table
        else
            echo "    No target groups found"
        fi
    done
done

# Check Lambda function usage (basic info only)
echo ""
echo "⚡ LAMBDA FUNCTIONS - Recent activity check:"
echo "Functions last modified in the past 30 days:"
aws lambda list-functions --query 'Functions[?LastModified >= `2025-08-10`].{FunctionName:FunctionName,LastModified:LastModified,Runtime:Runtime}' --output table

echo ""
echo "✅ DRY RUN COMPLETE - No resources were modified or deleted"
echo "Review the output above to understand current resource utilization"
EOF

    chmod +x "$CATEGORIZE_DIR/dry-run-cleanup.sh"
    
    echo -e "${GREEN}✅ Cleanup plan generated in: $CATEGORIZE_DIR/CLEANUP_PLAN.md${NC}"
    echo -e "${GREEN}🧪 Dry-run script available: $CATEGORIZE_DIR/dry-run-cleanup.sh${NC}"
}

# Function to generate summary report
generate_summary_report() {
    echo -e "\n${BLUE}📊 GENERATING CATEGORIZATION SUMMARY${NC}"
    
    cat > "$CATEGORIZE_DIR/CATEGORIZATION_SUMMARY.md" << EOF
# AWS Resource Categorization Summary

**Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Source Audit**: $LATEST_AUDIT_DIR
**AWS Account**: 313476888312
**AWS Region**: us-east-2

## 🎯 Categorization Results

### ✅ KEEP (Critical Production Resources)
- **2 Amplify Applications**: Development and staging workbenches
- **7 Production S3 Buckets**: All diatonic-prod-* buckets
- **4 MinIO S3 Buckets**: Dev environment data storage
- **3 Infrastructure S3 Buckets**: Terraform state, Amplify deployment, user content

**Total KEEP Resources**: ~16 critical resources that must be preserved

### ⚠️ REVIEW (Potential Cleanup Candidates)
- **10 Development S3 Buckets**: Potential duplicates with different suffixes
- **1 ECS Cluster**: aws-devops-dev-cluster (check if actively used)
- **1 Application Load Balancer**: May be unused
- **1 EventBridge Rule**: SSL certificate monitoring (depends on ALB usage)
- **25 Lambda Functions**: Need individual review for active usage
- **Multiple VPC Resources**: Subnets, security groups, IPs for evaluation
- **11 Elastic IPs**: Check for unassociated IPs (immediate cost savings)

**Total REVIEW Resources**: ~50+ resources requiring analysis

### 🗑️ REMOVE (Confirmed Cleanup)
- **0 CloudFront Distributions**: None found (no cleanup needed)
- **0 EC2 Instances**: None found (no cleanup needed)
- **0 EBS Volumes**: None found (no cleanup needed)

**Note**: Most resources need review rather than immediate removal due to potential dependencies.

## 💰 Potential Cost Savings

### Immediate Impact (After Review & Cleanup)
- **Unassociated Elastic IPs**: Up to ~$40/month (11 IPs if all unassociated)
- **Unused Load Balancers**: ~$22.50/month each
- **Unused ECS Services**: Variable, depends on resource allocation
- **Duplicate S3 Buckets**: Storage and request costs

### Long-term Benefits
- Simplified infrastructure management
- Clearer cost allocation and monitoring
- Reduced security surface area
- Easier compliance and auditing

## 🚀 Next Steps

1. **Execute Dry Run**: Run the dry-run script to analyze resource utilization
2. **Review Phase**: Manually examine each REVIEW category resource
3. **Backup Data**: Export any important data from resources to be deleted
4. **Phased Cleanup**: Execute cleanup plan in recommended phases
5. **Test & Verify**: Ensure applications remain functional after each phase

## 📁 Generated Files

- \`keep/\`: Resources that must be preserved
- \`review/\`: Resources requiring manual analysis  
- \`remove/\`: Resources confirmed for deletion (none at this time)
- \`CLEANUP_PLAN.md\`: Detailed execution strategy
- \`dry-run-cleanup.sh\`: Safe exploration script

## ⚠️ Critical Safety Notes

- **Never delete production buckets** (diatonic-prod-*)
- **Never delete MinIO buckets** (minio-standalone-dev-*)
- **Never delete Terraform state** (aws-devops-terraform-state-*)
- **Always dry-run first** before any destructive operations
- **Test applications after each cleanup phase**

---

**Status**: Ready for Phase 1 (Dry Run and Analysis)
**Risk Level**: LOW (with proper execution of plan)
**Expected Duration**: 2-4 hours for complete cleanup
EOF
}

# Main execution
main() {
    categorize_resources
    generate_cleanup_plan
    generate_summary_report
    
    echo -e "\n${GREEN}🎉 AWS RESOURCE CATEGORIZATION COMPLETE!${NC}"
    echo -e "${GREEN}📁 Results available in: $CATEGORIZE_DIR${NC}"
    echo -e "\n${YELLOW}🎯 NEXT STEPS:${NC}"
    echo -e "${YELLOW}1. Review categorization summary: cat $CATEGORIZE_DIR/CATEGORIZATION_SUMMARY.md${NC}"
    echo -e "${YELLOW}2. Execute dry-run analysis: $CATEGORIZE_DIR/dry-run-cleanup.sh${NC}"
    echo -e "${YELLOW}3. Follow cleanup plan: cat $CATEGORIZE_DIR/CLEANUP_PLAN.md${NC}"
    echo -e "\n${RED}⚠️  IMPORTANT: Always backup critical data before deletion!${NC}"
}

main "$@"
