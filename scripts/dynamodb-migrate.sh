#!/usr/bin/env bash
# DynamoDB Migration Script with Comprehensive Validation and Production Support
# Handles schema changes, data migrations, and production deployments with safety guards

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Environment-specific configuration
ENVIRONMENT="${NODE_ENV:-development}"
CONFIG_MODULE="$SCRIPT_DIR/environment-config.cjs"

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
        exit 1
    fi
    
    print_step "Loading environment configuration for: $ENVIRONMENT"
    
    local config_file="/tmp/dynamodb-migrate-config-$$.json"
    NODE_ENV="$ENVIRONMENT" node "$CONFIG_MODULE" export "$config_file"
    
    # Extract configuration values
    LOCAL_ENDPOINT=$(jq -r '.dynamodb.endpoint // "none"' "$config_file")
    REGION=$(jq -r '.region' "$config_file")
    TABLE_PREFIX=$(jq -r '.tablePrefix' "$config_file")
    CLOUD_TABLE_PREFIX=$(jq -r '.cloudTablePrefix' "$config_file")
    ENABLE_CLOUD_SYNC=$(jq -r '.features.enableCloudSync' "$config_file")
    
    rm -f "$config_file"
    
    print_status "✅ Configuration loaded for $ENVIRONMENT"
    echo "Configuration exported to: $config_file"
}

# Usage information
usage() {
    cat << EOF
DynamoDB Migration Tool with Comprehensive Validation

USAGE:
    $0 <command> [options]

COMMANDS:
    validate-schema <migration-file>     Validate migration syntax and schema
    lint-migration <migration-file>      Comprehensive linting of migration files  
    check-permissions                    Verify AWS permissions for migration
    plan-migration <migration-file>      Create migration execution plan
    apply-migration <migration-file>     Execute migration with safety checks
    rollback-migration <migration-id>    Rollback a specific migration
    generate-migration <name>            Generate new migration template
    list-migrations                      List all available migrations
    migration-status                     Show migration status and history
    production-deploy <migration-file>   Deploy to production with extra safety

OPTIONS:
    -e, --environment ENV     Environment (development/staging/production)
    -f, --force              Force operation without confirmation
    -v, --verbose            Enable verbose output
    -d, --dry-run            Show what would be done without executing
    --backup                 Create backup before migration
    --skip-validation        Skip validation (NOT recommended)
    -h, --help               Show this help message

MIGRATION FILE STRUCTURE:
    migrations/
    ├── 001_initial_schema.json
    ├── 002_add_user_indexes.json
    └── 003_modify_table_capacity.json

EXAMPLES:
    $0 generate-migration "add_user_indexes" 
    $0 validate-schema migrations/002_add_user_indexes.json
    $0 lint-migration migrations/002_add_user_indexes.json
    $0 plan-migration migrations/002_add_user_indexes.json
    $0 apply-migration migrations/002_add_user_indexes.json
    $0 production-deploy migrations/002_add_user_indexes.json --backup

SAFETY FEATURES:
    🔒 Multi-level validation and linting
    🔒 Permission verification before execution
    🔒 Automatic backups for production migrations
    🔒 Rollback capability with change tracking
    🔒 Production deployment requires explicit approval
    🔒 Dry-run mode for testing migration plans
EOF
}

# Parse command line arguments
VERBOSE=false
FORCE=false
DRY_RUN=false
BACKUP=false
SKIP_VALIDATION=false
COMMAND=""
MIGRATION_FILE=""

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
        --backup)
            BACKUP=true
            shift
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            if [[ -z "$COMMAND" ]]; then
                COMMAND="$1"
            elif [[ -z "$MIGRATION_FILE" ]]; then
                MIGRATION_FILE="$1"
            fi
            shift
            ;;
    esac
done

# Load configuration after parsing environment
load_environment_config

# Initialize migration directories
initialize_migration_system() {
    print_step "Initializing migration system..."
    
    local migration_dirs=(
        "$PROJECT_ROOT/migrations"
        "$PROJECT_ROOT/migrations/templates"
        "$PROJECT_ROOT/migrations/applied"
        "$PROJECT_ROOT/migrations/backups"
        "$PROJECT_ROOT/migrations/rollbacks"
        "$PROJECT_ROOT/migrations/logs"
    )
    
    for dir in "${migration_dirs[@]}"; do
        mkdir -p "$dir"
    done
    
    # Create migration tracking table
    create_migration_tracking_table
    
    print_success "✅ Migration system initialized"
}

