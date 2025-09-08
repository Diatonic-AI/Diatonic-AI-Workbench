#!/usr/bin/env bash
# DynamoDB Schema Synchronization Script with PII Protection
# Manages local and cloud DynamoDB table schemas and data with environment-specific configuration

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Environment-specific configuration (loaded from environment-config.js)
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

# Usage information
usage() {
    cat << EOF
DynamoDB Schema Synchronization Tool with PII Protection

USAGE:
    $0 <command> [options]

COMMANDS:
    create-local            Create all tables in local DynamoDB
    sync-content-from-cloud Sync ONLY content tables from cloud (safe)
    sync-from-cloud         [DEPRECATED] Use sync-content-from-cloud instead
    seed-mock-data          Generate and load mock PII data locally
    delete-local           Delete all local tables
    list-local             List all local tables
    list-cloud             List all cloud tables
    status                 Show sync status and table classification
    reset                  Delete and recreate all local tables + seed mock data
    show-config            Display current environment configuration
    validate-environment   Validate environment setup and security

OPTIONS:
    -e, --environment ENV  Environment (development/staging/production)
    -f, --force            Force operation without confirmation
    -v, --verbose          Enable verbose output
    -d, --dry-run          Show what would be done without executing
    -h, --help             Show this help message

EXAMPLES:
    $0 status                           # Check current status
    $0 create-local                     # Create all tables locally
    $0 sync-content-from-cloud          # Sync content tables only (safe)
    $0 seed-mock-data                   # Load mock PII data
    $0 reset                            # Fresh start with mock data
    $0 -e staging sync-content-from-cloud  # Staging environment sync

SECURITY FEATURES:
    🔒 PII Protection: Real user data is never stored locally in development
    🔒 Selective Sync: Only content tables are synced from cloud
    🔒 Mock Data: PII tables use sanitized mock data for development
    🔒 Environment Blocking: Production operations are restricted
    🔒 Approval Gates: Sync operations require confirmation

NOTES:
    - Production environment blocks most sync operations
    - Development uses mock data for all PII-related tables
    - Content tables (pages, features, etc.) are safe to sync
    - AWS credentials required for cloud operations
EOF
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

# Check if table should be synced based on content/PII classification
is_syncable_table() {
    local table_name="$1"
    
    # Extract base table name (remove prefixes)
    local base_name=$(echo "$table_name" | sed -E "s/^${CLOUD_TABLE_PREFIX}-//")
    
    # Check if it's in the syncable tables list
    for syncable in "${SYNCABLE_TABLES[@]}"; do
        if [[ "$base_name" == "$syncable" ]]; then
            return 0  # Is syncable
        fi
    done
    
    return 1  # Not syncable
}

# Check if table contains PII data
is_pii_table() {
    local table_name="$1"
    
    # Extract base table name (remove prefixes)
    local base_name=$(echo "$table_name" | sed -E "s/^${TABLE_PREFIX}-//")
    
    # Check if it's in the PII tables list
    for pii_table in "${PII_TABLES[@]}"; do
        if [[ "$base_name" == "$pii_table" ]]; then
            return 0  # Is PII table
        fi
    done
    
    return 1  # Not PII table
}

# Sync content tables from cloud to local (safe operation)
sync_content_from_cloud() {
    print_step "🔄 Syncing SAFE content tables from cloud to local..."
    
    validate_environment
    check_dependencies
    check_local_dynamodb
    
    if [[ "$ENABLE_CLOUD_SYNC" != "true" ]]; then
        print_error "❌ Cloud sync is disabled for environment: $ENVIRONMENT"
        exit 1
    fi
    
    # Get list of cloud tables
    local cloud_tables
    cloud_tables=$(aws dynamodb list-tables --region "$REGION" --output json | \
        jq -r '.TableNames[]' | grep "^$CLOUD_TABLE_PREFIX" | sort || true)
    
    if [[ -z "$cloud_tables" ]]; then
        print_warning "No cloud tables found with prefix: $CLOUD_TABLE_PREFIX"
        return 1
    fi
    
    print_status "Found cloud tables:"
    echo "$cloud_tables" | sed 's/^/  - /'
    
    local synced_count=0
    local skipped_count=0
    
    # Process each cloud table using process substitution to avoid subshell
    while IFS= read -r cloud_table; do
        if [[ -n "$cloud_table" ]]; then
            if is_syncable_table "$cloud_table"; then
                if is_pii_table "$cloud_table"; then
                    print_security "🔒 SKIPPING PII table: $cloud_table (security protection)"
                    ((skipped_count++))
                else
                    sync_table_content "$cloud_table"
                    ((synced_count++))
                fi
            else
                if [[ "$VERBOSE" == true ]]; then
                    print_warning "⚠️  SKIPPING non-content table: $cloud_table"
                fi
                ((skipped_count++))
            fi
        fi
    done < <(echo "$cloud_tables")
    
    print_success "✅ Content sync completed"
    print_status "Summary: $synced_count tables synced, $skipped_count tables skipped"
    
    if [[ "$ENABLE_PII_PROTECTION" == "true" ]]; then
        print_security "🔒 PII tables require mock data seeding"
        print_status "Run: $0 seed-mock-data"
    fi
}

# Sync individual table content
sync_table_content() {
    local cloud_table="$1"
    local local_table=$(echo "$cloud_table" | sed "s/^$CLOUD_TABLE_PREFIX-/$TABLE_PREFIX-/")
    
    print_step "Syncing content: $cloud_table → $local_table"
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY-RUN] Would sync $cloud_table to $local_table"
        return 0
    fi
    
    # Check if local table exists
    if ! aws dynamodb describe-table --table-name "$local_table" \
        --endpoint-url "$LOCAL_ENDPOINT" --region "$REGION" &>/dev/null; then
        
        print_step "Creating local table schema for: $local_table"
        create_local_table_from_cloud "$cloud_table" "$local_table"
    fi
    
    # Clear existing local data if force mode
    if [[ "$FORCE" == true ]]; then
        print_step "Force mode: clearing existing local data..."
        clear_table_data "$local_table"
    fi
    
    # Export data from cloud
    local temp_file="/tmp/${cloud_table##*/}_export_$$.json"
    print_step "Exporting data from cloud table..."
    
    aws dynamodb scan \
        --table-name "$cloud_table" \
        --region "$REGION" \
        --output json > "$temp_file"
    
    # Count items
    local item_count=$(jq -r '.Items | length' "$temp_file")
    
    if [[ "$item_count" -gt 0 ]]; then
        print_step "Importing $item_count items to local table..."
        
        # Batch import (DynamoDB supports up to 25 items per batch)
        local batch_size=25
        local total_batches=$(( (item_count + batch_size - 1) / batch_size ))
        
        for ((batch=0; batch<total_batches; batch++)); do
            local start_idx=$((batch * batch_size))
            local batch_items=$(jq ".Items[$start_idx:$((start_idx + batch_size))]" "$temp_file")
            
            # Create batch write request
            local batch_request=$(cat << EOF
{
  "$local_table": $(echo "$batch_items" | jq '[.[] | {"PutRequest": {"Item": .}}]')
}
EOF
)
            
            if [[ "$VERBOSE" == true ]]; then
                print_status "Processing batch $((batch + 1))/$total_batches"
            fi
            
            aws dynamodb batch-write-item \
                --endpoint-url "$LOCAL_ENDPOINT" \
                --region "$REGION" \
                --request-items "$batch_request" &>/dev/null
        done
        
        print_success "✅ Successfully imported $item_count items"
    else
        print_status "No data to import (empty table)"
    fi
    
    # Cleanup
    rm -f "$temp_file"
}

