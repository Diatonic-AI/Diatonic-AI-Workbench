#!/bin/bash
# AWS Cost Optimization Script
# Implements immediate cost-saving measures identified in the analysis
# 
# IMPORTANT: Review each section before executing. Some actions are IRREVERSIBLE.
# Run in DRY_RUN mode first: DRY_RUN=true ./aws-cost-optimization-script.sh

set -euo pipefail

# Configuration
DRY_RUN="${DRY_RUN:-true}"  # Set to false to actually execute changes
REGION="${AWS_REGION:-us-east-2}"
DATE=$(date -u +"%Y%m%d-%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date -u +'%Y-%m-%d %H:%M:%S UTC')] $*${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $*${NC}" >&2
}

error() {
    echo -e "${RED}[ERROR] $*${NC}" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS] $*${NC}"
}

# Check AWS CLI access
check_aws_access() {
    log "Checking AWS access..."
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        error "AWS access not configured or insufficient permissions"
        exit 1
    fi
    
    local account_id=$(aws sts get-caller-identity --query 'Account' --output text)
    local region=$(aws configure get region)
    log "Connected to AWS Account: $account_id, Region: $region"
}

# Phase 1: AWS Support Plan Analysis
analyze_support_plan() {
    log "=== PHASE 1: AWS Support Plan Analysis ==="
    
    # Note: Support plan info requires billing permissions
    # This is mainly for manual review
    
    warn "Current support plan appears to be Developer (\$29/month)"
    warn "Consider downgrading to Basic (free) if case-based support not needed"
    warn "Manual action required: Go to AWS Console > Support > Support Plans"
    
    echo "Potential savings: \$29/month"
}

# Phase 2: Elastic IP Address Audit
audit_elastic_ips() {
    log "=== PHASE 2: Elastic IP Address Audit ==="
    
    local eips=$(aws ec2 describe-addresses --query 'Addresses[*].[AllocationId,PublicIp,InstanceId,AssociationId,Domain]' --output table)
    
    log "Current Elastic IP addresses:"
    echo "$eips"
    
    # Find unassociated EIPs
    local unassociated_eips=$(aws ec2 describe-addresses --query 'Addresses[?InstanceId==null && AssociationId==null].[AllocationId,PublicIp]' --output text)
    
    if [[ -n "$unassociated_eips" ]]; then
        warn "Found unassociated EIPs (costing \$3.60/month each):"
        echo "$unassociated_eips"
        
        if [[ "$DRY_RUN" == "false" ]]; then
            warn "Would you like to release unassociated EIPs? (y/N)"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                while read -r alloc_id public_ip; do
                    if [[ -n "$alloc_id" ]]; then
                        log "Releasing EIP: $public_ip ($alloc_id)"
                        aws ec2 release-address --allocation-id "$alloc_id"
                        success "Released EIP: $public_ip"
                    fi
                done <<< "$unassociated_eips"
            fi
        else
            log "DRY_RUN: Would release $(echo "$unassociated_eips" | wc -l) unassociated EIPs"
        fi
    else
        log "No unassociated EIPs found"
    fi
    
    # Count total EIPs for cost calculation
    local total_eips=$(aws ec2 describe-addresses --query 'length(Addresses)' --output text)
    local eip_cost=$((total_eips * 36))
    log "Total EIPs: $total_eips (costing approximately \$$eip_cost/month if all associated)"
}

