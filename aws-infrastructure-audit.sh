#!/usr/bin/env bash
# AWS Infrastructure Audit Script
# Purpose: Comprehensive discovery and inventory of AWS resources
# Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

set -uo pipefail  # Remove -e to continue on errors

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Output directory for reports
AUDIT_DIR="./aws-audit-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$AUDIT_DIR"

echo -e "${BLUE}🔍 Starting AWS Infrastructure Audit...${NC}"
echo -e "${BLUE}📁 Reports will be saved to: $AUDIT_DIR${NC}"

# Function to safely run AWS CLI commands
safe_aws_cmd() {
    local cmd="$1"
    local output_file="$2"
    local service_name="$3"
    
    echo -e "${YELLOW}📊 Auditing $service_name...${NC}"
    
    if eval "$cmd" > "$output_file" 2>/dev/null; then
        local count=$(wc -l < "$output_file")
        echo -e "${GREEN}✅ $service_name: $count items found${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name: Error occurred (possibly no access or no resources)${NC}"
        echo "Error occurred during audit" > "$output_file"
        return 1
    fi
}

# Function to get resource tags as string
get_resource_tags() {
    local arn="$1"
    aws resourcegroupstaggingapi get-resources --resource-arn-list "$arn" --query 'ResourceTagMappingList[0].Tags[*].[Key,Value]' --output text 2>/dev/null | tr '\t' '=' | tr '\n' ';' || echo "no-tags"
}

echo -e "\n${BLUE}🌐 1. CLOUDFRONT DISTRIBUTIONS${NC}"
# CloudFront distributions with detailed info
aws cloudfront list-distributions --query 'DistributionList.Items[*].{Id:Id,DomainName:DomainName,Status:Status,Enabled:Enabled,Origins:Origins[0].DomainName,Comment:Comment}' --output table > "$AUDIT_DIR/cloudfront-distributions.txt" 2>/dev/null || echo "No CloudFront access or no distributions" > "$AUDIT_DIR/cloudfront-distributions.txt"

# Get detailed CloudFront info
if aws cloudfront list-distributions --query 'DistributionList.Items[*].Id' --output text > "$AUDIT_DIR/cloudfront-ids.txt" 2>/dev/null; then
    while read -r distribution_id; do
        if [[ -n "$distribution_id" && "$distribution_id" != "None" ]]; then
            echo -e "${YELLOW}  📋 Getting details for CloudFront distribution: $distribution_id${NC}"
            aws cloudfront get-distribution --id "$distribution_id" --query 'Distribution.{Id:Id,ARN:ARN,Status:Status,DomainName:DomainName,Enabled:DistributionConfig.Enabled,Origins:DistributionConfig.Origins,DefaultCacheBehavior:DistributionConfig.DefaultCacheBehavior.TargetOriginId}' --output json >> "$AUDIT_DIR/cloudfront-detailed.json" 2>/dev/null
        fi
    done < "$AUDIT_DIR/cloudfront-ids.txt"
fi

echo -e "\n${BLUE}🚀 2. AMPLIFY APPLICATIONS${NC}"
safe_aws_cmd "aws amplify list-apps --query 'apps[*].{AppId:appId,Name:name,Platform:platform,Repository:repository,DefaultDomain:defaultDomain,CreateTime:createTime}' --output table" "$AUDIT_DIR/amplify-apps.txt" "Amplify Applications"

# Get Amplify branches for each app
if aws amplify list-apps --query 'apps[*].appId' --output text > "$AUDIT_DIR/amplify-app-ids.txt" 2>/dev/null; then
    # Handle tab-separated app IDs on same line
    while IFS=$'\t' read -ra APP_IDS; do
        for app_id in "${APP_IDS[@]}"; do
            if [[ -n "$app_id" && "$app_id" != "None" && "$app_id" != "" ]]; then
                echo -e "${YELLOW}  📋 Getting branches for Amplify app: $app_id${NC}"
                aws amplify list-branches --app-id "$app_id" --query 'branches[*].{BranchName:branchName,Stage:stage,Framework:framework}' --output json >> "$AUDIT_DIR/amplify-branches.json" 2>/dev/null || echo "Error getting branches for $app_id" >> "$AUDIT_DIR/amplify-branches.json"
            fi
        done
    done < "$AUDIT_DIR/amplify-app-ids.txt"
