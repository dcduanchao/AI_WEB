#!/bin/bash

set -euo pipefail

TARGET_DIR="${TARGET_DIR:-/root/nginx/html/aiweb}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$ROOT_DIR"

echo "==== Installing dependencies ===="
npm ci

echo "==== Building project ===="
npm run build

echo "==== Deploying files ===="
mkdir -p "$TARGET_DIR"
rsync -a --delete "$ROOT_DIR/dist/" "$TARGET_DIR/"

echo "==== Deployment success ===="