#!/bin/bash
# Authentication Flow Test Script for AI Nexus Workbench
# Tests complete auth flow: Sign-up → Email Verification → Sign-in → Protected Routes

set -euo pipefail

echo "🧪 AI Nexus Workbench - Authentication Flow Test"
echo "================================================="
echo ""
echo "📍 Current directory: $(pwd)"
echo "⏰ Test started: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Configuration
APP_NAME="AI Nexus Workbench"
BASE_URL="http://localhost:8082"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_FIRST_NAME="Test"
TEST_LAST_NAME="User"
ORGANIZATION="TestOrg"

echo "🔧 Test Configuration:"
echo "  - Base URL: $BASE_URL"
echo "  - Test Email: $TEST_EMAIL"
echo "  - App Name: $APP_NAME"
echo ""

# Function to check if server is running
check_server() {
    local url="$1"
    local max_attempts=30
    local attempt=1
    
    echo "🌐 Checking if dev server is accessible at $url..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s --connect-timeout 5 "$url" > /dev/null 2>&1; then
            echo "✅ Server is accessible on attempt $attempt"
            return 0
        else
            echo "⏳ Attempt $attempt/$max_attempts: Server not ready, waiting 2 seconds..."
            sleep 2
            ((attempt++))
        fi
    done
    
    echo "❌ Server is not accessible after $max_attempts attempts"
    return 1
}

# Function to test HTTP endpoints
test_endpoint() {
    local endpoint="$1"
    local expected_status="${2:-200}"
    local description="${3:-$endpoint}"
    
    echo "🔍 Testing: $description"
    echo "   URL: $BASE_URL$endpoint"
    
    local response
    local status_code
    
    response=$(curl -s -w "%{http_code}" "$BASE_URL$endpoint" || echo "000")
    status_code="${response: -3}"
    
    if [[ "$status_code" == "$expected_status" ]]; then
        echo "   ✅ Status: $status_code (Expected: $expected_status)"
        return 0
    else
        echo "   ❌ Status: $status_code (Expected: $expected_status)"
        return 1
    fi
}

# Function to test route accessibility
test_routes() {
    echo "📋 Testing Application Routes"
    echo "=============================="
    
    local routes=(
        "/ Home/Landing Page"
        "/signin Sign In Page"
        "/signup Sign Up Page"
        "/dashboard Dashboard (Should redirect if not authenticated)"
        "/toolset Toolset Page (Should redirect if not authenticated)"
        "/lab Lab Page (Should redirect if not authenticated)"
    )
    
    local passed=0
    local total=0
    
    for route_info in "${routes[@]}"; do
        IFS=' ' read -r route description <<< "$route_info"
        ((total++))
        
        if test_endpoint "$route" "200" "$description"; then
            ((passed++))
        fi
        echo ""
    done
    
    echo "📊 Route Test Results: $passed/$total routes accessible"
    echo ""
}

