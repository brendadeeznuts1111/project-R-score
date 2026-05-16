#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="${PAGES_PROJECT_NAME:-offshore-books-web}"
BRANCH="${PAGES_BRANCH:-main}"

cat <<EOF
Deploying static Offshore Books assets to Cloudflare Pages
  project: ${PROJECT_NAME}
  branch:  ${BRANCH}
  dir:     ${ROOT_DIR}
EOF

cd "${ROOT_DIR}"

if ! command -v wrangler >/dev/null 2>&1; then
  echo "wrangler is required. Install with: npm install -g wrangler" >&2
  exit 1
fi

wrangler pages deploy "${ROOT_DIR}" \
  --project-name "${PROJECT_NAME}" \
  --branch "${BRANCH}"
