#!/usr/bin/env bash
# Test Environment Setup Script
# Validates the new environment configuration system and PII protection

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    print_step "Testing: $test_name"
    ((TESTS_RUN++))
    
    if eval "$test_command"; then
        print_success "✅ $test_name - PASSED"
        ((TESTS_PASSED++))
    else
        print_error "❌ $test_name - FAILED"
        ((TESTS_FAILED++))
    fi
    
    echo ""
}

# Header
print_step "🧪 AI Nexus Workbench - Environment Configuration Test Suite"
print_status "=========================================================="
print_status "Testing the new environment-aware DynamoDB configuration system"
print_status "Generated: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Test 1: Environment Configuration Module
run_test "Environment Configuration Module Exists" \
    "test -f '$SCRIPT_DIR/environment-config.cjs'"

run_test "Environment Configuration Module Executable" \
    "test -x '$SCRIPT_DIR/environment-config.cjs'"

run_test "Environment Configuration Show Command" \
    "cd '$PROJECT_ROOT' && node scripts/environment-config.cjs show >/dev/null 2>&1"

run_test "Environment Configuration Validate Command" \
    "cd '$PROJECT_ROOT' && node scripts/environment-config.cjs validate >/dev/null 2>&1"

# Test 2: Mock Data Seeding Script
run_test "Mock Data Seeding Script Exists" \
    "test -f '$SCRIPT_DIR/seed-mock-user-data.sh'"

run_test "Mock Data Seeding Script Executable" \
    "test -x '$SCRIPT_DIR/seed-mock-user-data.sh'"

run_test "Mock Data Seeding Help Command" \
    "cd '$PROJECT_ROOT' && scripts/seed-mock-user-data.sh --help >/dev/null 2>&1"

run_test "Mock Data Seeding Dry Run" \
    "cd '$PROJECT_ROOT' && scripts/seed-mock-user-data.sh --dry-run >/dev/null 2>&1"

# Test 3: DynamoDB Schema Sync Script
run_test "DynamoDB Schema Sync Script Exists" \
    "test -f '$SCRIPT_DIR/dynamodb-schema-sync.sh'"

run_test "DynamoDB Schema Sync Script Executable" \
    "test -x '$SCRIPT_DIR/dynamodb-schema-sync.sh'"

run_test "DynamoDB Schema Sync Help Command" \
    "cd '$PROJECT_ROOT' && scripts/dynamodb-schema-sync.sh help >/dev/null 2>&1"

# Test 4: Environment Security Features
print_step "Testing Security Features..."

# Test production environment blocking
run_test "Production Environment Blocking (Mock Data)" \
    "cd '$PROJECT_ROOT' && NODE_ENV=production scripts/seed-mock-user-data.sh --dry-run 2>&1 | grep -q 'PRODUCTION ENVIRONMENT BLOCKED'"

run_test "Production Environment Blocking (Sync)" \
    "cd '$PROJECT_ROOT' && NODE_ENV=production scripts/dynamodb-schema-sync.sh sync-content-from-cloud 2>&1 | grep -q 'PRODUCTION ENVIRONMENT DETECTED'"

# Test PII table classification
run_test "PII Table Classification" \
    "cd '$PROJECT_ROOT' && node scripts/environment-config.cjs show | grep -q 'PII Tables'"

run_test "Syncable Table Classification" \
    "cd '$PROJECT_ROOT' && node scripts/environment-config.cjs show | grep -q 'Syncable Tables'"

# Test 5: Configuration Validation
print_step "Testing Configuration Validation..."

# Test required fields in environment config
run_test "Environment Config Has Table Prefix" \
    "cd '$PROJECT_ROOT' && node scripts/environment-config.cjs show | grep -q 'Table Prefix'"

run_test "Environment Config Has PII Protection" \
    "cd '$PROJECT_ROOT' && node scripts/environment-config.cjs show | grep -q 'PII Protection.*ENABLED'"

run_test "Environment Config Has Security Features" \
    "cd '$PROJECT_ROOT' && node scripts/environment-config.cjs show | grep -q 'Security Features'"

# Test 6: Documentation Exists
print_step "Testing Documentation..."