fi

echo -e "\n${BLUE}🐳 3. ECS RESOURCES${NC}"
safe_aws_cmd "aws ecs list-clusters --query 'clusterArns' --output table" "$AUDIT_DIR/ecs-clusters.txt" "ECS Clusters"
# ECS services need cluster context, get all services across all clusters
echo "" > "$AUDIT_DIR/ecs-services.txt"
if aws ecs list-clusters --query 'clusterArns[*]' --output text > "$AUDIT_DIR/ecs-cluster-arns-temp.txt" 2>/dev/null; then
    while read -r cluster_arn; do
        if [[ -n "$cluster_arn" && "$cluster_arn" != "None" ]]; then
            cluster_name=$(basename "$cluster_arn")
            echo -e "${YELLOW}  📋 Getting services for cluster: $cluster_name${NC}"
            aws ecs list-services --cluster "$cluster_arn" --query 'serviceArns' --output table >> "$AUDIT_DIR/ecs-services.txt" 2>/dev/null || echo "No services in $cluster_name" >> "$AUDIT_DIR/ecs-services.txt"
        fi
    done < "$AUDIT_DIR/ecs-cluster-arns-temp.txt"
    echo -e "${GREEN}✅ ECS Services: Scanned across all clusters${NC}"
else
    echo -e "${RED}❌ ECS Services: No clusters found${NC}"
fi
safe_aws_cmd "aws ecs list-task-definitions --query 'taskDefinitionArns' --output table" "$AUDIT_DIR/ecs-task-definitions.txt" "ECS Task Definitions"

# Get detailed ECS cluster info
if aws ecs list-clusters --query 'clusterArns' --output text > "$AUDIT_DIR/ecs-cluster-arns.txt" 2>/dev/null; then
    while read -r cluster_arn; do
        if [[ -n "$cluster_arn" && "$cluster_arn" != "None" ]]; then
            cluster_name=$(basename "$cluster_arn")
            echo -e "${YELLOW}  📋 Getting details for ECS cluster: $cluster_name${NC}"
            aws ecs describe-clusters --clusters "$cluster_arn" --query 'clusters[0].{ClusterName:clusterName,Status:status,RunningTasksCount:runningTasksCount,ActiveServicesCount:activeServicesCount,RegisteredContainerInstancesCount:registeredContainerInstancesCount}' --output json >> "$AUDIT_DIR/ecs-cluster-details.json" 2>/dev/null
        fi
    done < "$AUDIT_DIR/ecs-cluster-arns.txt"
fi

echo -e "\n${BLUE}📅 4. EVENTBRIDGE RULES${NC}"
safe_aws_cmd "aws events list-rules --query 'Rules[*].{Name:Name,State:State,ScheduleExpression:ScheduleExpression,EventPattern:EventPattern}' --output table" "$AUDIT_DIR/eventbridge-rules.txt" "EventBridge Rules"
safe_aws_cmd "aws events list-event-buses --query 'EventBuses[*].{Name:Name,Arn:Arn}' --output table" "$AUDIT_DIR/eventbridge-buses.txt" "EventBridge Buses"

echo -e "\n${BLUE}🪣 5. S3 BUCKETS${NC}"
safe_aws_cmd "aws s3api list-buckets --query 'Buckets[*].{Name:Name,CreationDate:CreationDate}' --output table" "$AUDIT_DIR/s3-buckets.txt" "S3 Buckets"

