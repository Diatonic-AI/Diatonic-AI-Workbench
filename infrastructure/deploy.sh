#!/bin/bash
# AI Nexus Workbench - Infrastructure Deployment Script
# Deploys Cognito infrastructure with security hardening for production

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/terraform/cognito"
PROJECT_NAME="ai-nexus-workbench"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_usage() {
    cat << EOF
AI Nexus Workbench Infrastructure Deployment

Usage: $0 [COMMAND] [ENVIRONMENT] [OPTIONS]

COMMANDS:
    plan        Generate and show execution plan
    apply       Apply infrastructure changes
    destroy     Destroy infrastructure (use with caution)
    output      Show infrastructure outputs
    validate    Validate Terraform configuration
    init        Initialize Terraform backend
    upgrade     Upgrade Terraform providers

ENVIRONMENTS:
    dev         Development environment
    staging     Staging environment  
    prod        Production environment

OPTIONS:
    -h, --help      Show this help message
    -y, --yes       Auto-approve apply/destroy operations
    -v, --verbose   Enable verbose output
    --dry-run       Show what would be done without executing

EXAMPLES:
    $0 plan staging          # Plan staging deployment
    $0 apply prod -y         # Apply production changes with auto-approve
    $0 output prod           # Show production outputs
    $0 destroy dev --dry-run # Show what would be destroyed in dev

SECURITY NOTES:
    - Production deployments require MFA and advanced security
    - Always review plans before applying changes
    - SES email address must be verified before deployment
    - Backup existing state before major changes

EOF
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Terraform
    if ! command -v terraform >/dev/null 2>&1; then
        log_error "Terraform is not installed"
        exit 1
    fi
    
    local tf_version=$(terraform version -json | jq -r '.terraform_version')
    log_info "Terraform version: $tf_version"
    
    # Check AWS CLI
    if ! command -v aws >/dev/null 2>&1; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials are not configured"
        exit 1
    fi
    
    local aws_account=$(aws sts get-caller-identity --query Account --output text)
    local aws_region=$(aws configure get region || echo "us-east-1")
    log_info "AWS Account: $aws_account"
    log_info "AWS Region: $aws_region"
    
    # Check jq
    if ! command -v jq >/dev/null 2>&1; then
        log_error "jq is not installed (required for JSON processing)"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

validate_environment() {
    local env="$1"
    
    if [[ ! "$env" =~ ^(dev|staging|prod)$ ]]; then
        log_error "Invalid environment: $env. Must be dev, staging, or prod"
        exit 1
    fi
    
    local tfvars_file="$TERRAFORM_DIR/environments/${env}.tfvars"
    if [[ ! -f "$tfvars_file" ]]; then
        log_error "Environment configuration not found: $tfvars_file"
        exit 1
    fi
    
    log_success "Environment validation passed: $env"
}

init_terraform() {
    local env="$1"
    
    log_info "Initializing Terraform for environment: $env"
    
    cd "$TERRAFORM_DIR"
    
    # Initialize Terraform with backend configuration
    terraform init \
        -backend-config="key=${PROJECT_NAME}/${env}/cognito.tfstate" \
        -reconfigure
    
    log_success "Terraform initialized for $env"
}

validate_terraform() {
    local env="$1"
    
    log_info "Validating Terraform configuration..."
    
    cd "$TERRAFORM_DIR"
    
    # Validate configuration
    terraform validate
    
    # Format check
    if ! terraform fmt -check -recursive; then
        log_warning "Terraform files are not formatted. Run 'terraform fmt -recursive' to fix"
    fi
    
    log_success "Terraform configuration is valid"
}

plan_deployment() {
    local env="$1"
    local verbose="${2:-false}"
    
    log_info "Planning deployment for environment: $env"
    
    cd "$TERRAFORM_DIR"
    
    local plan_args=(
        -var-file="environments/${env}.tfvars"
        -out="${env}.tfplan"
    )
    
    if [[ "$verbose" == "true" ]]; then
        plan_args+=("-detailed-exitcode")
    fi
    
    terraform plan "${plan_args[@]}"
    
    log_success "Deployment plan generated: ${env}.tfplan"
    log_info "Review the plan above before applying changes"
}

apply_deployment() {
    local env="$1" 
    local auto_approve="${2:-false}"
    local dry_run="${3:-false}"
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "DRY RUN: Would apply deployment for environment: $env"
        return 0
    fi
    
    log_info "Applying deployment for environment: $env"
    
    cd "$TERRAFORM_DIR"
    
    # Check if plan file exists
    local plan_file="${env}.tfplan"
    if [[ ! -f "$plan_file" ]]; then
        log_warning "No plan file found. Generating plan first..."
        plan_deployment "$env"
    fi
    
    # Apply configuration
    local apply_args=("$plan_file")
    
    if [[ "$auto_approve" == "false" ]]; then
        log_warning "About to apply changes to $env environment"
        echo -n "Do you want to continue? (yes/no): "
        read -r response
        if [[ "$response" != "yes" ]]; then
            log_info "Deployment cancelled by user"
            exit 0
        fi
    fi
    
    terraform apply "${apply_args[@]}"
    
    # Clean up plan file
    rm -f "$plan_file"
    
    log_success "Deployment completed for environment: $env"
    
    # Show outputs
    show_outputs "$env"
}

destroy_infrastructure() {
    local env="$1"
    local auto_approve="${2:-false}"
    local dry_run="${3:-false}"
    
    if [[ "$env" == "prod" && "$auto_approve" == "true" ]]; then
        log_error "Auto-approve is not allowed for production destruction"
        exit 1
    fi
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "DRY RUN: Would destroy infrastructure for environment: $env"
        cd "$TERRAFORM_DIR"
        terraform plan -destroy -var-file="environments/${env}.tfvars"
        return 0
    fi
    
    log_warning "DESTRUCTIVE OPERATION: About to destroy infrastructure for $env environment"
    
    cd "$TERRAFORM_DIR"
    
    local destroy_args=(
        -var-file="environments/${env}.tfvars"
    )
    
    if [[ "$auto_approve" == "false" ]]; then
        echo -n "Are you absolutely sure you want to destroy $env infrastructure? (type 'yes' to confirm): "
        read -r response
        if [[ "$response" != "yes" ]]; then
            log_info "Destruction cancelled by user"
            exit 0
        fi
    else
        destroy_args+=("-auto-approve")
    fi
    
    terraform destroy "${destroy_args[@]}"
    
    log_success "Infrastructure destroyed for environment: $env"
}

show_outputs() {
    local env="$1"
    
    log_info "Infrastructure outputs for environment: $env"
    
    cd "$TERRAFORM_DIR"
    
    if ! terraform output >/dev/null 2>&1; then
        log_warning "No outputs available. Infrastructure may not be deployed."
        return 1
    fi
    
    echo ""
    echo "=== INFRASTRUCTURE OUTPUTS ==="
    terraform output
    echo ""
    
    # Generate environment file
    generate_env_file "$env"
}

generate_env_file() {
    local env="$1"
    local output_file="$SCRIPT_DIR/../.env.${env}"
    
    log_info "Generating environment file: $output_file"
    
    cd "$TERRAFORM_DIR"
    
    cat > "$output_file" << EOF
# Generated environment file for $env
# $(date -u +"%Y-%m-%d %H:%M:%S UTC")

VITE_AWS_REGION=$(terraform output -raw environment_variables | jq -r '.VITE_AWS_REGION')
VITE_AWS_COGNITO_USER_POOL_ID=$(terraform output -raw environment_variables | jq -r '.VITE_AWS_COGNITO_USER_POOL_ID')
VITE_AWS_COGNITO_USER_POOL_CLIENT_ID=$(terraform output -raw environment_variables | jq -r '.VITE_AWS_COGNITO_USER_POOL_CLIENT_ID')
VITE_AWS_COGNITO_IDENTITY_POOL_ID=$(terraform output -raw environment_variables | jq -r '.VITE_AWS_COGNITO_IDENTITY_POOL_ID')
VITE_AWS_COGNITO_DOMAIN=$(terraform output -raw environment_variables | jq -r '.VITE_AWS_COGNITO_DOMAIN')

# Additional configuration
VITE_APP_NAME="AI Nexus Workbench"
VITE_APP_VERSION="1.0.0"
VITE_ENVIRONMENT="$env"
EOF
    
    log_success "Environment file generated: $output_file"
}

upgrade_providers() {
    log_info "Upgrading Terraform providers..."
    
    cd "$TERRAFORM_DIR"
    
    terraform init -upgrade
    
    log_success "Terraform providers upgraded"
}

# Main script execution
main() {
    local command="${1:-}"
    local environment="${2:-}"
    local auto_approve="false"
    local verbose="false"
    local dry_run="false"
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -y|--yes)
                auto_approve="true"
                shift
                ;;
            -v|--verbose)
                verbose="true"
                shift
                ;;
            --dry-run)
                dry_run="true"
                shift
                ;;
            *)
                if [[ -z "$command" ]]; then
                    command="$1"
                elif [[ -z "$environment" ]]; then
                    environment="$1"
                fi
                shift
                ;;
        esac
    done
    
    # Show header
    echo ""
    log_info "AI Nexus Workbench Infrastructure Deployment"
    log_info "============================================="
    echo ""
    
    # Validate inputs
    if [[ -z "$command" ]]; then
        log_error "No command specified"
        show_usage
        exit 1
    fi
    
    case "$command" in
        init)
            if [[ -z "$environment" ]]; then
                log_error "Environment required for init command"
                exit 1
            fi
            check_prerequisites
            validate_environment "$environment"
            init_terraform "$environment"
            ;;
        validate)
            if [[ -z "$environment" ]]; then
                log_error "Environment required for validate command"
                exit 1
            fi
            check_prerequisites
            validate_environment "$environment"
            validate_terraform "$environment"
            ;;
        plan)
            if [[ -z "$environment" ]]; then
                log_error "Environment required for plan command"
                exit 1
            fi
            check_prerequisites
            validate_environment "$environment"
            init_terraform "$environment"
            validate_terraform "$environment"
            plan_deployment "$environment" "$verbose"
            ;;
        apply)
            if [[ -z "$environment" ]]; then
                log_error "Environment required for apply command"
                exit 1
            fi
            check_prerequisites
            validate_environment "$environment"
            init_terraform "$environment"
            validate_terraform "$environment"
            apply_deployment "$environment" "$auto_approve" "$dry_run"
            ;;
        destroy)
            if [[ -z "$environment" ]]; then
                log_error "Environment required for destroy command"
                exit 1
            fi
            check_prerequisites
            validate_environment "$environment"
            init_terraform "$environment"
            destroy_infrastructure "$environment" "$auto_approve" "$dry_run"
            ;;
        output)
            if [[ -z "$environment" ]]; then
                log_error "Environment required for output command"
                exit 1
            fi
            check_prerequisites
            validate_environment "$environment"
            show_outputs "$environment"
            ;;
        upgrade)
            check_prerequisites
            upgrade_providers
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
    
    echo ""
    log_success "Operation completed successfully"
    echo ""
}

# Execute main function with all arguments
main "$@"
