#!/usr/bin/env bash
# V2 additive schema + API/admin/blog release, preserving every previous release.
set -Eeuo pipefail
umask 027
APP_HOME=/home/myblog
APP_USER=myblog
ARTIFACTS_DIR="${ARTIFACTS_DIR:?}"
REVISION="$(cat "$ARTIFACTS_DIR/revision.txt")"
[[ "$(id -u)" == 0 && "$REVISION" =~ ^[a-f0-9]{40}$ ]]
for command in node pnpm pg_dump pg_restore nginx systemctl curl; do command -v "$command" >/dev/null; done
PREVIOUS="$(readlink -f "$(systemctl show myblog-api.service -p WorkingDirectory --value)")"
[[ "$PREVIOUS" == /home/myblog/* && -f "$PREVIOUS/dist/src/main.js" ]]
SITE=/etc/nginx/sites-enabled/myblog.conf
DROPIN=/etc/systemd/system/myblog-api.service.d/25-search-release.conf
WEATHER="$APP_HOME/apps/weather.env"
CURRENT="$APP_HOME/server-current"
ADMIN_CURRENT="$APP_HOME/admin-current"
[[ -L "$CURRENT" && ( ! -e "$ADMIN_CURRENT" || -L "$ADMIN_CURRENT" ) ]]
OLD_ADMIN=''; if [[ -L "$ADMIN_CURRENT" ]]; then OLD_ADMIN="$(readlink -f "$ADMIN_CURRENT")"; fi
RELEASE_ID="$(date -u +%Y%m%d_%H%M%S)-${REVISION:0:12}"
RELEASE="$APP_HOME/server-releases/$RELEASE_ID"
ADMIN="$APP_HOME/admin-releases/$RELEASE_ID"
BACKUP="$(mktemp -d "$APP_HOME/environment-backup-XXXXXXXX")"
chmod 0700 "$BACKUP"
for archive in server admin; do
  tar -tzf "$ARTIFACTS_DIR/$archive.tar.gz" > "$BACKUP/$archive-files.txt"
  if grep -Eq '(^/|(^|/)\.\.(/|$))' "$BACKUP/$archive-files.txt"; then exit 1; fi
done
install -d -m 0750 -o "$APP_USER" -g "$APP_USER" "$RELEASE" "$ADMIN"
tar --no-same-owner -xzf "$ARTIFACTS_DIR/server.tar.gz" -C "$RELEASE"
tar --no-same-owner -xzf "$ARTIFACTS_DIR/admin.tar.gz" -C "$ADMIN"
test -f "$RELEASE/dist/src/main.js"; test -f "$ADMIN/dist/index.html"
ln -s "$APP_HOME/apps/.env" "$RELEASE/.env"
ln -s "$APP_HOME/apps/.env" "$RELEASE/.env.prod"
printf '%s\n' "$PREVIOUS" > "$RELEASE/previous-release.txt"
printf '%s\n' "$REVISION" > "$RELEASE/revision.txt"
printf '%s\n' "$REVISION" > "$ADMIN/dist/revision.txt"
chown -R "$APP_USER:$APP_USER" "$RELEASE" "$ADMIN"
runuser -u "$APP_USER" -- bash -c "cd '$RELEASE' && pnpm install --frozen-lockfile && pnpm exec prisma generate"
cp -p "$SITE" "$BACKUP/nginx.before"
cp -p "$DROPIN" "$BACKUP/dropin.before"
if [[ -f "$WEATHER" ]]; then cp -p "$WEATHER" "$BACKUP/weather.before"; fi
# Only the new table is allowed; backup and migration preflight precede switching.
node "$ARTIFACTS_DIR/prepare-environment-db.mjs" "$PREVIOUS" "$RELEASE" "$BACKUP/database.dump"
node --input-type=module - "$SITE" "$BACKUP/nginx.next" <<'NODE'
import fs from 'node:fs';
const [source, target] = process.argv.slice(2);
const original = fs.readFileSync(source, 'utf8');
if (!original.includes('/home/myblog/current/admin/dist') && !original.includes('/home/myblog/admin-current/dist')) throw Error('Unrecognized admin root');
fs.writeFileSync(target, original.replaceAll('/home/myblog/current/admin/dist', '/home/myblog/admin-current/dist'));
NODE
switch_to() { ln -s "$1" "$2.next-$$"; chown -h "$APP_USER:$APP_USER" "$2.next-$$"; mv -Tf "$2.next-$$" "$2"; }
wait_api() { for attempt in $(seq 1 30); do if curl -fsS --max-time 5 http://127.0.0.1:3000/v1/health >/dev/null; then return 0; fi; sleep 1; done; return 1; }
BLOG_SWITCHED=false
rollback() {
  local code=$?; trap - ERR; set +e
  if [[ "$BLOG_SWITCHED" == true ]]; then ARTIFACTS_DIR="$ARTIFACTS_DIR" bash "$ARTIFACTS_DIR/deploy-blog.sh" rollback; fi
  cp -p "$BACKUP/nginx.before" "$SITE"; cp -p "$BACKUP/dropin.before" "$DROPIN"
  if [[ -f "$BACKUP/weather.before" ]]; then cp -p "$BACKUP/weather.before" "$WEATHER"; else rm -f -- "$WEATHER"; fi
  switch_to "$PREVIOUS" "$CURRENT"
  if [[ -n "$OLD_ADMIN" ]]; then switch_to "$OLD_ADMIN" "$ADMIN_CURRENT"; else rm -f -- "$ADMIN_CURRENT"; fi
  systemctl daemon-reload; systemctl restart myblog-api.service; nginx -t && systemctl reload nginx
  wait_api || printf 'CRITICAL: API rollback health check failed\n' >&2
  printf 'V2 release rolled back. Additive environment table retained. Private backup: %s\n' "$BACKUP" >&2
  exit "$code"
}
trap rollback ERR
# This small file contains only weather settings; never replace the main .env.
test -f "$ARTIFACTS_DIR/weather.env"
install -m 0600 -o root -g root "$ARTIFACTS_DIR/weather.env" "$WEATHER"
printf '[Service]\nWorkingDirectory=%s\nExecStart=\nExecStart=%s %s/dist/src/main.js\nEnvironmentFile=%s\n' "$CURRENT" "$(command -v node)" "$CURRENT" "$WEATHER" > "$DROPIN"
switch_to "$RELEASE" "$CURRENT"; switch_to "$ADMIN" "$ADMIN_CURRENT"
cp "$BACKUP/nginx.next" "$SITE"
nginx -t; systemctl daemon-reload; systemctl restart myblog-api.service; wait_api
systemctl reload nginx
node "$ARTIFACTS_DIR/smoke-search.mjs" https://api.new-universe.cn/v1/public
node "$ARTIFACTS_DIR/smoke-environment.mjs" https://api.new-universe.cn "$REQUIRE_WEATHER"
test "$(curl -fsS https://badmin.new-universe.cn/revision.txt)" = "$REVISION"
ARTIFACTS_DIR="$ARTIFACTS_DIR" bash "$ARTIFACTS_DIR/deploy-blog.sh"
BLOG_SWITCHED=true
node "$ARTIFACTS_DIR/smoke-environment.mjs" https://api.new-universe.cn "$REQUIRE_WEATHER"
trap - ERR
printf 'V2 API/admin/blog released %s; private rollback backup %s\n' "$REVISION" "$BACKUP"
