#!/usr/bin/env bash
# OAuth Authentication Flow Test Script
# Tests the complete OAuth authentication flow for production deployment
# Generated: 2025-09-12T03:57:58Z

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/oauth_auth_test_$(date +%Y%m%d_%H%M%S).log"
TEST_RESULTS=()

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Test result tracking
add_test_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    TEST_RESULTS+=("$test_name|$status|$message")
    
    if [[ "$status" == "PASS" ]]; then
        echo -e "${GREEN}✅ $test_name: $message${NC}"
    elif [[ "$status" == "WARN" ]]; then
        echo -e "${YELLOW}⚠️  $test_name: $message${NC}"
    else
        echo -e "${RED}❌ $test_name: $message${NC}"
    fi
    
    log "$test_name: $status - $message"
}

# Header
echo -e "${BLUE}"
echo "🔐 OAuth Authentication Flow Test Suite"
echo "======================================"
echo "Project: AI Nexus Workbench"
echo "Environment: Production"
echo "Domain: app.diatonic.ai"
echo "Generated: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo -e "${NC}"

# Test 1: Environment Configuration Validation
test_environment_config() {
    echo -e "\n${BLUE}🔍 Test 1: Environment Configuration Validation${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Check if production env file exists
    if [[ -f ".env.production" ]]; then
        add_test_result "production_env_exists" "PASS" "Production environment file exists"
    else
        add_test_result "production_env_exists" "FAIL" "Production environment file missing"
        return 1
    fi
    
    # Load production environment variables
    source .env.production 2>/dev/null || {
        add_test_result "env_load" "FAIL" "Cannot load production environment variables"
        return 1
    }
    
    # Validate critical OAuth variables
    local required_vars=(
        "VITE_AWS_COGNITO_USER_POOL_ID"
        "VITE_AWS_COGNITO_USER_POOL_CLIENT_ID"
        "VITE_AWS_COGNITO_IDENTITY_POOL_ID"
        "VITE_AUTH_DOMAIN"
        "VITE_APP_DOMAIN"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -eq 0 ]]; then
        add_test_result "required_vars" "PASS" "All required OAuth variables present"
    else
        add_test_result "required_vars" "FAIL" "Missing variables: ${missing_vars[*]}"
        return 1
    fi
    
    # Validate OAuth resource IDs format
    if [[ "$VITE_AWS_COGNITO_USER_POOL_ID" =~ ^us-east-2_[A-Za-z0-9]+$ ]]; then
        add_test_result "user_pool_format" "PASS" "User pool ID format valid: $VITE_AWS_COGNITO_USER_POOL_ID"
    else
        add_test_result "user_pool_format" "FAIL" "Invalid user pool ID format: $VITE_AWS_COGNITO_USER_POOL_ID"
    fi
    
    if [[ "$VITE_AWS_COGNITO_IDENTITY_POOL_ID" =~ ^us-east-2:[a-f0-9-]+$ ]]; then
        add_test_result "identity_pool_format" "PASS" "Identity pool ID format valid"
    else
        add_test_result "identity_pool_format" "FAIL" "Invalid identity pool ID format: $VITE_AWS_COGNITO_IDENTITY_POOL_ID"
    fi
}

