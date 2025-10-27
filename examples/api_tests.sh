#!/bin/bash

# Cedar Agent API Test Suite
# Generated automatically by generate_docs.sh

set -e

# Configuration
BASE_URL="http://localhost:8280/v1"
API_KEY="test-key"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local expected_status="$2"
    local curl_command="$3"
    
    echo -e "${BLUE}🧪 Testing: $test_name${NC}"
    
    # Run the curl command and capture status code
    local status_code
    status_code=$(eval "$curl_command" -w "%{http_code}" -s -o /dev/null)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS: $test_name (Status: $status_code)${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL: $test_name (Expected: $expected_status, Got: $status_code)${NC}"
        ((TESTS_FAILED++))
    fi
}

echo -e "${BLUE}🚀 Cedar Agent API Test Suite${NC}"
echo "=================================="

# Test 1: Health Check
run_test "Health Check" "204" "curl -X GET $BASE_URL/"

# Test 2: Get Schema (should fail without auth)
run_test "Get Schema without auth" "401" "curl -X GET $BASE_URL/schema"

# Test 3: Get Schema with auth
run_test "Get Schema with auth" "200" "curl -H \"Authorization: $API_KEY\" $BASE_URL/schema"

# Test 4: Get Policies with auth
run_test "Get Policies with auth" "200" "curl -H \"Authorization: $API_KEY\" $BASE_URL/policies"

# Test 5: Get Data with auth
run_test "Get Data with auth" "200" "curl -H \"Authorization: $API_KEY\" $BASE_URL/data"

# Test 6: Authorization check with valid request
run_test "Authorization check" "200" "curl -X POST -H \"Content-Type: application/json\" -H \"Authorization: $API_KEY\" -d '{\"principal\": \"User::\\\"test\\\"\", \"action\": \"Action::\\\"view\\\"\", \"resource\": \"Document::\\\"test\\\"\"}' $BASE_URL/is_authorized"

# Test 7: Invalid policy creation
run_test "Invalid policy creation" "400" "curl -X POST -H \"Content-Type: application/json\" -H \"Authorization: $API_KEY\" -d '{\"id\": \"test\", \"content\": \"invalid syntax\"}' $BASE_URL/policies"

# Test 8: Non-existent policy
run_test "Non-existent policy" "404" "curl -H \"Authorization: $API_KEY\" $BASE_URL/policies/nonexistent"

echo -e "\n${BLUE}📊 Test Results${NC}"
echo "==============="
echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}💥 Some tests failed!${NC}"
    exit 1
fi