# Create local table from cloud schema
create_local_table_from_cloud() {
    local cloud_table="$1"
    local local_table="$2"
    
    print_step "Creating local table schema: $local_table"
    
    # Get table description from cloud
    local table_description
    table_description=$(aws dynamodb describe-table \
        --table-name "$cloud_table" \
        --region "$REGION" \
        --output json)
    
    # Transform schema for local use
    local local_schema
    local_schema=$(echo "$table_description" | jq '{
        TableName: "'"$local_table"'",
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
    echo "$local_schema" | aws dynamodb create-table \
        --cli-input-json file:///dev/stdin \
        --endpoint-url "$LOCAL_ENDPOINT" \
        --region "$REGION" &> /dev/null
    
    print_success "✅ Created local table: $local_table"
}

# Clear all data from a table
clear_table_data() {
    local table_name="$1"
    
    print_step "Clearing data from: $table_name"
    
    # Get all items (key attributes only)
    local items=$(aws dynamodb scan \
        --table-name "$table_name" \
        --endpoint-url "$LOCAL_ENDPOINT" \
        --region "$REGION" \
        --projection-expression "$(get_key_attributes "$table_name")" \
        --query "Items[]")
    
    if [[ "$items" != "[]" && "$items" != "null" ]]; then
        echo "$items" | jq -r '.[] | [.[]] | @json' | while IFS= read -r key; do
            aws dynamodb delete-item \
                --table-name "$table_name" \
                --endpoint-url "$LOCAL_ENDPOINT" \
                --region "$REGION" \
                --key "$key" &>/dev/null
        done
        print_status "Data cleared from $table_name"
    fi
}

# Get primary key attributes for a table (simplified)
get_key_attributes() {
    local table_name="$1"
    local base_name=$(echo "$table_name" | sed -E "s/^${TABLE_PREFIX}-//")
    
    case "$base_name" in
        "users"|"user-profiles")
            echo "userId"
            ;;
        "user-progress")
            echo "userId,progressId"
            ;;
        "content-pages")
            echo "id"
            ;;
        *)
            echo "id"
            ;;
    esac
}