# Get S3 bucket details
if aws s3api list-buckets --query 'Buckets[*].Name' --output text > "$AUDIT_DIR/s3-bucket-names.txt" 2>/dev/null; then
    echo "" > "$AUDIT_DIR/s3-bucket-details.json"
    while read -r bucket_name; do
        if [[ -n "$bucket_name" && "$bucket_name" != "None" ]]; then
            echo -e "${YELLOW}  📋 Getting details for S3 bucket: $bucket_name${NC}"
            # Get bucket region
            region=$(aws s3api get-bucket-location --bucket "$bucket_name" --query 'LocationConstraint' --output text 2>/dev/null || echo "us-east-1")
            [[ "$region" == "None" ]] && region="us-east-1"
            
            # Get bucket tags
            tags=$(aws s3api get-bucket-tagging --bucket "$bucket_name" --query 'TagSet[*].[Key,Value]' --output text 2>/dev/null | tr '\t' '=' | tr '\n' ';' || echo "no-tags")
            
            # Get bucket policy
            policy_exists=$(aws s3api get-bucket-policy --bucket "$bucket_name" --query 'Policy' --output text 2>/dev/null && echo "yes" || echo "no")
            
            # Get website configuration
            website_config=$(aws s3api get-bucket-website --bucket "$bucket_name" --query 'IndexDocument.Suffix' --output text 2>/dev/null && echo "yes" || echo "no")
            
            echo "{\"bucket\":\"$bucket_name\",\"region\":\"$region\",\"tags\":\"$tags\",\"policy_exists\":\"$policy_exists\",\"website_config\":\"$website_config\"}" >> "$AUDIT_DIR/s3-bucket-details.json"
        fi
    done < "$AUDIT_DIR/s3-bucket-names.txt"
fi

echo -e "\n${BLUE}🌐 6. VPC AND NETWORKING${NC}"
safe_aws_cmd "aws ec2 describe-vpcs --query 'Vpcs[*].{VpcId:VpcId,CidrBlock:CidrBlock,State:State,IsDefault:IsDefault}' --output table" "$AUDIT_DIR/vpc-list.txt" "VPCs"
safe_aws_cmd "aws ec2 describe-subnets --query 'Subnets[*].{SubnetId:SubnetId,VpcId:VpcId,CidrBlock:CidrBlock,AvailabilityZone:AvailabilityZone}' --output table" "$AUDIT_DIR/subnets.txt" "Subnets"
safe_aws_cmd "aws ec2 describe-security-groups --query 'SecurityGroups[*].{GroupId:GroupId,GroupName:GroupName,VpcId:VpcId,Description:Description}' --output table" "$AUDIT_DIR/security-groups.txt" "Security Groups"
safe_aws_cmd "aws ec2 describe-internet-gateways --query 'InternetGateways[*].{InternetGatewayId:InternetGatewayId,State:State,VpcId:Attachments[0].VpcId}' --output table" "$AUDIT_DIR/internet-gateways.txt" "Internet Gateways"

echo -e "\n${BLUE}💻 7. EC2 INSTANCES${NC}"
safe_aws_cmd "aws ec2 describe-instances --query 'Reservations[*].Instances[*].{InstanceId:InstanceId,InstanceType:InstanceType,State:State.Name,PublicIpAddress:PublicIpAddress,PrivateIpAddress:PrivateIpAddress,LaunchTime:LaunchTime}' --output table" "$AUDIT_DIR/ec2-instances.txt" "EC2 Instances"

echo -e "\n${BLUE}🔑 8. KEY PAIRS${NC}"
safe_aws_cmd "aws ec2 describe-key-pairs --query 'KeyPairs[*].{KeyName:KeyName,KeyFingerprint:KeyFingerprint,CreateTime:CreateTime}' --output table" "$AUDIT_DIR/key-pairs.txt" "EC2 Key Pairs"

echo -e "\n${BLUE}⚖️ 9. LOAD BALANCERS${NC}"
safe_aws_cmd "aws elbv2 describe-load-balancers --query 'LoadBalancers[*].{LoadBalancerArn:LoadBalancerArn,LoadBalancerName:LoadBalancerName,Type:Type,State:State.Code,VpcId:VpcId}' --output table" "$AUDIT_DIR/load-balancers.txt" "Application Load Balancers"
safe_aws_cmd "aws elb describe-load-balancers --query 'LoadBalancerDescriptions[*].{LoadBalancerName:LoadBalancerName,DNSName:DNSName,VPCId:VPCId,CreatedTime:CreatedTime}' --output table" "$AUDIT_DIR/classic-load-balancers.txt" "Classic Load Balancers"