# Phase 3: NAT Gateway Analysis and Optimization
analyze_nat_gateways() {
    log "=== PHASE 3: NAT Gateway Analysis ==="
    
    local nat_gateways=$(aws ec2 describe-nat-gateways --filter Name=state,Values=available --query 'NatGateways[*].[NatGatewayId,VpcId,SubnetId,CreateTime,State]' --output table)
    
    log "Current NAT Gateways:"
    echo "$nat_gateways"
    
    # Count NAT gateways
    local nat_count=$(aws ec2 describe-nat-gateways --filter Name=state,Values=available --query 'length(NatGateways)' --output text)
    local nat_cost=$((nat_count * 32))
    log "Total NAT Gateways: $nat_count (costing approximately \$$nat_cost/month base cost)"
    
    # Group by VPC
    log "NAT Gateways by VPC:"
    aws ec2 describe-nat-gateways --filter Name=state,Values=available \
        --query 'NatGateways[*].[VpcId,NatGatewayId]' --output text | \
        sort | uniq -c | while read count vpc_id nat_id; do
        log "  VPC $vpc_id: $count NAT Gateway(s)"
    done
    
    # Recommendations
    if [[ $nat_count -gt 3 ]]; then
        warn "RECOMMENDATION: Consider reducing NAT Gateways from $nat_count to 2-3"
        local potential_savings=$(( (nat_count - 3) * 32 ))
        warn "Potential savings: \$$potential_savings/month"
        warn "Focus on removing NAT gateways from dev/staging environments"
    fi
}

# Phase 4: Load Balancer Analysis
analyze_load_balancers() {
    log "=== PHASE 4: Load Balancer Analysis ==="
    
    # Application Load Balancers
    local albs=$(aws elbv2 describe-load-balancers --query 'LoadBalancers[*].[LoadBalancerName,Type,State.Code,CreatedTime,VpcId]' --output table)
    
    if [[ -n "$albs" ]]; then
        log "Current Load Balancers:"
        echo "$albs"
        
        local alb_count=$(aws elbv2 describe-load-balancers --query 'length(LoadBalancers)' --output text)
        local alb_cost=$((alb_count * 16))
        log "Total ALB/NLB count: $alb_count (costing approximately \$$alb_cost/month)"
        
        # Check for idle load balancers (this requires CloudWatch metrics)
        warn "RECOMMENDATION: Review load balancer necessity, especially in dev environments"
        warn "Check CloudWatch metrics for request counts to identify idle LBs"
    fi
    
    # Classic Load Balancers (if any)
    local clbs=$(aws elb describe-load-balancers --query 'LoadBalancerDescriptions[*].[LoadBalancerName,CreatedTime,VPCId]' --output table 2>/dev/null || true)
    
    if [[ -n "$clbs" && "$clbs" != "None" ]]; then
        log "Classic Load Balancers found:"
        echo "$clbs"
        warn "Consider migrating CLBs to ALB/NLB for better cost efficiency"
    fi
}

# Phase 5: VPC Endpoints Recommendations
analyze_vpc_endpoints() {
    log "=== PHASE 5: VPC Endpoints Analysis ==="
    
    # List current VPC endpoints
    local endpoints=$(aws ec2 describe-vpc-endpoints --query 'VpcEndpoints[*].[VpcEndpointId,VpcId,ServiceName,VpcEndpointType]' --output table)
    
    if [[ -n "$endpoints" && "$endpoints" != "None" ]]; then
        log "Current VPC Endpoints:"
        echo "$endpoints"
    else
        log "No VPC endpoints found"
    fi
    
    # List VPCs for endpoint recommendations
    local vpcs=$(aws ec2 describe-vpcs --query 'Vpcs[*].VpcId' --output text)
    
    log "RECOMMENDATIONS: Add Gateway VPC Endpoints to reduce NAT Gateway data processing:"
    for vpc in $vpcs; do
        log "  VPC $vpc:"
        log "    - S3 Gateway Endpoint (free)"
        log "    - DynamoDB Gateway Endpoint (free)"
        
        if [[ "$DRY_RUN" == "false" ]]; then
            warn "Would you like to create S3 and DynamoDB Gateway Endpoints for VPC $vpc? (y/N)"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                create_gateway_endpoints "$vpc"
            fi
        fi
    done
}

