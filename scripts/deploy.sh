#!/usr/bin/env bash
# Runs ON THE SERVER (piped over SSH by the CD workflow): bash -s < scripts/deploy.sh
# Pulls an immutable image, replaces the container and rolls back if it is not healthy.
set -euo pipefail

: "${IMAGE:?IMAGE is required (e.g. ghcr.io/owner/repo@sha256:...)}"
NAME="${CONTAINER_NAME:-trivo}"
HOST_PORT="${HOST_PORT:-9028}"
ENV_FILE="${ENV_FILE:-/opt/trivo/.env}"
# Open Payments private key: lives only on the server and is mounted read-only.
# In /opt/trivo/.env use OPEN_PAYMENTS_PRIVATE_KEY_PATH=/run/secrets/open_payments.key
KEY_FILE="${KEY_FILE:-/opt/trivo/open_payments.key}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE (runtime configuration is kept on the server, never in git)." >&2
  exit 1
fi

previous="$(docker inspect --format '{{.Config.Image}}' "$NAME" 2>/dev/null || true)"

echo "Pulling $IMAGE"
docker pull "$IMAGE"

start() {
  local mounts=()
  if [ -f "$KEY_FILE" ]; then
    mounts=(-v "$KEY_FILE:/run/secrets/open_payments.key:ro")
  fi
  docker run -d --name "$NAME" --restart unless-stopped \
    -p "$HOST_PORT:9028" --env-file "$ENV_FILE" \
    ${mounts[@]+"${mounts[@]}"} "$1" >/dev/null
}

wait_healthy() {
  local status
  for _ in $(seq 1 30); do
    status="$(docker inspect --format '{{.State.Health.Status}}' "$NAME" 2>/dev/null || echo none)"
    [ "$status" = "healthy" ] && return 0
    [ "$status" = "unhealthy" ] && return 1
    sleep 2
  done
  return 1
}

docker rm -f "$NAME" >/dev/null 2>&1 || true
start "$IMAGE"

if wait_healthy; then
  echo "Deployed $IMAGE"
  docker image prune -f >/dev/null
  exit 0
fi

echo "Health check failed. Last logs:" >&2
docker logs --tail 50 "$NAME" >&2 || true
docker rm -f "$NAME" >/dev/null 2>&1 || true

if [ -n "$previous" ]; then
  start "$previous"
  echo "Rolled back to $previous" >&2
fi
exit 1
