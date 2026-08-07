#!/usr/bin/env bash
set -euo pipefail

plugin_root="$(cd "$(dirname "$0")/.." && pwd)"

NODE_ENV=production bun build "$plugin_root/desktop/src/plugin.tsx" \
  --outfile "$plugin_root/desktop/plugin.js" \
  --format esm \
  --target browser \
  --external '@hermes/plugin-sdk' \
  --external react \
  --external 'react/jsx-runtime'

node --check "$plugin_root/desktop/plugin.js"