echo -e "\n${BLUE}⚡ 10. LAMBDA FUNCTIONS${NC}"
safe_aws_cmd "aws lambda list-functions --query 'Functions[*].{FunctionName:FunctionName,Runtime:Runtime,LastModified:LastModified,Role:Role}' --output table" "$AUDIT_DIR/lambda-functions.txt" "Lambda Functions"

echo -e "\n${BLUE}🌐 11. API GATEWAY${NC}"
safe_aws_cmd "aws apigateway get-rest-apis --query 'items[*].{id:id,name:name,createdDate:createdDate}' --output table" "$AUDIT_DIR/api-gateway-rest.txt" "API Gateway REST APIs"
safe_aws_cmd "aws apigatewayv2 get-apis --query 'Items[*].{ApiId:ApiId,Name:Name,ProtocolType:ProtocolType,CreatedDate:CreatedDate}' --output table" "$AUDIT_DIR/api-gateway-v2.txt" "API Gateway V2 APIs"

echo -e "\n${BLUE}💾 12. EBS VOLUMES${NC}"
safe_aws_cmd "aws ec2 describe-volumes --query 'Volumes[*].{VolumeId:VolumeId,State:State,Size:Size,VolumeType:VolumeType,CreateTime:CreateTime,Attachments:Attachments[0].InstanceId}' --output table" "$AUDIT_DIR/ebs-volumes.txt" "EBS Volumes"

echo -e "\n${BLUE}🎯 13. ELASTIC IPS${NC}"
safe_aws_cmd "aws ec2 describe-addresses --query 'Addresses[*].{PublicIp:PublicIp,AllocationId:AllocationId,AssociationId:AssociationId,InstanceId:InstanceId}' --output table" "$AUDIT_DIR/elastic-ips.txt" "Elastic IPs"

echo -e "\n${BLUE}🔐 14. IAM ROLES (SUMMARY)${NC}"
safe_aws_cmd "aws iam list-roles --query 'Roles[*].{RoleName:RoleName,CreateDate:CreateDate,AssumeRolePolicyDocument:AssumeRolePolicyDocument}' --output table" "$AUDIT_DIR/iam-roles.txt" "IAM Roles"

echo -e "\n${BLUE}📦 15. ECR REPOSITORIES${NC}"
safe_aws_cmd "aws ecr describe-repositories --query 'repositories[*].{repositoryName:repositoryName,registryId:registryId,repositoryUri:repositoryUri,createdAt:createdAt}' --output table" "$AUDIT_DIR/ecr-repositories.txt" "ECR Repositories"

# Generate summary report
echo -e "\n${GREEN}📋 Generating Summary Report...${NC}"
cat > "$AUDIT_DIR/AUDIT_SUMMARY.md" << EOF
# AWS Infrastructure Audit Summary

**Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**AWS Account**: $(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || echo "Unknown")
**AWS Region**: $(aws configure get region 2>/dev/null || echo $AWS_DEFAULT_REGION || echo "Unknown")

## 🔍 Audit Results

### Core Services
- **CloudFront Distributions**: $(grep -c "Distribution" "$AUDIT_DIR/cloudfront-distributions.txt" 2>/dev/null || echo "0") distributions found
- **Amplify Applications**: $(grep -c "App" "$AUDIT_DIR/amplify-apps.txt" 2>/dev/null || echo "0") applications found
- **S3 Buckets**: $(grep -c "Name" "$AUDIT_DIR/s3-buckets.txt" 2>/dev/null || echo "0") buckets found

