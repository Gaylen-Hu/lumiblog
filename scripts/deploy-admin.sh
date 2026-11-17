#!/usr/bin/env bash
# Deploy the existing static admin over its live symlink, without modifying Nginx or the DB.
set -Eeuo pipefail
umask 027
home=/home/myblog
current="$home/admin-current"
artifacts="${ARTIFACTS_DIR:?}"
revision="$(cat "$artifacts/revision.txt")"
[[ "$(id -u)" == 0 && "$revision" =~ ^[a-f0-9]{40}$ && -L "$current" ]]
previous="$(readlink -f "$current")"
[[ "$previous" == "$home/admin-releases/"* && -f "$previous/dist/index.html" ]]
next="$(mktemp -d "$home/admin-releases/$(date -u +%Y%m%d_%H%M%S)-${revision:0:12}-XXXX")"
tar -tzf "$artifacts/admin.tar.gz" > "$artifacts/admin-files.txt"
if grep -Eq '(^/|(^|/)\.\.(/|$))' "$artifacts/admin-files.txt"; then exit 1; fi
tar --no-same-owner -xzf "$artifacts/admin.tar.gz" -C "$next"
test -s "$next/dist/index.html"
printf '%s\n' "$revision" > "$next/dist/revision.txt"
printf '%s\n' "$previous" > "$next/previous-release.txt"
chown -R myblog:myblog "$next"
chmod 0755 "$next"
chmod -R a+rX "$next/dist"
switch_to() { ln -s "$1" "$home/.admin-switch-$$"; mv -Tf "$home/.admin-switch-$$" "$current"; }
switch_to "$next"
trap 'switch_to "$previous"' ERR
base=https://badmin.new-universe.cn
check=(curl --max-time 15 --resolve badmin.new-universe.cn:443:127.0.0.1 -fsS)
test "$("${check[@]}" "$base/revision.txt")" = "$revision"
"${check[@]}" "$base/" > "$artifacts/admin-index.html"
asset="$(node -e 'const html=require("fs").readFileSync(process.argv[1],"utf8");const src=html.match(/<script\b[^>]*\bsrc="([^":]+\.js)"/i)?.[1];if(!src)process.exit(1);console.log(new URL(src,process.argv[2]).pathname)' "$artifacts/admin-index.html" "$base")"
"${check[@]}" "$base$asset" >/dev/null
trap - ERR
printf 'Admin released %s\n' "$revision"