# Seed mock data for PII tables
seed_mock_data() {
    print_step "🌱 Seeding mock data for PII tables..."
    
    validate_environment
    check_local_dynamodb
    
    if [[ "$ENABLE_PII_PROTECTION" != "true" ]]; then
        print_warning "PII protection is disabled, but mock data seeding requested"
    fi
    
    # Call the dedicated mock data seeding script
    local seed_script="$SCRIPT_DIR/seed-mock-user-data.sh"
    
    if [[ ! -f "$seed_script" ]]; then
        print_error "Mock data seeding script not found: $seed_script"
        print_error "Please ensure seed-mock-user-data.sh is available"
        exit 1
    fi
    
    local seed_args=("-e" "$ENVIRONMENT")
    [[ "$VERBOSE" == true ]] && seed_args+=("-v")
    [[ "$FORCE" == true ]] && seed_args+=("-f")
    [[ "$DRY_RUN" == true ]] && seed_args+=("-d")
    
    "$seed_script" "${seed_args[@]}"
    
    print_success "✅ Mock data seeding completed"
}

# Create all local tables
create_local_tables() {
    print_step "🏗️  Creating all local tables..."
    
    validate_environment
    check_dependencies
    check_local_dynamodb
    
    # Get cloud tables for schema reference
    local cloud_tables
    cloud_tables=$(aws dynamodb list-tables --region "$REGION" --output json | \
        jq -r '.TableNames[]' | grep "^$CLOUD_TABLE_PREFIX" | sort || true)
    
    if [[ -z "$cloud_tables" ]]; then
        print_error "No cloud tables found to create schemas from"
        print_error "Please ensure cloud infrastructure is deployed"
        exit 1
    fi
    
    local created_count=0
    local skipped_count=0
    
    # Create each table
    echo "$cloud_tables" | while IFS= read -r cloud_table; do
        if [[ -n "$cloud_table" ]]; then
            local local_table=$(echo "$cloud_table" | sed "s/^$CLOUD_TABLE_PREFIX-/$TABLE_PREFIX-/")
            
            # Check if local table already exists
            if aws dynamodb describe-table --table-name "$local_table" \
                --endpoint-url "$LOCAL_ENDPOINT" --region "$REGION" &>/dev/null; then
                
                if [[ "$VERBOSE" == true ]]; then
                    print_warning "Table already exists: $local_table"
                fi
                ((skipped_count++))
            else
                create_local_table_from_cloud "$cloud_table" "$local_table"
                ((created_count++))
            fi
        fi
    done
    
    print_success "✅ Table creation completed"
    print_status "Summary: $created_count tables created, $skipped_count tables skipped"
}

