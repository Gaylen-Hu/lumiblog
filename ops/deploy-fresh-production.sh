#!/usr/bin/env bash
set -Eeuo pipefail

umask 027

APP_USER=myblog
APP_HOME=/home/myblog
ENV_FILE="$APP_HOME/apps/.env"
ARTIFACTS_DIR=/tmp/blog-deploy
RELEASE_ID="$(date +%Y%m%d_%H%M%S)"
RELEASE_DIR="$APP_HOME/releases/$RELEASE_ID"

for file in server.tar.gz admin.tar.gz blog.tar.gz; do
  [[ -f "$ARTIFACTS_DIR/$file" ]] || { echo "Missing $file" >&2; exit 1; }
done
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }

install -d -m 0750 -o "$APP_USER" -g "$APP_USER" \
  "$APP_HOME/releases" "$RELEASE_DIR/server" "$RELEASE_DIR/admin" "$RELEASE_DIR/blog"

tar -xzf "$ARTIFACTS_DIR/server.tar.gz" -C "$RELEASE_DIR/server"
tar -xzf "$ARTIFACTS_DIR/admin.tar.gz" -C "$RELEASE_DIR/admin"
tar -xzf "$ARTIFACTS_DIR/blog.tar.gz" -C "$RELEASE_DIR/blog"
chown -R "$APP_USER:$APP_USER" "$RELEASE_DIR"

cp "$ENV_FILE" "$RELEASE_DIR/server/.env"
cp "$ENV_FILE" "$RELEASE_DIR/server/.env.prod"
chown "$APP_USER:$APP_USER" "$RELEASE_DIR/server/.env" "$RELEASE_DIR/server/.env.prod"
chmod 0600 "$RELEASE_DIR/server/.env" "$RELEASE_DIR/server/.env.prod"

runuser -u "$APP_USER" -- env HOME="$APP_HOME" bash -lc \
  "cd '$RELEASE_DIR/server' && pnpm install --frozen-lockfile && pnpm exec prisma generate"

DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' "$ENV_FILE")"
ADMIN_PASSWORD="$(sed -n 's/^ADMIN_DEFAULT_PASSWORD=//p' "$ENV_FILE")"

runuser -u "$APP_USER" -- env HOME="$APP_HOME" DATABASE_URL="$DATABASE_URL" bash -lc \
  "cd '$RELEASE_DIR/server' && pnpm exec prisma migrate deploy"

(
  cd "$RELEASE_DIR/server"
  runuser -u "$APP_USER" -- env \
    DATABASE_URL="$DATABASE_URL" ADMIN_DEFAULT_PASSWORD="$ADMIN_PASSWORD" \
    node -e "const bcrypt=require('bcrypt'); const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); (async()=>{const h=await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD,12); const r=await p.user.updateMany({where:{role:'ADMIN'},data:{password:h}}); if(r.count<1) throw new Error('No admin account found'); console.log('ADMIN_PASSWORD_ROTATED='+r.count)})().finally(()=>p.\$disconnect())"
)

ln -sfn "$RELEASE_DIR" "$APP_HOME/current"
chown -h "$APP_USER:$APP_USER" "$APP_HOME/current"

cat >/etc/systemd/system/myblog-api.service <<EOF
[Unit]
Description=MyBlog API
After=network.target postgresql.service redis-server.service
Requires=postgresql.service redis-server.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_HOME/current/server
EnvironmentFile=$ENV_FILE
Environment=NODE_ENV=prod
ExecStart=/usr/bin/node dist/src/main.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

cat >/etc/systemd/system/blog-web.service <<EOF
[Unit]
Description=MyBlog Next.js frontend
After=network.target myblog-api.service
Wants=myblog-api.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_HOME/current/blog
EnvironmentFile=$ENV_FILE
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now myblog-api.service blog-web.service

sleep 3
systemctl --no-pager --full status myblog-api.service blog-web.service
curl -fsS http://127.0.0.1:3000/v1/public/site-config >/dev/null
curl -fsS http://127.0.0.1:3001/ >/dev/null

find "$APP_HOME/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
  | sort -nr | tail -n +4 | cut -d' ' -f2- >"$APP_HOME/.old-releases"

echo "DEPLOY_READY=$RELEASE_ID"