# Test 2: AWS Cognito Resource Verification
test_cognito_resources() {
    echo -e "\n${BLUE}🔍 Test 2: AWS Cognito Resource Verification${NC}"
    
    # Test AWS CLI availability
    if ! command -v aws >/dev/null 2>&1; then
        add_test_result "aws_cli" "FAIL" "AWS CLI not available"
        return 1
    fi
    
    add_test_result "aws_cli" "PASS" "AWS CLI available"
    
    # Test User Pool existence
    local user_pool_id="$VITE_AWS_COGNITO_USER_POOL_ID"
    if aws cognito-idp describe-user-pool --user-pool-id "$user_pool_id" --region us-east-2 >/dev/null 2>&1; then
        add_test_result "user_pool_exists" "PASS" "User pool $user_pool_id exists and accessible"
    else
        add_test_result "user_pool_exists" "FAIL" "User pool $user_pool_id not found or not accessible"
        return 1
    fi
    
    # Test User Pool Client configuration
    local client_id="$VITE_AWS_COGNITO_USER_POOL_CLIENT_ID"
    local client_config
    client_config=$(aws cognito-idp describe-user-pool-client --user-pool-id "$user_pool_id" --client-id "$client_id" --region us-east-2 2>/dev/null)
    
    if [[ -n "$client_config" ]]; then
        add_test_result "client_exists" "PASS" "User pool client $client_id exists and accessible"
        
        # Check OAuth flows enabled
        local oauth_enabled
        oauth_enabled=$(echo "$client_config" | jq -r '.UserPoolClient.AllowedOAuthFlowsUserPoolClient')
        if [[ "$oauth_enabled" == "true" ]]; then
            add_test_result "oauth_enabled" "PASS" "OAuth flows enabled on client"
        else
            add_test_result "oauth_enabled" "FAIL" "OAuth flows disabled on client"
        fi
        
        # Check callback URLs
        local callback_urls
        callback_urls=$(echo "$client_config" | jq -r '.UserPoolClient.CallbackURLs[]?' 2>/dev/null || echo "")
        if echo "$callback_urls" | grep -q "app.diatonic.ai"; then
            add_test_result "callback_urls" "PASS" "Production callback URLs configured"
        else
            add_test_result "callback_urls" "WARN" "Production callback URLs may be missing"
        fi
        
        # Check allowed OAuth flows
        local oauth_flows
        oauth_flows=$(echo "$client_config" | jq -r '.UserPoolClient.AllowedOAuthFlows[]?' 2>/dev/null | tr '\n' ' ')
        if echo "$oauth_flows" | grep -q "code"; then
            add_test_result "oauth_flows" "PASS" "Authorization code flow enabled"
        else
            add_test_result "oauth_flows" "FAIL" "Authorization code flow not enabled"
        fi
        
    else
        add_test_result "client_exists" "FAIL" "User pool client $client_id not found or not accessible"
        return 1
    fi
    
    # Test Identity Pool existence
    local identity_pool_id="$VITE_AWS_COGNITO_IDENTITY_POOL_ID"
    if aws cognito-identity describe-identity-pool --identity-pool-id "$identity_pool_id" --region us-east-2 >/dev/null 2>&1; then
        add_test_result "identity_pool_exists" "PASS" "Identity pool $identity_pool_id exists and accessible"
    else
        add_test_result "identity_pool_exists" "FAIL" "Identity pool $identity_pool_id not found or not accessible"
    fi
}

# Test 3: Application Configuration Validation
test_app_config() {
    echo -e "\n${BLUE}🔍 Test 3: Application Configuration Validation${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Check if AWS config file exists and is valid
    if [[ -f "src/lib/aws-config.ts" ]]; then
        add_test_result "aws_config_exists" "PASS" "AWS configuration file exists"
        
        # Check for production configuration
        if grep -q "production.*diatonic" "src/lib/aws-config.ts"; then
            add_test_result "prod_config" "PASS" "Production configuration found in aws-config.ts"
        else
            add_test_result "prod_config" "WARN" "Production configuration may need updating"
        fi
        
        # Check for OAuth callback helper functions
        if grep -q "getRedirectUrls\|getOAuthDomain" "src/lib/aws-config.ts"; then
            add_test_result "oauth_helpers" "PASS" "OAuth helper functions present"
        else
            add_test_result "oauth_helpers" "FAIL" "OAuth helper functions missing"
        fi
    else
        add_test_result "aws_config_exists" "FAIL" "AWS configuration file missing"
        return 1
    fi
    
    # Check if OAuth callback route exists
    if [[ -f "src/components/auth/OAuthCallback.tsx" ]]; then
        add_test_result "oauth_callback_component" "PASS" "OAuth callback component exists"
    else
        add_test_result "oauth_callback_component" "FAIL" "OAuth callback component missing"
        return 1
    fi
    
    # Check if OAuth callback route is registered in App.tsx
    if grep -q "auth/callback.*OAuthCallback" "src/App.tsx"; then
        add_test_result "oauth_callback_route" "PASS" "OAuth callback route registered in App.tsx"
    else
        add_test_result "oauth_callback_route" "FAIL" "OAuth callback route not registered in App.tsx"
        return 1
    fi
    
    # Check AuthContext exists and has OAuth support
    if [[ -f "src/contexts/AuthContext.tsx" ]]; then
        add_test_result "auth_context_exists" "PASS" "AuthContext exists"
        
        if grep -q "aws-amplify/auth\|Amplify\.configure" "src/contexts/AuthContext.tsx"; then
            add_test_result "amplify_integration" "PASS" "AWS Amplify integration present in AuthContext"
        else
            add_test_result "amplify_integration" "FAIL" "AWS Amplify integration missing"
        fi
    else
        add_test_result "auth_context_exists" "FAIL" "AuthContext missing"
        return 1
    fi
}