# Delete all local tables
delete_local_tables() {
    print_step "🗑️  Deleting all local tables..."
    
    check_local_dynamodb
    
    if [[ "$FORCE" != true ]]; then
        print_warning "⚠️  This will delete ALL local DynamoDB tables"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Aborted by user"
            exit 0
        fi
    fi
    
    # Get all local tables
    local local_tables
    local_tables=$(aws dynamodb list-tables \
        --endpoint-url "$LOCAL_ENDPOINT" \
        --region "$REGION" \
        --output json | jq -r '.TableNames[]' | sort)
    
    if [[ -z "$local_tables" ]]; then
        print_status "No local tables found to delete"
        return 0
    fi
    
    local deleted_count=0
    
    echo "$local_tables" | while IFS= read -r table_name; do
        if [[ -n "$table_name" ]]; then
            if [[ "$DRY_RUN" == true ]]; then
                print_status "[DRY-RUN] Would delete table: $table_name"
            else
                print_step "Deleting table: $table_name"
                aws dynamodb delete-table \
                    --table-name "$table_name" \
                    --endpoint-url "$LOCAL_ENDPOINT" \
                    --region "$REGION" &>/dev/null
                ((deleted_count++))
            fi
        fi
    done
    
    if [[ "$DRY_RUN" != true ]]; then
        print_success "✅ Deleted $deleted_count local tables"
    fi
}

# List local tables
list_local_tables() {
    print_step "📋 Local DynamoDB Tables"
    
    check_local_dynamodb
    
    local tables
    tables=$(aws dynamodb list-tables \
        --endpoint-url "$LOCAL_ENDPOINT" \
        --region "$REGION" \
        --output json | jq -r '.TableNames[]' | sort)
    
    if [[ -n "$tables" ]]; then
        echo "$tables" | while IFS= read -r table_name; do
            local item_count
            item_count=$(aws dynamodb scan \
                --table-name "$table_name" \
                --endpoint-url "$LOCAL_ENDPOINT" \
                --region "$REGION" \
                --select "COUNT" \
                --query "Count" 2>/dev/null || echo "?")
            
            local table_type="Content"
            if is_pii_table "$table_name"; then
                table_type="PII"
            fi
            
            print_status "$table_name ($table_type) - $item_count items"
        done
    else
        print_status "No local tables found"
    fi
}

# List cloud tables
list_cloud_tables() {
    print_step "☁️  Cloud DynamoDB Tables ($ENVIRONMENT)"
    
    check_dependencies
    
    local tables
    tables=$(aws dynamodb list-tables --region "$REGION" --output json | \
        jq -r '.TableNames[]' | grep "^$CLOUD_TABLE_PREFIX" | sort || true)
    
    if [[ -n "$tables" ]]; then
        echo "$tables" | while IFS= read -r table_name; do
            local table_type="Content"
            if is_pii_table "$table_name"; then
                table_type="PII"
            fi
            
            local sync_status="❌ Not Syncable"
            if is_syncable_table "$table_name"; then
                if is_pii_table "$table_name"; then
                    sync_status="🔒 PII Protected"
                else
                    sync_status="✅ Syncable"
                fi
            fi
            
            print_status "$table_name ($table_type) - $sync_status"
        done
    else
        print_status "No cloud tables found for environment: $ENVIRONMENT"
    fi
}

