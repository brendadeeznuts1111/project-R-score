#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Offshore Books preflight"
echo "  root: ${ROOT_DIR}"

required_files=(
  "index.html"
  "miniapp.html"
  "accounts.sample.json"
  "accounts.local.json"
  "worker.js"
  "wrangler.toml"
  "deploy-pages.sh"
  "bootstrap-telegram.sh"
  "deploy-all.sh"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "${ROOT_DIR}/${file}" ]]; then
    echo "Missing required file: ${file}" >&2
    exit 1
  fi
done

echo "Checking shell scripts..."
bash -n "${ROOT_DIR}/deploy-pages.sh"
bash -n "${ROOT_DIR}/bootstrap-telegram.sh"
bash -n "${ROOT_DIR}/deploy-all.sh"

echo "Checking JSON files..."
python3 - <<PY
import json
from pathlib import Path
root = Path("${ROOT_DIR}")
for name in ["accounts.sample.json", "accounts.local.json"]:
    data = json.loads((root / name).read_text())
    assert isinstance(data, list), name
print("JSON parse OK")
PY

echo "Checking Worker import..."
bun -e 'await import("'"${ROOT_DIR}"'/worker.js"); console.log("worker import OK")'

if command -v ruby >/dev/null 2>&1 && [[ -f "${ROOT_DIR}/.github/workflows/deploy.yml" ]]; then
  echo "Checking workflow YAML..."
  ruby -e 'require "yaml"; YAML.load_file("'"${ROOT_DIR}"'/.github/workflows/deploy.yml"); puts "workflow YAML parse OK"'
fi

if [[ -f "${ROOT_DIR}/.env" ]]; then
  echo "Inspecting local .env..."
  if grep -q '^TELEGRAM_BOT_TOKEN=123456:replace-me' "${ROOT_DIR}/.env"; then
    echo "Warning: TELEGRAM_BOT_TOKEN still has placeholder value in .env" >&2
  fi
fi

echo "wrangler.toml placeholders:"
grep -n 'example.com\|your_bot_username' "${ROOT_DIR}/wrangler.toml" || true

cat <<'EOF'
Preflight complete.
If wrangler.toml still shows placeholder values, update them before deploying.
EOF
