#!/usr/bin/env bash
# cloudflare-dns-sync.sh — thin bash wrapper over scripts/cloudflare-dns-sync.ts
#
# Idempotent DNS-as-code for factory-wager.com email records (Proton Mail
# MX/SPF/DMARC/verification + DKIM CNAMEs). Default is --dry-run; pass --apply
# to mutate. Token: CLOUDFLARE_DNS_API_TOKEN (env or ~/.reasonix/.env) with
# Zone.DNS:Edit on the factory-wager.com zone. DKIM targets come from
# PROTON_DKIM_TARGET_1/2/3 — see docs/harness/tenants/proton-integration.md.
set -euo pipefail
cd "$(dirname "$0")/.."
exec bun scripts/cloudflare-dns-sync.ts "$@"
