#!/bin/bash

# ========================================
# 远程部署脚本 — 仅解压产物 + 重启服务
# 构建已在 CI 完成，服务器不做任何编译
# ========================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
PROJECT_ROOT="${PROJECT_ROOT:-/home/myblog}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-/tmp/blog-deploy}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
BLOG_PORT="${BLOG_PORT:-3001}"
ADMIN_PORT="${ADMIN_PORT:-8002}"
MCP_PORT="${MCP_PORT:-4000}"

# 备份目录（用于回滚）
BACKUP_DIR="$PROJECT_ROOT/_backups/$(date +%Y%m%d_%H%M%S)"

log_info()  { echo -e "${GREEN}[INFO]${NC} $(date '+%H:%M:%S') $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $(date '+%H:%M:%S') $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $1" >&2; }
log_step()  { echo -e "\n${BLUE}══════ $1 ══════${NC}"; }

DEPLOY_FAILED=false

cleanup_on_error() {
    local exit_code=$?
    if [ "$DEPLOY_FAILED" = "true" ]; then return; fi
    if [ $exit_code -ne 0 ]; then
        DEPLOY_FAILED=true
        log_error "部署失败（退出码: $exit_code），备份在: $BACKUP_DIR"
        log_error "可手动回滚: cp -r $BACKUP_DIR/* 对应目录"
    fi
}
trap cleanup_on_error EXIT

# 统一环境变量文件
ENV_FILE="$PROJECT_ROOT/apps/.env"

# ========================================
# 前置检查
# ========================================
log_step "前置检查"

for cmd in pm2 node; do
    if ! command -v "$cmd" &> /dev/null; then
        log_error "缺少命令: $cmd"
        exit 1
    fi
done

for f in server.tar.gz admin.tar.gz blog.tar.gz; do
    if [ ! -f "$ARTIFACTS_DIR/$f" ]; then
        log_error "产物不存在: $ARTIFACTS_DIR/$f"
        exit 1
    fi
done

if [ ! -f "$ENV_FILE" ]; then
    log_error "统一环境变量文件不存在: $ENV_FILE"
    log_error "请先创建该文件，包含所有应用的环境变量"
    exit 1
fi

log_info "环境变量文件: $ENV_FILE"
log_info "产物大小:"
ls -lh "$ARTIFACTS_DIR"/*.tar.gz

# ========================================
# 备份当前版本
# ========================================
log_step "备份当前版本"
mkdir -p "$BACKUP_DIR"

# 后端备份
if [ -d "$PROJECT_ROOT/apps/server/my-blog/dist" ]; then
    mkdir -p "$BACKUP_DIR/server"
    cp -r "$PROJECT_ROOT/apps/server/my-blog/dist" "$BACKUP_DIR/server/"
    log_info "后端已备份"
fi

# 管理后台备份
if [ -d "$PROJECT_ROOT/apps/admin-web/myapp/dist" ]; then
    mkdir -p "$BACKUP_DIR/admin"
    cp -r "$PROJECT_ROOT/apps/admin-web/myapp/dist" "$BACKUP_DIR/admin/"
    log_info "管理后台已备份"
fi

# 博客备份
if [ -d "$PROJECT_ROOT/apps/blog-web/blog_web/.next" ]; then
    mkdir -p "$BACKUP_DIR/blog"
    cp -r "$PROJECT_ROOT/apps/blog-web/blog_web/.next" "$BACKUP_DIR/blog/"
    log_info "博客前端已备份"
fi

# 只保留最近 3 个备份
cd "$PROJECT_ROOT/_backups" 2>/dev/null && ls -dt */ | tail -n +4 | xargs rm -rf 2>/dev/null || true

# ========================================
# 1. 部署后端 (NestJS)
# ========================================
log_step "1/5 部署后端 (NestJS)"

SERVER_DIR="$PROJECT_ROOT/apps/server/my-blog"
mkdir -p "$SERVER_DIR"

log_info "解压后端产物..."
cd "$SERVER_DIR"

# 保存 uploads 目录
if [ -d "uploads" ]; then
    mv uploads /tmp/_uploads_backup 2>/dev/null || true
fi

# 清理旧文件，解压新产物
rm -rf dist prisma package.json pnpm-lock.yaml prisma.config.ts .npmrc
tar -xzf "$ARTIFACTS_DIR/server.tar.gz" -C .

# 恢复 uploads
if [ -d "/tmp/_uploads_backup" ]; then
    mv /tmp/_uploads_backup uploads
fi

# 从统一 .env 分发（NestJS 生产环境读 .env.prod）
log_info "分发环境变量 → .env.prod"
cp "$ENV_FILE" "$SERVER_DIR/.env.prod"

# 安装依赖（不做编译，只下载和链接，对服务器压力很小）
log_info "安装后端依赖..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# 生成 Prisma Client
log_info "生成 Prisma Client..."
export $(grep -v '^#' "$SERVER_DIR/.env.prod" | grep -E '^DATABASE_URL=' | xargs)
npx prisma generate

# 执行数据库迁移
log_info "执行数据库迁移..."
node_modules/.bin/prisma migrate deploy 2>&1 || log_warn "无待执行迁移或迁移失败"
unset DATABASE_URL

# 重启后端
if pm2 list | grep -q "my-blog-api"; then
    log_info "重载后端服务..."
    pm2 reload my-blog-api || pm2 restart my-blog-api
