#!/usr/bin/env bash
# AI Nexus Workbench - Development Data Management Utilities
# Updated to match actual Terraform DynamoDB table schemas
set -euo pipefail

# Configuration
REGION=${REGION:-us-east-2}
ENV=${ENV:-dev}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

# Dev DynamoDB table configuration (matching Terraform)
DEV_TABLES=(
    "aws-devops-dev-user-profiles"
    "aws-devops-dev-user-sessions"
    "aws-devops-dev-user-content-metadata"
    "aws-devops-dev-application-settings"
    "aws-devops-dev-organization-data"
    "aws-devops-dev-system-logs"
)

# Production table mappings (when they exist)
PROD_TABLES=(
    "aws-devops-prod-user-profiles"
    "aws-devops-prod-user-sessions"
    "aws-devops-prod-user-content-metadata"
    "aws-devops-prod-application-settings"
    "aws-devops-prod-organization-data"
    "aws-devops-prod-system-logs"
)

# Check if DynamoDB table exists
table_exists() {
    local table_name="$1"
    aws dynamodb describe-table --table-name "$table_name" >/dev/null 2>&1
}

# Verify all dev tables exist
verify_dev_tables() {
    log "Verifying dev DynamoDB tables..."
    
    local missing_tables=()
    for table in "${DEV_TABLES[@]}"; do
        if table_exists "$table"; then
            success "✓ $table exists"
        else
            error "✗ $table missing"
            missing_tables+=("$table")
        fi
    done
    
    if [[ ${#missing_tables[@]} -gt 0 ]]; then
        error "Missing ${#missing_tables[@]} dev tables. Please create them first with 'terraform apply'."
        return 1
    fi
    
    success "All dev tables verified"
}

# Get table schema for comparison
get_table_schema() {
    local table_name="$1"
    aws dynamodb describe-table --table-name "$table_name" \
        --query "Table.{AttributeDefinitions:AttributeDefinitions,KeySchema:KeySchema,GlobalSecondaryIndexes:GlobalSecondaryIndexes}" \
        --output json 2>/dev/null || echo "{}"
}

# Compare schemas between dev and prod
sync_schemas() {
    log "Comparing dev and prod table schemas..."
    
    for i in "${!DEV_TABLES[@]}"; do
        local dev_table="${DEV_TABLES[i]}"
        local prod_table="${PROD_TABLES[i]}"
        
        if ! table_exists "$prod_table"; then
            warn "Production table $prod_table does not exist - skipping schema comparison"
            continue
        fi
        
        local dev_schema=$(get_table_schema "$dev_table")
        local prod_schema=$(get_table_schema "$prod_table")
        
        if [[ "$dev_schema" == "$prod_schema" ]]; then
            success "✓ $dev_table schema matches $prod_table"
        else
            warn "⚠ Schema mismatch between $dev_table and $prod_table"
            echo "Dev schema:"
            echo "$dev_schema" | jq .
            echo "Prod schema:"
            echo "$prod_schema" | jq .
        fi
    done
}

# Populate dev tables with sample data matching actual schemas
populate_dev_data() {
    log "Populating dev tables with realistic sample data..."
    
    # Check if uuidgen is available
    if ! command -v uuidgen &> /dev/null; then
        error "uuidgen command not found. Please install uuid-tools package."
        return 1
    fi
    
    local current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local current_date=$(date -u +"%Y-%m-%d")
    local expires_at=$(date -d "+90 days" +%s)
    local session_expires=$(date -d "+24 hours" +%s)
    
    # Generate realistic IDs
    local user_id_1=$(uuidgen | tr '[:upper:]' '[:lower:]')
    local user_id_2=$(uuidgen | tr '[:upper:]' '[:lower:]')
    local user_id_3=$(uuidgen | tr '[:upper:]' '[:lower:]')
    local org_id=$(uuidgen | tr '[:upper:]' '[:lower:]')
    local content_id_1=$(uuidgen | tr '[:upper:]' '[:lower:]')
    local content_id_2=$(uuidgen | tr '[:upper:]' '[:lower:]')
    
    log "Generated IDs:"
    log "  Users: $user_id_1, $user_id_2, $user_id_3"
    log "  Organization: $org_id"
    log "  Content: $content_id_1, $content_id_2"
    
    # User Profiles - Schema: PK=user_id, GSI: email-index, organization-index
    log "Creating sample user profiles..."
    
    # Alice (admin)
    aws dynamodb put-item \
        --table-name "aws-devops-dev-user-profiles" \
        --item '{
            "user_id": {"S": "'$user_id_1'"},
            "email": {"S": "alice.dev@example.com"},
            "full_name": {"S": "Alice Developer"},
            "organization_id": {"S": "'$org_id'"},
            "role": {"S": "admin"},
            "created_at": {"S": "'$current_time'"},
            "updated_at": {"S": "'$current_time'"},
            "preferences": {"M": {
                "theme": {"S": "dark"},
                "notifications": {"BOOL": true},
                "language": {"S": "en"}
            }},
            "metadata": {"M": {
                "last_login": {"S": "'$current_time'"},
                "login_count": {"N": "1"},
                "account_status": {"S": "active"}
            }}
        }' >/dev/null
    
    # Bob (user)
    aws dynamodb put-item \
        --table-name "aws-devops-dev-user-profiles" \
        --item '{
            "user_id": {"S": "'$user_id_2'"},
            "email": {"S": "bob.dev@example.com"},
            "full_name": {"S": "Bob Developer"},
            "organization_id": {"S": "'$org_id'"},
            "role": {"S": "user"},
            "created_at": {"S": "'$current_time'"},
            "updated_at": {"S": "'$current_time'"},
            "preferences": {"M": {
                "theme": {"S": "light"},
                "notifications": {"BOOL": true},
                "language": {"S": "en"}
            }},
            "metadata": {"M": {
                "account_status": {"S": "active"}
            }}
        }' >/dev/null
    
    # Charlie (viewer)
    aws dynamodb put-item \
        --table-name "aws-devops-dev-user-profiles" \
        --item '{
            "user_id": {"S": "'$user_id_3'"},
            "email": {"S": "charlie.dev@example.com"},
            "full_name": {"S": "Charlie Viewer"},
            "organization_id": {"S": "'$org_id'"},
            "role": {"S": "viewer"},
            "created_at": {"S": "'$current_time'"},
            "updated_at": {"S": "'$current_time'"},
            "preferences": {"M": {
                "theme": {"S": "auto"},
                "notifications": {"BOOL": false},
                "language": {"S": "en"}
            }},
            "metadata": {"M": {
                "account_status": {"S": "active"}
            }}
        }' >/dev/null
    
    success "Created 3 sample users"
    
    # User Sessions - Schema: PK=session_id, GSI: user-sessions-index
    log "Creating sample user sessions..."
    
    local session_id_1="${user_id_1}_$(date +%s)"
    local session_id_2="${user_id_2}_$(date +%s)"
    
    aws dynamodb put-item \
        --table-name "aws-devops-dev-user-sessions" \
        --item '{
            "session_id": {"S": "'$session_id_1'"},
            "user_id": {"S": "'$user_id_1'"},
            "created_at": {"S": "'$current_time'"},
            "expires_at": {"N": "'$session_expires'"},
            "status": {"S": "active"},
            "client_info": {"M": {
                "user_agent": {"S": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"},
                "client_id": {"S": "dev-client"}
            }}
        }' >/dev/null
    
    aws dynamodb put-item \
        --table-name "aws-devops-dev-user-sessions" \
        --item '{
            "session_id": {"S": "'$session_id_2'"},
            "user_id": {"S": "'$user_id_2'"},
            "created_at": {"S": "'$current_time'"},
            "expires_at": {"N": "'$session_expires'"},
            "status": {"S": "active"},
            "client_info": {"M": {
                "user_agent": {"S": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
                "client_id": {"S": "dev-client"}
            }}
        }' >/dev/null
    
    success "Created sample sessions"
    
    # Application Settings - Schema: PK=setting_category+setting_key, GSI: updated-at-index
    log "Creating sample application settings..."
    
    aws dynamodb put-item \
        --table-name "aws-devops-dev-application-settings" \
        --item '{
            "setting_category": {"S": "public"},
            "setting_key": {"S": "app_name"},
            "setting_value": {"S": "AI Nexus Workbench"},
            "updated_at": {"S": "'$current_time'"},
            "description": {"S": "Application display name"},
            "data_type": {"S": "string"}
        }' >/dev/null
    
    aws dynamodb put-item \
        --table-name "aws-devops-dev-application-settings" \
        --item '{
            "setting_category": {"S": "public"},
            "setting_key": {"S": "maintenance_mode"},
            "setting_value": {"BOOL": false},
            "updated_at": {"S": "'$current_time'"},
            "description": {"S": "Application maintenance mode flag"},
            "data_type": {"S": "boolean"}
        }' >/dev/null
    
    aws dynamodb put-item \
        --table-name "aws-devops-dev-application-settings" \
        --item '{
            "setting_category": {"S": "user_settings"},
            "setting_key": {"S": "default_theme"},
            "setting_value": {"S": "light"},
            "updated_at": {"S": "'$current_time'"},
            "description": {"S": "Default UI theme for new users"},
            "data_type": {"S": "string"}
        }' >/dev/null
    
    aws dynamodb put-item \
        --table-name "aws-devops-dev-application-settings" \
        --item '{
            "setting_category": {"S": "org_settings"},
            "setting_key": {"S": "max_users_per_org"},
            "setting_value": {"N": "100"},
            "updated_at": {"S": "'$current_time'"},
            "description": {"S": "Maximum users allowed per organization"},
            "data_type": {"S": "number"}
        }' >/dev/null
    
    success "Created application settings"
    
    # Organization Data - Schema: PK=organization_id+data_type, GSI: data-type-index, created-at-index
    log "Creating sample organization data..."
    
    aws dynamodb put-item \
        --table-name "aws-devops-dev-organization-data" \
        --item '{
            "organization_id": {"S": "'$org_id'"},
            "data_type": {"S": "profile"},
            "created_at": {"S": "'$current_time'"},
            "updated_at": {"S": "'$current_time'"},
            "data": {"M": {
                "name": {"S": "Development Organization"},
                "description": {"S": "Test organization for development environment"},
                "industry": {"S": "Technology"},
                "size": {"S": "small"},
                "country": {"S": "US"},
                "timezone": {"S": "America/New_York"}
            }}
        }' >/dev/null
    
    aws dynamodb put-item \
        --table-name "aws-devops-dev-organization-data" \
        --item '{
            "organization_id": {"S": "'$org_id'"},
            "data_type": {"S": "settings"},
            "created_at": {"S": "'$current_time'"},
            "updated_at": {"S": "'$current_time'"},
            "data": {"M": {
                "billing_contact": {"S": "billing@devorg.com"},
                "support_tier": {"S": "basic"},
                "features_enabled": {"L": [
                    {"S": "basic_ai_tools"},
                    {"S": "team_collaboration"},
                    {"S": "file_sharing"}
                ]},
                "subscription_plan": {"S": "free"},
                "max_storage_gb": {"N": "10"}
            }}
        }' >/dev/null
    
    aws dynamodb put-item \
        --table-name "aws-devops-dev-organization-data" \
        --item '{
            "organization_id": {"S": "'$org_id'"},
            "data_type": {"S": "billing"},
            "created_at": {"S": "'$current_time'"},
            "updated_at": {"S": "'$current_time'"},
            "data": {"M": {
                "current_usage_gb": {"N": "2.5"},
                "monthly_api_calls": {"N": "1250"},
                "last_billing_date": {"S": "'$current_date'"},
                "billing_status": {"S": "current"}
            }}
        }' >/dev/null
    
    success "Created organization data"
    
    # User Content Metadata - Schema: PK=content_id, GSI: user-content-index, content-type-index, organization-content-index
    log "Creating sample content metadata..."
    
    aws dynamodb put-item \
        --table-name "aws-devops-dev-user-content-metadata" \
        --item '{
            "content_id": {"S": "'$content_id_1'"},
            "user_id": {"S": "'$user_id_1'"},
            "content_type": {"S": "agent_flow"},
            "organization_id": {"S": "'$org_id'"},
            "created_at": {"S": "'$current_time'"},
            "updated_at": {"S": "'$current_time'"},
            "file_path": {"S": "users/'$user_id_1'/flows/'$content_id_1'.json"},
            "file_size": {"N": "2048"},
            "metadata": {"M": {
                "title": {"S": "Customer Support Agent"},
                "description": {"S": "AI agent for handling customer support queries"},
                "version": {"S": "1.0"},
                "status": {"S": "active"},
                "tags": {"L": [{"S": "customer-service"}, {"S": "chatbot"}]}
            }}
        }' >/dev/null
    
    aws dynamodb put-item \
        --table-name "aws-devops-dev-user-content-metadata" \
        --item '{
            "content_id": {"S": "'$content_id_2'"},
            "user_id": {"S": "'$user_id_2'"},
            "content_type": {"S": "document"},
            "organization_id": {"S": "'$org_id'"},
            "created_at": {"S": "'$current_time'"},
            "updated_at": {"S": "'$current_time'"},
            "file_path": {"S": "users/'$user_id_2'/documents/'$content_id_2'.pdf"},
            "file_size": {"N": "524288"},
            "metadata": {"M": {
                "title": {"S": "Product Requirements Document"},
                "description": {"S": "Technical specifications for new AI features"},
                "version": {"S": "2.1"},
                "status": {"S": "draft"},
                "tags": {"L": [{"S": "requirements"}, {"S": "product"}]}
            }}
        }' >/dev/null
    
    success "Created content metadata"
    
    # System Logs - Schema: PK=log_id+timestamp, GSI: user-logs-index, event-type-index, daily-logs-index
    log "Creating sample system logs..."
    
    local log_id_1="${user_id_1}_$(date +%s)_001"
    local log_id_2="${user_id_2}_$(date +%s)_002"
    local log_id_3="system_$(date +%s)_003"
    
    aws dynamodb put-item \
        --table-name "aws-devops-dev-system-logs" \
        --item '{
            "log_id": {"S": "'$log_id_1'"},
            "timestamp": {"S": "'$current_time'"},
            "user_id": {"S": "'$user_id_1'"},
            "event_type": {"S": "user_login"},
            "date": {"S": "'$current_date'"},
            "details": {"S": "User logged in successfully via Cognito"},
            "expires_at": {"N": "'$expires_at'"},
            "metadata": {"M": {
                "ip_address": {"S": "192.168.1.100"},
                "user_agent": {"S": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"},
                "session_id": {"S": "'$session_id_1'"},
                "login_method": {"S": "oauth"}
            }}
        }' >/dev/null
    
    aws dynamodb put-item \
        --table-name "aws-devops-dev-system-logs" \
        --item '{
            "log_id": {"S": "'$log_id_2'"},
            "timestamp": {"S": "'$current_time'"},
            "user_id": {"S": "'$user_id_2'"},
            "event_type": {"S": "content_created"},
            "date": {"S": "'$current_date'"},
            "details": {"S": "User created new document content"},
            "expires_at": {"N": "'$expires_at'"},
            "metadata": {"M": {
                "content_id": {"S": "'$content_id_2'"},
                "content_type": {"S": "document"},
                "file_size_bytes": {"N": "524288"},
                "organization_id": {"S": "'$org_id'"}
            }}
        }' >/dev/null
    
    aws dynamodb put-item \
        --table-name "aws-devops-dev-system-logs" \
        --item '{
            "log_id": {"S": "'$log_id_3'"},
            "timestamp": {"S": "'$current_time'"},
            "user_id": {"S": "system"},
            "event_type": {"S": "system_health"},
            "date": {"S": "'$current_date'"},
            "details": {"S": "Daily system health check completed successfully"},
            "expires_at": {"N": "'$expires_at'"},
            "metadata": {"M": {
                "health_score": {"N": "98"},
                "check_type": {"S": "automated"},
                "services_checked": {"L": [
                    {"S": "dynamodb"},
                    {"S": "s3"},
                    {"S": "cognito"},
                    {"S": "api_gateway"}
                ]}
            }}
        }' >/dev/null
    
    success "Created system logs"
    
    success "Sample dev data created successfully!"
    log "Sample users created:"
    log "  - Alice (admin): alice.dev@example.com - ID: $user_id_1"
    log "  - Bob (user): bob.dev@example.com - ID: $user_id_2"
    log "  - Charlie (viewer): charlie.dev@example.com - ID: $user_id_3"
    log "  - Organization ID: $org_id"
    log "  - Content IDs: $content_id_1, $content_id_2"
}

