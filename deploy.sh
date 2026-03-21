#!/bin/bash

# ========================================
# 部署脚本 - 从git拉取代码，构建并使用pm2部署所有服务
# ========================================

set -euo pipefail  # -e: 遇到错误立即退出, -u: 未定义变量报错, -o pipefail: 管道中任意命令失败则退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========================================
# 配置项（可通过环境变量覆盖）
# ========================================
PROJECT_ROOT="${PROJECT_ROOT:-/root/myblog}"
GIT_BRANCH="${GIT_BRANCH:-main}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
BLOG_PORT="${BLOG_PORT:-3001}"
ADMIN_PORT="${ADMIN_PORT:-8002}"
MCP_PORT="${MCP_PORT:-4000}"

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%H:%M:%S') $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $1" >&2
}

log_step() {
    echo -e ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}======================================${NC}"
}

# 错误处理：打印出错行号
trap 'log_error "脚本在第 $LINENO 行发生错误，退出码: $?"' ERR

# ========================================
# 前置检查
# ========================================
log_step "前置检查"

# 检查必要命令
for cmd in git node pm2; do
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

# 检查是否为 git 仓库
if [ ! -d ".git" ]; then
    log_error "$PROJECT_ROOT 不是 git 仓库"
    exit 1
fi

# 检查关键环境变量文件是否存在
ENV_FILES=(
    "apps/server/my-blog/.env"
    "apps/blog-web/blog_web/.env.local"
    "apps/admin-web/myapp/.env.production"
)
for env_file in "${ENV_FILES[@]}"; do
    if [ ! -f "$PROJECT_ROOT/$env_file" ]; then
        log_warn "环境变量文件不存在: $env_file（请参考 deployment.md 配置）"
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

# ========================================
# 1. 从git拉取最新代码
# ========================================
log_step "步骤 1/6: 从git拉取最新代码"

# 检查是否有未提交的本地修改
if ! git diff --quiet || ! git diff --cached --quiet; then
    log_warn "检测到本地未提交的修改，将被 stash 暂存"
    git stash push -m "deploy-script-auto-stash-$(date +%Y%m%d%H%M%S)"
fi

git fetch origin
git pull origin "$GIT_BRANCH"
log_info "当前 commit: $(git rev-parse --short HEAD)"

# ========================================
# 2. 后端服务部署 (NestJS API)
# ========================================
log_step "步骤 2/6: 部署后端服务 (NestJS API)"
cd "$PROJECT_ROOT/apps/server/my-blog"

log_info "安装后端依赖..."
$INSTALL_CMD install --frozen-lockfile 2>/dev/null || $INSTALL_CMD install

log_info "构建后端..."
$INSTALL_CMD run build

# 验证构建产物
if [ ! -f "dist/src/main.js" ]; then
    log_error "后端构建失败：dist/src/main.js 不存在"
    exit 1
fi

if pm2 list | grep -q "my-blog-api"; then
    log_info "重启后端服务 (my-blog-api)..."
    pm2 restart my-blog-api
else
    log_info "首次启动后端服务 (my-blog-api), 端口: $BACKEND_PORT..."
    pm2 start dist/src/main.js \
        --name my-blog-api \
        --max-memory-restart 512M \
        --log-date-format "YYYY-MM-DD HH:mm:ss"
fi

# 等待后端启动并健康检查
log_info "等待后端服务启动..."
for i in {1..15}; do
    if curl -sf "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
        log_info "后端服务健康检查通过"
        break
    fi
    if [ "$i" -eq 15 ]; then
        log_warn "后端健康检查超时，请手动确认: pm2 logs my-blog-api"
    fi
    sleep 2
done

# ========================================
# 3. 管理后台部署 (Ant Design Pro)
# ========================================
log_step "步骤 3/6: 部署管理后台 (Admin Web)"
cd "$PROJECT_ROOT/apps/admin-web/myapp"

log_info "安装管理后台依赖..."
$INSTALL_CMD install --frozen-lockfile 2>/dev/null || $INSTALL_CMD install

log_info "构建管理后台..."
NODE_ENV=production UMI_ENV=prod $INSTALL_CMD run build

# 验证构建产物
if [ ! -d "dist" ]; then
    log_error "管理后台构建失败：dist 目录不存在"
    exit 1
fi

# 安装 serve（如果未安装）
if ! command -v serve &> /dev/null; then
    log_info "安装 serve..."
    npm install -g serve
