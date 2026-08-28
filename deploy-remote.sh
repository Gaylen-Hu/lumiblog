#!/usr/bin/env bash
set -Eeuo pipefail

umask 027

APP_USER="${APP_USER:-myblog}"
APP_HOME="${APP_HOME:-/home/myblog}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-/tmp/blog-deploy}"
ENV_FILE="$APP_HOME/apps/.env"
RELEASE_ID="$(date -u +%Y%m%d_%H%M%S)"
RELEASE_DIR="$APP_HOME/releases/$RELEASE_ID"
CURRENT_LINK="$APP_HOME/current"
NEW_LINK="$APP_HOME/.current-$RELEASE_ID"
PREVIOUS_RELEASE=""
SWITCHED=false

log() { printf '[deploy] %s\n' "$*"; }
fail() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

restore_previous_release() {
  if [[ "$SWITCHED" == true && -n "$PREVIOUS_RELEASE" && -d "$PREVIOUS_RELEASE" ]]; then
    log "Health check failed; restoring $PREVIOUS_RELEASE"
    ln -s "$PREVIOUS_RELEASE" "$NEW_LINK.rollback"
    chown -h "$APP_USER:$APP_USER" "$NEW_LINK.rollback"
    mv -Tf "$NEW_LINK.rollback" "$CURRENT_LINK"
    systemctl restart myblog-api.service blog-web.service || true
  fi
}

cleanup_on_error() {
  local exit_code=$?
  trap - ERR
  restore_previous_release
  [[ -L "$NEW_LINK" ]] && rm -f -- "$NEW_LINK"
  log "Deployment failed with exit code $exit_code"
  exit "$exit_code"
}
trap cleanup_on_error ERR

[[ "$(id -u)" -eq 0 ]] || fail 'This script must run as root'
[[ -f "$ENV_FILE" ]] || fail "Missing environment file: $ENV_FILE"
id "$APP_USER" >/dev/null 2>&1 || fail "Missing application user: $APP_USER"

for command_name in node pnpm tar runuser systemctl curl; do
  command -v "$command_name" >/dev/null 2>&1 || fail "Missing command: $command_name"
done

for artifact_name in server.tar.gz admin.tar.gz blog.tar.gz; do
  artifact_path="$ARTIFACTS_DIR/$artifact_name"
  [[ -f "$artifact_path" ]] || fail "Missing artifact: $artifact_path"
  if tar -tzf "$artifact_path" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
    fail "Unsafe path found in $artifact_name"
  fi
done

if [[ -L "$CURRENT_LINK" ]]; then
  PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK")"
  [[ "$PREVIOUS_RELEASE" == "$APP_HOME/releases/"* ]] || fail 'Current release points outside releases directory'
fi

[[ ! -e "$RELEASE_DIR" ]] || fail "Release already exists: $RELEASE_DIR"
install -d -m 0750 -o "$APP_USER" -g "$APP_USER" \
  "$APP_HOME/releases" "$RELEASE_DIR/server" "$RELEASE_DIR/admin" "$RELEASE_DIR/blog"

log "Extracting release $RELEASE_ID"
tar -xzf "$ARTIFACTS_DIR/server.tar.gz" -C "$RELEASE_DIR/server"
tar -xzf "$ARTIFACTS_DIR/admin.tar.gz" -C "$RELEASE_DIR/admin"
tar -xzf "$ARTIFACTS_DIR/blog.tar.gz" -C "$RELEASE_DIR/blog"

[[ -f "$RELEASE_DIR/server/dist/src/main.js" ]] || fail 'Server entry point is missing'
[[ -f "$RELEASE_DIR/admin/dist/index.html" ]] || fail 'Admin build is missing'
[[ -f "$RELEASE_DIR/blog/server.js" ]] || fail 'Blog standalone entry point is missing'

chown -R "$APP_USER:$APP_USER" "$RELEASE_DIR"
ln -s "$ENV_FILE" "$RELEASE_DIR/server/.env"
ln -s "$ENV_FILE" "$RELEASE_DIR/server/.env.prod"

log 'Installing server dependencies and generating Prisma client'
runuser -u "$APP_USER" -- bash -c "cd '$RELEASE_DIR/server' && pnpm install --frozen-lockfile && pnpm exec prisma generate"

log 'Applying database migrations'
runuser -u "$APP_USER" -- bash -c "cd '$RELEASE_DIR/server' && pnpm exec prisma migrate deploy"

log 'Switching current release'
ln -s "$RELEASE_DIR" "$NEW_LINK"
chown -h "$APP_USER:$APP_USER" "$NEW_LINK"
mv -Tf "$NEW_LINK" "$CURRENT_LINK"
SWITCHED=true

systemctl restart myblog-api.service blog-web.service
systemctl reload nginx.service

wait_for_url() {
  local name="$1"
  local url="$2"
  local attempt
  for attempt in $(seq 1 30); do
    if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null; then
      log "$name health check passed"
      return 0
    fi
    sleep 2
  done
  fail "$name health check failed: $url"
}

wait_for_url 'API' 'http://127.0.0.1:3000/v1/health'
wait_for_url 'Blog' 'http://127.0.0.1:3001/'
curl --fail --silent --show-error --max-time 5 \
  --resolve badmin.new-universe.cn:443:127.0.0.1 \
  'https://badmin.new-universe.cn/user/login' >/dev/null
log 'Admin health check passed'

systemctl is-active --quiet myblog-api.service blog-web.service nginx.service
SWITCHED=false

log 'Removing releases older than the three most recent versions'
CURRENT_RELEASE="$(readlink -f "$CURRENT_LINK")"
while IFS= read -r old_release; do
  [[ -n "$old_release" ]] || continue
  [[ "$old_release" == "$APP_HOME/releases/"* ]] || fail "Refusing to remove unsafe path: $old_release"
  [[ "$old_release" != "$CURRENT_RELEASE" ]] || continue
  rm -rf -- "$old_release"
done < <(
  find "$APP_HOME/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
    | sort -nr \
    | tail -n +4 \
    | cut -d' ' -f2-
)

log "Deployment completed: $RELEASE_ID"
log "Previous release: ${PREVIOUS_RELEASE:-none}"