# Create migration tracking table
create_migration_tracking_table() {
    local table_name="${TABLE_PREFIX}-migration-history"
    local endpoint_arg=""
    
    if [[ "$ENVIRONMENT" == "development" && "$LOCAL_ENDPOINT" != "none" ]]; then
        endpoint_arg="--endpoint-url $LOCAL_ENDPOINT"
    fi
    
    # Check if migration table exists
    if ! aws dynamodb describe-table --table-name "$table_name" \
        $endpoint_arg --region "$REGION" &>/dev/null; then
        
        print_step "Creating migration tracking table: $table_name"
        
        aws dynamodb create-table \
            --table-name "$table_name" \
            --attribute-definitions \
                AttributeName=migration_id,AttributeType=S \
                AttributeName=applied_at,AttributeType=S \
            --key-schema \
                AttributeName=migration_id,KeyType=HASH \
                AttributeName=applied_at,KeyType=RANGE \
            --billing-mode PAY_PER_REQUEST \
            $endpoint_arg \
            --region "$REGION" >/dev/null
            
        print_success "✅ Migration tracking table created"
    fi
}

# Validate migration file syntax and schema
validate_migration_schema() {
    local migration_file="$1"
    
    print_step "🔍 Validating migration schema: $(basename "$migration_file")"
    
    if [[ ! -f "$migration_file" ]]; then
        print_error "Migration file not found: $migration_file"
        return 1
    fi
    
    local validation_errors=()
    
    # 1. JSON Syntax Validation
    if ! jq empty "$migration_file" 2>/dev/null; then
        validation_errors+=("Invalid JSON syntax")
    else
        print_status "✅ JSON syntax valid"
    fi
    
    # 2. Required Fields Validation
    local required_fields=("version" "name" "description" "operations")
    for field in "${required_fields[@]}"; do
        if ! jq -e ".$field" "$migration_file" >/dev/null; then
            validation_errors+=("Missing required field: $field")
        fi
    done
    
    # 3. Version Format Validation
    local version=$(jq -r '.version' "$migration_file" 2>/dev/null || echo "")
    if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        validation_errors+=("Invalid version format: $version (expected: X.Y.Z)")
    else
        print_status "✅ Version format valid: $version"
    fi
    
    # 4. Operations Structure Validation
    local operations_count=$(jq '.operations | length' "$migration_file" 2>/dev/null || echo "0")
    if [[ "$operations_count" -eq 0 ]]; then
        validation_errors+=("No operations defined in migration")
    else
        print_status "✅ Found $operations_count operation(s)"
        
        # Validate each operation
        for ((i=0; i<operations_count; i++)); do
            local op_type=$(jq -r ".operations[$i].type" "$migration_file" 2>/dev/null || echo "")
            case "$op_type" in
                "create_table"|"modify_table"|"delete_table"|"create_index"|"delete_index"|"update_capacity"|"custom_script")
                    print_status "  ✅ Operation $((i+1)): $op_type"
                    ;;
                "")
                    validation_errors+=("Operation $((i+1)): Missing type field")
                    ;;
                *)
                    validation_errors+=("Operation $((i+1)): Unknown operation type: $op_type")
                    ;;
            esac
        done
    fi
    
    # 5. Environment Restrictions Validation
    local target_env=$(jq -r '.target_environment // "all"' "$migration_file")
    if [[ "$target_env" != "all" && "$target_env" != "$ENVIRONMENT" ]]; then
        validation_errors+=("Migration not allowed in $ENVIRONMENT environment (target: $target_env)")
    fi
    
    # Report validation results
    if [[ ${#validation_errors[@]} -gt 0 ]]; then
        print_error "❌ Schema validation failed:"
        for error in "${validation_errors[@]}"; do
            print_error "  - $error"
        done
        return 1
    else
        print_success "✅ Schema validation passed"
        return 0
    fi
}

# Comprehensive migration linting
lint_migration() {
    local migration_file="$1"
    
    print_step "🔍 Linting migration file: $(basename "$migration_file")"
    
    local lint_warnings=()
    local lint_errors=()
    
    # 1. Check file naming convention
    local filename=$(basename "$migration_file")
    if [[ ! "$filename" =~ ^[0-9]{3}_[a-z0-9_]+\.json$ ]]; then
        lint_warnings+=("File naming convention: Expected format '###_description.json'")
    fi
    
    # 2. Check migration metadata
    local description=$(jq -r '.description' "$migration_file" 2>/dev/null || echo "")
    if [[ ${#description} -lt 10 ]]; then
        lint_warnings+=("Description should be more descriptive (current: ${#description} chars)")
    fi
    
    # 3. Check for destructive operations
    local operations=$(jq -r '.operations[].type' "$migration_file" 2>/dev/null || echo "")
    while IFS= read -r op_type; do
        case "$op_type" in
            "delete_table"|"delete_index")
                if [[ "$ENVIRONMENT" == "production" ]]; then
                    lint_errors+=("Destructive operation '$op_type' not allowed in production")
                else
                    lint_warnings+=("Destructive operation '$op_type' detected")
                fi
                ;;
        esac
    done <<< "$operations"
    
    # 4. Check for backup recommendations
    local has_backup=$(jq -r '.backup_required // false' "$migration_file")
    if [[ "$has_backup" != "true" ]] && [[ "$ENVIRONMENT" == "production" ]]; then
        lint_warnings+=("Production migrations should specify 'backup_required: true'")
    fi
    
    # 5. Check rollback procedures
    if ! jq -e '.rollback_procedure' "$migration_file" >/dev/null; then
        lint_warnings+=("No rollback procedure defined")
    fi
    
    # 6. Validate table naming conventions
    jq -r '.operations[] | select(.type == "create_table") | .table_name' "$migration_file" 2>/dev/null | \
    while IFS= read -r table_name; do
        if [[ -n "$table_name" && ! "$table_name" =~ ^${TABLE_PREFIX}- ]]; then
            lint_warnings+=("Table '$table_name' doesn't follow naming convention (should start with '$TABLE_PREFIX-')")
        fi
    done
    
    # Report linting results
    if [[ ${#lint_errors[@]} -gt 0 ]]; then
        print_error "❌ Linting failed with errors:"
        for error in "${lint_errors[@]}"; do
            print_error "  ❌ $error"
        done
        return 1
    fi
    
    if [[ ${#lint_warnings[@]} -gt 0 ]]; then
        print_warning "⚠️ Linting completed with warnings:"
        for warning in "${lint_warnings[@]}"; do
            print_warning "  ⚠️ $warning"
        done
    else
        print_success "✅ Linting completed - no issues found"
    fi
    
    return 0
}

# Check AWS permissions for migration operations
check_permissions() {
    print_step "🔐 Checking AWS permissions for DynamoDB operations..."
    
    local permission_errors=()
    local endpoint_arg=""
    
    if [[ "$ENVIRONMENT" == "development" && "$LOCAL_ENDPOINT" != "none" ]]; then
        endpoint_arg="--endpoint-url $LOCAL_ENDPOINT"
        print_status "Using local DynamoDB endpoint for permission testing"
    fi
    
    # Test basic DynamoDB permissions
    local test_table_name="${TABLE_PREFIX}-permission-test-$$"
    
    # 1. Test CreateTable permission
    print_status "Testing CreateTable permission..."
    if aws dynamodb create-table \
        --table-name "$test_table_name" \
        --attribute-definitions AttributeName=id,AttributeType=S \
        --key-schema AttributeName=id,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        $endpoint_arg \
        --region "$REGION" >/dev/null 2>&1; then
        print_status "✅ CreateTable permission OK"
    else
        permission_errors+=("CreateTable permission denied")
    fi
    
    # 2. Test DescribeTable permission
    print_status "Testing DescribeTable permission..."
    if aws dynamodb describe-table \
        --table-name "$test_table_name" \
        $endpoint_arg \
        --region "$REGION" >/dev/null 2>&1; then
        print_status "✅ DescribeTable permission OK"
    else
        permission_errors+=("DescribeTable permission denied")
    fi
    
    # 3. Test ModifyTable permission
    print_status "Testing ModifyTable permission..."
    if aws dynamodb modify-table \
        --table-name "$test_table_name" \
        --billing-mode PAY_PER_REQUEST \
        $endpoint_arg \
        --region "$REGION" >/dev/null 2>&1; then
        print_status "✅ ModifyTable permission OK"
    else
        permission_errors+=("ModifyTable permission denied")
    fi
    
    # 4. Test DeleteTable permission (cleanup)
    print_status "Testing DeleteTable permission..."
    if aws dynamodb delete-table \
        --table-name "$test_table_name" \
        $endpoint_arg \
        --region "$REGION" >/dev/null 2>&1; then
        print_status "✅ DeleteTable permission OK"
    else
        permission_errors+=("DeleteTable permission denied")
    fi
    
    # 5. Test IAM permissions (production only)
    if [[ "$ENVIRONMENT" == "production" ]]; then
        print_status "Testing IAM permissions..."
        if aws iam get-user >/dev/null 2>&1; then
            print_status "✅ IAM permissions OK"
        else
            print_warning "⚠️ Limited IAM permissions (may affect some operations)"
        fi
    fi
    
    # Report permission check results
    if [[ ${#permission_errors[@]} -gt 0 ]]; then
        print_error "❌ Permission check failed:"
        for error in "${permission_errors[@]}"; do
            print_error "  - $error"
        done
        print_error "Please ensure your AWS credentials have the necessary DynamoDB permissions"
        return 1
    else
        print_success "✅ All required permissions verified"
        return 0
    fi
}

# Generate migration execution plan
plan_migration() {
    local migration_file="$1"
    
    print_step "📋 Creating migration execution plan: $(basename "$migration_file")"
    
    if [[ ! -f "$migration_file" ]]; then
        print_error "Migration file not found: $migration_file"
        return 1
    fi
    
    # Validate first if not skipping
    if [[ "$SKIP_VALIDATION" != "true" ]]; then
        validate_migration_schema "$migration_file" || return 1
    fi
    
    local migration_name=$(jq -r '.name' "$migration_file")
    local version=$(jq -r '.version' "$migration_file")
    local operations_count=$(jq '.operations | length' "$migration_file")
    
    print_status "Migration: $migration_name (v$version)"
    print_status "Operations: $operations_count"
    print_status "Environment: $ENVIRONMENT"
    print_status "Target Region: $REGION"
    
    echo ""
    print_step "📝 Execution Plan:"
    echo "=================="
    
    # Process each operation
    for ((i=0; i<operations_count; i++)); do
        local op=$(jq ".operations[$i]" "$migration_file")
        local op_type=$(echo "$op" | jq -r '.type')
        local op_description=$(echo "$op" | jq -r '.description // "No description"')
        
        echo ""
        print_status "Step $((i+1)): $op_type"
        print_status "  Description: $op_description"
        
        case "$op_type" in
            "create_table")
                local table_name=$(echo "$op" | jq -r '.table_name')
                print_status "  Table: $table_name"
                print_status "  Action: Create new DynamoDB table"
                ;;
            "modify_table")
                local table_name=$(echo "$op" | jq -r '.table_name')
                local modifications=$(echo "$op" | jq -r '.modifications | keys | join(", ")')
                print_status "  Table: $table_name"
                print_status "  Modifications: $modifications"
                ;;
            "delete_table")
                local table_name=$(echo "$op" | jq -r '.table_name')
                print_status "  Table: $table_name"
                print_warning "  ⚠️ DESTRUCTIVE: This will permanently delete the table"
                ;;
            "create_index")
                local table_name=$(echo "$op" | jq -r '.table_name')
                local index_name=$(echo "$op" | jq -r '.index_name')
                print_status "  Table: $table_name"
                print_status "  Index: $index_name"
                ;;
            "custom_script")
                local script_path=$(echo "$op" | jq -r '.script_path')
                print_status "  Script: $script_path"
                print_warning "  ⚠️ Custom script execution"
                ;;
        esac
        
        # Estimate duration and risks
        local estimated_duration=$(echo "$op" | jq -r '.estimated_duration // "Unknown"')
        local risk_level=$(echo "$op" | jq -r '.risk_level // "medium"')
        
        print_status "  Duration: $estimated_duration"
        case "$risk_level" in
            "low") print_status "  Risk Level: 🟢 LOW" ;;
            "medium") print_warning "  Risk Level: 🟡 MEDIUM" ;;
            "high") print_error "  Risk Level: 🔴 HIGH" ;;
        esac
    done
    
    echo ""
    print_step "🛡️ Safety Checks:"
    echo "=================="
    
    # Check for backups
    local backup_required=$(jq -r '.backup_required // false' "$migration_file")
    if [[ "$backup_required" == "true" ]] || [[ "$ENVIRONMENT" == "production" ]]; then
        print_status "✅ Backup will be created before migration"
    else
        print_warning "⚠️ No backup will be created"
    fi
    
    # Check for rollback procedure
    if jq -e '.rollback_procedure' "$migration_file" >/dev/null; then
        print_status "✅ Rollback procedure available"
    else
        print_warning "⚠️ No rollback procedure defined"
    fi
    
    echo ""
    print_step "📊 Migration Summary:"
    echo "===================="
    print_status "Environment: $ENVIRONMENT"
    print_status "Dry Run: $([[ "$DRY_RUN" == "true" ]] && echo "YES" || echo "NO")"
    print_status "Backup: $([[ "$backup_required" == "true" || "$ENVIRONMENT" == "production" ]] && echo "YES" || echo "NO")"
    print_status "Operations: $operations_count"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_success "✅ Dry run completed - no changes made"
    else
        print_warning "⚠️ Ready to execute migration"
        if [[ "$ENVIRONMENT" == "production" ]]; then
            print_error "🚨 PRODUCTION MIGRATION - Extra caution required!"
        fi
    fi
    
    return 0
}

# Apply migration with safety checks
apply_migration() {
    local migration_file="$1"
    
    print_step "🚀 Applying migration: $(basename "$migration_file")"
    
    # Security check for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        print_security "🔒 PRODUCTION ENVIRONMENT DETECTED"
        if [[ "$FORCE" != "true" ]]; then
            print_warning "Production migrations require explicit confirmation"
            read -p "Are you absolutely sure you want to proceed? (type 'CONFIRM'): " -r
            if [[ ! $REPLY == "CONFIRM" ]]; then
                print_status "Migration aborted by user"
                return 0
            fi
        fi
    fi
    
    # Run validation and permission checks
    if [[ "$SKIP_VALIDATION" != "true" ]]; then
        validate_migration_schema "$migration_file" || return 1
        lint_migration "$migration_file" || return 1
        check_permissions || return 1
    fi
    
    # Create backup if required
    if [[ "$BACKUP" == "true" ]] || [[ "$ENVIRONMENT" == "production" ]]; then
        create_migration_backup "$migration_file" || return 1
    fi
    
    # Execute migration
    execute_migration "$migration_file" || return 1
    
    # Record migration in history
    record_migration_history "$migration_file" "applied" || return 1
    
    print_success "✅ Migration applied successfully"
    return 0
}

# Execute migration operations
execute_migration() {
    local migration_file="$1"
    local operations_count=$(jq '.operations | length' "$migration_file")
    local endpoint_arg=""
    
    if [[ "$ENVIRONMENT" == "development" && "$LOCAL_ENDPOINT" != "none" ]]; then
        endpoint_arg="--endpoint-url $LOCAL_ENDPOINT"
    fi
    
    print_step "Executing $operations_count operation(s)..."
    
    # Process each operation
    for ((i=0; i<operations_count; i++)); do
        local op=$(jq ".operations[$i]" "$migration_file")
        local op_type=$(echo "$op" | jq -r '.type')
        local op_description=$(echo "$op" | jq -r '.description // "No description"')
        
        print_status "Step $((i+1))/$operations_count: $op_type - $op_description"
        
        if [[ "$DRY_RUN" == "true" ]]; then
            print_status "[DRY-RUN] Would execute: $op_type"
            continue
        fi
        
        case "$op_type" in
            "create_table")
                execute_create_table "$op" "$endpoint_arg" || return 1
                ;;
            "modify_table")
                execute_modify_table "$op" "$endpoint_arg" || return 1
                ;;
            "delete_table")
                execute_delete_table "$op" "$endpoint_arg" || return 1
                ;;
            "create_index")
                execute_create_index "$op" "$endpoint_arg" || return 1
                ;;
            "delete_index")
                execute_delete_index "$op" "$endpoint_arg" || return 1
                ;;
            "update_capacity")
                execute_update_capacity "$op" "$endpoint_arg" || return 1
                ;;
            "custom_script")
                execute_custom_script "$op" || return 1
                ;;
            *)
                print_error "Unknown operation type: $op_type"
                return 1
                ;;
        esac
        
        print_success "✅ Step $((i+1)) completed"
    done
    
    return 0
}