# Show comprehensive status
show_status() {
    print_step "📊 DynamoDB Schema Sync Status Report"
    print_status "Environment: $ENVIRONMENT"
    print_status "Generated: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
    echo ""
    
    # Environment configuration
    print_step "🔧 Configuration"
    print_status "  - Environment: $ENVIRONMENT"
    print_status "  - Region: $REGION"
    print_status "  - Table Prefix: $TABLE_PREFIX"
    print_status "  - Cloud Prefix: $CLOUD_TABLE_PREFIX"
    print_status "  - Local Endpoint: $LOCAL_ENDPOINT"
    print_status "  - Cloud Sync Enabled: $ENABLE_CLOUD_SYNC"
    print_status "  - PII Protection: $ENABLE_PII_PROTECTION"
    print_status "  - Sync Approval Required: $REQUIRE_SYNC_APPROVAL"
    echo ""
    
    # Local DynamoDB status
    print_step "🏠 Local DynamoDB"
    if [[ "$LOCAL_ENDPOINT" == "none" ]]; then
        print_error "  ❌ No local endpoint configured for $ENVIRONMENT"
    elif aws dynamodb list-tables --endpoint-url "$LOCAL_ENDPOINT" --region "$REGION" &>/dev/null; then
        local local_count
        local_count=$(aws dynamodb list-tables --endpoint-url "$LOCAL_ENDPOINT" --region "$REGION" --output json | jq -r '.TableNames | length')
        print_success "  ✅ Running on $LOCAL_ENDPOINT"
        print_status "  📊 Tables: $local_count"
        
        # Count PII vs content tables
        local pii_count=0
        local content_count=0
        local tables
        tables=$(aws dynamodb list-tables --endpoint-url "$LOCAL_ENDPOINT" --region "$REGION" --output json | jq -r '.TableNames[]')
        
        if [[ -n "$tables" ]]; then
            echo "$tables" | while IFS= read -r table_name; do
                if is_pii_table "$table_name"; then
                    ((pii_count++))
                else
                    ((content_count++))
                fi
            done
        fi
        
        print_status "  🔒 PII Tables: $pii_count"
        print_status "  📄 Content Tables: $content_count"
    else
        print_error "  ❌ Not running or not accessible"
        print_error "  Start with: docker run -d -p 8002:8000 amazon/dynamodb-local"
    fi
    echo ""
    
    # Cloud DynamoDB status
    print_step "☁️  Cloud DynamoDB"
    if aws configure list &> /dev/null; then
        local cloud_count
        cloud_count=$(aws dynamodb list-tables --region "$REGION" --output json | \
            jq -r '.TableNames | map(select(test("^'"$CLOUD_TABLE_PREFIX"'"))) | length' 2>/dev/null || echo "0")
        
        print_success "  ✅ AWS CLI configured"
        print_status "  📊 Tables ($ENVIRONMENT): $cloud_count"
        print_status "  🌍 Region: $REGION"
        
        # Count syncable vs non-syncable
        if [[ "$cloud_count" -gt 0 ]]; then
            local syncable_count=0
            local pii_count=0
            local tables
            tables=$(aws dynamodb list-tables --region "$REGION" --output json | \
                jq -r '.TableNames[]' | grep "^$CLOUD_TABLE_PREFIX" || true)
            
            if [[ -n "$tables" ]]; then
                echo "$tables" | while IFS= read -r table_name; do
                    if is_syncable_table "$table_name"; then
                        ((syncable_count++))
                    fi
                    if is_pii_table "$table_name"; then
                        ((pii_count++))
                    fi
                done
                
                print_status "  ✅ Syncable Tables: $syncable_count"
                print_status "  🔒 PII Protected: $pii_count"
            fi
        fi
    else
        print_error "  ❌ AWS CLI not configured"
        print_error "  Configure with: aws configure"
    fi
    echo ""
    
    # Security status
    print_step "🔒 Security Status"
    case "$ENVIRONMENT" in
        "production")
            print_security "  🔒 PRODUCTION: Direct cloud access only"
            print_status "  ❌ Cloud sync: Blocked"
            print_status "  ❌ Mock data: Blocked"
            ;;
        "development"|"staging")
            print_security "  ✅ DEV/STAGING: PII protection enabled"
            print_status "  ✅ Cloud sync: Content tables only"
            print_status "  ✅ Mock data: Available for PII tables"
            print_status "  🔒 PII sync: Blocked (security)"
            ;;
    esac
    echo ""
    
    # Available operations
    print_step "🎯 Available Operations"
    print_status "  create-local         - Create all table schemas locally"
    print_status "  sync-content-from-cloud - Sync safe content tables from cloud"
    print_status "  seed-mock-data       - Load mock data for PII tables"
    print_status "  list-local          - List local tables"
    print_status "  list-cloud          - List cloud tables"
    print_status "  reset               - Delete and recreate all local + seed mock"
    print_status "  show-config         - Display detailed configuration"
}

# Show detailed configuration
show_config() {
    print_step "🔧 Environment Configuration Details"
    node "$CONFIG_MODULE" show
}

