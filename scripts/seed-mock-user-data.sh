#!/bin/bash
# Mock User Data Seeding Script
# Generates and loads sanitized PII data into local DynamoDB for development

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${NODE_ENV:-development}"
FORCE_RECREATE=false
VERBOSE=false
DRY_RUN=false

# Print colored output
print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Usage information
usage() {
    cat << EOF
Mock User Data Seeding Script for AI Nexus Workbench

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV    Environment (development/staging) [default: development]
    -f, --force             Force recreate all mock data tables
    -v, --verbose           Enable verbose logging
    -d, --dry-run           Show what would be done without executing
    -h, --help             Show this help message

EXAMPLES:
    $0                      # Seed development environment with mock data
    $0 -f                   # Force recreate all mock data tables
    $0 --dry-run            # Preview what data would be created
    $0 -e staging -v        # Seed staging with verbose output

SECURITY NOTES:
    - This script only operates on local DynamoDB instances
    - All generated data is clearly marked as mock/development data
    - No real PII data is stored locally during development
    - Production environment is explicitly blocked
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_RECREATE=true
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
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Environment validation
validate_environment() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        print_error "❌ PRODUCTION ENVIRONMENT BLOCKED"
        print_error "This script is designed for development/staging only"
        print_error "Production uses real user data directly from AWS"
        exit 1
    fi
    
    if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "staging" ]]; then
        print_error "Invalid environment: $ENVIRONMENT"
        print_error "Must be 'development' or 'staging'"
        exit 1
    fi
    
    print_status "✅ Environment validation passed: $ENVIRONMENT"
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
    
    print_status "✅ Dependencies check passed"
}

# Load environment configuration
load_config() {
    print_step "Loading environment configuration..."
    
    export NODE_ENV="$ENVIRONMENT"
    
    # Load configuration using the environment config module
    if [[ ! -f "$SCRIPT_DIR/environment-config.cjs" ]]; then
        print_error "Environment configuration module not found"
        print_error "Expected: $SCRIPT_DIR/environment-config.cjs"
        exit 1
    fi
    
    local config_json="/tmp/ai-nexus-config-$$.json"
    node "$SCRIPT_DIR/environment-config.cjs" export "$config_json"
    
    # Extract configuration values
    TABLE_PREFIX=$(jq -r '.tablePrefix' "$config_json")
    DYNAMODB_ENDPOINT=$(jq -r '.dynamodb.endpoint // "none"' "$config_json")
    PII_TABLES=($(jq -r '.piiTables[]' "$config_json"))
    SYNCABLE_TABLES=($(jq -r '.syncableTables[]' "$config_json"))
    
    rm -f "$config_json"
    
    print_status "Configuration loaded:"
    print_status "  - Environment: $ENVIRONMENT"
    print_status "  - Table Prefix: $TABLE_PREFIX"
    print_status "  - Local Endpoint: $DYNAMODB_ENDPOINT"
    print_status "  - PII Tables: ${#PII_TABLES[@]}"
    print_status "  - Content Tables: ${#SYNCABLE_TABLES[@]}"
}

# Check local DynamoDB connection
check_dynamodb_connection() {
    print_step "Checking local DynamoDB connection..."
    
    if [[ "$DYNAMODB_ENDPOINT" == "none" ]]; then
        print_error "No local DynamoDB endpoint configured"
        print_error "This script requires a local DynamoDB instance"
        exit 1
    fi
    
    # Test connection
    if ! aws dynamodb list-tables --endpoint-url "$DYNAMODB_ENDPOINT" --region us-east-2 &>/dev/null; then
        print_error "Cannot connect to local DynamoDB at $DYNAMODB_ENDPOINT"
        print_error "Please ensure DynamoDB Local is running"
        print_error "Run: docker run -p 8002:8000 amazon/dynamodb-local"
        exit 1
    fi
    
    print_status "✅ Local DynamoDB connection verified"
}

