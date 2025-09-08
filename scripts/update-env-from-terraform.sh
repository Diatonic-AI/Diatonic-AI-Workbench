#!/bin/bash
# Update Environment Variables from Terraform Outputs
# This script extracts Terraform outputs and updates environment files

set -euo pipefail

# Configuration
TERRAFORM_DIR="../../infrastructure/terraform/core"
ENV_FILE=".env.development"
BACKUP_SUFFIX=".backup.$(date +%Y%m%d-%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to get Terraform output
get_terraform_output() {
    local output_name="$1"
    local value
    
    cd "$TERRAFORM_DIR"
    
    if value=$(terraform output -raw "$output_name" 2>/dev/null); then
        echo "$value"
        return 0
    else
        warning "Could not get Terraform output: $output_name"
        return 1
    fi
}

# Function to update environment variable in file
update_env_var() {
    local env_file="$1"
    local var_name="$2"
    local var_value="$3"
    
    if [[ -z "$var_value" ]]; then
        warning "Skipping empty value for $var_name"
        return
    fi
    
    # Escape special characters in the value
    var_value_escaped=$(printf '%s\n' "$var_value" | sed 's/[[\.*^$()+?{|]/\\&/g')
    
    if grep -q "^$var_name=" "$env_file"; then
        # Update existing variable
        sed -i "s|^$var_name=.*|$var_name=$var_value_escaped|" "$env_file"
        log "Updated $var_name in $env_file"
    else
        # Add new variable
        echo "$var_name=$var_value_escaped" >> "$env_file"
        log "Added $var_name to $env_file"
    fi
}

main() {
    log "Starting environment variable update from Terraform outputs..."
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]]; then
        error "This script must be run from the AI Nexus Workbench root directory"
        exit 1
    fi
    
    # Check if Terraform directory exists
    if [[ ! -d "$TERRAFORM_DIR" ]]; then
        error "Terraform directory not found: $TERRAFORM_DIR"
        exit 1
    fi
    
    # Create scripts directory if it doesn't exist
    mkdir -p scripts
    
    # Backup existing environment file
    if [[ -f "$ENV_FILE" ]]; then
        cp "$ENV_FILE" "${ENV_FILE}${BACKUP_SUFFIX}"
        log "Backed up existing $ENV_FILE to ${ENV_FILE}${BACKUP_SUFFIX}"
    fi
    
    log "Extracting Terraform outputs..."
    
    # Get Terraform outputs
    declare -A terraform_outputs
    terraform_outputs[ai_nexus_cognito_user_pool_id]="VITE_AWS_COGNITO_USER_POOL_ID"
    terraform_outputs[ai_nexus_cognito_user_pool_client_id]="VITE_AWS_COGNITO_USER_POOL_CLIENT_ID"
    terraform_outputs[ai_nexus_cognito_identity_pool_id]="VITE_AWS_COGNITO_IDENTITY_POOL_ID"
    terraform_outputs[ai_nexus_cognito_user_pool_domain]="VITE_AWS_COGNITO_USER_POOL_DOMAIN"
    terraform_outputs[ai_nexus_api_gateway_invoke_url]="VITE_API_GATEWAY_URL"
    terraform_outputs[ai_nexus_s3_bucket_name]="VITE_S3_BUCKET_NAME"
    terraform_outputs[ai_nexus_cloudfront_domain_name]="VITE_CLOUDFRONT_DOMAIN"
    terraform_outputs[ai_nexus_dynamodb_user_data_table_name]="VITE_DYNAMODB_USER_DATA_TABLE"
    terraform_outputs[ai_nexus_dynamodb_files_table_name]="VITE_DYNAMODB_FILES_TABLE"
    terraform_outputs[ai_nexus_dynamodb_sessions_table_name]="VITE_DYNAMODB_SESSIONS_TABLE"
    
    # Process each output
    for tf_output in "${!terraform_outputs[@]}"; do
        env_var="${terraform_outputs[$tf_output]}"
        
        if output_value=$(get_terraform_output "$tf_output"); then
            update_env_var "$ENV_FILE" "$env_var" "$output_value"
        fi
    done
    
    # Add AWS region if not present
    if ! grep -q "^VITE_AWS_REGION=" "$ENV_FILE"; then
        aws_region=$(get_terraform_output "ai_nexus_aws_region" || echo "us-east-2")
        update_env_var "$ENV_FILE" "VITE_AWS_REGION" "$aws_region"
    fi
    
    success "Environment variables updated successfully!"
    
    # Display summary
    log "Updated environment file: $ENV_FILE"
    log "Backup created: ${ENV_FILE}${BACKUP_SUFFIX}"
    
    # Show updated variables
    echo
    log "Updated environment variables:"
    for env_var in "${terraform_outputs[@]}"; do
        if grep -q "^$env_var=" "$ENV_FILE"; then
            value=$(grep "^$env_var=" "$ENV_FILE" | cut -d'=' -f2-)
            if [[ -n "$value" ]]; then
                echo "  ✓ $env_var=$value"
            else
                echo "  ⚠ $env_var=(empty)"
            fi
        fi
    done
}

# Show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Update environment variables from Terraform outputs.

OPTIONS:
    -e, --env-file FILE     Environment file to update (default: .env.development)
    -t, --terraform-dir DIR Terraform directory (default: ../../infrastructure/terraform/core)
    -h, --help             Show this help message

EXAMPLES:
    $0                                      # Update .env.development
    $0 -e .env.production                   # Update production environment
    $0 -t /path/to/terraform -e .env.prod   # Custom terraform dir and env file
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        -t|--terraform-dir)
            TERRAFORM_DIR="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main
