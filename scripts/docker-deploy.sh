#!/usr/bin/env bash
set -euo pipefail

# Production deploy helper for docker-compose.yml (not docker-compose.dev.yml).
# Rebuilds the app image from the current working tree, then starts/restarts services
# (app, db, minio, minio-init). Receipt storage uses in-stack MinIO unless S3_* are
# overridden in .env. MinIO API/console: localhost:${MINIO_API_PORT:-9000} / :9001.
#
# Plain `docker compose up -d` reuses the local image tag and does NOT pick up
# changes from `git pull`. Always pass --build or use this script after pulling.

cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${BEENVOICE_IMAGE:-}" ]] && command -v git >/dev/null 2>&1; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    BEENVOICE_IMAGE="beenvoice:$(git rev-parse --short HEAD)"
    export BEENVOICE_IMAGE
  fi
fi

BEENVOICE_IMAGE="${BEENVOICE_IMAGE:-beenvoice:local}"
export BEENVOICE_IMAGE

echo "Deploying ${BEENVOICE_IMAGE} (docker compose up -d --build)..."
exec docker compose up -d --build "$@"
