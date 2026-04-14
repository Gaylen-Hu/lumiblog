#!/bin/bash

# ========================================
# 部署脚本 - 从git拉取代码，构建并使用pm2部署所有服务
# ========================================

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ========================================
# 配置项（可通过环境变量覆盖）
# ========================================
PROJECT_ROOT="${PROJECT_ROOT:-/root/myblog}"
GIT_BRANCH="${GIT_BRANCH:-main}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
BLOG_PORT="${BLOG_PORT:-3001}"
ADMIN_PORT="${ADMIN_PORT:-8002}"
MCP_PORT="${MCP_PORT:-4000}"
SKIP_GIT="${SKIP_GIT:-false}"
MIN_DISK_MB="${MIN_DISK_MB:-2048}"  # 最少需要 2GB 可用磁盘

# 回滚用：记录部署前的 commit
ROLLBACK_COMMIT=""
DEPLOY_FAILED=false

# 日志函数
log_info() { echo -e "${GREEN}[INFO]${NC} $(date '+%H:%M:%S') $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%H:%M:%S') $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $1" >&2; }
log_step() {
    echo -e ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}======================================${NC}"
}

# ========================================
# 健康检查函数
# ========================================
health_check() {
    local name="$1"
    local url="$2"
    local max_retries="${3:-15}"
    local sleep_sec="${4:-2}"

    log_info "等待 $name 启动..."
    for i in $(seq 1 "$max_retries"); do
        if curl -sf "$url" > /dev/null 2>&1; then
            log_info "$name 健康检查通过"
            return 0
        fi
        if [ "$i" -eq "$max_retries" ]; then
            log_warn "$name 健康检查超时（${max_retries}次尝试），请手动确认: pm2 logs $name"
            return 1
        fi
        sleep "$sleep_sec"
    done
}

# ========================================
# 回滚函数
# ========================================
rollback() {
    if [ -z "$ROLLBACK_COMMIT" ]; then
        log_error "无回滚点，无法自动回滚"
        return 1
    fi

    log_error "部署失败，开始回滚到 commit: $ROLLBACK_COMMIT"

    cd "$PROJECT_ROOT"
    git reset --hard "$ROLLBACK_COMMIT"

    # 重新构建并重启后端（最关键的服务）
    cd "$PROJECT_ROOT/apps/server/my-blog"
    $INSTALL_CMD install --frozen-lockfile 2>/dev/null || $INSTALL_CMD install
    $INSTALL_CMD exec prisma generate
    NODE_OPTIONS="--max-old-space-size=512" $INSTALL_CMD run build
    if [ -f "dist/src/main.js" ]; then
        pm2 reload my-blog-api 2>/dev/null || pm2 restart my-blog-api 2>/dev/null || true
    fi

    log_warn "已回滚到 $ROLLBACK_COMMIT，仅恢复了后端服务，其他服务请手动检查"
}

# 错误处理：部署失败时尝试回滚
cleanup_on_error() {
    local exit_code=$?
    if [ "$DEPLOY_FAILED" = "true" ]; then
        return  # 避免重复回滚
    fi
    if [ $exit_code -ne 0 ]; then
        DEPLOY_FAILED=true
        log_error "脚本在第 $LINENO 行发生错误，退出码: $exit_code"
        rollback || log_error "回滚也失败了，请手动处理"
    fi
}
trap cleanup_on_error EXIT

# ========================================
# 前置检查
# ========================================
log_step "前置检查"

# 检查必要命令
for cmd in git node pm2 curl; do
    if ! command -v "$cmd" &> /dev/null; then
        log_error "缺少必要命令: $cmd，请先安装"
        exit 1
    fi
done

# 检查项目目录
if [ ! -d "$PROJECT_ROOT" ]; then
    log_error "项目目录不存在: $PROJECT_ROOT"
    exit 1
fi

cd "$PROJECT_ROOT"

if [ ! -d ".git" ]; then
    log_error "$PROJECT_ROOT 不是 git 仓库"
    exit 1
fi

