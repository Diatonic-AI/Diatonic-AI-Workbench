#!/usr/bin/env bash
# AI Nexus Workbench - Integrated Deployment Script
# This script deploys the advanced AI Nexus system integrated with existing AWS DevOps infrastructure

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/home/daclab-ai/dev/AWS-DevOps"
EXISTING_CORE_DIR="$PROJECT_ROOT/infrastructure/terraform/core"
AI_NEXUS_DIR="$PROJECT_ROOT/apps/ai-nexus-workbench/infrastructure"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Help function
show_help() {
    cat << EOF
AI Nexus Workbench - Integrated Deployment Script

This script deploys the advanced AI Nexus Workbench system integrated with 
the existing AWS DevOps infrastructure.

USAGE:
    $0 <command> [environment]

COMMANDS:
    plan        - Show what will be deployed
    deploy      - Deploy the infrastructure
    destroy     - Destroy AI Nexus infrastructure only
    validate    - Validate Terraform configuration
    backup      - Backup existing AI Nexus state
    migrate     - Migrate from legacy AI Nexus to new system
    test        - Run integration tests
    help        - Show this help message

ENVIRONMENTS:
    dev         - Development environment (default)
    staging     - Staging environment
    prod        - Production environment

EXAMPLES:
    $0 plan dev                 # Plan deployment to dev environment
    $0 deploy prod              # Deploy to production
    $0 validate                 # Validate configuration
    $0 migrate dev              # Migrate legacy components in dev

INTEGRATION FEATURES:
    - Uses existing VPC infrastructure
    - Integrates with existing S3 buckets
    - Leverages existing monitoring and logging
    - Replaces legacy AI Nexus components
    - Maintains existing security patterns

EOF
}

# Validate environment
validate_environment() {
    local env="${1:-dev}"
    
    case "$env" in
        dev|staging|prod)
            log "Environment: $env"
            ;;
        *)
            error "Invalid environment: $env. Must be dev, staging, or prod"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [[ ! -f "$SCRIPT_DIR/main.tf" ]]; then
        error "Must run from AI Nexus Workbench infrastructure directory"
        exit 1
    fi
    
    # Check for required tools
    local tools=("terraform" "aws" "jq")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    # Check Terraform version
    local tf_version=$(terraform version -json | jq -r '.terraform_version')
    log "Terraform version: $tf_version"
    
    success "Prerequisites check passed"
}

# Backup existing state
backup_existing_state() {
    local env="${1:-dev}"
    
    log "Creating backup of existing AI Nexus resources..."
    
    local backup_dir="$SCRIPT_DIR/backups/$(date +%Y%m%d_%H%M%S)_${env}"
    mkdir -p "$backup_dir"
    
    # Check if legacy resources exist in core infrastructure
    if [[ -d "$EXISTING_CORE_DIR" ]]; then
        cd "$EXISTING_CORE_DIR"
        
        # List existing AI Nexus resources
        if terraform state list 2>/dev/null | grep -i ai_nexus > "$backup_dir/existing_resources.txt"; then
            warn "Found existing AI Nexus resources in core infrastructure"
            cat "$backup_dir/existing_resources.txt"
            
            # Export current state
            terraform show -json > "$backup_dir/terraform_state.json" 2>/dev/null || true
            
            # Export specific AI Nexus resources
            while read -r resource; do
                terraform state show "$resource" > "$backup_dir/$(echo $resource | tr '/' '_').txt" 2>/dev/null || true
            done < "$backup_dir/existing_resources.txt"
            
            success "Backup created at: $backup_dir"
        else
            log "No existing AI Nexus resources found in core infrastructure"
        fi
    fi
}

# Validate Terraform configuration
validate_terraform() {
    local env="${1:-dev}"
    
    log "Validating Terraform configuration for $env..."
    
    cd "$SCRIPT_DIR"
    
    # Initialize if needed
    if [[ ! -d ".terraform" ]]; then
        log "Initializing Terraform..."
        terraform init
    fi
    
    # Validate syntax
    log "Checking Terraform syntax..."
    if terraform validate; then
        success "Terraform configuration is valid"
    else
        error "Terraform configuration validation failed"
        return 1
    fi
    
    # Format check
    log "Checking Terraform formatting..."
    if terraform fmt -check -recursive; then
        success "Terraform formatting is correct"
    else
        warn "Terraform files need formatting. Run 'terraform fmt -recursive'"
    fi
    
    # Plan validation
    local tfvars_file="terraform.${env}.tfvars"
    if [[ -f "$tfvars_file" ]]; then
        log "Running plan validation with $tfvars_file..."
        if terraform plan -var-file="$tfvars_file" -out="/tmp/tfplan" >/dev/null 2>&1; then
            success "Plan validation successful"
            rm -f "/tmp/tfplan"
        else
            error "Plan validation failed"
            return 1
        fi
    else
        warn "No tfvars file found for environment: $env"
    fi
}

