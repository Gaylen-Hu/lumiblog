#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

APP_USER=myblog
APP_HOME=/home/myblog
APP_ROOT="$APP_HOME/apps"
SECRETS_FILE=/root/myblog-new-secrets.env
DATA_ROOT=/root/restore-staging/data/data
DB_DUMP="$DATA_ROOT/database/myblog-full.dump"

if [[ ! -f "$DB_DUMP" ]]; then
  echo "Missing database dump: $DB_DUMP" >&2
  exit 1
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "$APP_HOME" --shell /bin/bash "$APP_USER"
fi

install -d -m 0750 -o "$APP_USER" -g "$APP_USER" \
  "$APP_ROOT" "$APP_ROOT/server/my-blog/uploads" "$APP_ROOT/logs"

if [[ ! -f "$SECRETS_FILE" ]]; then
  DB_PASSWORD="$(openssl rand -hex 24)"
  REDIS_PASSWORD="$(openssl rand -hex 24)"
  JWT_SECRET="$(openssl rand -hex 48)"
  ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '\n' | tr '/+' '_-')"
  cat >"$SECRETS_FILE" <<EOF
DB_NAME=myblog_db
DB_USER=myblog_user
DB_PASSWORD=$DB_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
JWT_SECRET=$JWT_SECRET
ADMIN_DEFAULT_PASSWORD=$ADMIN_PASSWORD
EOF
  chmod 0600 "$SECRETS_FILE"
fi

# shellcheck disable=SC1090
source "$SECRETS_FILE"

REDIS_CONF=/etc/redis/redis.conf
cp -an "$REDIS_CONF" "$REDIS_CONF.clean-install"
sed -ri 's/^bind .*/bind 127.0.0.1 ::1/' "$REDIS_CONF"
sed -ri 's/^protected-mode .*/protected-mode yes/' "$REDIS_CONF"
if grep -Eq '^# *requirepass ' "$REDIS_CONF"; then
  sed -ri "s/^# *requirepass .*/requirepass $REDIS_PASSWORD/" "$REDIS_CONF"
elif grep -Eq '^requirepass ' "$REDIS_CONF"; then
  sed -ri "s/^requirepass .*/requirepass $REDIS_PASSWORD/" "$REDIS_CONF"
else
  printf '\nrequirepass %s\n' "$REDIS_PASSWORD" >>"$REDIS_CONF"
fi
systemctl restart redis-server
REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping | grep -qx PONG

runuser -u postgres -- psql -v ON_ERROR_STOP=1 \
  -v db_user="$DB_USER" -v db_password="$DB_PASSWORD" -v db_name="$DB_NAME" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'db_user', :'db_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'db_user') \gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'db_user', :'db_password') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db_name') \gexec
SQL

TABLE_COUNT="$(runuser -u postgres -- psql -Atqc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" "$DB_NAME")"
if [[ "$TABLE_COUNT" == "0" ]]; then
  PG_RESTORE_DUMP=/var/lib/postgresql/myblog-full.dump
  install -m 0600 -o postgres -g postgres "$DB_DUMP" "$PG_RESTORE_DUMP"
  runuser -u postgres -- pg_restore --exit-on-error --no-owner --no-acl \
    --role="$DB_USER" --dbname="$DB_NAME" "$PG_RESTORE_DUMP"
  rm -f "$PG_RESTORE_DUMP"
fi

runuser -u postgres -- psql -v ON_ERROR_STOP=1 "$DB_NAME" <<SQL
ALTER SCHEMA public OWNER TO "$DB_USER";
GRANT ALL ON SCHEMA public TO "$DB_USER";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "$DB_USER";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "$DB_USER";
SQL

cat >"$APP_ROOT/.env" <<EOF
NODE_ENV=prod
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME?schema=public
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d
JWT_MAX_SESSIONS=5
ADMIN_DEFAULT_PASSWORD=$ADMIN_DEFAULT_PASSWORD
CORS_ORIGINS=https://www.new-universe.cn,https://badmin.new-universe.cn
SITE_URL=https://www.new-universe.cn
SITE_NAME='New Universe'
BASE_URL=https://api.new-universe.cn
UPLOAD_DIR=$APP_ROOT/server/my-blog/uploads
EOF
chmod 0600 "$APP_ROOT/.env"
chown "$APP_USER:$APP_USER" "$APP_ROOT/.env"

if [[ -d "$DATA_ROOT/uploads" ]]; then
  rsync -a --chown="$APP_USER:$APP_USER" "$DATA_ROOT/uploads/" \
    "$APP_ROOT/server/my-blog/uploads/"
fi

echo RESTORE_READY
runuser -u postgres -- psql -Atqc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" "$DB_NAME"
runuser -u postgres -- psql -Atqc \
  "SELECT table_name || E'\t' || (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name" "$DB_NAME"
ss -lntup
