#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/../frontend"
npm ci
VITE_APP_MODE=demo npm run dev