# Plan deployment
plan_deployment() {
    local env="${1:-dev}"
    
    log "Planning AI Nexus Workbench deployment for $env environment..."
    
    cd "$SCRIPT_DIR"
    
    # Initialize if needed
    if [[ ! -d ".terraform" ]]; then
        log "Initializing Terraform..."
        terraform init
    fi
    
    local tfvars_file="terraform.${env}.tfvars"
    if [[ ! -f "$tfvars_file" ]]; then
        error "Environment configuration file not found: $tfvars_file"
        exit 1
    fi
    
    # Run plan
    log "Generating deployment plan..."
    terraform plan \
        -var-file="$tfvars_file" \
        -out="ai-nexus-${env}.tfplan"
    
    success "Plan generated successfully"
    log "Plan saved to: ai-nexus-${env}.tfplan"
    
    # Show resource summary
    log "Resource Summary:"
    terraform show ai-nexus-${env}.tfplan | grep -E "^  # " | sort | uniq -c || true
}

# Deploy infrastructure
deploy_infrastructure() {
    local env="${1:-dev}"
    
    log "Deploying AI Nexus Workbench infrastructure to $env environment..."
    
    cd "$SCRIPT_DIR"
    
    local tfvars_file="terraform.${env}.tfvars"
    local plan_file="ai-nexus-${env}.tfplan"
    
    # Check for plan file
    if [[ ! -f "$plan_file" ]]; then
        warn "No plan file found. Generating plan first..."
        plan_deployment "$env"
    fi
    
    # Confirm deployment
    if [[ "$env" == "prod" ]]; then
        echo
        warn "⚠️  PRODUCTION DEPLOYMENT ⚠️"
        warn "This will deploy to the production environment"
        read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log "Deployment cancelled by user"
            exit 1
        fi
    fi
    
    # Apply the plan
    log "Applying infrastructure changes..."
    if terraform apply "$plan_file"; then
        success "Infrastructure deployment completed successfully!"
        
        # Clean up plan file
        rm -f "$plan_file"
        
        # Show deployment summary
        show_deployment_summary "$env"
        
    else
        error "Infrastructure deployment failed"
        exit 1
    fi
}

# Show deployment summary
show_deployment_summary() {
    local env="${1:-dev}"
    
    log "Deployment Summary for $env environment:"
    echo
    
    # Get outputs
    local outputs=$(terraform output -json 2>/dev/null || echo "{}")
    
    # Show key information
    if command -v jq >/dev/null; then
        echo "🔐 Authentication:"
        echo "   Cognito User Pool ID: $(echo "$outputs" | jq -r '.cognito_user_pool_id.value // "N/A"')"
        echo "   Cognito Domain: $(echo "$outputs" | jq -r '.cognito_user_pool_domain.value // "N/A"')"
        echo
        
        echo "🌐 API Gateway:"
        echo "   API Gateway URL: $(echo "$outputs" | jq -r '.api_endpoints.value.base_url // "N/A"')"
        echo
        
        echo "💾 Storage:"
        echo "   S3 Bucket: $(echo "$outputs" | jq -r '.s3_bucket_info.value.bucket_name // "N/A"')"
        echo
        
        echo "📊 Monitoring:"
        echo "   Log Group: $(echo "$outputs" | jq -r '.monitoring_info.value.cloudwatch_log_group.name // "N/A"')"
        echo
    fi
    
    # Show next steps
    echo "🚀 Next Steps:"
    echo "   1. Update frontend configuration with new Cognito settings"
    echo "   2. Test authentication flows"
    echo "   3. Verify API endpoints"
    echo "   4. Check monitoring dashboards"
    echo "   5. Run integration tests: $0 test $env"
    echo
}

# Run integration tests
run_integration_tests() {
    local env="${1:-dev}"
    
    log "Running integration tests for $env environment..."
    
    cd "$SCRIPT_DIR"
    
    # Get outputs for testing
    local outputs=$(terraform output -json 2>/dev/null || echo "{}")
    
    if command -v jq >/dev/null; then
        local api_url=$(echo "$outputs" | jq -r '.api_endpoints.value.base_url // ""')
        local user_pool_id=$(echo "$outputs" | jq -r '.cognito_user_pool_id.value // ""')
        
        if [[ -n "$api_url" && "$api_url" != "null" ]]; then
            log "Testing API Gateway health check..."
            if curl -s -f "${api_url}/health" >/dev/null 2>&1; then
                success "API Gateway is responding"
            else
                warn "API Gateway health check failed"
            fi
        fi
        
        if [[ -n "$user_pool_id" && "$user_pool_id" != "null" ]]; then
            log "Verifying Cognito User Pool..."
            if aws cognito-idp describe-user-pool --user-pool-id "$user_pool_id" >/dev/null 2>&1; then
                success "Cognito User Pool is accessible"
            else
                warn "Cognito User Pool verification failed"
            fi
        fi
    fi
    
    # Test database connectivity
    log "Testing DynamoDB table access..."
    local tables=$(aws dynamodb list-tables --query "TableNames" --output text 2>/dev/null || echo "")
    if echo "$tables" | grep -q "${env}-ai-nexus"; then
        success "DynamoDB tables are accessible"
    else
        warn "DynamoDB tables not found or not accessible"
    fi
    
    success "Integration tests completed"
}