fi

# 创建 serve 启动脚本（解决 ESM 兼容性问题）
cat > "$PROJECT_ROOT/apps/admin-web/myapp/dist/serve.cjs" << 'EOF'
const { spawn } = require('child_process');
const path = require('path');

const servePath = path.join(__dirname, '../node_modules/.bin/serve');
const distPath = path.join(__dirname);

const child = spawn(servePath, [distPath, '-l', process.env.ADMIN_PORT || '8002'], {
  stdio: 'inherit',
  shell: true
});

child.on('error', (err) => {
  console.error('Failed to start serve:', err);
  process.exit(1);
});
EOF

if pm2 list | grep -q "admin-web"; then
    log_info "重启管理后台服务 (admin-web)..."
    pm2 restart admin-web
else
    log_info "首次启动管理后台服务 (admin-web), 端口: $ADMIN_PORT..."
    ADMIN_PORT=$ADMIN_PORT pm2 start dist/serve.cjs \
        --name admin-web \
        --cwd "$PROJECT_ROOT/apps/admin-web/myapp" \
        --max-memory-restart 256M \
        --log-date-format "YYYY-MM-DD HH:mm:ss"
fi

# ========================================
# 4. 前端页面部署 (Next.js Blog)
# ========================================
log_step "步骤 4/6: 部署前端页面 (Blog Web)"
cd "$PROJECT_ROOT/apps/blog-web/blog_web"

log_info "安装前端依赖..."
$INSTALL_CMD install --frozen-lockfile 2>/dev/null || $INSTALL_CMD install

log_info "构建前端..."
$INSTALL_CMD run build

# 验证构建产物
if [ ! -d ".next" ]; then
    log_error "前端构建失败：.next 目录不存在"
    exit 1
fi

if pm2 list | grep -q "blog-web"; then
    log_info "重启前端服务 (blog-web)..."
    pm2 restart blog-web
else
    log_info "首次启动前端服务 (blog-web), 端口: $BLOG_PORT..."
    PORT=$BLOG_PORT NODE_ENV=production pm2 start npm \
        --name blog-web \
        --max-memory-restart 512M \
        --log-date-format "YYYY-MM-DD HH:mm:ss" \
        -- start
fi

# ========================================
# 5. MCP Server 部署
# ========================================
log_step "步骤 5/6: 部署 MCP Server"
cd "$PROJECT_ROOT/mcp-server"

log_info "安装 MCP Server 依赖..."
$INSTALL_CMD install --frozen-lockfile 2>/dev/null || $INSTALL_CMD install

log_info "构建 MCP Server..."
$INSTALL_CMD run build

# 验证构建产物
if [ ! -f "dist/index.js" ]; then
    log_error "MCP Server 构建失败：dist/index.js 不存在"
    exit 1
fi

if pm2 list | grep -q "blog-mcp-server"; then
    log_info "重启 MCP Server..."
    pm2 restart blog-mcp-server
else
    log_info "首次启动 MCP Server, 端口: $MCP_PORT..."
    TRANSPORT=http PORT=$MCP_PORT BLOG_API_URL=http://localhost:$BACKEND_PORT \
    pm2 start dist/index.js \
        --name blog-mcp-server \
        --max-memory-restart 256M \
        --log-date-format "YYYY-MM-DD HH:mm:ss"
fi

# ========================================
# 6. 保存并显示状态
# ========================================
log_step "步骤 6/6: 保存配置并显示状态"
log_info "保存 pm2 配置..."
pm2 save

echo ""
pm2 list

echo ""
log_info "========================================"
log_info "部署完成！服务访问地址："
log_info "========================================"
log_info "  后端 API:      http://localhost:$BACKEND_PORT"
log_info "                 → api.example.com"
log_info ""
log_info "  前端页面:      http://localhost:$BLOG_PORT"
log_info "                 → www.example.com"
log_info ""
log_info "  管理后台:      http://localhost:$ADMIN_PORT"
log_info "                 → badmin.example.com"
log_info ""
log_info "  MCP Server:    http://localhost:$MCP_PORT"
log_info "                 → www.example.com/mcp"
log_info "========================================"
log_info "  Commit:        $(git -C "$PROJECT_ROOT" rev-parse --short HEAD)"
log_info "  部署时间:      $(date '+%Y-%m-%d %H:%M:%S')"
log_info "========================================"