# Generate mock user data
generate_mock_users() {
    local num_users=${1:-10}
    local output_file="$2"
    
    print_step "Generating $num_users mock users..."
    
    cat > "$output_file" << 'EOF'
[
EOF
    
    for ((i=0; i<num_users; i++)); do
        local comma=""
        [[ $i -lt $((num_users-1)) ]] && comma=","
        
        cat >> "$output_file" << EOF
  {
    "userId": {
      "S": "dev-user-$(printf "%04d" $((i+1)))"
    },
    "email": {
      "S": "user$((i+1000))@example.com"
    },
    "firstName": {
      "S": "$(echo "Alex Jordan Casey Riley Sage Quinn Avery Blake Cameron Dakota" | cut -d' ' -f$((i%10+1)))"
    },
    "lastName": {
      "S": "$(echo "Smith Johnson Brown Davis Miller Wilson Moore Taylor Anderson Jackson" | cut -d' ' -f$((i%10+1)))"
    },
    "createdAt": {
      "S": "$(date -u -d "$((RANDOM % 365)) days ago" +"%Y-%m-%dT%H:%M:%S.%3NZ")"
    },
    "accountStatus": {
      "S": "$(echo "active active active suspended" | cut -d' ' -f$((i%4+1)))"
    },
    "subscriptionTier": {
      "S": "$(echo "free premium enterprise" | cut -d' ' -f$((i%3+1)))"
    },
    "phoneNumber": {
      "S": "+1-555-$(printf "%04d" $((1000+i)))"
    },
    "preferences": {
      "M": {
        "theme": {"S": "$(echo "light dark auto" | cut -d' ' -f$((i%3+1)))"},
        "notifications": {"BOOL": $(echo "true false" | cut -d' ' -f$((i%2+1)))},
        "language": {"S": "en"}
      }
    },
    "_mockData": {
      "BOOL": true
    },
    "_originalDataRedacted": {
      "BOOL": true
    },
    "_generatedAt": {
      "S": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
    }
  }$comma
EOF
    done
    
    echo ']' >> "$output_file"
    print_status "✅ Mock users generated: $output_file"
}

# Generate mock user profiles
generate_mock_user_profiles() {
    local num_profiles=${1:-10}
    local output_file="$2"
    
    print_step "Generating $num_profiles mock user profiles..."
    
    cat > "$output_file" << 'EOF'
[
EOF
    
    local bios=(
        "This is sample biographical information for development purposes."
        "Mock user profile data for testing and development."
        "Generated content to protect real user information."
        "Development environment placeholder text."
        "AI enthusiast exploring the future of technology."
        "Professional developer with a passion for innovation."
        "Creative problem solver in the digital space."
        "Technology advocate and continuous learner."
    )
    
    for ((i=0; i<num_profiles; i++)); do
        local comma=""
        [[ $i -lt $((num_profiles-1)) ]] && comma=","
        
        cat >> "$output_file" << EOF
  {
    "userId": {
      "S": "dev-user-$(printf "%04d" $((i+1)))"
    },
    "profileId": {
      "S": "profile-$(printf "%04d" $((i+1)))"
    },
    "biography": {
      "S": "${bios[$((i % ${#bios[@]}))]}"
    },
    "personalWebsite": {
      "S": "https://example-$((i+1)).com"
    },
    "linkedinUrl": {
      "S": "https://linkedin.com/in/user$((i+1))"
    },
    "profileImage": {
      "S": "https://via.placeholder.com/150x150?text=User$((i+1))"
    },
    "skillsInterests": {
      "SS": ["AI", "Machine Learning", "Web Development", "Cloud Computing"]
    },
    "experienceLevel": {
      "S": "$(echo "beginner intermediate advanced expert" | cut -d' ' -f$((i%4+1)))"
    },
    "timezone": {
      "S": "$(echo "America/New_York Europe/London Asia/Tokyo" | cut -d' ' -f$((i%3+1)))"
    },
    "_mockData": {
      "BOOL": true
    },
    "_originalDataRedacted": {
      "BOOL": true
    },
    "updatedAt": {
      "S": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
    }
  }$comma
EOF
    done
    
    echo ']' >> "$output_file"
    print_status "✅ Mock user profiles generated: $output_file"
}

# Generate mock user progress data
generate_mock_user_progress() {
    local num_records=${1:-25}
    local output_file="$2"
    
    print_step "Generating $num_records mock progress records..."
    
    cat > "$output_file" << 'EOF'
[
EOF
    
    local courses=("ai-fundamentals" "ml-basics" "web-development" "cloud-computing" "data-science")
    local modules=("introduction" "basics" "intermediate" "advanced" "capstone")
    
    for ((i=0; i<num_records; i++)); do
        local comma=""
        [[ $i -lt $((num_records-1)) ]] && comma=","
        
        local user_id=$((i % 10 + 1))
        local course_idx=$((i % ${#courses[@]}))
        local module_idx=$((i % ${#modules[@]}))
        local progress=$((RANDOM % 100 + 1))
        
        cat >> "$output_file" << EOF
  {
    "userId": {
      "S": "dev-user-$(printf "%04d" $user_id)"
    },
    "progressId": {
      "S": "progress-$((i+1))"
    },
    "courseId": {
      "S": "${courses[$course_idx]}"
    },
    "moduleId": {
      "S": "${modules[$module_idx]}"
    },
    "completionPercentage": {
      "N": "$progress"
    },
    "completedLessons": {
      "NS": ["1", "2", "3"]
    },
    "timeSpentMinutes": {
      "N": "$((RANDOM % 600 + 30))"
    },
    "lastAccessedAt": {
      "S": "$(date -u -d "$((RANDOM % 30)) days ago" +"%Y-%m-%dT%H:%M:%S.%3NZ")"
    },
    "achievements": {
      "SS": ["first-lesson", "quick-learner"]
    },
    "_mockData": {
      "BOOL": true
    },
    "_generatedAt": {
      "S": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
    }
  }$comma
EOF
    done
    
    echo ']' >> "$output_file"
    print_status "✅ Mock user progress generated: $output_file"
}

# Create or update table with mock data
seed_table() {
    local table_name="$1"
    local data_file="$2"
    local description="$3"
    
    local full_table_name="${TABLE_PREFIX}-${table_name}"
    
    print_step "Seeding table: $full_table_name ($description)"
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY-RUN] Would seed $full_table_name with data from $data_file"
        local item_count=$(jq length "$data_file")
        print_status "[DRY-RUN] Items to load: $item_count"
        return 0
    fi
    
    # Check if table exists
    if ! aws dynamodb describe-table \
        --table-name "$full_table_name" \
        --endpoint-url "$DYNAMODB_ENDPOINT" \
        --region us-east-2 &>/dev/null; then
        print_warning "Table $full_table_name does not exist, skipping..."
        return 0
    fi
    
    # Clear existing data if force recreate
    if [[ "$FORCE_RECREATE" == true ]]; then
        print_step "Force recreate enabled, clearing existing data..."
        
        # Scan and delete all items (use with caution)
        local items=$(aws dynamodb scan \
            --table-name "$full_table_name" \
            --endpoint-url "$DYNAMODB_ENDPOINT" \
            --region us-east-2 \
            --projection-expression "$(get_key_attributes "$table_name")" \
            --query "Items[]")
        
        if [[ "$items" != "[]" && "$items" != "null" ]]; then
            echo "$items" | jq -r '.[] | [.[]] | @json' | while IFS= read -r key; do
                aws dynamodb delete-item \
                    --table-name "$full_table_name" \
                    --endpoint-url "$DYNAMODB_ENDPOINT" \
                    --region us-east-2 \
                    --key "$key" &>/dev/null
            done
        fi
        
        print_status "Existing data cleared from $full_table_name"
    fi
    
    # Load mock data
    local item_count=$(jq length "$data_file")
    print_step "Loading $item_count mock items into $full_table_name..."
    
    # Batch write items (DynamoDB supports up to 25 items per batch)
    local batch_size=25
    local total_batches=$(( (item_count + batch_size - 1) / batch_size ))
    
    for ((batch=0; batch<total_batches; batch++)); do
        local start_idx=$((batch * batch_size))
        local batch_items=$(jq ".[$start_idx:$((start_idx + batch_size))]" "$data_file")
        
        # Create batch write request
        local batch_request=$(cat << EOF
{
  "$full_table_name": $(echo "$batch_items" | jq '[.[] | {"PutRequest": {"Item": .}}]')
}
EOF
)
        
        if [[ "$VERBOSE" == true ]]; then
            print_status "Processing batch $((batch + 1))/$total_batches"
        fi
        
        aws dynamodb batch-write-item \
            --endpoint-url "$DYNAMODB_ENDPOINT" \
            --region us-east-2 \
            --request-items "$batch_request" &>/dev/null
    done
    
    print_status "✅ Successfully seeded $item_count items into $full_table_name"
}

# Get primary key attributes for a table (simplified for this example)
get_key_attributes() {
    local table_name="$1"
    case "$table_name" in
        "users"|"user-profiles")
            echo "userId"
            ;;
        "user-progress")
            echo "userId,progressId"
            ;;
        *)
            echo "id"
            ;;
    esac
}

# Generate and seed all mock data
seed_all_mock_data() {
    print_step "🌱 Starting mock data generation and seeding..."
    
    local temp_dir="/tmp/ai-nexus-mock-data-$$"
    mkdir -p "$temp_dir"
    
    print_status "Using temporary directory: $temp_dir"
    
    # Generate mock data files
    generate_mock_users 10 "$temp_dir/users.json"
    generate_mock_user_profiles 10 "$temp_dir/user-profiles.json"
    generate_mock_user_progress 25 "$temp_dir/user-progress.json"
    
    # Seed tables
    seed_table "users" "$temp_dir/users.json" "User accounts"
    seed_table "user-profiles" "$temp_dir/user-profiles.json" "User profiles"
    seed_table "user-progress" "$temp_dir/user-progress.json" "Learning progress"
    
    # Clean up temporary files unless verbose mode
    if [[ "$VERBOSE" != true ]]; then
        rm -rf "$temp_dir"
        print_status "Temporary files cleaned up"
    else
        print_status "Mock data files preserved in: $temp_dir"
    fi
    
    print_status "🎉 Mock data seeding completed successfully!"
}

# Verify seeded data
verify_seeded_data() {
    print_step "🔍 Verifying seeded mock data..."
    
    for table in "${PII_TABLES[@]}"; do
        local full_table_name="${TABLE_PREFIX}-${table}"
        
        # Check if table exists
        if ! aws dynamodb describe-table \
            --table-name "$full_table_name" \
            --endpoint-url "$DYNAMODB_ENDPOINT" \
            --region us-east-2 &>/dev/null; then
            continue
        fi
        
        local item_count=$(aws dynamodb scan \
            --table-name "$full_table_name" \
            --endpoint-url "$DYNAMODB_ENDPOINT" \
            --region us-east-2 \
            --select "COUNT" \
            --query "Count")
        
        local mock_count=$(aws dynamodb scan \
            --table-name "$full_table_name" \
            --endpoint-url "$DYNAMODB_ENDPOINT" \
            --region us-east-2 \
            --filter-expression "attribute_exists(#mock)" \
            --expression-attribute-names '{"#mock": "_mockData"}' \
            --select "COUNT" \
            --query "Count")
        
        print_status "$full_table_name: $item_count total items ($mock_count mock)"
    done
    
    print_status "✅ Data verification completed"
}

# Show summary
show_summary() {
    print_step "📋 Mock Data Seeding Summary"
    print_status "Environment: $ENVIRONMENT"
    print_status "Table Prefix: $TABLE_PREFIX"
    print_status "Local DynamoDB: $DYNAMODB_ENDPOINT"
    print_status "PII Tables: ${#PII_TABLES[@]} tables configured for mock data"
    print_status "Force Recreate: $FORCE_RECREATE"
    print_status "Dry Run: $DRY_RUN"
    
    print_status ""
    print_status "🔒 SECURITY REMINDER:"
    print_status "- All data generated is clearly marked as mock/development data"
    print_status "- No real PII information is stored locally"
    print_status "- Production environment is blocked from this script"
    print_status "- Mock data should never be used in production"
}

# Main execution
main() {
    print_status "🌱 AI Nexus Workbench - Mock User Data Seeder"
    print_status "=============================================="
    
    # Validation and setup
    validate_environment
    check_dependencies
    load_config
    check_dynamodb_connection
    
    # Show configuration
    show_summary
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status ""
        print_status "🔍 DRY RUN MODE - No changes will be made"
    fi
    
    # Confirmation for non-dry-run
    if [[ "$DRY_RUN" != true && "$FORCE_RECREATE" == true ]]; then
        print_warning "⚠️  FORCE RECREATE is enabled - existing mock data will be deleted"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Aborted by user"
            exit 0
        fi
    fi
    
    # Execute seeding
    seed_all_mock_data
    
    # Verify results
    if [[ "$DRY_RUN" != true ]]; then
        verify_seeded_data
    fi
    
    print_status "✅ Mock data seeding process completed"
}

# Execute main function
main "$@"
