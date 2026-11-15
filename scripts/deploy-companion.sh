#!/usr/bin/env bash
# Release the matching API, frontend and same-origin proxy as one change.
set -Eeuo pipefail
umask 077
cd "${ARTIFACTS_DIR:?}"
rev="$(cat revision.txt)"
[[ "$(id -u)" == 0 && "$rev" =~ ^[a-f0-9]{40}$ ]]
previous_api="$(readlink -f /home/myblog/server-current)"
[[ "$previous_api" == /home/myblog/server-releases/* && -f "$previous_api/dist/src/main.js" ]]
keyfile="$(mktemp)"
trap 'rm -f -- "$keyfile"' EXIT
cat > "$keyfile"
api_switched=false
blog_switched=false
restore() {
  local code=$?
  trap - ERR
  set +e
  if [[ "$blog_switched" == true ]]; then bash ./deploy-blog.sh rollback; fi
  if [[ "$api_switched" == true ]]; then
    ln -s "$previous_api" "/home/myblog/.companion-rollback-$$" &&
      mv -Tf "/home/myblog/.companion-rollback-$$" /home/myblog/server-current &&
      systemctl restart myblog-api.service
    curl --retry 15 --retry-all-errors --retry-delay 1 -fsS --max-time 5 \
      http://127.0.0.1:3000/v1/health >/dev/null || echo 'API rollback health check failed' >&2
  fi
  exit "$code"
}
trap restore ERR
PRESERVE_API_UNIT=true bash ./deploy-search-server.sh
api_switched=true
bash ./deploy-blog.sh
blog_switched=true
# Verify the deployed model before activating the proxy.
curl -fsSI --max-time 30 --resolve www.new-universe.cn:443:127.0.0.1 \
  https://www.new-universe.cn/companion/v1/kitten-head.glb >/dev/null
if [[ -s "$keyfile" ]]; then
  bash ./configure-companion-production.sh apply "$keyfile"
else
  bash ./configure-companion-production.sh apply
fi
trap - ERR
printf 'Companion released %s\n' "$rev"
