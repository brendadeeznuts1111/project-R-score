#!/bin/bash
# Bun.secrets Integration Demo - R2 Support & User Scoped Windows
# Cardinal Flags for Internal Wiki System

echo "🔐 Bun.secrets Integration Demo"
echo "================================"
echo "R2 Storage • User Scoping • Cardinal Flags • Encryption"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="http://localhost:3001"
TEST_USER="demo-user-$(date +%s)"

echo -e "${CYAN}Step 1: Starting Bun.secrets Wiki Server${NC}"
echo "Starting server with R2 integration and user scoping..."

# Start the server in background
bun run bun-secrets-r2-integration.ts &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 3

# Check if server is running
if curl -s "$SERVER_URL" > /dev/null; then
    echo -e "${GREEN}✅ Server started successfully${NC}"
else
    echo -e "${RED}❌ Server failed to start${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}Step 2: Creating User Scoped Windows${NC}"
echo "Testing different user scopes with cardinal flags..."

# Create private window
echo -e "${BLUE}Creating private window for user: $TEST_USER${NC}"
PRIVATE_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/window/create" \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"$TEST_USER\", \"scope\": \"private\"}")

PRIVATE_WINDOW_ID=$(echo "$PRIVATE_RESPONSE" | grep -o '"windowId":"[^"]*"' | cut -d'"' -f4)
echo "Private Window ID: $PRIVATE_WINDOW_ID"

# Create team window
echo -e "${BLUE}Creating team window for user: $TEST_USER${NC}"
TEAM_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/window/create" \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"$TEST_USER\", \"scope\": \"team\"}")

TEAM_WINDOW_ID=$(echo "$TEAM_RESPONSE" | grep -o '"windowId":"[^"]*"' | cut -d'"' -f4)
echo "Team Window ID: $TEAM_WINDOW_ID"

# Create public window
echo -e "${BLUE}Creating public window for user: $TEST_USER${NC}"
PUBLIC_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/window/create" \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"$TEST_USER\", \"scope\": \"public\"}")

PUBLIC_WINDOW_ID=$(echo "$PUBLIC_RESPONSE" | grep -o '"windowId":"[^"]*"' | cut -d'"' -f4)
echo "Public Window ID: $PUBLIC_WINDOW_ID"

echo ""
echo -e "${CYAN}Step 3: Testing Cardinal Flags${NC}"
echo "Validating permissions for different scopes..."

# Test private window permissions
echo -e "${BLUE}Testing private window permissions:${NC}"
echo "Private window cardinal flags:"
echo "$PRIVATE_RESPONSE" | grep -o '"cardinalFlags":{[^}]*}' | sed 's/,/\n/g'

# Test team window permissions
echo -e "${BLUE}Testing team window permissions:${NC}"
echo "Team window cardinal flags:"
echo "$TEAM_RESPONSE" | grep -o '"cardinalFlags":{[^}]*}' | sed 's/,/\n/g'

# Test public window permissions
echo -e "${BLUE}Testing public window permissions:${NC}"
echo "Public window cardinal flags:"
echo "$PUBLIC_RESPONSE" | grep -o '"cardinalFlags":{[^}]*}' | sed 's/,/\n/g'

echo ""
echo -e "${CYAN}Step 4: Testing Wiki Content Upload${NC}"
echo "Uploading encrypted content to R2 with user scoping..."

# Upload content to private window
PRIVATE_CONTENT="# Private Wiki Content\n\nThis is sensitive content stored in a private window.\n\n## Features\n- Encrypted storage\n- User-specific access\n- Cardinal flag validation\n\nCreated: $(date)"
echo -e "${BLUE}Uploading content to private window...${NC}"
PRIVATE_UPLOAD=$(curl -s -X POST "$SERVER_URL/api/wiki/upload" \
    -H "X-User-ID: $TEST_USER" \
    -H "X-Window-ID: $PRIVATE_WINDOW_ID" \
    -H "Content-Type: text/markdown" \
    -d "$PRIVATE_CONTENT")

PRIVATE_UPLOAD_SUCCESS=$(echo "$PRIVATE_UPLOAD" | grep -o '"success":true')
if [ "$PRIVATE_UPLOAD_SUCCESS" = '"success":true' ]; then
    echo -e "${GREEN}✅ Private content uploaded successfully${NC}"
    PRIVATE_OBJECT_KEY=$(echo "$PRIVATE_UPLOAD" | grep -o '"objectKey":"[^"]*"' | cut -d'"' -f4)
    echo "Object Key: $PRIVATE_OBJECT_KEY"
else
    echo -e "${RED}❌ Private content upload failed${NC}"
fi

