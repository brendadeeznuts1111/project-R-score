# Makefile (for Nix users)
.PHONY: nix-shell build test-ffi check-env debug clean

# Enter development environment
nix-shell:
	nix develop

# Build inside Nix shell
build:
	nix develop --command bun run build

# Test FFI specifically
test-ffi:
	nix develop --command bun run test:ffi

# Test Nix integration
test-nix:
	nix develop --command bun test test/js/bun/ffi/nix-integration.test.ts

# Verify paths are set correctly
check-env:
	nix develop --command bash -c 'echo "C_INCLUDE_PATH: $$C_INCLUDE_PATH" && echo "LIBRARY_PATH: $$LIBRARY_PATH"'

# Debug environment
debug:
	nix develop --command bun scripts/debug-nix-paths.ts

# Run security tests
test-security:
	nix develop --command bun test test/js/bun/ffi/security.test.ts

# Run all FFI tests
test-all: test-ffi test-nix test-security

# Clean build artifacts
clean:
	nix develop --command bash -c "rm -rf build/ dist/"

# Full development workflow
dev: nix-shell
	@echo "🔧 Entering Bun FFI development environment"
	@echo "Run 'make build' to build Bun"
	@echo "Run 'make test-all' to run all tests"
	@echo "Run 'make debug' to debug environment"

# Quick test for CI
ci-test:
	nix develop --command bash -c "
		bun run build && \
		bun test test/js/bun/ffi/nix-integration.test.ts && \
		bun test test/js/bun/ffi/security.test.ts
	"

# Help target
help:
	@echo "Available targets:"
	@echo "  nix-shell   - Enter development environment"
	@echo "  build       - Build Bun"
	@echo "  test-ffi    - Test FFI functionality"
	@echo "  test-nix    - Test Nix integration"
	@echo "  check-env   - Check environment variables"
	@echo "  debug       - Debug environment"
	@echo "  test-security - Run security tests"
	@echo "  test-all    - Run all FFI tests"
	@echo "  clean       - Clean build artifacts"
	@echo "  dev         - Full development workflow"
	@echo "  ci-test     - Quick test for CI"
	@echo "  help        - Show this help"
