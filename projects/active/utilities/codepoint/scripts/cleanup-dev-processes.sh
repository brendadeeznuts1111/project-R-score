#!/bin/bash
# cleanup-dev-processes.sh - Clean up development processes and ports

echo "🧹 Development Process Cleanup"
echo "============================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check for development processes
echo -e "\n${BLUE}🔍 Scanning for development processes...${NC}"
DEV_PROCESSES=$(ps aux | grep -E "(bun.*test|bun.*dev|bun.*serve|vite|node.*dev)" | grep -v grep | grep -v "Windsurf\|Cursor")

if [ -z "$DEV_PROCESSES" ]; then
    print_status "No development processes found"
else
    echo -e "${YELLOW}📊 Found development processes:${NC}"
    echo "$DEV_PROCESSES" | while read line; do
        PID=$(echo $line | awk '{print $2}')
        CMD=$(echo $line | awk '{for(i=11;i<=NF;i++) printf $i" "; print ""}')
        echo "   PID: $PID - $CMD"
    done

    # Extract PIDs
    PIDS=$(echo "$DEV_PROCESSES" | awk '{print $2}' | tr '\n' ' ')

    echo -e "\n${YELLOW}🗑️  Terminating development processes...${NC}"
    if kill $PIDS 2>/dev/null; then
        print_status "Sent termination signals to processes"
        sleep 2

        # Force kill if still running
        REMAINING=$(ps aux | grep -E "(bun.*test|bun.*dev|bun.*serve|vite|node.*dev)" | grep -v grep | grep -v "Windsurf\|Cursor" | awk '{print $2}' | tr '\n' ' ')
        if [ ! -z "$REMAINING" ]; then
            print_warning "Some processes still running, force killing..."
            kill -9 $REMAINING 2>/dev/null
        fi
    else
        print_error "Failed to terminate processes"
    fi
fi

# Check development ports
echo -e "\n${BLUE}🔍 Checking development ports...${NC}"
PORTS="3000 5555 8000 4000 5000 8080 3001"
PORTS_IN_USE=""

for port in $PORTS; do
    if lsof -i :$port 2>/dev/null | grep -q LISTEN; then
        PORTS_IN_USE="$PORTS_IN_USE $port"
        echo -e "${RED}🔴 Port $port is in use${NC}"
        lsof -i :$port 2>/dev/null | grep LISTEN | while read line; do
            echo "   $line"
        done
    fi
done

if [ -z "$PORTS_IN_USE" ]; then
    print_status "All development ports are free"
else
    print_warning "Some ports are still in use"
fi

# Final check
echo -e "\n${BLUE}🔍 Final verification...${NC}"
REMAINING_PROCESSES=$(ps aux | grep -E "(bun.*test|bun.*dev|bun.*serve|vite|node.*dev)" | grep -v grep | grep -v "Windsurf\|Cursor")

if [ -z "$REMAINING_PROCESSES" ]; then
    print_status "All development processes cleaned up successfully!"
else
    print_error "Some processes are still running:"
    echo "$REMAINING_PROCESSES" | while read line; do
        PID=$(echo $line | awk '{print $2}')
        CMD=$(echo $line | awk '{for(i=11;i<=NF;i++) printf $i" "; print ""}')
        echo "   PID: $PID - $CMD"
    done
fi

echo -e "\n${BLUE}📋 Cleanup Summary${NC}"
echo "=================="
echo "• Development processes: Terminated"
echo "• Development ports: Checked"
echo "• IDE processes: Preserved"
echo "• System processes: Unaffected"

echo -e "\n${GREEN}🎉 Cleanup complete!${NC}"
echo -e "${BLUE}💡 Tip: Use Ctrl+C to gracefully stop development servers${NC}"
