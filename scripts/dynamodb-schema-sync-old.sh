#!/usr/bin/env bash
# DynamoDB Schema Synchronization Script with PII Protection
# Manages local and cloud DynamoDB table schemas and data with environment-specific configuration

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Environment-specific configuration (loaded from environment-config.js)
ENVIRONMENT="${NODE_ENV:-development}"
CONFIG_MODULE="$SCRIPT_DIR/environment-config.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print colored output
print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }
print_security() { echo -e "${PURPLE}[SECURITY]${NC} $1"; }
print_success() { echo -e "${CYAN}[SUCCESS]${NC} $1"; }

# Load environment configuration
load_environment_config() {
    if [[ ! -f "$CONFIG_MODULE" ]]; then
        print_error "Environment configuration module not found: $CONFIG_MODULE"
        print_error "Please ensure environment-config.js is available"
        exit 1
    fi
    
    print_step "Loading environment configuration for: $ENVIRONMENT"
    
    local config_file="/tmp/dynamodb-sync-config-$$.json"
    NODE_ENV="$ENVIRONMENT" node "$CONFIG_MODULE" export "$config_file"
    
    # Extract configuration values
    LOCAL_ENDPOINT=$(jq -r '.dynamodb.endpoint // "none"' "$config_file")
    REGION=$(jq -r '.region' "$config_file")
    TABLE_PREFIX=$(jq -r '.tablePrefix' "$config_file")
    CLOUD_TABLE_PREFIX=$(jq -r '.cloudTablePrefix' "$config_file")
    ENABLE_PII_PROTECTION=$(jq -r '.features.enablePiiProtection' "$config_file")
    ENABLE_CLOUD_SYNC=$(jq -r '.features.enableCloudSync' "$config_file")
    REQUIRE_SYNC_APPROVAL=$(jq -r '.features.requireApprovalForSync' "$config_file")
    
    # Load table classifications
    mapfile -t SYNCABLE_TABLES < <(jq -r '.syncableTables[]' "$config_file")
    mapfile -t PII_TABLES < <(jq -r '.piiTables[]' "$config_file")
    
    rm -f "$config_file"
    
    print_status "✅ Configuration loaded successfully"
    print_status "  - Environment: $ENVIRONMENT"
    print_status "  - Local Endpoint: $LOCAL_ENDPOINT"
    print_status "  - Cloud Sync: $ENABLE_CLOUD_SYNC"
    print_status "  - PII Protection: $ENABLE_PII_PROTECTION"
    print_status "  - Syncable Tables: ${#SYNCABLE_TABLES[@]}"
    print_status "  - PII Tables: ${#PII_TABLES[@]}"
}

# Parse command line arguments
VERBOSE=false
FORCE=false
DRY_RUN=false
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            if [[ -z "$COMMAND" ]]; then
                COMMAND="$1"
            fi
            shift
            ;;
    esac
done

# Load configuration after parsing environment
load_environment_config

# Environment validation
validate_environment() {
    case "$ENVIRONMENT" in
        "production")
            print_security "🔒 PRODUCTION ENVIRONMENT DETECTED"
            if [[ "$COMMAND" == "sync-content-from-cloud" || "$COMMAND" == "sync-from-cloud" ]]; then
                print_error "❌ Cloud sync operations are blocked in production"
                print_error "Production should access cloud data directly"
                exit 1
            fi
            if [[ "$COMMAND" == "seed-mock-data" ]]; then
                print_error "❌ Mock data operations are blocked in production"
                print_error "Production uses real data only"
                exit 1
            fi
            ;;
        "development"|"staging")
            print_security "✅ Development/Staging environment - PII protection enabled"
            ;;
        *)
            print_error "Invalid environment: $ENVIRONMENT"
            print_error "Must be one of: development, staging, production"
            exit 1
            ;;
    esac
}

# Check dependencies
check_dependencies() {
    local missing_deps=()
    
    if ! command -v aws &> /dev/null; then
        missing_deps+=("aws-cli")
    fi
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("node.js")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        print_error "Please install missing dependencies and try again"
        exit 1
    fi
    
    # Check AWS CLI configuration
    if ! aws configure list &> /dev/null; then
        print_error "AWS CLI not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_status "✅ Dependencies check passed"
}

# Check if local DynamoDB is running
check_local_dynamodb() {
    if [[ "$LOCAL_ENDPOINT" == "none" ]]; then
        print_error "No local DynamoDB endpoint configured for $ENVIRONMENT"
        return 1
    fi
    
    if ! aws dynamodb list-tables --endpoint-url "$LOCAL_ENDPOINT" --region "$REGION" &>/dev/null; then
        print_error "Cannot connect to local DynamoDB at $LOCAL_ENDPOINT"
        print_error "Please start DynamoDB Local first:"
        print_error "  docker run -d -p 8002:8000 amazon/dynamodb-local"
        exit 1
    fi
    print_status "✅ Local DynamoDB is running"
}

