#!/usr/bin/env bash
# Frontend-only deployment. Never changes current/, API/admin services or a database.
set -Eeuo pipefail
umask 027
APP_HOME="${APP_HOME:-/home/myblog}"
APP_USER="${APP_USER:-myblog}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-/tmp/blog-frontend}"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-enabled/myblog.conf}"
ACTION="${1:-deploy}"
CURRENT="$APP_HOME/blog-current"
DROPIN=/etc/systemd/system/blog-web.service.d/20-blog-release.conf
SWITCHED=false
CONFIG_CHANGED=false
DROPIN_CHANGED=false
PREVIOUS=''
WORK=''
fail() { printf '[blog] ERROR: %s\n' "$*" >&2; exit 1; }
valid_target() { [[ -d "$1" && "$1" == "$(readlink -f -- "$1")" && ( "$1" == "$APP_HOME/blog-releases/"* || "$1" == "$APP_HOME/releases/"*/blog ) ]]; }
wait_blog() {
  for attempt in $(seq 1 20); do
    if curl -fsS --max-time 5 http://127.0.0.1:3001/zh >/dev/null; then return 0; fi
    sleep 1
  done
  return 1
}
switch_to() {
  ln -s "$1" "$APP_HOME/.blog-switch-$$"
  chown -h "$APP_USER:$APP_USER" "$APP_HOME/.blog-switch-$$"
  mv -Tf "$APP_HOME/.blog-switch-$$" "$CURRENT"
}
rollback_error() {
  local code=$?
  trap - ERR
  set +e
  if [[ "$CONFIG_CHANGED" == true ]]; then cp -p "$WORK/nginx.before" "$NGINX_SITE"; fi
  if [[ "$SWITCHED" == true && -n "$PREVIOUS" ]]; then switch_to "$PREVIOUS"; fi
  if [[ "$DROPIN_CHANGED" == true ]]; then
    if [[ -f "$WORK/dropin.before" ]]; then cp -p "$WORK/dropin.before" "$DROPIN"; else rm -f -- "$DROPIN"; fi
  fi
  systemctl daemon-reload
  systemctl restart blog-web.service
  nginx -t && systemctl reload nginx.service
  wait_blog || printf '[blog] CRITICAL: previous frontend also failed health check\n' >&2
  printf '[blog] Release failed; previous frontend/config restored. Backups: %s\n' "$WORK" >&2
  exit "$code"
}
[[ "$(id -u)" == 0 ]] || fail 'Run as root'
for command in node tar curl systemctl nginx readlink install; do command -v "$command" >/dev/null || fail "Missing $command"; done
[[ "$APP_HOME" == /home/* && "$APP_HOME" != *..* ]] || fail 'Unexpected application root'
APP_HOME="$(readlink -f "$APP_HOME")"
if [[ -L "$CURRENT" ]]; then PREVIOUS="$(readlink -f "$CURRENT")"
else PREVIOUS="$(readlink -f "$APP_HOME/current/blog")"; fi
valid_target "$PREVIOUS" || fail 'Existing frontend release not found; manual setup required'
[[ ! -e "$CURRENT" || -L "$CURRENT" ]] || fail 'blog-current must be a symlink'
if [[ "$ACTION" == rollback ]]; then
  [[ -L "$CURRENT" ]] || fail 'No frontend release to roll back'
  TARGET="$(cat "$PREVIOUS/previous-release.txt")"
  valid_target "$TARGET" || fail 'Invalid rollback target'
  switch_to "$TARGET"
  if ! systemctl restart blog-web.service || ! wait_blog; then switch_to "$PREVIOUS"; systemctl restart blog-web.service; fail 'Rollback failed; restored current frontend'; fi
  printf '[blog] Rolled back frontend to %s\n' "$TARGET"
  exit 0
fi
[[ "$ACTION" == deploy ]] || fail 'Usage: deploy-blog.sh [deploy|rollback]'
[[ -f "$ARTIFACTS_DIR/blog.tar.gz" && -f "$NGINX_SITE" ]] || fail 'Artifact or existing Nginx site missing'
REVISION="$(cat "$ARTIFACTS_DIR/revision.txt")"
[[ "$REVISION" =~ ^[a-f0-9]{40}$ ]] || fail 'Invalid release revision'
tar -tzf "$ARTIFACTS_DIR/blog.tar.gz" > "$ARTIFACTS_DIR/archive-files.txt"
if grep -Eq '(^/|(^|/)\.\.(/|$))' "$ARTIFACTS_DIR/archive-files.txt"; then fail 'Unsafe archive path'; fi
RELEASE="$APP_HOME/blog-releases/$(date -u +%Y%m%d_%H%M%S)-${REVISION:0:12}"
[[ ! -e "$RELEASE" ]] || fail 'Release already exists'
install -d -m 0750 -o "$APP_USER" -g "$APP_USER" "$RELEASE"
tar --no-same-owner -xzf "$ARTIFACTS_DIR/blog.tar.gz" -C "$RELEASE"
[[ -f "$RELEASE/server.js" && -f "$RELEASE/blog-release.json" ]] || fail 'Incomplete standalone package'
node -e 'const m=require(process.argv[1]); if(m.revision!==process.argv[2])process.exit(1)' "$RELEASE/blog-release.json" "$REVISION"
printf '%s\n' "$PREVIOUS" > "$RELEASE/previous-release.txt"
chown -R "$APP_USER:$APP_USER" "$RELEASE"
WORK="$(mktemp -d "$APP_HOME/blog-backup-XXXXXXXX")"
cp -p "$NGINX_SITE" "$WORK/nginx.before"
if [[ -f "$DROPIN" ]]; then cp -p "$DROPIN" "$WORK/dropin.before"; fi
node "$ARTIFACTS_DIR/patch-blog-nginx.mjs" "$NGINX_SITE" "$WORK/nginx.next"
trap rollback_error ERR
install -d /etc/systemd/system/blog-web.service.d
DROPIN_CHANGED=true
printf '[Service]\nWorkingDirectory=%s\n' "$CURRENT" > "$DROPIN"
switch_to "$RELEASE"
SWITCHED=true
systemctl daemon-reload
systemctl restart blog-web.service
wait_blog
node "$ARTIFACTS_DIR/smoke-blog.mjs" http://127.0.0.1:3001 "$REVISION"
CONFIG_CHANGED=true
cat "$WORK/nginx.next" > "$NGINX_SITE"
nginx -t
systemctl reload nginx.service
# Exercise the actual virtual host and TLS route, not just the upstream port.
for route in '/zh' '/api/study/reading?path=%2Fzh%2Ftimeline' '/api/study/search?q=Flutter&page=1&locale=zh' '/study-assets/daylight/garden.webp'; do
  printf '[blog] HTTPS check %s\n' "$route"
  # nginx reload returns before all workers have adopted the new configuration.
  curl -fsS --retry 10 --retry-all-errors --retry-delay 1 --max-time 30 --resolve www.new-universe.cn:443:127.0.0.1 "https://www.new-universe.cn$route" >/dev/null
done
curl -fsS --max-time 30 --resolve www.new-universe.cn:443:127.0.0.1 'https://www.new-universe.cn/api/study/reading?path=%2Fzh%2Ftimeline' \
  | node -e 'let s="";process.stdin.on("data",x=>s+=x).on("end",()=>{if(JSON.parse(s).kind!=="timeline")process.exit(1)})'
curl -fsS --max-time 30 --resolve www.new-universe.cn:443:127.0.0.1 'https://www.new-universe.cn/api/study/search?q=Flutter&page=1&locale=zh' \
  | node -e 'let s="";process.stdin.on("data",x=>s+=x).on("end",()=>{if(!Array.isArray(JSON.parse(s).data))process.exit(1)})'
LIVE_REVISION="$(curl -fsS --resolve www.new-universe.cn:443:127.0.0.1 https://www.new-universe.cn/blog-release.json)"
printf '%s' "$LIVE_REVISION" | node -e 'let s=""; process.stdin.on("data",x=>s+=x).on("end",()=>{if(JSON.parse(s).revision!==process.argv[1])process.exit(1)})' "$REVISION"
trap - ERR
printf '[blog] Released %s; previous %s; config backup %s\n' "$REVISION" "$PREVIOUS" "$WORK"
