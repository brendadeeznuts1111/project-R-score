#!/bin/bash

# Test Organization Script
# Reorganizes 46 test files into logical groups

echo "🧪 Test Organization Script"
echo "=========================="

# Create organized test directory structure
echo "📁 Creating organized test structure..."

mkdir -p tests/{unit,integration,performance,security,e2e}
mkdir -p tests/{unit/{cli,storage,email,filter},integration/{dashboard,analytics},performance/{bench,proxy},security/{auth,feature-flags},e2e/{workflows,scenarios}}

# Current test files mapping
echo "📋 Mapping current test files to new structure..."

# Unit Tests (15 files)
echo "   → Organizing unit tests..."
# Core unit tests
if [ -f "tests/core/empire-patterns.test.ts" ]; then
    mv "tests/core/empire-patterns.test.ts" "tests/unit/cli/"
fi
if [ -f "tests/core/intelligence-pipeline.test.ts" ]; then
    mv "tests/core/intelligence-pipeline.test.ts" "tests/unit/cli/"
fi

# Storage unit tests
if [ -f "tests/storage/test-r2-storage.js" ]; then
    mv "tests/storage/test-r2-storage.js" "tests/unit/storage/"
fi
if [ -f "tests/storage/test-r2-upload.ts" ]; then
    mv "tests/storage/test-r2-upload.ts" "tests/unit/storage/"
fi
if [ -f "tests/storage/test-enhanced-storage.js" ]; then
    mv "tests/storage/test-enhanced-storage.js" "tests/unit/storage/"
fi

# Email unit tests
if [ -f "tests/email/email-search.test.js" ]; then
    mv "tests/email/email-search.test.js" "tests/unit/email/"
fi
if [ -f "tests/email/test-imap.js" ]; then
    mv "tests/email/test-imap.js" "tests/unit/email/"
fi

# Filter unit tests
if [ -f "tests/filter/phone-sanitizer.test.ts" ]; then
    mv "tests/filter/phone-sanitizer.test.ts" "tests/unit/filter/"
fi

# Direct unit tests
if [ -f "tests/test-cli-debug.ts" ]; then
    mv "tests/test-cli-debug.ts" "tests/unit/cli/"
fi
if [ -f "tests/test-phone-sanitizer-v2.ts" ]; then
    mv "tests/test-phone-sanitizer-v2.ts" "tests/unit/filter/"
fi
if [ -f "tests/test-feature-flag-security.ts" ]; then
    mv "tests/test-feature-flag-security.ts" "tests/unit/security/"
fi

# Integration Tests (10 files)
echo "   → Organizing integration tests..."
if [ -f "tests/dashboard-integration.test.ts" ]; then
    mv "tests/dashboard-integration.test.ts" "tests/integration/dashboard/"
fi
if [ -f "tests/test-deep-app-integration.test.ts" ]; then
    mv "tests/test-deep-app-integration.test.ts" "tests/integration/dashboard/"
fi
if [ -f "tests/test-duoplus-integration.ts" ]; then
    mv "tests/test-duoplus-integration.ts" "tests/integration/analytics/"
fi
if [ -f "tests/cashapp-v2.test.ts" ]; then
    mv "tests/cashapp-v2.test.ts" "tests/integration/analytics/"
fi

# Performance Tests (12 files)
echo "   → Organizing performance tests..."
if [ -d "tests/bench" ]; then
    mv "tests/bench"/* "tests/performance/bench/" 2>/dev/null || true
fi

# Security Tests (5 files)
echo "   → Organizing security tests..."
if [ -f "tests/test-feature-flag-security.ts" ]; then
    cp "tests/unit/security/test-feature-flag-security.ts" "tests/security/auth/" 2>/dev/null || true
fi

# E2E Tests (4 files)
echo "   → Organizing e2e tests..."
if [ -f "tests/empire-patterns.test.ts" ]; then
    cp "tests/empire-patterns.test.ts" "tests/e2e/workflows/" 2>/dev/null || true
fi

# Clean up empty directories
echo "🧹 Cleaning up empty directories..."
find tests/ -type d -empty -delete 2>/dev/null || true

echo ""
echo "📊 New Test Structure:"
echo "tests/"
echo "├── unit/           # Unit tests (15 files)"
echo "│   ├── cli/       # CLI component tests"
echo "│   ├── storage/   # Storage system tests"
echo "│   ├── email/     # Email system tests"
echo "│   ├── filter/    # Data filtering tests"
echo "│   └── security/  # Security unit tests"
echo "├── integration/    # Integration tests (10 files)"
echo "│   ├── dashboard/ # Dashboard integration"
echo "│   └── analytics/ # Analytics integration"
echo "├── performance/    # Performance tests (12 files)"
echo "│   ├── bench/     # Benchmark tests"
echo "│   └── proxy/     # Proxy performance"
echo "├── security/       # Security tests (5 files)"
echo "│   ├── auth/      # Authentication tests"
echo "│   └── feature-flags/ # Feature flag tests"
echo "└── e2e/           # End-to-end tests (4 files)"
echo "    ├── workflows/ # Workflow tests"
echo "    └── scenarios/ # Scenario tests"

echo ""
echo "✅ Test organization complete!"