# Function to check Terraform state
check_terraform_state() {
    local terraform_dir="$PROJECT_DIR/infrastructure"
    
    if [[ ! -d "$terraform_dir" ]]; then
        error "Terraform infrastructure directory not found"
        return 1
    fi
    
    cd "$terraform_dir"
    
    if [[ ! -f ".terraform.lock.hcl" ]]; then
        warn "Terraform not initialized. Running terraform init..."
        terraform init
    fi
    
    info "Terraform state ready"
}

# Function to sync schema from cloud to local
sync_schema_cloud_to_local() {
    log "🔄 Syncing schema from AWS to local DynamoDB..."
    
    check_aws_config
    check_local_dynamodb
    
    # Get list of tables from AWS
    local aws_tables
    aws_tables=$(aws dynamodb list-tables --region "$AWS_REGION" --output json | jq -r '.TableNames[]' | grep "ai-nexus-workbench-$ENVIRONMENT" || true)
    
    if [[ -z "$aws_tables" ]]; then
        warn "No tables found in AWS for environment: $ENVIRONMENT"
        return 1
    fi
    
    log "Found AWS tables for $ENVIRONMENT environment:"
    echo "$aws_tables" | sed 's/^/  - /'
    
    # Create local tables based on AWS schema
    echo "$aws_tables" | while IFS= read -r table_name; do
        if [[ -n "$table_name" ]]; then
            sync_table_schema "$table_name"
        fi
    done
    
    log "✅ Schema sync from cloud completed"
}

# Function to sync individual table schema
sync_table_schema() {
    local table_name="$1"
    local local_table_name
    
    # Convert cloud table name to local format
    local_table_name=$(echo "$table_name" | sed "s/ai-nexus-workbench-$ENVIRONMENT-/ai-nexus-workbench-development-/")
    
    info "Syncing table: $table_name -> $local_table_name"
    
    # Get table description from AWS
    local table_description
    table_description=$(aws dynamodb describe-table --table-name "$table_name" --region "$AWS_REGION" --output json)
    
    # Check if local table exists
    if aws dynamodb describe-table --table-name "$local_table_name" --endpoint-url "$LOCAL_ENDPOINT" --region "$AWS_REGION" &> /dev/null; then
        warn "  Local table $local_table_name already exists, skipping"
        return
    fi
    
    # Extract table schema and create local version
    local table_schema
    table_schema=$(echo "$table_description" | jq '{
        TableName: "'$local_table_name'",
        KeySchema: .Table.KeySchema,
        AttributeDefinitions: .Table.AttributeDefinitions,
        GlobalSecondaryIndexes: (if .Table.GlobalSecondaryIndexes then 
            [.Table.GlobalSecondaryIndexes[] | {
                IndexName: .IndexName,
                KeySchema: .KeySchema,
                Projection: .Projection,
                ProvisionedThroughput: {ReadCapacityUnits: 5, WriteCapacityUnits: 5}
            }]
        else empty end),
        LocalSecondaryIndexes: .Table.LocalSecondaryIndexes,
        BillingMode: "PROVISIONED",
        ProvisionedThroughput: {ReadCapacityUnits: 5, WriteCapacityUnits: 5}
    }')
    
    # Create local table
    echo "$table_schema" | aws dynamodb create-table \
        --cli-input-json file:///dev/stdin \
        --endpoint-url "$LOCAL_ENDPOINT" \
        --region "$AWS_REGION" &> /dev/null
    
    log "  ✅ Created local table: $local_table_name"
}

# Function to sync data from cloud to local
sync_data_cloud_to_local() {
    log "📊 Syncing data from AWS to local DynamoDB..."
    
    check_aws_config
    check_local_dynamodb
    
    # List of tables to sync data for
    local content_tables=(
        "content-pages"
        "content-features" 
        "content-testimonials"
        "content-seo"
        "content-feature-details"
    )
    
    for table_base in "${content_tables[@]}"; do
        sync_table_data "ai-nexus-workbench-$ENVIRONMENT-$table_base" "ai-nexus-workbench-development-$table_base"
    done
    
    log "✅ Data sync from cloud completed"
}