# Migrate from legacy system
migrate_legacy_system() {
    local env="${1:-dev}"
    
    log "Starting migration from legacy AI Nexus system..."
    warn "This will remove legacy AI Nexus resources from the core infrastructure"
    
    # Backup first
    backup_existing_state "$env"
    
    # List resources to be removed
    log "Resources to be migrated:"
    cd "$EXISTING_CORE_DIR"
    
    local legacy_resources=(
        "aws_cognito_user_pool.ai_nexus_user_pool"
        "aws_cognito_user_pool_client.ai_nexus_client"
        "aws_cognito_identity_pool.ai_nexus_identity_pool"
        "aws_dynamodb_table.ai_nexus_user_data"
        "aws_dynamodb_table.ai_nexus_app_state"
        "aws_dynamodb_table.ai_nexus_sessions"
        "aws_dynamodb_table.ai_nexus_files"
        "aws_lambda_function.ai_nexus_user_data_lambda"
        "aws_lambda_function.ai_nexus_files_lambda"
        "aws_lambda_function.ai_nexus_sessions_lambda"
        "aws_api_gateway_rest_api.ai_nexus_api"
        "aws_s3_bucket.ai_nexus_uploads"
    )
    
    # Check which resources actually exist
    local existing_resources=()
    for resource in "${legacy_resources[@]}"; do
        if terraform state list 2>/dev/null | grep -q "^${resource}$"; then
            existing_resources+=("$resource")
            echo "  - $resource"
        fi
    done
    
    if [[ ${#existing_resources[@]} -eq 0 ]]; then
        log "No legacy AI Nexus resources found to migrate"
        return 0
    fi
    
    read -p "Proceed with removing ${#existing_resources[@]} legacy resources? (type 'yes' to confirm): " confirm
    if [[ "$confirm" != "yes" ]]; then
        log "Migration cancelled by user"
        return 1
    fi
    
    # Remove legacy resources from state
    for resource in "${existing_resources[@]}"; do
        log "Removing $resource from Terraform state..."
        terraform state rm "$resource" || warn "Failed to remove $resource"
    done
    
    success "Legacy resource migration completed"
    log "Deploy the new system with: $0 deploy $env"
}

# Destroy infrastructure
destroy_infrastructure() {
    local env="${1:-dev}"
    
    warn "⚠️  DESTROYING AI NEXUS WORKBENCH INFRASTRUCTURE ⚠️"
    warn "This will remove all AI Nexus Workbench resources for $env environment"
    
    if [[ "$env" == "prod" ]]; then
        warn "⚠️  PRODUCTION DESTRUCTION ⚠️"
        warn "This will DESTROY the production AI Nexus Workbench environment"
        echo
        read -p "Type 'destroy-production' to confirm: " confirm
        if [[ "$confirm" != "destroy-production" ]]; then
            log "Destruction cancelled by user"
            exit 1
        fi
    else
        read -p "Are you sure you want to destroy the $env environment? (type 'yes' to confirm): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log "Destruction cancelled by user"
            exit 1
        fi
    fi
    
    cd "$SCRIPT_DIR"
    
    local tfvars_file="terraform.${env}.tfvars"
    if [[ ! -f "$tfvars_file" ]]; then
        error "Environment configuration file not found: $tfvars_file"
        exit 1
    fi
    
    # Destroy infrastructure
    log "Destroying AI Nexus Workbench infrastructure..."
    if terraform destroy -var-file="$tfvars_file" -auto-approve; then
        success "Infrastructure destroyed successfully"
    else
        error "Infrastructure destruction failed"
        exit 1
    fi
}

# Main function
main() {
    local command="${1:-help}"
    local env="${2:-dev}"
    
    case "$command" in
        plan)
            validate_environment "$env"
            check_prerequisites
            plan_deployment "$env"
            ;;
        deploy)
            validate_environment "$env"
            check_prerequisites
            backup_existing_state "$env"
            deploy_infrastructure "$env"
            ;;
        validate)
            validate_environment "$env"
            check_prerequisites
            validate_terraform "$env"
            ;;
        backup)
            validate_environment "$env"
            check_prerequisites
            backup_existing_state "$env"
            ;;
        migrate)
            validate_environment "$env"
            check_prerequisites
            migrate_legacy_system "$env"
            ;;
        test)
            validate_environment "$env"
            check_prerequisites
            run_integration_tests "$env"
            ;;
        destroy)
            validate_environment "$env"
            check_prerequisites
            destroy_infrastructure "$env"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'error "Script interrupted"; exit 130' INT TERM

# Run main function
main "$@"