# Backup dev data to local files
backup_dev_data() {
    local backup_dir="./backups/dev-$(date +%Y%m%d-%H%M%S)"
    log "Backing up dev data to $backup_dir..."
    
    mkdir -p "$backup_dir"
    
    for table in "${DEV_TABLES[@]}"; do
        log "Backing up $table..."
        aws dynamodb scan --table-name "$table" --output json > "$backup_dir/${table}.json"
    done
    
    # Create backup metadata
    cat > "$backup_dir/backup-metadata.json" << EOF
{
    "backup_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "dev",
    "region": "$REGION",
    "tables": $(printf '"%s"\n' "${DEV_TABLES[@]}" | jq -s .),
    "backup_type": "full_scan"
}
EOF
    
    success "Dev data backed up to $backup_dir"
    echo "Backup size: $(du -sh "$backup_dir" | cut -f1)"
}

# Restore dev data from backup
restore_dev_data() {
    local backup_dir="$1"
    
    if [[ ! -d "$backup_dir" ]]; then
        error "Backup directory $backup_dir does not exist"
        return 1
    fi
    
    log "Restoring dev data from $backup_dir..."
    warn "This will overwrite existing dev data!"
    
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm
    if [[ "$confirm" != "yes" ]]; then
        log "Restore cancelled"
        return 1
    fi
    
    for table in "${DEV_TABLES[@]}"; do
        local backup_file="$backup_dir/${table}.json"
        
        if [[ ! -f "$backup_file" ]]; then
            warn "Backup file for $table not found, skipping..."
            continue
        fi
        
        log "Restoring $table..."
        
        # Restore data
        jq -c '.Items[]' "$backup_file" | while read -r item; do
            aws dynamodb put-item --table-name "$table" --item "$item" 2>/dev/null || {
                warn "Failed to restore item in $table: $item"
            }
        done
    done
    
    success "Dev data restored from $backup_dir"
}