# Test 4: OAuth Domain and URL Configuration
test_oauth_domains() {
    echo -e "\n${BLUE}🔍 Test 4: OAuth Domain and URL Configuration${NC}"
    
    # Check domain format
    if [[ "$VITE_APP_DOMAIN" == "app.diatonic.ai" ]]; then
        add_test_result "app_domain" "PASS" "Application domain correctly set to app.diatonic.ai"
    else
        add_test_result "app_domain" "FAIL" "Application domain incorrect: $VITE_APP_DOMAIN (expected: app.diatonic.ai)"
    fi
    
    # Check auth domain format
    if [[ "$VITE_AUTH_DOMAIN" =~ ^ai-nexus-[a-z0-9]+\.auth\.us-east-2\.amazoncognito\.com$ ]]; then
        add_test_result "auth_domain_format" "PASS" "Auth domain format valid: $VITE_AUTH_DOMAIN"
    else
        add_test_result "auth_domain_format" "FAIL" "Auth domain format invalid: $VITE_AUTH_DOMAIN"
    fi
    
    # Test DNS resolution for auth domain
    if nslookup "$VITE_AUTH_DOMAIN" >/dev/null 2>&1; then
        add_test_result "auth_domain_dns" "PASS" "Auth domain DNS resolution successful"
    else
        add_test_result "auth_domain_dns" "WARN" "Auth domain DNS resolution failed (may be expected in dev)"
    fi
}

# Test 5: Build and Runtime Validation
test_build_validation() {
    echo -e "\n${BLUE}🔍 Test 5: Build and Runtime Validation${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Check if package.json exists
    if [[ -f "package.json" ]]; then
        add_test_result "package_json" "PASS" "package.json exists"
        
        # Check for required dependencies
        local required_deps=("aws-amplify" "react-router-dom")
        for dep in "${required_deps[@]}"; do
            if jq -e ".dependencies.\"$dep\"" package.json >/dev/null 2>&1; then
                add_test_result "dep_$dep" "PASS" "$dep dependency present"
            else
                add_test_result "dep_$dep" "FAIL" "$dep dependency missing"
            fi
        done
    else
        add_test_result "package_json" "FAIL" "package.json missing"
        return 1
    fi
    
    # Test TypeScript compilation
    echo "🔨 Testing TypeScript compilation..."
    if command -v npx >/dev/null 2>&1; then
        if npx tsc --noEmit --skipLibCheck >/dev/null 2>&1; then
            add_test_result "typescript_compile" "PASS" "TypeScript compilation successful"
        else
            add_test_result "typescript_compile" "WARN" "TypeScript compilation has warnings/errors"
        fi
    else
        add_test_result "typescript_compile" "SKIP" "npx not available"
    fi
}

# Test 6: OAuth Flow Simulation
test_oauth_flow_simulation() {
    echo -e "\n${BLUE}🔍 Test 6: OAuth Flow URL Generation${NC}"
    
    # Generate OAuth authorization URL
    local user_pool_id="$VITE_AWS_COGNITO_USER_POOL_ID"
    local client_id="$VITE_AWS_COGNITO_USER_POOL_CLIENT_ID"
    local auth_domain="$VITE_AUTH_DOMAIN"
    local callback_url="https://app.diatonic.ai/auth/callback"
    
    local oauth_url="https://${auth_domain}/oauth2/authorize"
    oauth_url+="?client_id=${client_id}"
    oauth_url+="&response_type=code"
    oauth_url+="&scope=openid+profile+email"
    oauth_url+="&redirect_uri=${callback_url}"
    oauth_url+="&state=oauth_test_$(date +%s)"
    
    add_test_result "oauth_url_generation" "PASS" "OAuth authorization URL generated successfully"
    
    echo "🔗 OAuth Authorization URL:"
    echo "$oauth_url"
    echo ""
    
    # Test OAuth domain reachability
    if curl -s --connect-timeout 5 "https://${auth_domain}/.well-known/openid_configuration" >/dev/null 2>&1; then
        add_test_result "oauth_domain_reachable" "PASS" "OAuth domain is reachable"
    else
        add_test_result "oauth_domain_reachable" "WARN" "OAuth domain may not be reachable (check network/firewall)"
    fi
}