# Function to sync individual table data
sync_table_data() {
    local cloud_table="$1"
    local local_table="$2"
    
    info "Syncing data: $cloud_table -> $local_table"
    
    # Check if cloud table exists
    if ! aws dynamodb describe-table --table-name "$cloud_table" --region "$AWS_REGION" &> /dev/null; then
        warn "  Cloud table $cloud_table does not exist, skipping"
        return
    fi
    
    # Check if local table exists
    if ! aws dynamodb describe-table --table-name "$local_table" --endpoint-url "$LOCAL_ENDPOINT" --region "$AWS_REGION" &> /dev/null; then
        warn "  Local table $local_table does not exist, skipping"
        return
    fi
    
    # Export data from cloud table
    local export_file="/tmp/${cloud_table}_export.json"
    aws dynamodb scan --table-name "$cloud_table" --region "$AWS_REGION" --output json > "$export_file"
    
    # Import data to local table
    local item_count
    item_count=$(jq -r '.Items | length' "$export_file")
    
    if [[ "$item_count" -gt 0 ]]; then
        jq -r '.Items[]' "$export_file" | while IFS= read -r item; do
            echo "$item" | aws dynamodb put-item \
                --table-name "$local_table" \
                --item file:///dev/stdin \
                --endpoint-url "$LOCAL_ENDPOINT" \
                --region "$AWS_REGION" &> /dev/null || warn "    Failed to import item"
        done
        
        log "  ✅ Imported $item_count items to $local_table"
    else
        info "  No data to import for $local_table"
    fi
    
    rm -f "$export_file"
}

# Function to deploy schema to cloud
deploy_schema_to_cloud() {
    log "🚀 Deploying schema to AWS using Terraform..."
    
    check_terraform_state
    
    cd "$PROJECT_DIR/infrastructure"
    
    # Plan the deployment
    log "Planning Terraform deployment..."
    terraform plan -var="environment=$ENVIRONMENT" -out=schema-deployment.tfplan
    
    # Ask for confirmation
    echo ""
    read -p "Deploy the above plan to AWS? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Applying Terraform deployment..."
        terraform apply schema-deployment.tfplan
        
        rm -f schema-deployment.tfplan
        log "✅ Schema deployed to AWS"
    else
        log "Deployment cancelled"
        rm -f schema-deployment.tfplan
    fi
}

# Function to validate schema consistency
validate_schema_consistency() {
    log "🔍 Validating schema consistency between local and cloud..."
    
    local validation_report="/tmp/schema_validation_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$validation_report" << EOF
# DynamoDB Schema Validation Report

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Environment:** $ENVIRONMENT
**Local Endpoint:** $LOCAL_ENDPOINT
**AWS Region:** $AWS_REGION

## Table Comparison

EOF
    
    # List local tables
    local local_tables
    local_tables=$(aws dynamodb list-tables --endpoint-url "$LOCAL_ENDPOINT" --region "$AWS_REGION" --output json | jq -r '.TableNames[]' | sort)
    
    # List cloud tables  
    local cloud_tables
    cloud_tables=$(aws dynamodb list-tables --region "$AWS_REGION" --output json | jq -r '.TableNames[]' | grep "ai-nexus-workbench-$ENVIRONMENT" | sort || true)
    
    echo "### Local Tables" >> "$validation_report"
    echo "$local_tables" | sed 's/^/- /' >> "$validation_report"
    
    echo "" >> "$validation_report"
    echo "### Cloud Tables ($ENVIRONMENT)" >> "$validation_report"
    if [[ -n "$cloud_tables" ]]; then
        echo "$cloud_tables" | sed 's/^/- /' >> "$validation_report"
    else
        echo "- No tables found" >> "$validation_report"
    fi
    
    echo "" >> "$validation_report"
    echo "## Validation Status" >> "$validation_report"
    
    if [[ -n "$cloud_tables" ]]; then
        local total_tables
        total_tables=$(echo "$cloud_tables" | wc -l)
        local matching_tables=0
        
        echo "$cloud_tables" | while IFS= read -r cloud_table; do
            local local_equivalent
            local_equivalent=$(echo "$cloud_table" | sed "s/ai-nexus-workbench-$ENVIRONMENT-/ai-nexus-workbench-development-/")
            
            if echo "$local_tables" | grep -q "^$local_equivalent$"; then
                echo "- ✅ $cloud_table -> $local_equivalent (matched)" >> "$validation_report"
                ((matching_tables++))
            else
                echo "- ❌ $cloud_table -> $local_equivalent (missing locally)" >> "$validation_report"
            fi
        done
        
        echo "" >> "$validation_report"
        echo "**Summary:** $matching_tables/$total_tables tables synchronized" >> "$validation_report"
    else
        echo "- ⚠️ No cloud tables found for environment $ENVIRONMENT" >> "$validation_report"
    fi
    
    log "Validation report generated: $validation_report"
    cat "$validation_report"
}

