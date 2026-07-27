#!/usr/bin/env bash
# cloudflare-pages-deploy.sh — thin wrapper (prefer: bun run proton:deploy:pages)
# Uses: CLOUDFLARE_API_TOKEN resolved via Proton Pass inject
# Run: bash scripts/proton-deploy.sh pages --branch main
#      bash scripts/cloudflare-pages-deploy.sh --branch main  (direct, no vault)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --wait) ARGS+=(--wait) ;;
    --verify) ARGS+=(--verify) ;;
    --branch)
      shift
      ARGS+=(--branch "$1")
      ;;
    *) ARGS+=("$1") ;;
  esac
  shift
done

exec bun "$ROOT/tools/cloudflare-pages-deploy.ts" "${ARGS[@]}"