else
    log_info "首次启动后端服务, 端口: $BACKEND_PORT..."
    NODE_ENV=prod pm2 start dist/src/main.js \
        --name my-blog-api \
        --max-memory-restart 300M \
        --node-args="--max-old-space-size=256" \
        --log-date-format "YYYY-MM-DD HH:mm:ss"
fi

log_info "后端部署完成"

# ========================================
# 2. 部署管理后台 (Ant Design Pro)
# ========================================
log_step "2/5 部署管理后台 (Admin)"

ADMIN_DIR="$PROJECT_ROOT/apps/admin-web/myapp"
mkdir -p "$ADMIN_DIR"

log_info "解压管理后台产物..."
rm -rf "$ADMIN_DIR/dist"
tar -xzf "$ARTIFACTS_DIR/admin.tar.gz" -C "$ADMIN_DIR"

# 写入 serve 启动脚本
cat > "$ADMIN_DIR/dist/serve.cjs" << 'SERVEOF'
const { spawn } = require('child_process');
const path = require('path');
const distPath = path.resolve(__dirname);
const port = process.env.ADMIN_PORT || '8002';
const child = spawn('serve', [distPath, '-l', port, '-s'], {
  stdio: 'inherit', shell: true
});
child.on('error', (err) => { console.error('Failed to start serve:', err); process.exit(1); });
child.on('exit', (code) => { process.exit(code || 0); });
SERVEOF

if pm2 list | grep -q "admin-web"; then
    log_info "重载管理后台..."
    pm2 reload admin-web || pm2 restart admin-web
else
    log_info "首次启动管理后台, 端口: $ADMIN_PORT..."
    if ! command -v serve &> /dev/null; then
        npm install -g serve
    fi
    ADMIN_PORT=$ADMIN_PORT pm2 start "$ADMIN_DIR/dist/serve.cjs" \
        --name admin-web \
        --cwd "$ADMIN_DIR" \
        --max-memory-restart 256M \
        --log-date-format "YYYY-MM-DD HH:mm:ss"
fi

log_info "管理后台部署完成"

# ========================================
# 3. 部署博客前端 (Next.js standalone)
# ========================================
log_step "3/5 部署博客前端 (Next.js)"

BLOG_DIR="$PROJECT_ROOT/apps/blog-web/blog_web"
BLOG_STANDALONE="$BLOG_DIR/_standalone"

log_info "解压博客前端产物..."

# 清理旧 standalone 目录，解压新的
rm -rf "$BLOG_STANDALONE"
mkdir -p "$BLOG_STANDALONE"
tar -xzf "$ARTIFACTS_DIR/blog.tar.gz" -C "$BLOG_STANDALONE"

# 从统一 .env 分发（Next.js 读 .env.local）
log_info "分发环境变量 → .env.local"
cp "$ENV_FILE" "$BLOG_STANDALONE/.env.local"

if pm2 list | grep -q "blog-web"; then
    log_info "重载博客前端..."
    pm2 reload blog-web || pm2 restart blog-web
else
    log_info "首次启动博客前端, 端口: $BLOG_PORT..."
    PORT=$BLOG_PORT HOSTNAME=0.0.0.0 pm2 start "$BLOG_STANDALONE/server.js" \
        --name blog-web \
        --cwd "$BLOG_STANDALONE" \
        --max-memory-restart 300M \
        --log-date-format "YYYY-MM-DD HH:mm:ss"
fi

log_info "博客前端部署完成"

# ========================================
# 4. MCP Server（如果有产物）
# ========================================
log_step "4/5 MCP Server"

if [ -f "$ARTIFACTS_DIR/mcp.tar.gz" ]; then
    MCP_DIR="$PROJECT_ROOT/mcp-server"
    mkdir -p "$MCP_DIR"
    rm -rf "$MCP_DIR/dist" "$MCP_DIR/node_modules"
    tar -xzf "$ARTIFACTS_DIR/mcp.tar.gz" -C "$MCP_DIR"

    if pm2 list | grep -q "blog-mcp-server"; then
        pm2 reload blog-mcp-server || pm2 restart blog-mcp-server
    else
        TRANSPORT=http PORT=$MCP_PORT BLOG_API_URL=http://localhost:$BACKEND_PORT \
        pm2 start "$MCP_DIR/dist/index.js" \
            --name blog-mcp-server \
            --max-memory-restart 256M \
            --log-date-format "YYYY-MM-DD HH:mm:ss"
    fi
    log_info "MCP Server 部署完成"
else
    log_warn "无 MCP Server 产物，跳过"
fi

# ========================================
# 5. Nginx + 保存状态
# ========================================
log_step "5/5 收尾"

if command -v nginx &> /dev/null; then
    if nginx -t 2>&1; then
        systemctl is-active --quiet nginx 2>/dev/null && systemctl reload nginx && log_info "Nginx 已重载"
    else
        log_warn "Nginx 配置有误，请检查"
    fi
fi

pm2 save
echo ""
pm2 list

echo ""
log_info "════════════════════════════════════"
log_info "部署完成！"
log_info "  后端 API:   http://localhost:$BACKEND_PORT"
log_info "  博客前端:   http://localhost:$BLOG_PORT"
log_info "  管理后台:   http://localhost:$ADMIN_PORT"
log_info "  备份位置:   $BACKUP_DIR"
log_info "  部署时间:   $(date '+%Y-%m-%d %H:%M:%S')"
log_info "════════════════════════════════════"

DEPLOY_FAILED=true  # 防止 EXIT trap 误触发
