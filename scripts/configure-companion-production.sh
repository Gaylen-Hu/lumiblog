#!/usr/bin/env bash
# Run as root after the compatible API and frontend releases are selected.
set -Eeuo pipefail
set +x
umask 077
config=/etc/myblog/companion.env
unit=/etc/systemd/system/myblog-api.service.d/90-companion.conf
snippet=/etc/nginx/snippets/myblog-companion-secret.conf
state=/var/lib/myblog/companion
backups=/var/backups/myblog-companion
site=/etc/nginx/sites-enabled/myblog.conf
artifacts=${ARTIFACTS_DIR:-$(dirname -- "$0")}
die() { printf '%s\n' "$*" >&2; exit 1; }
[[ $(id -u) == 0 ]] || die 'Companion configuration requires root'

restore_file() {
  if [[ -f "$backup/$1.before" ]]; then
    cp -p -- "$backup/$1.before" "$2"
  else
    rm -f -- "$2"
  fi
}
restore() {
  local result=0
  restore_file config "$config" || result=1
  restore_file unit "$unit" || result=1
  restore_file snippet "$snippet" || result=1
  cp -p -- "$backup/nginx.before" "$site" || result=1
  systemctl daemon-reload || result=1
  systemctl restart myblog-api.service && wait_api || result=1
  nginx -t && systemctl reload nginx.service || result=1
  return "$result"
}
wait_api() {
  for attempt in {1..30}; do
    if curl -fsS --max-time 3 http://127.0.0.1:3000/v1/health >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}
check_proxy() {
  # Nginx can briefly keep old workers after a successful reload.
  local origin=https://www.new-universe.cn
  for attempt in {1..12}; do
    if curl -fsS --max-time 5 --resolve www.new-universe.cn:443:127.0.0.1 "$origin/api/companion/status" |
        node -e 'let s="";process.stdin.on("data",x=>s+=x).on("end",()=>{try {const v=JSON.parse(s);if(v.provider!=="DeepSeek"||v.configured!==(process.argv[1]==="present"))process.exitCode=1}catch{process.exitCode=1}})' "$expected_model"; then return 0; fi
    sleep 1
  done
  return 1
}
case "${1:-}" in
  rollback)
    backup="${2:?Expected a backup directory}"
    [[ $(readlink -f -- "$backup") == "$backup" && ${backup%/*} == "$backups" &&
       $(stat -c '%u:%a' "$backup") == 0:700 && -f "$backup/ready" ]] ||
      die 'Unrecognized companion backup'
    restore
    exit
    ;;
  apply) [[ $# -le 2 ]] || die 'Expected at most one protected model key file' ;;
  *) die 'Usage: configure-companion-production.sh apply [private-key-file] | rollback backup-directory' ;;
esac

api_user=$(systemctl show myblog-api.service -p User --value)
[[ "$api_user" == myblog ]] || die 'Unexpected API service account'
api_dir=$(systemctl show myblog-api.service -p WorkingDirectory --value)
[[ -d "$api_dir" ]] || die 'API working directory unavailable'
[[ -f "$site" ]] || die 'Active blog Nginx site not found'
for file in "$config" "$unit" "$snippet"; do
  [[ ! -L "$file" && ( ! -e "$file" || -f "$file" ) ]] || die 'Unexpected configuration file type'
done
install -d -m 0700 "$backups"
backup=$(mktemp -d "$backups/release-XXXXXXXX")
for name in config unit snippet; do
  file=${!name}
  if [[ -f "$file" ]]; then cp -p -- "$file" "$backup/$name.before"; fi
done
cp -p -- "$site" "$backup/nginx.before"
node "$artifacts/patch-companion-nginx.mjs" "$site" "$backup/nginx.next"
touch "$backup/ready"
[[ -d /etc/myblog ]] || install -d -m 0755 /etc/myblog
install -d -m 0755 /etc/systemd/system/myblog-api.service.d /etc/nginx/snippets
[[ ! -L "$state" ]] || die 'Unexpected companion state symlink'
install -d -m 0700 -o "$api_user" -g "$(id -gn "$api_user")" "$state"

# Use only CAT_AGENT fields. The administrator's other AI credentials are unrelated.
# Restrict emitted values to literal single-line tokens understood by both consumers.
python3 - "$backup" "$api_dir" "$config" "${2:-}" <<'PY'
from pathlib import Path
import re, secrets, stat, sys
out, app, config = map(Path, sys.argv[1:4])
def fields(path):
    if not path.is_file():
        return {}
    result = {}
    for line in path.read_text().splitlines():
        name, eq, value = line.partition("=")
        if eq and name in {"CAT_AGENT_API_KEY", "CAT_AGENT_MODEL", "CAT_AGENT_COOKIE_SECRET", "CAT_AGENT_PROXY_TOKEN", "CAT_AGENT_PROVIDER"}:
            value = value.strip()
            if len(value) > 1 and value[0] == value[-1] and value[0] in ('"', "'"):
                value = value[1:-1]
            result[name] = value
    return result

existing = {}
for source in (app / ".env.prod", Path("/home/myblog/apps/.env"), config):
    existing.update({k: v for k, v in fields(source).items() if v})
key = existing.get("CAT_AGENT_API_KEY", "")
if existing.get("CAT_AGENT_PROVIDER", "deepseek") != "deepseek" and key:
    sys.exit("Existing companion credential belongs to another provider")
if not key and sys.argv[4]:
    source = Path(sys.argv[4])
    st = source.lstat()
    if not source.is_absolute() or not stat.S_ISREG(st.st_mode) or st.st_uid or st.st_mode & 0o077:
        sys.exit("The replacement key must be an absolute root-owned private file")
    key = source.read_text().strip()
if key and not re.fullmatch(r"[A-Za-z0-9._-]{8,512}", key):
    sys.exit("Unexpected format for companion model credential")
model = existing.get("CAT_AGENT_MODEL") or "deepseek-flash"
if not re.fullmatch(r"[A-Za-z0-9._/-]{1,128}", model):
    sys.exit("Unexpected companion model name")
def secret(name):
    value = existing.get(name) or secrets.token_hex(48)
    if not re.fullmatch(r"[A-Za-z0-9._+/=-]{32,512}", value):
        sys.exit("Unexpected format for " + name)
    return value
cookie = secret("CAT_AGENT_COOKIE_SECRET")
proxy = secret("CAT_AGENT_PROXY_TOKEN")
if cookie == proxy:
    sys.exit("Cookie and proxy secrets must differ")
values = dict(CAT_COMPANION_ENABLED="true", CAT_AGENT_MODE="production",
              CAT_AGENT_ALLOWED_ORIGINS="https://www.new-universe.cn",
              CAT_AGENT_STATE_DIR="/var/lib/myblog/companion",
              CAT_AGENT_COOKIE_SECRET=cookie, CAT_AGENT_PROXY_TOKEN=proxy,
              CAT_AGENT_PROVIDER="deepseek", CAT_AGENT_BASE_URL="https://api.deepseek.com",
              CAT_AGENT_MODEL=model, CAT_AGENT_API_KEY=key)
(out / "config.next").write_text("".join(f"{k}={v}\n" for k, v in values.items()))
(out / "snippet.next").write_text(f'set $companion_proxy_token "{proxy}";\n')
(out / "model-status").write_text("present" if key else "missing")
PY
expected_model=$(cat "$backup/model-status")
printf '[Service]\nEnvironmentFile=%s\nReadWritePaths=%s\n' "$config" "$state" > "$backup/unit.next"
trap 'rc=$?; trap - ERR; if ! restore; then printf "Companion rollback needs attention: %s\n" "$backup" >&2; fi; exit "$rc"' ERR
install -m 0600 "$backup/config.next" "$config"
install -m 0600 "$backup/snippet.next" "$snippet"
install -m 0644 "$backup/unit.next" "$unit"
cat "$backup/nginx.next" > "$site"
nginx -t
systemctl daemon-reload
systemctl restart myblog-api.service
wait_api
systemctl reload nginx.service
check_proxy
bash "$artifacts/refresh-companion-proxy.sh" verify
denied=$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/v1/public/companion/status)
[[ "$denied" == 403 ]]
trap - ERR
rm -f -- "$backup/config.next" "$backup/snippet.next" "$backup/unit.next"
printf 'COMPANION_CONFIG_BACKUP=%s\n' "$backup"
printf 'COMPANION_MODEL_KEY=%s\n' "$expected_model"
