#!/bin/bash
# Production deployment preflight — Bun.secrets + R2 credential validation

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
  case "$1" in
    INFO) echo -e "${YELLOW}ℹ${NC} $2" ;;
    OK) echo -e "${GREEN}✅${NC} $2" ;;
    ERR) echo -e "${RED}❌${NC} $2" ;;
  esac
}

check_prerequisites() {
  log INFO "Checking prerequisites"
  command -v bun >/dev/null || { log ERR "Bun is required"; exit 1; }
  log OK "Bun $(bun --version)"
}

run_preflight() {
  log INFO "Running Bun.secrets + R2 preflight"
  bun scripts/deployment/deploy-production.ts
  log OK "Preflight passed"
}

main() {
  local command=${1:-deploy}
  case "$command" in
    prereqs) check_prerequisites ;;
    deploy|full|preflight)
      check_prerequisites
      run_preflight
      ;;
    help|*)
      echo "Usage: $0 [prereqs|preflight|deploy|full|help]"
      echo "  Validates Bun.secrets runtime and resolves R2 credentials before deploy."
      ;;
  esac
}

main "$@"