# Get data statistics
get_data_stats() {
    log "Getting dev data statistics..."
    
    echo "┌─────────────────────────────────────────┬───────────┐"
    echo "│ Table Name                              │ Item Count│"
    echo "├─────────────────────────────────────────┼───────────┤"
    
    for table in "${DEV_TABLES[@]}"; do
        if table_exists "$table"; then
            local count=$(aws dynamodb scan --table-name "$table" --select COUNT --output json | jq '.Count')
            printf "│ %-39s │ %9s │\n" "$table" "$count"
        else
            printf "│ %-39s │ %9s │\n" "$table" "N/A"
        fi
    done
    
    echo "└─────────────────────────────────────────┴───────────┘"
}

# Advanced data query functions
query_users() {
    log "Querying user data..."
    
    if ! table_exists "aws-devops-dev-user-profiles"; then
        error "User profiles table does not exist"
        return 1
    fi
    
    echo "Recent Users:"
    aws dynamodb scan \
        --table-name "aws-devops-dev-user-profiles" \
        --projection-expression "user_id, email, full_name, #role, created_at" \
        --expression-attribute-names '{"#role": "role"}' \
        --output table
}

query_sessions() {
    log "Querying active sessions..."
    
    if ! table_exists "aws-devops-dev-user-sessions"; then
        error "User sessions table does not exist"
        return 1
    fi
    
    echo "Active Sessions:"
    aws dynamodb scan \
        --table-name "aws-devops-dev-user-sessions" \
        --filter-expression "#status = :status" \
        --expression-attribute-names '{"#status": "status"}' \
        --expression-attribute-values '{":status": {"S": "active"}}' \
        --projection-expression "session_id, user_id, created_at, #status" \
        --output table
}