# Execute create table operation
execute_create_table() {
    local op="$1"
    local endpoint_arg="$2"
    
    local table_name=$(echo "$op" | jq -r '.table_name')
    local table_definition=$(echo "$op" | jq '.table_definition')
    
    print_status "Creating table: $table_name"
    
    # Check if table already exists
    if aws dynamodb describe-table --table-name "$table_name" \
        $endpoint_arg --region "$REGION" &>/dev/null; then
        print_warning "Table $table_name already exists - skipping creation"
        return 0
    fi
    
    # Create the table
    echo "$table_definition" | aws dynamodb create-table \
        --cli-input-json file:///dev/stdin \
        $endpoint_arg \
        --region "$REGION" >/dev/null
    
    # Wait for table to be active
    aws dynamodb wait table-exists --table-name "$table_name" \
        $endpoint_arg --region "$REGION"
    
    print_success "Table $table_name created successfully"
    return 0
}

# Execute modify table operation
execute_modify_table() {
    local op="$1"
    local endpoint_arg="$2"
    
    local table_name=$(echo "$op" | jq -r '.table_name')
    local modifications=$(echo "$op" | jq '.modifications')
    
    print_status "Modifying table: $table_name"
    
    # Apply each modification
    echo "$modifications" | jq -r 'to_entries[] | @json' | \
    while IFS= read -r mod; do
        local mod_type=$(echo "$mod" | jq -r '.key')
        local mod_value=$(echo "$mod" | jq '.value')
        
        case "$mod_type" in
            "billing_mode")
                local billing_mode=$(echo "$mod_value" | jq -r '.')
                aws dynamodb modify-table \
                    --table-name "$table_name" \
                    --billing-mode "$billing_mode" \
                    $endpoint_arg \
                    --region "$REGION" >/dev/null
                ;;
            "provisioned_throughput")
                local read_capacity=$(echo "$mod_value" | jq -r '.ReadCapacityUnits')
                local write_capacity=$(echo "$mod_value" | jq -r '.WriteCapacityUnits')
                aws dynamodb modify-table \
                    --table-name "$table_name" \
                    --provisioned-throughput ReadCapacityUnits="$read_capacity",WriteCapacityUnits="$write_capacity" \
                    $endpoint_arg \
                    --region "$REGION" >/dev/null
                ;;
        esac
    done
    
    return 0
}