### Compute & Container Services  
- **EC2 Instances**: $(grep -c "InstanceId" "$AUDIT_DIR/ec2-instances.txt" 2>/dev/null || echo "0") instances found
- **ECS Clusters**: $(grep -c "arn:aws:ecs" "$AUDIT_DIR/ecs-clusters.txt" 2>/dev/null || echo "0") clusters found
- **ECS Services**: $(grep -c "arn:aws:ecs" "$AUDIT_DIR/ecs-services.txt" 2>/dev/null || echo "0") services found
- **Lambda Functions**: $(grep -c "FunctionName" "$AUDIT_DIR/lambda-functions.txt" 2>/dev/null || echo "0") functions found

### Networking
- **VPCs**: $(grep -c "VpcId" "$AUDIT_DIR/vpc-list.txt" 2>/dev/null || echo "0") VPCs found
- **Load Balancers**: $(grep -c "LoadBalancer" "$AUDIT_DIR/load-balancers.txt" 2>/dev/null || echo "0") ALBs + $(grep -c "LoadBalancer" "$AUDIT_DIR/classic-load-balancers.txt" 2>/dev/null || echo "0") CLBs found
- **Elastic IPs**: $(grep -c "PublicIp" "$AUDIT_DIR/elastic-ips.txt" 2>/dev/null || echo "0") addresses found

### Event & API Services
- **EventBridge Rules**: $(grep -c "Name" "$AUDIT_DIR/eventbridge-rules.txt" 2>/dev/null || echo "0") rules found
- **API Gateway APIs**: $(grep -c "id" "$AUDIT_DIR/api-gateway-rest.txt" 2>/dev/null || echo "0") REST + $(grep -c "ApiId" "$AUDIT_DIR/api-gateway-v2.txt" 2>/dev/null || echo "0") V2 APIs found

### Storage & Security
- **EBS Volumes**: $(grep -c "VolumeId" "$AUDIT_DIR/ebs-volumes.txt" 2>/dev/null || echo "0") volumes found
- **ECR Repositories**: $(grep -c "repositoryName" "$AUDIT_DIR/ecr-repositories.txt" 2>/dev/null || echo "0") repositories found
- **Key Pairs**: $(grep -c "KeyName" "$AUDIT_DIR/key-pairs.txt" 2>/dev/null || echo "0") key pairs found

## 📁 Detailed Reports

All detailed reports are available in this directory:
- \`cloudfront-*.txt\` - CloudFront distribution details
- \`amplify-*.txt\` - Amplify application and branch details  
- \`ecs-*.txt\` - ECS clusters, services, and task definitions
- \`s3-*.txt\` - S3 bucket information
- \`vpc-*.txt\`, \`subnets.txt\`, \`security-groups.txt\` - Network resources
- \`ec2-*.txt\`, \`load-balancers.txt\` - Compute resources
- \`eventbridge-*.txt\` - Event-driven architecture resources
- \`lambda-functions.txt\`, \`api-gateway-*.txt\` - Serverless resources

## 🎯 Next Steps

1. **Review Reports**: Examine each detailed report to understand resource usage
2. **Categorize Resources**: Classify resources as KEEP, REMOVE, or REVIEW
3. **Create Cleanup Plan**: Generate safe deletion scripts with dependency checking
4. **Execute Cleanup**: Run cleanup scripts in dry-run mode first, then execute

## ⚠️ Safety Notes

- Always backup critical data before deletion
- Check resource dependencies before removing anything
- Start with unused/orphaned resources
- Verify Amplify and MinIO S3 resources are preserved
- Test remaining infrastructure after cleanup

EOF

echo -e "\n${GREEN}✅ AWS Infrastructure Audit Complete!${NC}"
echo -e "${GREEN}📁 All reports saved to: $AUDIT_DIR${NC}"
echo -e "${GREEN}📋 Summary available in: $AUDIT_DIR/AUDIT_SUMMARY.md${NC}"
echo ""
echo -e "${YELLOW}🎯 Next Steps:${NC}"
echo -e "${YELLOW}1. Review the audit summary: cat $AUDIT_DIR/AUDIT_SUMMARY.md${NC}"
echo -e "${YELLOW}2. Examine detailed reports in $AUDIT_DIR/${NC}"
echo -e "${YELLOW}3. Run the resource categorization script (to be created next)${NC}"