query_content() {
    log "Querying content metadata..."
    
    if ! table_exists "aws-devops-dev-user-content-metadata"; then
        error "Content metadata table does not exist"
        return 1
    fi
    
    echo "User Content:"
    aws dynamodb scan \
        --table-name "aws-devops-dev-user-content-metadata" \
        --projection-expression "content_id, user_id, content_type, created_at" \
        --output table
}

# Clear all dev data (with confirmation)
clear_dev_data() {
    warn "⚠️  WARNING: This will DELETE ALL data in dev tables!"
    warn "This action cannot be undone without a backup."
    echo
    
    read -p "Are you absolutely sure? Type 'DELETE ALL DEV DATA' to confirm: " confirm
    if [[ "$confirm" != "DELETE ALL DEV DATA" ]]; then
        log "Clear operation cancelled"
        return 1
    fi
    
    log "Clearing all dev data..."
    
    for table in "${DEV_TABLES[@]}"; do
        if table_exists "$table"; then
            log "Clearing $table..."
            
            # Get table key schema to build proper delete keys
            local key_schema=$(aws dynamodb describe-table --table-name "$table" --query "Table.KeySchema" --output json)
            
            # Scan and delete items based on table's key schema
            aws dynamodb scan --table-name "$table" --output json | \
                jq -c '.Items[]' | \
                while read -r item; do
                    # Build delete key dynamically based on table schema
                    local delete_key=""
                    case "$table" in
                        *user-profiles)
                            delete_key='{"user_id": '"$(echo "$item" | jq '.user_id')"'}'
                            ;;
                        *user-sessions)
                            delete_key='{"session_id": '"$(echo "$item" | jq '.session_id')"'}'
                            ;;
                        *user-content-metadata)
                            delete_key='{"content_id": '"$(echo "$item" | jq '.content_id')"'}'
                            ;;
                        *application-settings)
                            delete_key='{"setting_category": '"$(echo "$item" | jq '.setting_category')"', "setting_key": '"$(echo "$item" | jq '.setting_key')"'}'
                            ;;
                        *organization-data)
                            delete_key='{"organization_id": '"$(echo "$item" | jq '.organization_id')"', "data_type": '"$(echo "$item" | jq '.data_type')"'}'
                            ;;
                        *system-logs)
                            delete_key='{"log_id": '"$(echo "$item" | jq '.log_id')"', "timestamp": '"$(echo "$item" | jq '.timestamp')"'}'
                            ;;
                    esac
                    
                    if [[ -n "$delete_key" ]]; then
                        aws dynamodb delete-item --table-name "$table" --key "$delete_key" 2>/dev/null || true
                    fi
                done
        fi
    done
    
    success "All dev data cleared"
}