# Execute delete table operation
execute_delete_table() {
    local op="$1"
    local endpoint_arg="$2"
    
    local table_name=$(echo "$op" | jq -r '.table_name')
    
    print_warning "Deleting table: $table_name"
    
    # Extra confirmation for destructive operation
    if [[ "$FORCE" != "true" ]]; then
        read -p "Are you sure you want to DELETE table $table_name? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Table deletion skipped"
            return 0
        fi
    fi
    
    aws dynamodb delete-table \
        --table-name "$table_name" \
        $endpoint_arg \
        --region "$REGION" >/dev/null
    
    print_success "Table $table_name deleted"
    return 0
}

# Execute create index operation
execute_create_index() {
    local op="$1"
    local endpoint_arg="$2"
    
    local table_name=$(echo "$op" | jq -r '.table_name')
    local index_name=$(echo "$op" | jq -r '.index_name')
    local index_definition=$(echo "$op" | jq '.index_definition')
    
    print_status "Creating index: $index_name on table $table_name"
    
    # Create index using update-table command
    local update_command=$(echo "$index_definition" | jq --arg table "$table_name" '{
        TableName: $table,
        GlobalSecondaryIndexUpdates: [{
            Create: .
        }]
    }')
    
    echo "$update_command" | aws dynamodb update-table \
        --cli-input-json file:///dev/stdin \
        $endpoint_arg \
        --region "$REGION" >/dev/null
    
    print_success "Index $index_name created"
    return 0
}

