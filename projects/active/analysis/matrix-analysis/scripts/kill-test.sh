#!/bin/bash
# Quick test process killer utility
# Usage: ./kill-test.sh [pid|all] [--force]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Quick Test Process Killer"
    echo
    echo "Usage: $0 [pid|all] [--force]"
    echo
    echo "Arguments:"
    echo "  pid        Process ID to kill"
    echo "  all        Kill all test processes"
    echo
    echo "Options:"
    echo "  --force    Use SIGKILL instead of SIGTERM"
    echo
    echo "Examples:"
    echo "  $0 12345              # Graceful kill PID 12345"
    echo "  $0 12345 --force      # Force kill PID 12345"
    echo "  $0 all                # Graceful kill all test processes"
    echo "  $0 all --force        # Force kill all test processes"
    echo
}

# Function to find test processes
find_test_processes() {
    ps aux | grep -E "(bun test|npm test|yarn test|pnpm test|jest|vitest|mocha)" | grep -v grep || true
}

# Function to kill a single process
kill_process() {
    local pid=$1
    local signal=${2:-SIGTERM}
    
    if ! kill -0 "$pid" 2>/dev/null; then
        print_error "Process $pid does not exist"
        return 1
    fi
    
    print_status "Sending $signal to process $pid..."
    
    if kill "$signal" "$pid" 2>/dev/null; then
        print_success "Signal sent to process $pid"
        
        if [ "$signal" = "SIGTERM" ]; then
            # Wait a moment to see if it terminates gracefully
            sleep 1
            
            if kill -0 "$pid" 2>/dev/null; then
                print_warning "Process $pid still running after SIGTERM"
                print_warning "Use --force to send SIGKILL for immediate termination"
                return 1
            else
                print_success "Process $pid terminated gracefully"
            fi
        else
            print_success "Process $pid terminated immediately"
        fi
    else
        print_error "Failed to send signal to process $pid"
        return 1
    fi
}

# Main script logic
main() {
    local target=$1
    local force=$2
    
    if [ -z "$target" ] || [ "$target" = "--help" ] || [ "$target" = "-h" ]; then
        show_usage
        exit 0
    fi
    
    local signal="SIGTERM"
    if [ "$force" = "--force" ]; then
        signal="SIGKILL"
    fi
    
    print_status "Using signal: $signal"
    echo
    
    if [ "$target" = "all" ]; then
        print_status "Finding all test processes..."
        echo
        
        local test_processes
        test_processes=$(find_test_processes)
        
        if [ -z "$test_processes" ]; then
            print_warning "No test processes found"
            exit 0
        fi
        
        echo "$test_processes"
        echo
        
        local pids
        pids=$(echo "$test_processes" | awk '{print $2}')
        
        local killed=0
        local failed=0
        
        for pid in $pids; do
            if kill_process "$pid" "$signal"; then
                ((killed++))
            else
                ((failed++))
            fi
            echo
        done
        
        print_status "Summary: $killed killed, $failed failed"
        
    else
        # Validate PID
        if ! echo "$target" | grep -E '^[0-9]+$' > /dev/null; then
            print_error "Invalid PID: $target"
            echo
            show_usage
            exit 1
        fi
        
        kill_process "$target" "$signal"
    fi
}

# Check if running on macOS or Linux
if [[ "$OSTYPE" != "darwin"* ]] && [[ "$OSTYPE" != "linux-gnu"* ]]; then
    print_error "This script only supports macOS and Linux"
    exit 1
fi

# Run main function
main "$@"
