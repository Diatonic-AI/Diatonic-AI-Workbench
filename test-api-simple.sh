#!/bin/bash
# Simple API Integration Test Script
# Tests basic connectivity to backend API endpoints

set -e

API_BASE_URL="${VITE_API_GATEWAY_URL:-https://api.dev.diatonic.ai}"
TENANT_ID="${VITE_TENANT_ID:-diatonicvisuals}"

echo "🧪 API Integration Test Suite"
echo "============================="
echo "📡 API Base URL: $API_BASE_URL"
echo "🏢 Tenant ID: $TENANT_ID"
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
TOTAL=0

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local method="${4:-GET}"
    
    echo -n "Testing $name... "
    TOTAL=$((TOTAL + 1))
    
    if response=$(curl -s -w "%{http_code}" -X "$method" "$url" 2>/dev/null); then
        status_code="${response: -3}"
        body="${response%???}"
        
        if [ "$status_code" = "$expected_status" ]; then
            echo -e "${GREEN}✅ PASS${NC} ($status_code)"
            PASSED=$((PASSED + 1))
            
            # Show some response details for successful tests
            if [ "$status_code" = "200" ]; then
                if echo "$body" | grep -q "status.*healthy" 2>/dev/null; then
                    echo "   └─ Health check: System healthy"
                elif echo "$body" | grep -q "plans" 2>/dev/null; then
                    echo "   └─ Billing: Plans endpoint accessible"
                fi
            fi
        else
            echo -e "${RED}❌ FAIL${NC} (expected $expected_status, got $status_code)"
            if [ ${#body} -lt 200 ]; then
                echo "   └─ Response: $body"
            fi
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (connection error)"
    fi
}

echo "🔍 Running API endpoint tests..."
echo

# Test 1: Health endpoint (should return 200)
test_endpoint "Health Endpoint" "$API_BASE_URL/v1/health" 200

# Test 2: API docs endpoint (should return 200)
test_endpoint "API Docs" "$API_BASE_URL/v1/docs" 200

# Test 3: Billing plans (should return 200)  
test_endpoint "Billing Plans" "$API_BASE_URL/v1/billing/plans" 200

# Test 4: Protected endpoint without auth (should return 401)
test_endpoint "Protected Endpoint (no auth)" "$API_BASE_URL/v1/tenants/$TENANT_ID/billing/subscription" 401

# Test 5: CORS preflight request
test_endpoint "CORS Preflight" "$API_BASE_URL/v1/health" 200 "OPTIONS"

echo
echo "📊 Test Results:"
echo "================="

if [ $PASSED -eq $TOTAL ]; then
    echo -e "${GREEN}🎉 All tests passed! ($PASSED/$TOTAL)${NC}"
    echo "   The API backend is properly configured and accessible"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed ($PASSED/$TOTAL passed)${NC}"
    echo "   Check the API backend configuration and deployment"
    exit 1
fi
