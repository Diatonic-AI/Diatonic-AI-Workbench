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