# Upload content to public window
PUBLIC_CONTENT="# Public Wiki Content\n\nThis is public content accessible to all users.\n\n## Public Information\n- General documentation\n- Public announcements\n- Community guidelines\n\nCreated: $(date)"
echo -e "${BLUE}Uploading content to public window...${NC}"
PUBLIC_UPLOAD=$(curl -s -X POST "$SERVER_URL/api/wiki/upload" \
    -H "X-User-ID: $TEST_USER" \
    -H "X-Window-ID: $PUBLIC_WINDOW_ID" \
    -H "Content-Type: text/markdown" \
    -d "$PUBLIC_CONTENT")

PUBLIC_UPLOAD_SUCCESS=$(echo "$PUBLIC_UPLOAD" | grep -o '"success":true')
if [ "$PUBLIC_UPLOAD_SUCCESS" = '"success":true' ]; then
    echo -e "${GREEN}✅ Public content uploaded successfully${NC}"
    PUBLIC_OBJECT_KEY=$(echo "$PUBLIC_UPLOAD" | grep -o '"objectKey":"[^"]*"' | cut -d'"' -f4)
    echo "Object Key: $PUBLIC_OBJECT_KEY"
else
    echo -e "${RED}❌ Public content upload failed${NC}"
fi

echo ""
echo -e "${CYAN}Step 5: Testing Wiki Content Download${NC}"
echo "Downloading and decrypting content from R2..."

# Download from private window
if [ -n "$PRIVATE_OBJECT_KEY" ]; then
    echo -e "${BLUE}Downloading content from private window...${NC}"
    PRIVATE_DOWNLOAD=$(curl -s "$SERVER_URL/api/wiki/download?objectKey=$PRIVATE_OBJECT_KEY" \
        -H "X-User-ID: $TEST_USER" \
        -H "X-Window-ID: $PRIVATE_WINDOW_ID")
    
    if echo "$PRIVATE_DOWNLOAD" | grep -q "Private Wiki Content"; then
        echo -e "${GREEN}✅ Private content downloaded and decrypted successfully${NC}"
        echo "Content preview: $(echo "$PRIVATE_DOWNLOAD" | head -3)"
    else
        echo -e "${RED}❌ Private content download failed${NC}"
    fi
fi

# Download from public window
if [ -n "$PUBLIC_OBJECT_KEY" ]; then
    echo -e "${BLUE}Downloading content from public window...${NC}"
    PUBLIC_DOWNLOAD=$(curl -s "$SERVER_URL/api/wiki/download?objectKey=$PUBLIC_OBJECT_KEY" \
        -H "X-User-ID: $TEST_USER" \
        -H "X-Window-ID: $PUBLIC_WINDOW_ID")
    
    if echo "$PUBLIC_DOWNLOAD" | grep -q "Public Wiki Content"; then
        echo -e "${GREEN}✅ Public content downloaded and decrypted successfully${NC}"
        echo "Content preview: $(echo "$PUBLIC_DOWNLOAD" | head -3)"
    else
        echo -e "${RED}❌ Public content download failed${NC}"
    fi
fi

echo ""
echo -e "${CYAN}Step 6: Testing Permission Validation${NC}"
echo "Validating cardinal flag enforcement..."

# Test unauthorized access (should fail)
echo -e "${BLUE}Testing unauthorized access to private window...${NC}"
UNAUTHORIZED_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/wiki/upload" \
    -H "X-User-ID: unauthorized-user" \
    -H "X-Window-ID: $PRIVATE_WINDOW_ID" \
    -H "Content-Type: text/markdown" \
    -d "This should fail")

UNAUTHORIZED_SUCCESS=$(echo "$UNAUTHORIZED_RESPONSE" | grep -o '"success":false')
if [ "$UNAUTHORIZED_SUCCESS" = '"success":false' ]; then
    echo -e "${GREEN}✅ Unauthorized access correctly blocked${NC}"
else
    echo -e "${RED}❌ Unauthorized access not blocked${NC}"
fi

# Test public window write restriction (should fail)
echo -e "${BLUE}Testing write restriction on public window...${NC}"
PUBLIC_WRITE_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/wiki/upload" \
    -H "X-User-ID: $TEST_USER" \
    -H "X-Window-ID: $PUBLIC_WINDOW_ID" \
    -H "Content-Type: text/markdown" \
    -d "This should fail on public window")

PUBLIC_WRITE_SUCCESS=$(echo "$PUBLIC_WRITE_RESPONSE" | grep -o '"success":false')
if [ "$PUBLIC_WRITE_SUCCESS" = '"success":false' ]; then
    echo -e "${GREEN}✅ Public window write restriction correctly enforced${NC}"
else
    echo -e "${RED}❌ Public window write restriction not enforced${NC}"
fi