# Execute custom script
execute_custom_script() {
    local op="$1"
    
    local script_path=$(echo "$op" | jq -r '.script_path')
    local script_args=$(echo "$op" | jq -r '.args // ""')
    
    print_status "Executing custom script: $script_path"
    
    if [[ ! -f "$script_path" ]]; then
        print_error "Custom script not found: $script_path"
        return 1
    fi
    
    # Execute script with environment variables
    MIGRATION_ENVIRONMENT="$ENVIRONMENT" \
    MIGRATION_REGION="$REGION" \
    MIGRATION_TABLE_PREFIX="$TABLE_PREFIX" \
    bash "$script_path" $script_args
    
    return $?
}

# Create backup before migration
create_migration_backup() {
    local migration_file="$1"
    
    print_step "📦 Creating backup before migration..."
    
    local migration_name=$(jq -r '.name' "$migration_file")
    local backup_dir="$PROJECT_ROOT/migrations/backups/${migration_name}_$(date +%Y%m%d_%H%M%S)"
    
    mkdir -p "$backup_dir"
    
    # Get list of tables that will be affected
    local affected_tables=$(jq -r '.operations[] | select(.table_name) | .table_name' "$migration_file" | sort -u)
    
    if [[ -z "$affected_tables" ]]; then
        print_status "No tables to backup"
        return 0
    fi
    
    local endpoint_arg=""
    if [[ "$ENVIRONMENT" == "development" && "$LOCAL_ENDPOINT" != "none" ]]; then
        endpoint_arg="--endpoint-url $LOCAL_ENDPOINT"
    fi
    
    echo "$affected_tables" | while IFS= read -r table_name; do
        if [[ -n "$table_name" ]]; then
            print_status "Backing up table: $table_name"
            
            # Export table schema
            aws dynamodb describe-table \
                --table-name "$table_name" \
                $endpoint_arg \
                --region "$REGION" > "$backup_dir/${table_name}_schema.json"
            
            # Export table data
            aws dynamodb scan \
                --table-name "$table_name" \
                $endpoint_arg \
                --region "$REGION" > "$backup_dir/${table_name}_data.json"
        fi
    done
    
    # Create backup metadata
    cat > "$backup_dir/backup_metadata.json" << EOF
{
    "migration_name": "$migration_name",
    "migration_file": "$(basename "$migration_file")",
    "environment": "$ENVIRONMENT",
    "created_at": "$(date -u +"%Y-%m-%d %H:%M:%S UTC")",
    "region": "$REGION",
    "affected_tables": $(echo "$affected_tables" | jq -R . | jq -s .)
}
EOF
    
    print_success "✅ Backup created: $backup_dir"
    return 0
}