# Show help
show_help() {
    cat << EOF
AI Nexus Workbench - Development Data Management Utilities
Updated to match actual Terraform DynamoDB table schemas

USAGE:
    $0 <command> [options]

COMMANDS:
    verify          - Verify all dev tables exist
    populate        - Populate dev tables with sample data matching real schemas
    backup [dir]    - Backup dev data to local directory
    restore <dir>   - Restore dev data from backup directory
    stats           - Show data statistics for all dev tables
    clear           - Clear all dev data (with confirmation)
    sync-schemas    - Compare dev and prod table schemas
    query-users     - Show user profile data
    query-sessions  - Show active user sessions
    query-content   - Show content metadata
    help            - Show this help message

EXAMPLES:
    $0 verify                           # Check if all dev tables exist
    $0 populate                         # Add realistic sample dev data
    $0 backup                           # Backup to timestamped directory
    $0 restore ./backups/dev-20250108   # Restore from specific backup
    $0 stats                            # Show current data counts
    $0 query-users                      # Show user data
    $0 clear                            # Clear all dev data
    $0 sync-schemas                     # Compare with prod schemas

ENVIRONMENT VARIABLES:
    REGION          - AWS region (default: us-east-2)
    ENV             - Environment (default: dev)

DEV TABLES (matching Terraform schemas):
$(printf '    - %s\n' "${DEV_TABLES[@]}")

TABLE SCHEMAS:
    user-profiles:          PK=user_id, GSI: email-index, organization-index
    user-sessions:          PK=session_id, GSI: user-sessions-index
    user-content-metadata:  PK=content_id, GSI: user-content-index, content-type-index, organization-content-index
    application-settings:   PK=setting_category+setting_key, GSI: updated-at-index
    organization-data:      PK=organization_id+data_type, GSI: data-type-index, created-at-index
    system-logs:            PK=log_id+timestamp, GSI: user-logs-index, event-type-index, daily-logs-index

EOF
}

# Main function
main() {
    local command="${1:-help}"
    
    case "$command" in
        verify)
            verify_dev_tables
            ;;
        populate)
            verify_dev_tables
            populate_dev_data
            ;;
        backup)
            verify_dev_tables
            backup_dev_data
            ;;
        restore)
            if [[ -z "${2:-}" ]]; then
                error "Please specify backup directory"
                echo "Usage: $0 restore <backup_directory>"
                exit 1
            fi
            verify_dev_tables
            restore_dev_data "$2"
            ;;
        stats)
            get_data_stats
            ;;
        clear)
            verify_dev_tables
            clear_dev_data
            ;;
        sync-schemas)
            sync_schemas
            ;;
        query-users)
            query_users
            ;;
        query-sessions)
            query_sessions
            ;;
        query-content)
            query_content
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
