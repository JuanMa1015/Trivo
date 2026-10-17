#!/usr/bin/env bash
# Runs ON THE SERVER (piped over SSH by the CD workflow): bash -s < scripts/deploy.sh
# Brings up Postgres (once), applies migrations, replaces the app container (rolling back if it
# is not healthy) and keeps an HTTPS reverse proxy in front of it.
set -euo pipefail

: "${IMAGE:?IMAGE is required (e.g. ghcr.io/owner/repo@sha256:...)}"
: "${MIGRATE_IMAGE:?MIGRATE_IMAGE is required (the migrate stage image, by digest)}"
NAME="${CONTAINER_NAME:-trivo}"
HOST_PORT="${HOST_PORT:-9028}"
ENV_FILE="${ENV_FILE:-/opt/trivo/.env}"
# Open Payments private key: lives only on the server and is mounted read-only.
# In /opt/trivo/.env use OPEN_PAYMENTS_PRIVATE_KEY_PATH=/run/secrets/open_payments.key
KEY_FILE="${KEY_FILE:-/opt/trivo/open_payments.key}"
NETWORK="${NETWORK:-trivo}"
DB_NAME="${DB_NAME:-trivo-db}"
# Generated once on the server; nobody has to choose or paste a database password.
DB_PASSWORD_FILE="${DB_PASSWORD_FILE:-/opt/trivo/postgres_password}"
PROXY_NAME="${PROXY_NAME:-trivo-proxy}"
CADDY_DIR="${CADDY_DIR:-/opt/trivo/caddy}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE (runtime configuration is kept on the server, never in git)." >&2
  exit 1
fi

docker network inspect "$NETWORK" >/dev/null 2>&1 || docker network create "$NETWORK" >/dev/null

# --- Postgres: created once and never replaced by a deploy; data lives in a named volume.
if [ ! -f "$DB_PASSWORD_FILE" ]; then
  (umask 077 && head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n' >"$DB_PASSWORD_FILE")
fi
DB_PASSWORD="$(cat "$DB_PASSWORD_FILE")"
# The host is `db`: the app treats that name as a local, non-SSL database.
DATABASE_URL="postgresql://trivo:${DB_PASSWORD}@db:5432/trivo"

if ! docker inspect "$DB_NAME" >/dev/null 2>&1; then
  docker run -d --name "$DB_NAME" --restart unless-stopped \
    --network "$NETWORK" --network-alias db \
    -e POSTGRES_USER=trivo -e POSTGRES_PASSWORD="$DB_PASSWORD" -e POSTGRES_DB=trivo \
    -v trivo-pgdata:/var/lib/postgresql/data postgres:16-alpine >/dev/null
elif [ "$(docker inspect --format '{{.State.Running}}' "$DB_NAME")" != "true" ]; then
  docker start "$DB_NAME" >/dev/null
fi

for _ in $(seq 1 45); do
  docker exec "$DB_NAME" pg_isready -U trivo -d trivo >/dev/null 2>&1 && break
  sleep 2
done
docker exec "$DB_NAME" pg_isready -U trivo -d trivo >/dev/null

# --- Migrations first: if they fail, the running app is left untouched.
echo "Migrating with $MIGRATE_IMAGE"
docker pull "$MIGRATE_IMAGE"
docker run --rm --network "$NETWORK" -e DATABASE_URL="$DATABASE_URL" "$MIGRATE_IMAGE"

# --- App
previous="$(docker inspect --format '{{.Config.Image}}' "$NAME" 2>/dev/null || true)"

echo "Pulling $IMAGE"
docker pull "$IMAGE"

start() {
  local mounts=()
  if [ -f "$KEY_FILE" ]; then
    mounts=(-v "$KEY_FILE:/run/secrets/open_payments.key:ro")
  fi
  # -e wins over --env-file, so the database always points at the container above.
  docker run -d --name "$NAME" --restart unless-stopped \
    --network "$NETWORK" -p "$HOST_PORT:9028" \
    --env-file "$ENV_FILE" -e DATABASE_URL="$DATABASE_URL" \
    ${mounts[@]+"${mounts[@]}"} "$1" >/dev/null
}

wait_healthy() {
  local status
  for _ in $(seq 1 45); do
    status="$(docker inspect --format '{{.State.Health.Status}}' "$NAME" 2>/dev/null || echo none)"
    [ "$status" = "healthy" ] && return 0
    [ "$status" = "unhealthy" ] && return 1
    sleep 2
  done
  return 1
}

docker rm -f "$NAME" >/dev/null 2>&1 || true
start "$IMAGE"

if ! wait_healthy; then
  echo "Health check failed. Last logs:" >&2
  docker logs --tail 50 "$NAME" >&2 || true
  docker rm -f "$NAME" >/dev/null 2>&1 || true

  if [ -n "$previous" ]; then
    start "$previous"
    echo "Rolled back to $previous" >&2
  fi
  exit 1
fi

echo "Deployed $IMAGE"
docker image prune -f >/dev/null

# --- HTTPS: Caddy gets and renews the certificate by itself for the APP_BASE_URL domain.
# Needs a DNS A record to this server and ports 80 and 443 free. Its failure never fails the deploy.
app_url="$(grep -E '^APP_BASE_URL=' "$ENV_FILE" | tail -1 | cut -d= -f2-)"
case "$app_url" in
  https://*)
    domain="${app_url#https://}"
    domain="${domain%%/*}"
    mkdir -p "$CADDY_DIR"
    printf '%s {\n\treverse_proxy %s:9028\n}\n' "$domain" "$NAME" >"$CADDY_DIR/Caddyfile"
    if [ "$(docker inspect --format '{{.State.Running}}' "$PROXY_NAME" 2>/dev/null || echo false)" = "true" ]; then
      docker exec "$PROXY_NAME" caddy reload --config /etc/caddy/Caddyfile >/dev/null ||
        echo "WARNING: could not reload the proxy" >&2
    else
      docker rm -f "$PROXY_NAME" >/dev/null 2>&1 || true
      docker run -d --name "$PROXY_NAME" --restart unless-stopped --network "$NETWORK" \
        -p 80:80 -p 443:443 \
        -v "$CADDY_DIR/Caddyfile:/etc/caddy/Caddyfile:ro" -v trivo-caddy-data:/data \
        caddy:2-alpine >/dev/null ||
        echo "WARNING: could not start the proxy (are ports 80/443 free?)" >&2
    fi
    echo "HTTPS proxy for $domain"
    ;;
  *) echo "APP_BASE_URL is not https: skipping the HTTPS proxy" ;;
esac