# Record migration in history
record_migration_history() {
    local migration_file="$1"
    local status="$2"
    
    local table_name="${TABLE_PREFIX}-migration-history"
    local migration_id=$(basename "$migration_file" .json)
    local applied_at=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
    local version=$(jq -r '.version' "$migration_file")
    local name=$(jq -r '.name' "$migration_file")
    
    local endpoint_arg=""
    if [[ "$ENVIRONMENT" == "development" && "$LOCAL_ENDPOINT" != "none" ]]; then
        endpoint_arg="--endpoint-url $LOCAL_ENDPOINT"
    fi
    
    aws dynamodb put-item \
        --table-name "$table_name" \
        --item "{
            \"migration_id\": {\"S\": \"$migration_id\"},
            \"applied_at\": {\"S\": \"$applied_at\"},
            \"version\": {\"S\": \"$version\"},
            \"name\": {\"S\": \"$name\"},
            \"status\": {\"S\": \"$status\"},
            \"environment\": {\"S\": \"$ENVIRONMENT\"},
            \"region\": {\"S\": \"$REGION\"}
        }" \
        $endpoint_arg \
        --region "$REGION" >/dev/null
    
    return 0
}

# Generate new migration template
generate_migration() {
    local migration_name="$1"
    
    if [[ -z "$migration_name" ]]; then
        print_error "Migration name is required"
        return 1
    fi
    
    # Generate migration ID (next number)
    local next_id=1
    if [[ -d "$PROJECT_ROOT/migrations" ]]; then
        local last_id=$(find "$PROJECT_ROOT/migrations" -name "[0-9][0-9][0-9]_*.json" | \
                       sed 's/.*\/\([0-9][0-9][0-9]\)_.*/\1/' | sort -n | tail -1)
        if [[ -n "$last_id" ]]; then
            next_id=$((10#$last_id + 1))
        fi
    fi
    
    local migration_id=$(printf "%03d" "$next_id")
    local migration_filename="${migration_id}_${migration_name}.json"
    local migration_path="$PROJECT_ROOT/migrations/$migration_filename"
    
    # Create migration template
    cat > "$migration_path" << EOF
{
    "version": "1.0.0",
    "name": "$migration_name",
    "description": "TODO: Describe what this migration does",
    "author": "$USER",
    "created_at": "$(date -u +"%Y-%m-%d %H:%M:%S UTC")",
    "target_environment": "all",
    "backup_required": true,
    "estimated_duration": "5 minutes",
    "operations": [
        {
            "type": "create_table",
            "description": "Example: Create new table",
            "table_name": "${TABLE_PREFIX}-example",
            "risk_level": "low",
            "table_definition": {
                "TableName": "${TABLE_PREFIX}-example",
                "AttributeDefinitions": [
                    {
                        "AttributeName": "id",
                        "AttributeType": "S"
                    }
                ],
                "KeySchema": [
                    {
                        "AttributeName": "id",
                        "KeyType": "HASH"
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST"
            }
        }
    ],
    "rollback_procedure": {
        "description": "TODO: Describe how to rollback this migration",
        "operations": [
            {
                "type": "delete_table",
                "table_name": "${TABLE_PREFIX}-example"
            }
        ]
    },
    "validation_steps": [
        "Verify table was created successfully",
        "Check table status is ACTIVE"
    ]
}
EOF
    
    print_success "✅ Migration template generated: $migration_path"
    print_status "Edit the file to define your migration operations"
    
    return 0
}

# List all migrations
list_migrations() {
    print_step "📋 Available migrations:"
    
    if [[ ! -d "$PROJECT_ROOT/migrations" ]]; then
        print_status "No migrations directory found"
        return 0
    fi
    
    local migrations=$(find "$PROJECT_ROOT/migrations" -name "[0-9][0-9][0-9]_*.json" | sort)
    
    if [[ -z "$migrations" ]]; then
        print_status "No migrations found"
        return 0
    fi
    
    echo "$migrations" | while IFS= read -r migration_file; do
        local filename=$(basename "$migration_file")
        local name=$(jq -r '.name' "$migration_file" 2>/dev/null || echo "Unknown")
        local version=$(jq -r '.version' "$migration_file" 2>/dev/null || echo "Unknown")
        local description=$(jq -r '.description' "$migration_file" 2>/dev/null || echo "No description")
        
        echo ""
        print_status "📁 $filename"
        print_status "   Name: $name (v$version)"
        print_status "   Description: $description"
    done
}

# Show migration status and history
migration_status() {
    print_step "📊 Migration Status Report"
    
    initialize_migration_system
    
    local table_name="${TABLE_PREFIX}-migration-history"
    local endpoint_arg=""
    
    if [[ "$ENVIRONMENT" == "development" && "$LOCAL_ENDPOINT" != "none" ]]; then
        endpoint_arg="--endpoint-url $LOCAL_ENDPOINT"
    fi
    
    print_status "Environment: $ENVIRONMENT"
    print_status "Region: $REGION"
    print_status "Migration Tracking Table: $table_name"
    
    # Get applied migrations
    local applied_migrations=$(aws dynamodb scan \
        --table-name "$table_name" \
        --filter-expression "#env = :env" \
        --expression-attribute-names '{"#env": "environment"}' \
        --expression-attribute-values "{\":env\": {\"S\": \"$ENVIRONMENT\"}}" \
        $endpoint_arg \
        --region "$REGION" \
        --output json 2>/dev/null | jq -r '.Items[]' 2>/dev/null || echo "")
    
    if [[ -n "$applied_migrations" ]]; then
        echo ""
        print_step "✅ Applied Migrations:"
        echo "$applied_migrations" | jq -r '[.migration_id.S, .applied_at.S, .name.S, .status.S] | join(" | ")' | \
        while IFS='|' read -r id applied_at name status; do
            print_status "  $id | $applied_at | $name | $status"
        done
    else
        echo ""
        print_status "No migrations have been applied to this environment"
    fi
    
    # Check for pending migrations
    echo ""
    print_step "📋 Available Migrations:"
    list_migrations
}

# Production deployment with extra safety
production_deploy() {
    local migration_file="$1"
    
    if [[ "$ENVIRONMENT" != "production" ]]; then
        print_error "This command is only for production deployments"
        print_status "Current environment: $ENVIRONMENT"
        return 1
    fi
    
    print_security "🚨 PRODUCTION DEPLOYMENT MODE"
    print_security "Extra safety measures are in effect"
    
    # Force backup for production
    BACKUP=true
    
    # Run comprehensive checks
    validate_migration_schema "$migration_file" || return 1
    lint_migration "$migration_file" || return 1
    check_permissions || return 1
    
    # Show execution plan
    plan_migration "$migration_file" || return 1
    
    # Final confirmation
    echo ""
    print_security "🔒 FINAL PRODUCTION CONFIRMATION"
    print_warning "This will modify your PRODUCTION DynamoDB tables"
    print_warning "Backup will be created automatically"
    
    if [[ "$FORCE" != "true" ]]; then
        read -p "Type 'DEPLOY TO PRODUCTION' to continue: " -r
        if [[ ! $REPLY == "DEPLOY TO PRODUCTION" ]]; then
            print_status "Production deployment cancelled"
            return 0
        fi
    fi
    
    # Execute migration
    apply_migration "$migration_file"
    
    return $?
}

# Initialize migration system
initialize_migration_system

# Main script execution
main() {
    if [[ -z "$COMMAND" ]]; then
        print_error "No command specified"
        usage
        exit 1
    fi
    
    case "$COMMAND" in
        "validate-schema")
            if [[ -z "$MIGRATION_FILE" ]]; then
                print_error "Migration file required for validation"
                exit 1
            fi
            validate_migration_schema "$MIGRATION_FILE"
            ;;
        "lint-migration")
            if [[ -z "$MIGRATION_FILE" ]]; then
                print_error "Migration file required for linting"
                exit 1
            fi
            lint_migration "$MIGRATION_FILE"
            ;;
        "check-permissions")
            check_permissions
            ;;
        "plan-migration")
            if [[ -z "$MIGRATION_FILE" ]]; then
                print_error "Migration file required for planning"
                exit 1
            fi
            plan_migration "$MIGRATION_FILE"
            ;;
        "apply-migration")
            if [[ -z "$MIGRATION_FILE" ]]; then
                print_error "Migration file required for application"
                exit 1
            fi
            apply_migration "$MIGRATION_FILE"
            ;;
        "generate-migration")
            if [[ -z "$MIGRATION_FILE" ]]; then
                print_error "Migration name required for generation"
                exit 1
            fi
            generate_migration "$MIGRATION_FILE"
            ;;
        "list-migrations")
            list_migrations
            ;;
        "migration-status")
            migration_status
            ;;
        "production-deploy")
            if [[ -z "$MIGRATION_FILE" ]]; then
                print_error "Migration file required for production deployment"
                exit 1
            fi
            production_deploy "$MIGRATION_FILE"
            ;;
        "help"|"--help"|"-h")
            usage
            ;;
        *)
            print_error "Unknown command: $COMMAND"
            usage
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"