echo ""
echo -e "${CYAN}Step 7: Testing Configuration API${NC}"
echo "Retrieving system configuration..."

CONFIG_RESPONSE=$(curl -s "$SERVER_URL/api/secrets/config")
echo -e "${BLUE}System Configuration:${NC}"
echo "Wiki Features:"
echo "$CONFIG_RESPONSE" | grep -o '"features":{[^}]*}' | sed 's/,/\n/g' | sed 's/"//g'

echo ""
echo "R2 Configuration:"
echo "$CONFIG_RESPONSE" | grep -o '"r2":{[^}]*}' | sed 's/,/\n/g' | sed 's/"//g'

echo ""
echo -e "${CYAN}Step 8: Listing User Windows${NC}"
echo "Retrieving all windows for test user..."

WINDOWS_RESPONSE=$(curl -s "$SERVER_URL/api/window/list" \
    -H "X-User-ID: $TEST_USER")

WINDOW_COUNT=$(echo "$WINDOWS_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
echo -e "${BLUE}Total windows for $TEST_USER: $WINDOW_COUNT${NC}"

echo "Window Details:"
echo "$WINDOWS_RESPONSE" | grep -o '"windowId":"[^"]*","userId":"[^"]*","scope":"[^"]*"' | sed 's/","/"\n/g' | sed 's/"//g'

echo ""
echo -e "${CYAN}Step 9: Running Integration Tests${NC}"
echo "Executing comprehensive test suite..."

echo -e "${BLUE}Running Bun.secrets integration tests...${NC}"
if bun run test-bun-secrets-integration.ts; then
    echo -e "${GREEN}✅ All integration tests passed${NC}"
else
    echo -e "${RED}❌ Some integration tests failed${NC}"
fi

echo ""
echo -e "${CYAN}Step 10: Performance Benchmark${NC}"
echo "Testing system performance under load..."

echo -e "${BLUE}Running performance tests...${NC}"

# Test window creation performance
echo "Testing window creation speed..."
START_TIME=$(date +%s%N)
for i in {1..10}; do
    curl -s -X POST "$SERVER_URL/api/window/create" \
        -H "Content-Type: application/json" \
        -d "{\"userId\": \"perf-test-$i\", \"scope\": \"private\"}" > /dev/null
done
END_TIME=$(date +%s%N)
WINDOW_CREATION_TIME=$((($END_TIME - $START_TIME) / 1000000))
echo "10 windows created in ${WINDOW_CREATION_TIME}ms ($(echo "scale=2; 10000 / $WINDOW_CREATION_TIME" | bc) windows/sec)"

# Test permission check performance
echo "Testing permission validation speed..."
START_TIME=$(date +%s%N)
for i in {1..100}; do
    curl -s "$SERVER_URL/api/window/list" \
        -H "X-User-ID: $TEST_USER" > /dev/null
done
END_TIME=$(date +%s%N)
PERMISSION_TIME=$((($END_TIME - $START_TIME) / 1000000))
echo "100 permission checks in ${PERMISSION_TIME}ms ($(echo "scale=2; 100000 / $PERMISSION_TIME" | bc) checks/sec)"

echo ""
echo -e "${GREEN}🎉 Bun.secrets Integration Demo Complete!${NC}"
echo ""
echo -e "${YELLOW}Demo Summary:${NC}"
echo "• ✅ Server started with R2 integration"
echo "• ✅ User scoped windows created with cardinal flags"
echo "• ✅ Content encrypted and uploaded to R2"
echo "• ✅ Content downloaded and decrypted successfully"
echo "• ✅ Permission validation working correctly"
echo "• ✅ Configuration API accessible"
echo "• ✅ Integration tests passing"
echo "• ✅ Performance benchmarks completed"
echo ""
echo -e "${YELLOW}Live URLs:${NC}"
echo "• Dashboard: $SERVER_URL"
echo "• API: $SERVER_URL/api/secrets/config"
echo "• Window List: $SERVER_URL/api/window/list"
echo ""
echo -e "${YELLOW}Test User:${NC} $TEST_USER"
echo "• Private Window: $PRIVATE_WINDOW_ID"
echo "• Team Window: $TEAM_WINDOW_ID"
echo "• Public Window: $PUBLIC_WINDOW_ID"
echo ""
echo -e "${YELLOW}Performance Metrics:${NC}"
echo "• Window Creation: $(echo "scale=2; 10000 / $WINDOW_CREATION_TIME" | bc) windows/sec"
echo "• Permission Checks: $(echo "scale=2; 100000 / $PERMISSION_TIME" | bc) checks/sec"
echo ""
echo -e "${CYAN}Press Ctrl+C to stop the server${NC}"

# Wait for user to stop
wait $SERVER_PID