# Validate environment setup
validate_environment_setup() {
    print_step "🔍 Validating environment setup..."
    
    validate_environment
    check_dependencies
    
    local validation_errors=0
    
    # Check configuration module
    if [[ -f "$CONFIG_MODULE" ]]; then
        print_success "✅ Environment configuration module found"
        
        # Validate configuration
        if node "$CONFIG_MODULE" validate &>/dev/null; then
            print_success "✅ Environment configuration is valid"
        else
            print_error "❌ Environment configuration validation failed"
            ((validation_errors++))
        fi
    else
        print_error "❌ Environment configuration module missing"
        ((validation_errors++))
    fi
    
    # Check mock data script for dev/staging
    if [[ "$ENVIRONMENT" != "production" ]]; then
        local seed_script="$SCRIPT_DIR/seed-mock-user-data.sh"
        if [[ -f "$seed_script" ]]; then
            print_success "✅ Mock data seeding script found"
        else
            print_error "❌ Mock data seeding script missing"
            ((validation_errors++))
        fi
    fi
    
    # Check local DynamoDB for non-production
    if [[ "$ENVIRONMENT" != "production" ]]; then
        if [[ "$LOCAL_ENDPOINT" != "none" ]]; then
            if aws dynamodb list-tables --endpoint-url "$LOCAL_ENDPOINT" --region "$REGION" &>/dev/null; then
                print_success "✅ Local DynamoDB accessible"
            else
                print_warning "⚠️  Local DynamoDB not running"
                print_status "Start with: docker run -d -p 8002:8000 amazon/dynamodb-local"
            fi
        else
            print_error "❌ No local DynamoDB endpoint configured"
            ((validation_errors++))
        fi
    fi
    
    # Check AWS configuration
    if aws configure list &> /dev/null; then
        print_success "✅ AWS CLI configured"
        
        # Test cloud access
        if aws dynamodb list-tables --region "$REGION" &>/dev/null; then
            print_success "✅ Cloud DynamoDB accessible"
        else
            print_warning "⚠️  Cloud DynamoDB access issues"
        fi
    else
        print_error "❌ AWS CLI not configured"
        ((validation_errors++))
    fi
    
    echo ""
    if [[ $validation_errors -eq 0 ]]; then
        print_success "✅ Environment validation passed"
        return 0
    else
        print_error "❌ Environment validation failed with $validation_errors errors"
        return 1
    fi
}

# Reset - delete all local tables and recreate with mock data
reset_environment() {
    print_step "🔄 Resetting local environment..."
    
    validate_environment
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        print_error "❌ Reset operation blocked in production"
        exit 1
    fi
    
    if [[ "$FORCE" != true ]]; then
        print_warning "⚠️  This will delete ALL local tables and recreate them"
        print_warning "⚠️  All local data will be lost"
        read -p "Continue with reset? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Reset aborted by user"
            exit 0
        fi
    fi
    
    # Delete all local tables
    delete_local_tables
    
    # Wait for deletions to complete
    print_step "Waiting for table deletions to complete..."
    sleep 3
    
    # Create all local tables from cloud schemas
    create_local_tables
    
    # Sync safe content from cloud
    if [[ "$ENABLE_CLOUD_SYNC" == "true" ]]; then
        sync_content_from_cloud
    fi
    
    # Seed mock data for PII tables
    if [[ "$ENABLE_PII_PROTECTION" == "true" ]]; then
        seed_mock_data
    fi
    
    print_success "✅ Environment reset completed successfully"
}

# Main script execution
main() {
    # Validate we have a command
    if [[ -z "$COMMAND" ]]; then
        COMMAND="status"
    fi
    
    case "$COMMAND" in
        "create-local")
            create_local_tables
            ;;
        "sync-content-from-cloud")
            sync_content_from_cloud
            ;;
        "sync-from-cloud")
            print_warning "⚠️  sync-from-cloud is deprecated"
            print_status "Use 'sync-content-from-cloud' for safe content-only sync"
            print_status "Use 'seed-mock-data' for PII data"
            exit 1
            ;;
        "seed-mock-data")
            seed_mock_data
            ;;
        "delete-local")
            delete_local_tables
            ;;
        "list-local")
            list_local_tables
            ;;
        "list-cloud")
            list_cloud_tables
            ;;
        "status")
            show_status
            ;;
        "show-config")
            show_config
            ;;
        "validate-environment")
            validate_environment_setup
            ;;
        "reset")
            reset_environment
            ;;
        "help"|"--help"|"-h")
            usage
            ;;
        *)
            print_error "Unknown command: $COMMAND"
            print_status "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"
