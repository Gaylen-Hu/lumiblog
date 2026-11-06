#!/usr/bin/env bash
# API-only release, no migrations, admin deployment, or release deletion.
set -Eeuo pipefail
umask 027
APP_HOME=/home/myblog
APP_USER=myblog
CURRENT="$APP_HOME/server-current"
DROPIN=/etc/systemd/system/myblog-api.service.d/25-search-release.conf
ARTIFACTS_DIR="${ARTIFACTS_DIR:?}"
REVISION="$(cat "$ARTIFACTS_DIR/revision.txt")"
[[ "$REVISION" =~ ^[a-f0-9]{40}$ && "$(id -u)" == 0 ]]
PREVIOUS="$(systemctl show myblog-api.service -p WorkingDirectory --value)"
PREVIOUS="$(readlink -f "$PREVIOUS")"
[[ -f "$PREVIOUS/dist/src/main.js" && "$PREVIOUS" == /home/myblog/* ]]
[[ ! -e "$CURRENT" || -L "$CURRENT" ]]
[[ -f "$APP_HOME/apps/.env" ]]
tar -tzf "$ARTIFACTS_DIR/server.tar.gz" > "$ARTIFACTS_DIR/server-files.txt"
if grep -Eq '(^/|(^|/)\.\.(/|$))' "$ARTIFACTS_DIR/server-files.txt"; then exit 1; fi
RELEASE="$APP_HOME/server-releases/$(date -u +%Y%m%d_%H%M%S)-${REVISION:0:12}"
install -d -m 0750 -o "$APP_USER" -g "$APP_USER" "$RELEASE"
tar --no-same-owner -xzf "$ARTIFACTS_DIR/server.tar.gz" -C "$RELEASE"
test -f "$RELEASE/dist/src/main.js"
# Search V1 requires identical schema. Stop rather than migrate unrelated data.
cmp "$PREVIOUS/prisma/schema.prisma" "$RELEASE/prisma/schema.prisma"
ln -s "$APP_HOME/apps/.env" "$RELEASE/.env"
ln -s "$APP_HOME/apps/.env" "$RELEASE/.env.prod"
printf '%s\n' "$PREVIOUS" > "$RELEASE/previous-release.txt"
printf '%s\n' "$REVISION" > "$RELEASE/revision.txt"
chown -R "$APP_USER:$APP_USER" "$RELEASE"
runuser -u "$APP_USER" -- bash -c "cd '$RELEASE' && pnpm install --frozen-lockfile && pnpm exec prisma generate"
BACKUP="$(mktemp -d "$APP_HOME/server-backup-XXXXXXXX")"
if [[ -f "$DROPIN" ]]; then cp -p "$DROPIN" "$BACKUP/dropin.before"; fi
OLD_LINK=''
if [[ -L "$CURRENT" ]]; then OLD_LINK="$(readlink -f "$CURRENT")"; fi
switch_to() { ln -s "$1" "$APP_HOME/.server-switch-$$"; mv -Tf "$APP_HOME/.server-switch-$$" "$CURRENT"; }
wait_api() {
  for attempt in $(seq 1 30); do
    if curl -fsS --max-time 5 http://127.0.0.1:3000/v1/health >/dev/null; then return 0; fi
    sleep 1
  done
  return 1
}
rollback() {
  local code=$?
  trap - ERR
  set +e
  if [[ -f "$BACKUP/dropin.before" ]]; then cp -p "$BACKUP/dropin.before" "$DROPIN"; else rm -f -- "$DROPIN"; fi
  if [[ -n "$OLD_LINK" ]]; then switch_to "$OLD_LINK"; else rm -f -- "$CURRENT"; fi
  systemctl daemon-reload
  systemctl restart myblog-api.service
  wait_api || printf 'CRITICAL: API rollback health check failed\n' >&2
  printf 'API release failed, restored previous configuration: %s\n' "$BACKUP" >&2
  exit "$code"
}
trap rollback ERR
install -d /etc/systemd/system/myblog-api.service.d
printf '[Service]\nWorkingDirectory=%s\nExecStart=\nExecStart=%s %s/dist/src/main.js\n' "$CURRENT" "$(command -v node)" "$CURRENT" > "$DROPIN"
switch_to "$RELEASE"
systemctl daemon-reload
systemctl restart myblog-api.service
wait_api
node "$ARTIFACTS_DIR/smoke-search.mjs" http://127.0.0.1:3000/v1/public
node "$ARTIFACTS_DIR/smoke-search.mjs" https://api.new-universe.cn/v1/public
test "$(readlink -f "/proc/$(systemctl show myblog-api.service -p MainPID --value)/cwd")" = "$RELEASE"
trap - ERR
printf 'API released %s; previous %s; config backup %s\n' "$REVISION" "$PREVIOUS" "$BACKUP"