create_gateway_endpoints() {
    local vpc_id="$1"
    
    log "Creating Gateway Endpoints for VPC: $vpc_id"
    
    # Get route tables for the VPC
    local route_tables=$(aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$vpc_id" --query 'RouteTables[*].RouteTableId' --output text)
    
    # Create S3 Gateway Endpoint
    log "Creating S3 Gateway Endpoint..."
    local s3_endpoint_id=$(aws ec2 create-vpc-endpoint \
        --vpc-id "$vpc_id" \
        --service-name "com.amazonaws.$REGION.s3" \
        --vpc-endpoint-type Gateway \
        --route-table-ids $route_tables \
        --query 'VpcEndpoint.VpcEndpointId' --output text)
    
    success "Created S3 Gateway Endpoint: $s3_endpoint_id"
    
    # Create DynamoDB Gateway Endpoint
    log "Creating DynamoDB Gateway Endpoint..."
    local dynamodb_endpoint_id=$(aws ec2 create-vpc-endpoint \
        --vpc-id "$vpc_id" \
        --service-name "com.amazonaws.$REGION.dynamodb" \
        --vpc-endpoint-type Gateway \
        --route-table-ids $route_tables \
        --query 'VpcEndpoint.VpcEndpointId' --output text)
    
    success "Created DynamoDB Gateway Endpoint: $dynamodb_endpoint_id"
}

# Phase 6: Cost Monitoring Setup
setup_cost_monitoring() {
    log "=== PHASE 6: Cost Monitoring Setup ==="
    
    local budget_name="AWS-Monthly-Budget-$DATE"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        log "Creating AWS Budget with \$200/month threshold..."
        
        cat > "/tmp/budget-$DATE.json" << EOF
{
    "BudgetName": "$budget_name",
    "BudgetLimit": {
        "Amount": "200",
        "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST",
    "CostFilters": {},
    "TimePeriod": {
        "Start": "$(date -d 'first day of this month' '+%Y-%m-01')",
        "End": "2030-12-31"
    }
}
EOF
        
        # Note: Budget creation requires additional permissions
        warn "Budget creation requires billing permissions. Manual creation recommended."
        log "Budget config saved to: /tmp/budget-$DATE.json"
    else
        log "DRY_RUN: Would create AWS Budget with \$200/month threshold"
    fi
    
    log "RECOMMENDATION: Enable Cost Anomaly Detection in AWS Console"
    log "RECOMMENDATION: Set up CloudWatch billing alarms"
}

# Generate summary report
generate_summary_report() {
    log "=== COST OPTIMIZATION SUMMARY ==="
    
    local total_eips=$(aws ec2 describe-addresses --query 'length(Addresses)' --output text)
    local total_nats=$(aws ec2 describe-nat-gateways --filter Name=state,Values=available --query 'length(NatGateways)' --output text)
    local total_albs=$(aws elbv2 describe-load-balancers --query 'length(LoadBalancers)' --output text)
    
    log "Current Resource Inventory:"
    local eip_summary_cost=$((total_eips * 36))
    local nat_summary_cost=$((total_nats * 32))
    local alb_summary_cost=$((total_albs * 16))
    log "  - Elastic IPs: $total_eips (\$$eip_summary_cost/month potential cost)"
    log "  - NAT Gateways: $total_nats (\$$nat_summary_cost/month base cost)"
    log "  - Load Balancers: $total_albs (\$$alb_summary_cost/month base cost)"
    
    log "Immediate Actions Available:"
    log "  1. Downgrade AWS Support Plan: -\$29/month"
    log "  2. Optimize NAT Gateways: -\$32-65/month"
    log "  3. Release unused EIPs: -\$10-18/month"
    log "  4. Review ALB necessity: -\$8-16/month"
    
    log "Total Potential Monthly Savings: \$79-128 (30-48% reduction)"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        warn "This was a DRY RUN. To execute changes, run:"
        warn "DRY_RUN=false $0"
    fi
}

# Main execution
main() {
    log "AWS Cost Optimization Script - $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        warn "Running in DRY_RUN mode - no changes will be made"
    else
        warn "LIVE MODE - Changes will be made to your AWS account!"
        warn "Press Ctrl+C within 10 seconds to cancel..."
        sleep 10
    fi
    
    check_aws_access
    analyze_support_plan
    audit_elastic_ips
    analyze_nat_gateways
    analyze_load_balancers
    analyze_vpc_endpoints
    setup_cost_monitoring
    generate_summary_report
    
    success "Cost optimization analysis complete!"
}

# Run main function
main "$@"