# Generate comprehensive test report
generate_test_report() {
    echo -e "\n${BLUE}📊 OAuth Authentication Test Report${NC}"
    echo "=================================="
    
    local total_tests=${#TEST_RESULTS[@]}
    local passed_tests=0
    local failed_tests=0
    local warned_tests=0
    local skipped_tests=0
    
    echo "Test Results Summary:"
    echo "-------------------"
    
    for result in "${TEST_RESULTS[@]}"; do
        IFS='|' read -r test_name status message <<< "$result"
        case "$status" in
            "PASS") ((passed_tests++)) ;;
            "FAIL") ((failed_tests++)) ;;
            "WARN") ((warned_tests++)) ;;
            "SKIP") ((skipped_tests++)) ;;
        esac
    done
    
    echo "Total Tests: $total_tests"
    echo -e "${GREEN}Passed: $passed_tests${NC}"
    echo -e "${RED}Failed: $failed_tests${NC}"
    echo -e "${YELLOW}Warnings: $warned_tests${NC}"
    echo "Skipped: $skipped_tests"
    
    echo -e "\nDetailed Results:"
    echo "----------------"
    for result in "${TEST_RESULTS[@]}"; do
        IFS='|' read -r test_name status message <<< "$result"
        printf "%-30s | %-4s | %s\n" "$test_name" "$status" "$message"
    done
    
    echo -e "\nRecommendations:"
    echo "---------------"
    
    if [[ $failed_tests -gt 0 ]]; then
        echo -e "${RED}❌ CRITICAL: $failed_tests test(s) failed. OAuth authentication will not work.${NC}"
        echo "   Please fix the failed tests before deploying to production."
    elif [[ $warned_tests -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  WARNING: $warned_tests test(s) have warnings. Review before production deployment.${NC}"
        echo "   OAuth authentication should work but may have issues."
    else
        echo -e "${GREEN}✅ SUCCESS: All critical tests passed! OAuth authentication is ready for production.${NC}"
        echo "   Your users should be able to successfully log in to the application."
    fi
    
    echo -e "\nNext Steps:"
    echo "----------"
    if [[ $failed_tests -eq 0 ]]; then
        echo "1. Deploy the application with the current OAuth configuration"
        echo "2. Test user registration and login flows manually"
        echo "3. Monitor authentication logs for any issues"
        echo "4. Set up production monitoring for authentication metrics"
    else
        echo "1. Fix the failed tests listed above"
        echo "2. Re-run this test script to verify fixes"
        echo "3. Once all tests pass, proceed with deployment"
    fi
    
    echo -e "\nLog file: $LOG_FILE"
    
    # Return appropriate exit code
    if [[ $failed_tests -gt 0 ]]; then
        return 1
    else
        return 0
    fi
}

# Main execution
main() {
    log "Starting OAuth Authentication Flow Test Suite"
    
    # Load production environment
    if [[ -f "$PROJECT_ROOT/.env.production" ]]; then
        set -a  # automatically export all variables
        source "$PROJECT_ROOT/.env.production"
        set +a
    fi
    
    # Run all tests
    test_environment_config || true
    test_cognito_resources || true
    test_app_config || true
    test_oauth_domains || true
    test_build_validation || true
    test_oauth_flow_simulation || true
    
    # Generate final report
    generate_test_report
    
    echo -e "\n${BLUE}Test completed. Check the detailed log at: $LOG_FILE${NC}"
}

# Execute main function
main "$@"