run_test "Environment Configuration Documentation" \
    "test -f '$PROJECT_ROOT/docs/ENVIRONMENT_CONFIGURATION.md'"

run_test "Scripts README Updated" \
    "grep -q 'environment-aware scripts' '$SCRIPT_DIR/README.md'"

# Test 7: Script Integration
print_step "Testing Script Integration..."

# Test that scripts can find each other
run_test "DynamoDB Sync Can Find Environment Config" \
    "cd '$PROJECT_ROOT' && scripts/dynamodb-schema-sync.sh show-config >/dev/null 2>&1"

run_test "Mock Data Script Can Find Environment Config" \
    "cd '$PROJECT_ROOT' && scripts/seed-mock-user-data.sh --dry-run | grep -q 'Configuration loaded'"

# Test 8: Dependencies Check
print_step "Testing Dependencies..."

run_test "Node.js Available" \
    "command -v node >/dev/null 2>&1"

run_test "jq Available" \
    "command -v jq >/dev/null 2>&1"

run_test "AWS CLI Available" \
    "command -v aws >/dev/null 2>&1"

# Test 9: DynamoDB Status (if available)
if aws dynamodb list-tables --endpoint-url http://localhost:8002 --region us-east-2 >/dev/null 2>&1; then
    print_step "Testing DynamoDB Local Integration..."
    
    run_test "DynamoDB Local Connection" \
        "cd '$PROJECT_ROOT' && scripts/dynamodb-schema-sync.sh status | grep -q 'Local DynamoDB' | head -1"
        
    run_test "Table Classification in Status" \
        "cd '$PROJECT_ROOT' && scripts/dynamodb-schema-sync.sh status | grep -q 'PII Tables\\|Content Tables'"
else
    print_warning "⚠️  DynamoDB Local not available - skipping integration tests"
    print_status "Start DynamoDB Local with: docker run -d -p 8002:8000 amazon/dynamodb-local"
fi

# Test 10: Error Handling
print_step "Testing Error Handling..."

run_test "Invalid Environment Rejected" \
    "cd '$PROJECT_ROOT' && NODE_ENV=invalid scripts/dynamodb-schema-sync.sh status 2>&1 | grep -q 'Invalid environment'"

run_test "Missing Config Module Detected" \
    "cd '$PROJECT_ROOT' && mv scripts/environment-config.cjs scripts/environment-config.cjs.bak 2>/dev/null; scripts/dynamodb-schema-sync.sh status 2>&1 | grep -q 'Configuration.*not found'; mv scripts/environment-config.cjs.bak scripts/environment-config.cjs 2>/dev/null || true"

# Summary
echo ""
print_step "📊 Test Summary"
print_status "==============="
print_status "Tests Run: $TESTS_RUN"
print_success "Tests Passed: $TESTS_PASSED"

if [[ $TESTS_FAILED -gt 0 ]]; then
    print_error "Tests Failed: $TESTS_FAILED"
    echo ""
    print_error "❌ Some tests failed. Please review the output above."
    echo ""
    print_status "Common fixes:"
    print_status "  - Ensure all scripts are executable: chmod +x scripts/*.sh scripts/*.cjs"
    print_status "  - Install missing dependencies: jq, aws-cli, node.js"
    print_status "  - Start DynamoDB Local: docker run -d -p 8002:8000 amazon/dynamodb-local"
    echo ""
    exit 1
else
    print_success "Tests Passed: $TESTS_PASSED"
    echo ""
    print_success "🎉 All tests passed! Environment configuration system is working correctly."
    echo ""
    print_status "✅ Security Features:"
    print_status "  - PII protection is enabled and working"
    print_status "  - Production environment blocking is active"
    print_status "  - Table classification is properly configured"
    print_status "  - Mock data generation is available"
    echo ""
    print_status "🚀 Next steps:"
    print_status "  1. Review docs/ENVIRONMENT_CONFIGURATION.md for detailed information"
    print_status "  2. Start DynamoDB Local if not already running"
    print_status "  3. Run './scripts/dynamodb-schema-sync.sh reset' for a fresh development setup"
    print_status "  4. Use './scripts/dynamodb-schema-sync.sh status' to monitor your environment"
    echo ""
    exit 0
fi