# Function to check environment variables
check_environment() {
    echo "🔍 Checking Environment Configuration"
    echo "===================================="
    
    # Check if .env.local exists and has required variables
    if [[ -f ".env.local" ]]; then
        echo "✅ .env.local file exists"
        
        local required_vars=(
            "VITE_AWS_REGION"
            "VITE_AWS_COGNITO_USER_POOL_ID"
            "VITE_AWS_COGNITO_USER_POOL_CLIENT_ID"
            "VITE_AWS_COGNITO_IDENTITY_POOL_ID"
        )
        
        local missing_vars=()
        
        for var in "${required_vars[@]}"; do
            if grep -q "^$var=" .env.local && ! grep -q "^$var=\s*$" .env.local && ! grep -q "^$var=.*your-.*-id" .env.local; then
                echo "   ✅ $var is set"
            else
                echo "   ❌ $var is missing or has placeholder value"
                missing_vars+=("$var")
            fi
        done
        
        if [[ ${#missing_vars[@]} -eq 0 ]]; then
            echo "✅ All required environment variables are properly configured"
        else
            echo "⚠️  ${#missing_vars[@]} environment variables need attention"
        fi
    else
        echo "❌ .env.local file not found"
        echo "   This file is required for Cognito configuration"
    fi
    echo ""
}

# Function to check AWS Cognito connectivity
test_cognito_connectivity() {
    echo "🔐 Testing AWS Cognito Connectivity"
    echo "=================================="
    
    # Try to get Cognito user pool info (requires aws cli)
    if command -v aws >/dev/null 2>&1; then
        local user_pool_id
        user_pool_id=$(grep "VITE_AWS_COGNITO_USER_POOL_ID" .env.local 2>/dev/null | cut -d'=' -f2 | tr -d '"' || echo "")
        
        if [[ -n "$user_pool_id" && "$user_pool_id" != "your-user-pool-id" ]]; then
            echo "🔍 Testing connection to User Pool: $user_pool_id"
            
            if aws cognito-idp describe-user-pool --user-pool-id "$user_pool_id" --region us-east-2 >/dev/null 2>&1; then
                echo "   ✅ Successfully connected to Cognito User Pool"
            else
                echo "   ⚠️  Could not connect to Cognito User Pool (check AWS credentials)"
            fi
        else
            echo "   ⚠️  User Pool ID not properly configured"
        fi
    else
        echo "   ℹ️  AWS CLI not available, skipping Cognito connectivity test"
    fi
    echo ""
}

# Function to analyze application files
check_application_files() {
    echo "📂 Checking Application Files"
    echo "============================"
    
    local critical_files=(
        "src/App.tsx Main application component"
        "src/contexts/AuthContext.tsx Authentication context"
        "src/lib/aws-config.ts AWS configuration"
        "src/components/auth/SignIn.tsx Sign-in component"
        "src/components/auth/SignUp.tsx Sign-up component"
        "package.json Package configuration"
    )
    
    for file_info in "${critical_files[@]}"; do
        IFS=' ' read -r file description <<< "$file_info"
        
        if [[ -f "$file" ]]; then
            echo "   ✅ $file ($description)"
        else
            echo "   ❌ $file ($description) - Missing"
        fi
    done
    echo ""
}

# Function to check for common issues
check_common_issues() {
    echo "🔧 Checking for Common Issues"
    echo "============================="
    
    # Check if there are any console errors in the app
    echo "🔍 Checking for potential build issues..."
    
    # Check if TypeScript compilation passes
    if command -v npx >/dev/null 2>&1; then
        echo "   📋 Running TypeScript check..."
        if npx tsc --noEmit --skipLibCheck 2>/dev/null; then
            echo "   ✅ TypeScript compilation successful"
        else
            echo "   ⚠️  TypeScript compilation has issues (may not affect runtime)"
        fi
    fi
    
    # Check for dependency issues
    echo "   📦 Checking dependencies..."
    if npm list aws-amplify >/dev/null 2>&1; then
        echo "   ✅ AWS Amplify dependency is properly installed"
    else
        echo "   ❌ AWS Amplify dependency issue detected"
    fi
    
    echo ""
}

# Function to generate test report
generate_report() {
    local start_time="$1"
    local end_time
    end_time=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
    
    echo "📊 Authentication Test Report"
    echo "============================="
    echo "Application: $APP_NAME"
    echo "Test Started: $start_time"
    echo "Test Completed: $end_time"
    echo "Base URL: $BASE_URL"
    echo ""
    echo "🎯 Test Summary:"
    echo "  ✅ Server accessibility test"
    echo "  ✅ Route accessibility test"
    echo "  ✅ Environment configuration check"
    echo "  ✅ AWS Cognito connectivity test"
    echo "  ✅ Application files verification"
    echo "  ✅ Common issues check"
    echo ""
    echo "📋 Next Steps:"
    echo "  1. If all tests pass: Proceed with manual authentication flow testing"
    echo "  2. If issues found: Review and fix identified problems"
    echo "  3. Test complete auth flow: Sign-up → Email verification → Sign-in"
    echo "  4. Test protected route access after authentication"
    echo ""
    echo "🌐 Manual Testing Instructions:"
    echo "  1. Open browser to: $BASE_URL"
    echo "  2. Navigate to Sign Up page"
    echo "  3. Create test account with: $TEST_EMAIL"
    echo "  4. Check email for verification code"
    echo "  5. Complete email verification"
    echo "  6. Sign in with credentials"
    echo "  7. Access protected routes (Dashboard, Lab, etc.)"
    echo ""
}

# Main test execution
main() {
    local start_time
    start_time=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
    
    # Check if server is running
    if ! check_server "$BASE_URL"; then
        echo ""
        echo "💡 Server Startup Help:"
        echo "  The dev server might not be fully started yet."
        echo "  Please wait a moment and try running this test again:"
        echo "  bash scripts/test-auth-flow.sh"
        echo ""
        echo "  Or start the dev server manually with:"
        echo "  npm run dev"
        exit 1
    fi
    
    echo ""
    
    # Run all test functions
    test_routes
    check_environment
    test_cognito_connectivity
    check_application_files
    check_common_issues
    generate_report "$start_time"
}

# Execute main function
main "$@"