# Function to fix configuration issues
fix_configuration() {
    log "🔧 Fixing configuration issues..."
    
    # Fix DynamoDB config endpoint
    local config_file="$PROJECT_DIR/src/lib/dynamodb-config.ts"
    if [[ -f "$config_file" ]]; then
        if grep -q "localhost:8000" "$config_file"; then
            log "Fixing DynamoDB endpoint from 8000 to 8002..."
            sed -i 's/localhost:8000/localhost:8002/g' "$config_file"
        fi
    fi
    
    # Fix content service endpoint
    local content_service="$PROJECT_DIR/src/lib/content-service.ts"
    if [[ -f "$content_service" ]]; then
        if grep -q "localhost:8000" "$content_service"; then
            log "Fixing content service endpoint from 8000 to 8002..."
            sed -i 's/localhost:8000/localhost:8002/g' "$content_service"
        fi
    fi
    
    # Fix setup scripts endpoint
    local setup_script="$PROJECT_DIR/scripts/setup-dynamodb.js"
    if [[ -f "$setup_script" ]]; then
        if grep -q "localhost:8000" "$setup_script"; then
            log "Fixing setup script endpoint from 8000 to 8002..."
            sed -i 's/localhost:8000/localhost:8002/g' "$setup_script"
        fi
    fi
    
    log "✅ Configuration fixes applied"
}

# Function to show comprehensive status
show_status() {
    log "📊 DynamoDB Integration Status Report"
    echo ""
    
    # Local DynamoDB Status
    if curl -s "$LOCAL_ENDPOINT" > /dev/null 2>&1; then
        log "✅ Local DynamoDB: Running on $LOCAL_ENDPOINT"
        
        # List local tables
        local local_count
        local_count=$(aws dynamodb list-tables --endpoint-url "$LOCAL_ENDPOINT" --region "$AWS_REGION" --output json | jq -r '.TableNames | length' 2>/dev/null || echo "0")
        info "   Local Tables: $local_count"
    else
        error "❌ Local DynamoDB: Not running"
    fi
    
    # Cloud DynamoDB Status
    if command -v aws &> /dev/null && aws configure list &> /dev/null; then
        log "✅ AWS CLI: Configured"
        
        local cloud_count
        cloud_count=$(aws dynamodb list-tables --region "$AWS_REGION" --output json | jq -r '.TableNames | map(select(test("ai-nexus-workbench-'$ENVIRONMENT'"))) | length' 2>/dev/null || echo "0")
        info "   Cloud Tables ($ENVIRONMENT): $cloud_count"
    else
        error "❌ AWS CLI: Not configured"
    fi
    
    # Configuration Status
    local config_issues=0
    
    if grep -q "localhost:8000" "$PROJECT_DIR/src/lib/"*.ts 2>/dev/null; then
        warn "⚠️ Configuration: Port 8000 references found (should be 8002)"
        ((config_issues++))
    fi
    
    if [[ $config_issues -eq 0 ]]; then
        log "✅ Configuration: All endpoints correctly configured"
    fi
    
    echo ""
    info "Available operations:"
    info "  - sync-from-cloud: Pull schema and data from AWS to local"
    info "  - deploy-to-cloud: Deploy local schema to AWS using Terraform"
    info "  - validate: Check schema consistency"
    info "  - fix-config: Fix common configuration issues"
}

# Main script logic
case "${1:-status}" in
    "sync-from-cloud"|"pull")
        fix_configuration
        sync_schema_cloud_to_local
        sync_data_cloud_to_local
        ;;
    "deploy-to-cloud"|"push")
        deploy_schema_to_cloud
        ;;
    "validate"|"check")
        validate_schema_consistency
        ;;
    "fix-config"|"fix")
        fix_configuration
        ;;
    "status"|"info")
        show_status
        ;;
    "help"|"--help"|"-h")
        echo "DynamoDB Schema Sync and Cloud Integration"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  sync-from-cloud, pull    - Pull schema and data from AWS to local"
        echo "  deploy-to-cloud, push    - Deploy schema to AWS using Terraform"
        echo "  validate, check          - Validate schema consistency"
        echo "  fix-config, fix          - Fix common configuration issues"
        echo "  status, info             - Show comprehensive status"
        echo "  help                     - Show this help"
        echo ""
        echo "Environment: $ENVIRONMENT"
        echo "AWS Region: $AWS_REGION"
        echo "Local Endpoint: $LOCAL_ENDPOINT"
        ;;
    *)
        error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