# 磁盘空间检查
AVAILABLE_MB=$(df -m "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
if [ "$AVAILABLE_MB" -lt "$MIN_DISK_MB" ]; then
    log_error "磁盘空间不足：剩余 ${AVAILABLE_MB}MB，需要至少 ${MIN_DISK_MB}MB"
    exit 1
fi
log_info "磁盘空间充足：剩余 ${AVAILABLE_MB}MB"

# PM2 日志轮转配置
if ! pm2 list 2>/dev/null | grep -q "pm2-logrotate"; then
    log_info "安装 PM2 日志轮转插件..."
    pm2 install pm2-logrotate 2>/dev/null || log_warn "pm2-logrotate 安装失败，请手动安装"
    # 配置：单文件最大 10MB，保留 7 个文件，每天轮转
    pm2 set pm2-logrotate:max_size 10M 2>/dev/null || true
    pm2 set pm2-logrotate:retain 7 2>/dev/null || true
    pm2 set pm2-logrotate:rotateInterval "0 0 * * *" 2>/dev/null || true
fi

# 检查环境变量文件
ENV_FILES=(
    "apps/server/my-blog/.env"
    "apps/blog-web/blog_web/.env.local"
    "apps/admin-web/myapp/.env.production"
)
for env_file in "${ENV_FILES[@]}"; do
    if [ ! -f "$PROJECT_ROOT/$env_file" ]; then
        log_warn "环境变量文件不存在: $env_file"
    fi
done

# 检查包管理器
if command -v pnpm &> /dev/null; then
    INSTALL_CMD="pnpm"
else
    log_warn "未找到 pnpm，回退使用 npm"
    INSTALL_CMD="npm"
fi
log_info "使用包管理器: $INSTALL_CMD"

# 记录回滚点
ROLLBACK_COMMIT=$(git rev-parse HEAD)
log_info "回滚点: $ROLLBACK_COMMIT"

# ========================================
# 1. 从git拉取最新代码（CI 环境下跳过）
# ========================================
if [ "$SKIP_GIT" = "true" ]; then
    log_step "步骤 1/7: 跳过 git 操作（CI 已处理）"
    log_info "当前 commit: $(git rev-parse --short HEAD)"
else
    log_step "步骤 1/7: 从git拉取最新代码"

    if ! git diff --quiet || ! git diff --cached --quiet; then
        log_warn "检测到本地未提交的修改，将被 stash 暂存"
        git stash push -m "deploy-script-auto-stash-$(date +%Y%m%d%H%M%S)"
    fi

    git fetch origin
    git pull origin "$GIT_BRANCH"
    log_info "当前 commit: $(git rev-parse --short HEAD)"
fi

# ========================================
# 2. 后端服务部署 (NestJS API)
# ========================================
log_step "步骤 2/7: 部署后端服务 (NestJS API)"
cd "$PROJECT_ROOT/apps/server/my-blog"

log_info "安装后端依赖..."
$INSTALL_CMD install --frozen-lockfile 2>/dev/null || $INSTALL_CMD install

log_info "生成 Prisma Client..."
$INSTALL_CMD exec prisma generate

log_info "执行数据库迁移..."
$INSTALL_CMD exec prisma migrate deploy 2>&1 || {
    log_warn "Prisma migrate deploy 失败或无待执行迁移"
}

log_info "构建后端..."
NODE_OPTIONS="--max-old-space-size=512" $INSTALL_CMD run build

if [ ! -f "dist/src/main.js" ]; then
    log_error "后端构建失败：dist/src/main.js 不存在"
    exit 1
fi

if pm2 list | grep -q "my-blog-api"; then
    log_info "零停机重载后端服务 (my-blog-api)..."
    pm2 reload my-blog-api || pm2 restart my-blog-api
else
    log_info "首次启动后端服务 (my-blog-api), 端口: $BACKEND_PORT..."
    pm2 start dist/src/main.js \
        --name my-blog-api \
        --max-memory-restart 300M \
        --node-args="--max-old-space-size=256" \
        --log-date-format "YYYY-MM-DD HH:mm:ss"
fi

health_check "my-blog-api" "http://localhost:$BACKEND_PORT/v1/health" 15 2

# ========================================
# 3. 管理后台部署 (Ant Design Pro)
# ========================================
log_step "步骤 3/7: 部署管理后台 (Admin Web)"
cd "$PROJECT_ROOT/apps/admin-web/myapp"

log_info "安装管理后台依赖..."
$INSTALL_CMD install --frozen-lockfile 2>/dev/null || $INSTALL_CMD install

log_info "构建管理后台..."
NODE_OPTIONS="--max-old-space-size=512" NODE_ENV=production UMI_ENV=prod $INSTALL_CMD run build

if [ ! -d "dist" ]; then
    log_error "管理后台构建失败：dist 目录不存在"
    exit 1
fi

if ! command -v serve &> /dev/null; then
    log_info "安装 serve..."
    npm install -g serve
fi

cat > "$PROJECT_ROOT/apps/admin-web/myapp/dist/serve.cjs" << 'SERVEOF'
const { spawn } = require('child_process');
const path = require('path');

const distPath = path.resolve(__dirname);
const port = process.env.ADMIN_PORT || '8002';

const child = spawn('serve', [distPath, '-l', port, '-s'], {
  stdio: 'inherit',
  shell: true
});

child.on('error', (err) => {
  console.error('Failed to start serve:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
SERVEOF

if pm2 list | grep -q "admin-web"; then
    log_info "零停机重载管理后台 (admin-web)..."
    pm2 reload admin-web || pm2 restart admin-web
else
    log_info "首次启动管理后台服务 (admin-web), 端口: $ADMIN_PORT..."
    ADMIN_PORT=$ADMIN_PORT pm2 start dist/serve.cjs \
        --name admin-web \
        --cwd "$PROJECT_ROOT/apps/admin-web/myapp" \
        --max-memory-restart 256M \
        --log-date-format "YYYY-MM-DD HH:mm:ss"
fi

health_check "admin-web" "http://localhost:$ADMIN_PORT" 10 2

# ========================================
# 4. 前端页面部署 (Next.js Blog)
# ========================================
log_step "步骤 4/7: 部署前端页面 (Blog Web)"
cd "$PROJECT_ROOT/apps/blog-web/blog_web"

log_info "安装前端依赖..."
$INSTALL_CMD install --frozen-lockfile 2>/dev/null || $INSTALL_CMD install

log_info "构建前端..."
NODE_OPTIONS="--max-old-space-size=512" $INSTALL_CMD run build

if [ ! -d ".next" ]; then
    log_error "前端构建失败：.next 目录不存在"
    exit 1
fi

if pm2 list | grep -q "blog-web"; then
    log_info "零停机重载前端服务 (blog-web)..."
    pm2 reload blog-web || pm2 restart blog-web
else
    log_info "首次启动前端服务 (blog-web), 端口: $BLOG_PORT..."
    PORT=$BLOG_PORT NODE_ENV=production pm2 start npm \
        --name blog-web \
        --max-memory-restart 300M \
        --log-date-format "YYYY-MM-DD HH:mm:ss" \
        -- start
fi

health_check "blog-web" "http://localhost:$BLOG_PORT" 15 2

# ========================================
# 5. MCP Server 部署
# ========================================
log_step "步骤 5/7: 部署 MCP Server"
cd "$PROJECT_ROOT/mcp-server"

log_info "安装 MCP Server 依赖..."
$INSTALL_CMD install --frozen-lockfile 2>/dev/null || $INSTALL_CMD install

log_info "构建 MCP Server..."
$INSTALL_CMD run build

if [ ! -f "dist/index.js" ]; then
    log_error "MCP Server 构建失败：dist/index.js 不存在"
    exit 1
fi

if pm2 list | grep -q "blog-mcp-server"; then
    log_info "零停机重载 MCP Server..."
    pm2 reload blog-mcp-server || pm2 restart blog-mcp-server
else
    log_info "首次启动 MCP Server, 端口: $MCP_PORT..."
    TRANSPORT=http PORT=$MCP_PORT BLOG_API_URL=http://localhost:$BACKEND_PORT \
    pm2 start dist/index.js \
        --name blog-mcp-server \
        --max-memory-restart 256M \
        --log-date-format "YYYY-MM-DD HH:mm:ss"
fi

health_check "blog-mcp-server" "http://localhost:$MCP_PORT" 10 2

# ========================================
# 6. Nginx 配置检查
# ========================================
log_step "步骤 6/7: Nginx 配置检查"

if command -v nginx &> /dev/null; then
    if nginx -t 2>&1; then
        log_info "Nginx 配置语法正确"
        # 如果 Nginx 正在运行，reload 使配置生效
        if systemctl is-active --quiet nginx 2>/dev/null; then
            systemctl reload nginx 2>/dev/null && log_info "Nginx 已重载" || log_warn "Nginx 重载失败"
        fi
    else
        log_warn "Nginx 配置语法有误，请手动检查: nginx -t"
    fi
else
    log_warn "未找到 nginx 命令，跳过配置检查"
fi

# ========================================
# 7. 保存并显示状态
# ========================================
log_step "步骤 7/7: 保存配置并显示状态"
log_info "保存 pm2 配置..."
pm2 save

echo ""
pm2 list

echo ""
log_info "========================================"
log_info "部署完成！服务访问地址："
log_info "========================================"
log_info "  后端 API:      http://localhost:$BACKEND_PORT"
log_info "  前端页面:      http://localhost:$BLOG_PORT"
log_info "  管理后台:      http://localhost:$ADMIN_PORT"
log_info "  MCP Server:    http://localhost:$MCP_PORT"
log_info "========================================"
log_info "  Commit:        $(git -C "$PROJECT_ROOT" rev-parse --short HEAD)"
log_info "  回滚点:        $ROLLBACK_COMMIT"
log_info "  部署时间:      $(date '+%Y-%m-%d %H:%M:%S')"
log_info "========================================"

# 部署成功，清除错误 trap
DEPLOY_FAILED=true  # 防止 EXIT trap 误触发回滚
