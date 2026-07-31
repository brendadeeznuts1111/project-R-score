#!/usr/bin/env bash
# Resolve env.template → .env via Proton Pass (vault SSOT).
# Usage:
#   bash scripts/proton-inject.sh factorywager
#   bash scripts/proton-inject.sh bet-ticker
#   bash scripts/proton-inject.sh cascade-mover
#   bash scripts/proton-inject.sh scanner
#   bash scripts/proton-inject.sh kalshi-bot
#   bash scripts/proton-inject.sh factorywager --reasonix   # also refresh ~/.reasonix/.env keys
#
# Never paste API tokens into shell history. Mint once in the dashboard,
# store in Proton Pass (pass://factorywager/Cloudflare API Token/password),
# then inject.

set -euo pipefail

PROJECT="${1:-}"
SYNC_REASONIX=0
shift 2>/dev/null || true
for arg in "$@"; do
  case "$arg" in
    --reasonix) SYNC_REASONIX=1 ;;
    *)
      echo "Unknown flag: $arg" >&2
      echo "Usage: $0 <factorywager|bet-ticker|cascade-mover|scanner|cloudflare|kalshi-bot> [--reasonix]" >&2
      exit 1
      ;;
  esac
done

if [ -z "$PROJECT" ]; then
  echo "Usage: $0 <factorywager|bet-ticker|cascade-mover|scanner|cloudflare|kalshi-bot> [--reasonix]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

case "$PROJECT" in
  factorywager|cloudflare)
    # cloudflare agent is CF-scoped; monorepo template is factorywager vault
    AGENT="factorywager"
    TEMPLATE="$ROOT/env.template"
    OUT="$ROOT/.env"
    ;;
  bet-ticker)
    AGENT="bet-ticker"
    TEMPLATE="$ROOT/projects/active/enterprise/bet-ticker-worker-v1.1/env.template"
    OUT="$ROOT/projects/active/enterprise/bet-ticker-worker-v1.1/.env"
    ;;
  cascade-mover)
    AGENT="cascade-mover"
    TEMPLATE="$ROOT/projects/active/enterprise/cascade-mover-v3/env.template"
    OUT="$ROOT/projects/active/enterprise/cascade-mover-v3/.env"
    ;;
  scanner)
    AGENT="factorywager"
    TEMPLATE="$ROOT/projects/active/analysis/scanner/env.template"
    OUT="$ROOT/projects/active/analysis/scanner/.env"
    ;;
  kalshi-bot|kalshi)
    AGENT="kalshi-bot"
    TEMPLATE="$ROOT/Kalshi-bot/env.template"
    OUT="$ROOT/Kalshi-bot/.env"
    ;;
  *)
    echo "Unknown project: $PROJECT" >&2
    echo "Projects: factorywager, cloudflare, bet-ticker, cascade-mover, scanner, kalshi-bot" >&2
    exit 1
    ;;
esac

if [ ! -f "$TEMPLATE" ]; then
  echo "❌ Template not found: $TEMPLATE" >&2
  exit 1
fi

# shellcheck source=agent-env.sh
source "$SCRIPT_DIR/agent-env.sh" "$AGENT"

echo "🔐 Injecting $TEMPLATE → $OUT (vault SSOT via pass-cli)"
PROTON_PASS_AGENT_REASON="Inject env secrets for $PROJECT" \
  pass-cli inject --in-file "$TEMPLATE" --out-file "$OUT" --force
echo "✅ Wrote $OUT (mode $(stat -f '%Lp' "$OUT" 2>/dev/null || stat -c '%a' "$OUT" 2>/dev/null || echo '?'))"

if [ "$SYNC_REASONIX" -eq 1 ]; then
  if [ "$PROJECT" != "factorywager" ] && [ "$PROJECT" != "cloudflare" ]; then
    echo "⚠️  --reasonix only applies to factorywager/cloudflare inject (CF + Telegram keys)" >&2
  else
    REASONIX_ENV="${REASONIX_ENV:-$HOME/.reasonix/.env}"
    mkdir -p "$(dirname "$REASONIX_ENV")"
    touch "$REASONIX_ENV"
    chmod 600 "$REASONIX_ENV" 2>/dev/null || true

    # Pull only keys MCP / Reasonix need (derived cache, not SSOT)
    python3 - "$OUT" "$REASONIX_ENV" <<'PY'
import sys
from pathlib import Path

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
KEYS = (
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_DNS_API_TOKEN",
    "CLOUDFLARE_ACCESS_API_TOKEN",
    "TELEGRAM_BOT_FACTORY",
    "TELEGRAM_WEBHOOK_SECRET",
)

got = {}
for line in src.read_text().splitlines():
    if not line or line.lstrip().startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    if k in KEYS:
        got[k] = v

if not got:
    print("⚠️  No reasonix keys found in injected .env", file=sys.stderr)
    sys.exit(0)

text = dst.read_text() if dst.exists() else ""
lines = text.splitlines()
kept = []
for line in lines:
    if not line or line.lstrip().startswith("#") or "=" not in line:
        kept.append(line)
        continue
    k = line.split("=", 1)[0]
    if k in KEYS:
        continue  # drop stale copies (including duplicate CF token lines)
    kept.append(line)

while kept and kept[-1] == "":
    kept.pop()

block = ["", "# --- proton-inject (derived from vault; re-run to refresh) ---"]
for k in KEYS:
    if k in got:
        block.append(f"{k}={got[k]}")

dst.write_text("\n".join(kept + block) + "\n")
print(f"✅ Synced {len(got)} key(s) into {dst} (duplicates stripped)")
PY
  fi
fi
