#!/usr/bin/env bash
# Apply proxy changes to the active site, preserving its symlink and its previous contents.
set -Eeuo pipefail
umask 077
artifacts=$(cd -- "$(dirname -- "$0")" && pwd)
blog=https://www.new-universe.cn
api=https://api.new-universe.cn
curl_local=(curl --noproxy '*' -sS --max-time 8 --resolve www.new-universe.cn:443:127.0.0.1 --resolve api.new-universe.cn:443:127.0.0.1)

work=$(mktemp -d)
trap 'rm -f -- "$work/body" "$work/headers"; rmdir -- "$work"' EXIT
status_ok() {
  node -e 'const v=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); if(typeof v.configured!=="boolean"||v.provider!=="DeepSeek") process.exit(1)' "$work/body"
}
has_header() {
  tr -d '\r' < "$work/headers" | grep -Eix -- "$1" >/dev/null
}
browser_checks() {
  "${curl_local[@]}" -f "$blog/api/companion/status" -o "$work/body" && status_ok || return 1
  "${curl_local[@]}" -f -H "Origin: $blog" -H 'Sec-Fetch-Site: same-site' \
    -D "$work/headers" -o "$work/body" "$api/api/companion/status" && status_ok || return 1
  has_header 'Access-Control-Allow-Origin: https://www\.new-universe\.cn' || return 1
  has_header 'Access-Control-Allow-Credentials: true' || return 1
  local code
  code=$("${curl_local[@]}" -H 'Origin: https://other.example' -o /dev/null -w '%{http_code}' "$api/api/companion/status") || return 1
  [[ $code == 403 ]] || return 1
  code=$("${curl_local[@]}" -o /dev/null -w '%{http_code}' "$api/v1/public/companion/status") || return 1
  [[ $code == 403 ]] || return 1
  code=$("${curl_local[@]}" -X OPTIONS -H "Origin: $blog" -H 'Sec-Fetch-Site: same-site' \
    -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type' \
    -o /dev/null -D "$work/headers" -w '%{http_code}' "$api/api/companion/chat") || return 1
  [[ $code == 204 ]] || return 1
  has_header 'Access-Control-Allow-Origin: https://www\.new-universe\.cn' &&
    has_header 'Access-Control-Allow-Credentials: true' &&
    has_header 'Access-Control-Allow-Methods: .*POST.*' &&
    has_header 'Access-Control-Allow-Headers: .*Content-Type.*'
}
verify() {
  for attempt in {1..10}; do
    if browser_checks; then return 0; fi
    sleep 1
  done
  echo 'Companion proxy browser checks failed' >&2
  return 1
}
case "${1:-}" in
  verify) verify; exit ;;
  apply) ;;
  *) echo 'Usage: refresh-companion-proxy.sh apply|verify' >&2; exit 1 ;;
esac
site=$(readlink -e /etc/nginx/sites-enabled/myblog.conf)
[[ $(id -u) == 0 && $site == /etc/nginx/* && -f $site ]]
[[ -s /etc/nginx/snippets/myblog-companion-secret.conf ]]
install -d -m 0700 /var/backups/myblog-companion
backup=$(mktemp -d /var/backups/myblog-companion/proxy-XXXXXXXX)
cp -p -- "$site" "$backup/site.before"
node "$artifacts/patch-companion-nginx.mjs" "$site" "$backup/site.next"
atomic_replace() {
  local tmp
  tmp=$(mktemp --tmpdir="$(dirname -- "$site")" .companion-XXXXXXXX)
  cat -- "$1" > "$tmp" && chown --reference="$site" "$tmp" &&
    chmod --reference="$site" "$tmp" && mv -Tf -- "$tmp" "$site" || { rm -f -- "$tmp"; return 1; }
}
restore() {
  local rc=$?
  trap - ERR
  atomic_replace "$backup/site.before" && nginx -t && systemctl reload nginx.service ||
    echo "Proxy rollback needs attention: $backup/site.before" >&2
  exit "$rc"
}
if ! cmp -s -- "$backup/site.next" "$site"; then
  trap restore ERR
  atomic_replace "$backup/site.next"
  nginx -t
  systemctl reload nginx.service
fi
verify
trap - ERR
printf 'Verified companion proxy. Backup: %s\n' "$backup"
