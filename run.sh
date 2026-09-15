#!/usr/bin/env bash
# Sets up (on first run) and starts both apps/web and platform/ for local
# development: apps/web via `pnpm dev`, platform/ via invenio-cli's local
# (non-containerized-app) dev flow, its dockerized backend services
# (db/search/mq/cache) included. Ctrl-C stops both.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"
PLATFORM_DIR="$ROOT_DIR/platform"
PLATFORM_INIT_MARKER="$PLATFORM_DIR/.dev-initialized"

for cmd in pnpm uv invenio-cli docker; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "run.sh: '$cmd' not found on PATH." >&2
    case "$cmd" in
      pnpm) echo "  Install: corepack enable" >&2 ;;
      uv) echo "  Install: https://docs.astral.sh/uv/" >&2 ;;
      invenio-cli) echo "  Install: pipx install invenio-cli (see platform/README.md)" >&2 ;;
      docker) echo "  Install: Docker Desktop (or equivalent)" >&2 ;;
    esac
    exit 1
  fi
done

if ! docker info >/dev/null 2>&1; then
  echo "run.sh: Docker daemon isn't running. Start Docker Desktop and retry." >&2
  exit 1
fi

echo "==> apps/web: installing dependencies"
(cd "$WEB_DIR" && pnpm install)

if [ ! -d "$PLATFORM_DIR/var" ]; then
  echo "==> platform/: first-time install (python deps, symlinks, assets)"
  (cd "$PLATFORM_DIR" && invenio-cli install all)
fi

if [ ! -f "$PLATFORM_INIT_MARKER" ]; then
  echo "==> platform/: first-time services setup (db, search index, roles, fixtures)"
  (cd "$PLATFORM_DIR" && invenio-cli services setup)
  touch "$PLATFORM_INIT_MARKER"
fi

echo "==> starting apps/web (pnpm dev) and platform/ (invenio-cli run all)"
trap 'kill 0' EXIT INT TERM

(cd "$WEB_DIR" && pnpm dev 2>&1 | sed -u 's/^/[web]      /') &
(cd "$PLATFORM_DIR" && invenio-cli run all 2>&1 | sed -u 's/^/[platform] /') &

wait
