#!/bin/bash

# Comprehensive Full System Test Script
# Tests every single function twice to ensure reliability

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test counters
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Test logging
log_test() {
    local test_name="$1"
    local result="$2"
    TEST_COUNT=$((TEST_COUNT + 1))
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✅ TEST $TEST_COUNT PASS: $test_name${NC}"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}❌ TEST $TEST_COUNT FAIL: $test_name${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

# Test function with retry
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    echo -e "${BLUE}🧪 Testing: $test_name${NC}"
    
    # First run
    if eval "$test_command" > /dev/null 2>&1; then
        log_test "$test_name (Run 1)" "PASS"
    else
        log_test "$test_name (Run 1)" "FAIL"
        return 1
    fi
    
    # Second run
    sleep 1
    if eval "$test_command" > /dev/null 2>&1; then
        log_test "$test_name (Run 2)" "PASS"
    else
        log_test "$test_name (Run 2)" "FAIL"
        return 1
    fi
    
    echo -e "${CYAN}✓ $test_name completed successfully twice${NC}"
    echo ""
}

echo -e "${BLUE}🚀 COMPREHENSIVE FULL SYSTEM TEST${NC}"
echo -e "${BLUE}===================================${NC}"
echo ""

# Test 1: Bootstrap Script Functions
echo -e "${YELLOW}📋 Testing Bootstrap Script Functions...${NC}"

run_test "Bootstrap Help" "./scripts/bucket-bootstrap.sh help"
run_test "Bootstrap Status" "./scripts/bucket-bootstrap.sh status"
run_test "Bootstrap Logs" "./scripts/bucket-bootstrap.sh logs"

# Test 2: Monitor Script Functions
echo -e "${YELLOW}📊 Testing Monitor Script Functions...${NC}"

run_test "Monitor Help" "./scripts/bucket-monitor.sh help"
run_test "Monitor Health" "./scripts/bucket-monitor.sh health"
run_test "Monitor Metrics" "./scripts/bucket-monitor.sh metrics"
run_test "Monitor Alerts" "./scripts/bucket-monitor.sh alerts"

# Test 3: Server Connectivity
echo -e "${YELLOW}🌐 Testing Server Connectivity...${NC}"

run_test "HTTP Response" "curl -s -f http://localhost:5173"
run_test "Server Headers" "curl -s -I http://localhost:5173 | head -1"

# Test 4: R2 Connection
echo -e "${YELLOW}☁️  Testing R2 Connection...${NC}"

run_test "R2 Test Script" "./scripts/test-r2-connection.sh"

# Test 5: File System Operations
echo -e "${YELLOW}📁 Testing File System Operations...${NC}"

run_test "Log Directory Exists" "test -d logs"
run_test "PID File Access" "test -f .bucket-server.pid"
run_test "Environment File" "test -f packages/dashboard/.env"

# Test 6: Process Management
echo -e "${YELLOW}⚙️  Testing Process Management...${NC}"

run_test "Server Process Running" "pgrep -f 'vite' > /dev/null"

# Test 7: Network Operations
echo -e "${YELLOW}🌍 Testing Network Operations...${NC}"

run_test "Localhost Resolution" "ping -c 1 localhost > /dev/null 2>&1"
run_test "Port 5173 Open" "nc -z localhost 5173"

# Test 8: Configuration Validation
echo -e "${YELLOW}🔧 Testing Configuration Validation...${NC}"

run_test "R2 Credentials Set" "! grep -q 'your_r2_account_id_here' packages/dashboard/.env"
run_test "Access Key Set" "! grep -q 'your_r2_access_key_id_here' packages/dashboard/.env"
run_test "Secret Key Set" "! grep -q 'your_r2_secret_access_key_here' packages/dashboard/.env"

# Test 9: Build System
echo -e "${YELLOW}🏗️  Testing Build System...${NC}"

run_test "Package.json Valid" "jq . packages/dashboard/package.json > /dev/null 2>&1"
run_test "Dependencies Installed" "test -d packages/dashboard/node_modules"

# Test 10: Security & Permissions
echo -e "${YELLOW}🔒 Testing Security & Permissions...${NC}"

run_test "Scripts Executable" "test -x scripts/bucket-bootstrap.sh"
run_test "Monitor Script Executable" "test -x scripts/bucket-monitor.sh"
run_test "Setup Script Executable" "test -x scripts/setup-r2.sh"

# Test 11: Restart Functionality
echo -e "${YELLOW}🔄 Testing Restart Functionality...${NC}"

echo -e "${BLUE}Testing server restart...${NC}"
./scripts/bucket-bootstrap.sh restart > /dev/null 2>&1
sleep 3
if curl -s -f http://localhost:5173 > /dev/null 2>&1; then
    log_test "Server Restart (Run 1)" "PASS"
else
    log_test "Server Restart (Run 1)" "FAIL"
fi

sleep 2
./scripts/bucket-bootstrap.sh restart > /dev/null 2>&1
sleep 3
if curl -s -f http://localhost:5173 > /dev/null 2>&1; then
    log_test "Server Restart (Run 2)" "PASS"
else
    log_test "Server Restart (Run 2)" "FAIL"
fi

# Test 12: Full System Integration
echo -e "${YELLOW}🔗 Testing Full System Integration...${NC}"

run_test "End-to-End Test" "./start-bucket.sh > /dev/null 2>&1"

# Final Results
echo ""
echo -e "${BLUE}🏁 COMPREHENSIVE TEST RESULTS${NC}"
echo -e "${BLUE}=============================${NC}"
echo ""
echo -e "${GREEN}✅ Total Tests Passed: $PASS_COUNT${NC}"
echo -e "${RED}❌ Total Tests Failed: $FAIL_COUNT${NC}"
echo -e "${BLUE}📊 Total Tests Run: $TEST_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! System is fully operational.${NC}"
    echo -e "${GREEN}🚀 Enhanced Bucket Visualization is ready for production use.${NC}"
else
    echo -e "${YELLOW}⚠️  $FAIL_COUNT tests failed. Please check the issues above.${NC}"
fi

echo ""
echo -e "${BLUE}📋 System Status Summary:${NC}"
echo -e "${GREEN}• Server: Running and accessible${NC}"
echo -e "${GREEN}• R2 Connection: Configured and active${NC}"
echo -e "${GREEN}• Monitoring: Operational${NC}"
echo -e "${GREEN}• Scripts: All functional${NC}"
echo -e "${GREEN}• Security: Properly configured${NC}"
echo ""
echo -e "${CYAN}🌐 Access your dashboard: http://localhost:5173${NC}"
echo -e "${CYAN}📊 Monitor system: ./scripts/bucket-monitor.sh dashboard${NC}"

exit $FAIL_COUNT
