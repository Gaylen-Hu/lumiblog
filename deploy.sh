#!/bin/bash

# ========================================
# 部署脚本 - 从git拉取代码，构建并使用pm2部署所有服务
# ========================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/root/myblog"
cd "$PROJECT_ROOT"

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}"
}

# 检查npm/pnpm命令
get_install_cmd() {
    if command -v pnpm &> /dev/null; then
        echo "pnpm"
    else
        echo "npm"
    fi
}

INSTALL_CMD=$(get_install_cmd)
log_info "使用包管理器: $INSTALL_CMD"

# ========================================
# 1. 从git拉取最新代码
# ========================================
log_step "步骤 1/5: 从git拉取最新代码"
git pull origin main || git pull origin master

# ========================================
# 2. 后端服务部署 (NestJS API)
# ========================================
log_step "步骤 2/5: 部署后端服务 (NestJS API)"
cd "$PROJECT_ROOT/apps/server/my-blog"
log_info "安装后端依赖..."
$INSTALL_CMD install
log_info "构建后端..."
$INSTALL_CMD run build

# 检查服务是否已存在
if pm2 list | grep -q "my-blog-api"; then
    log_info "重启后端服务 (my-blog-api)..."
    pm2 restart my-blog-api
else
    log_info "启动后端服务 (my-blog-api)..."
    pm2 start dist/src/main.js --name my-blog-api
fi

# ========================================
# 3. 管理后台部署 (Ant Design Pro)
# ========================================
log_step "步骤 3/5: 部署管理后台 (Admin Web)"
cd "$PROJECT_ROOT/apps/admin-web/myapp"
log_info "安装管理后台依赖..."
$INSTALL_CMD install
log_info "构建管理后台..."
NODE_ENV=production UMI_ENV=prod $INSTALL_CMD run build

# 安装serve（如果未安装）
if ! command -v serve &> /dev/null; then
    log_info "安装serve..."
    npm install -g serve
fi

# 创建 serve 启动脚本（解决 ESM 兼容性问题）
cat > "$PROJECT_ROOT/apps/admin-web/myapp/dist/serve.cjs" << 'EOF'
const { spawn } = require('child_process');
const path = require('path');

const servePath = path.join(__dirname, '../node_modules/.bin/serve');
const distPath = path.join(__dirname);

const child = spawn(servePath, [distPath, '-l', '8002'], {
  stdio: 'inherit',
  shell: true
});

child.on('error', (err) => {
  console.error('Failed to start serve:', err);
  process.exit(1);
});

EOF

# 检查服务是否已存在
if pm2 list | grep -q "admin-web"; then
    log_info "重启管理后台服务 (admin-web)..."
    pm2 restart admin-web
else
    log_info "启动管理后台服务 (admin-web), 端口: 8002..."
    pm2 start dist/serve.cjs --name admin-web --cwd "$PROJECT_ROOT/apps/admin-web/myapp"
fi

# ========================================
# 4. 前端页面部署 (Next.js Blog)
# ========================================
log_step "步骤 4/5: 部署前端页面 (Blog Web)"
cd "$PROJECT_ROOT/apps/blog-web/blog_web"
log_info "安装前端依赖..."
$INSTALL_CMD install
log_info "构建前端..."
$INSTALL_CMD run build

# 检查服务是否已存在
if pm2 list | grep -q "blog-web"; then
    log_info "重启前端服务 (blog-web)..."
    pm2 restart blog-web
else
    log_info "启动前端服务 (blog-web), 端口: 3001..."
    PORT=3001 NODE_ENV=production pm2 start npm --name blog-web -- start
fi

# ========================================
# 5. 保存并显示状态
# ========================================
log_step "步骤 5/5: 保存配置并显示状态"
log_info "保存pm2配置..."
pm2 save

echo ""
log_info "部署完成！"
echo ""
pm2 list

echo ""
log_info "========================================"
log_info "服务访问地址："
log_info "========================================"
log_info "  后端 API:      http://localhost:3000"
log_info "                 → api.example.com"
log_info ""
log_info "  前端页面:      http://localhost:3001"
log_info "                 → www.example.com"
log_info ""
log_info "  管理后台:      http://localhost:8002"
log_info "                 → badmin.example.com/"
log_warn "  注意: 管理后台需要配置nginx"
log_info "========================================"
