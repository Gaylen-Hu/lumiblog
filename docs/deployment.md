# 部署文档

## 服务器信息

- **操作系统**: Linux 5.15.0-138-generic
- **包管理器**: pnpm 10.28.0
- **Node.js**: /usr/local/nodejs
- **PM2**: 进程管理

## 服务架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (443/80)                        │
│  www.example.com          badmin.example.com         │
├──────────────┬───────────────┬──────────────────────────────┤
│ /api         │ /             │ /api        │ /              │
│ ↓            │ ↓             │ ↓           │ ↓              │
└──────────────┴───────────────┴─────────────┴────────────────┘
               │                              │
     ┌─────────┴──────────────────────────────┴─────────────┐
     │              PM2                                      │
     ├─────────────┬──────────────┬─────────────────────────┤
     │ my-blog-api │ admin-web    │ blog-web                │
     │ :3000       │ :8002        │ :3001                   │
     │ (NestJS)    │ (Umi/AntD)   │ (Next.js)               │
     └─────────────┴──────────────┴─────────────────────────┘
                     │
     ┌───────────────┼─────────────────┐
     │               │                 │
  PostgreSQL        Redis          阿里云OSS
  :5432           :6379
```

## 访问地址

| 环境 | 服务 | URL |
|------|------|-----|
| 生产 | 前端页面 | https://www.example.com |
| 生产 | 管理后台 | https://badmin.example.com |
| 生产 | API（主站） | https://www.example.com/api |
| 生产 | API（管理后台） | https://badmin.example.com/api |
| 本地 | 前端页面 | http://localhost:3001 |
| 本地 | 管理后台 | http://localhost:8002 |
| 本地 | API | http://localhost:3000 |

## 端口映射

| 服务 | 内部端口 | 说明 |
|------|----------|------|
| my-blog-api | 3000 | 后端 API 服务 |
| blog-web | 3001 | 前端页面 (Next.js) |
| admin-web | 8002 | 管理后台 (Ant Design Pro) |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |

---

## 环境变量配置

### 后端 `apps/server/my-blog/.env`

```bash
# PostgreSQL 配置
DB_HOST=your_db_host
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=YOUR_DB_PASSWORD
DB_DATABASE=your_db_name
DATABASE_URL="postgresql://your_db_user:YOUR_DB_PASSWORD@your_db_host:5432/your_db_name?schema=public"

# Redis 配置
REDIS_HOST=your_db_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT 配置
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# 默认管理员账号（首次启动自动创建）
ADMIN_DEFAULT_EMAIL=admin@example.com
ADMIN_DEFAULT_PASSWORD=your_admin_password

# 微信配置
WX_NAME="your_wechat_name"
WX_APP_ID=your_wechat_app_id
WX_APP_SECRET=your_wechat_app_secret

# CORS 允许的域名（生产环境只允许主域名）
CORS_ORIGINS=https://www.example.com

# 豆包 AI 配置
DOUBAO_API_KEY=your_doubao_api_key
DOUBAO_MODEL=doubao-seed-1-6-251015

# 阿里云 OSS 配置（文件直传）
OSS_ACCESS_KEY_ID=your_oss_access_key_id
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_BUCKET=your_oss_bucket
OSS_REGION=oss-cn-beijing
OSS_ENDPOINT=https://your_oss_bucket.oss-cn-beijing.aliyuncs.com
```

### 前端博客 `apps/blog-web/blog_web/.env.local`

```bash
# 后端 API 地址（通过 Nginx /api 路径代理）
NEXT_PUBLIC_API_URL=https://www.example.com/api/v1/public

# 站点域名（用于 robots.txt / sitemap / OG 标签）
NEXT_PUBLIC_SITE_URL=https://www.example.com
```

### 管理后台 `apps/admin-web/myapp/.env.production`

```bash
# 生产环境
REACT_APP_ENV=pre

# API 基础地址（通过 badmin 域名下的 /api 路径代理）
API_BASE_URL=https://badmin.example.com/api
```

---

## SEO 屏蔽说明

`/api` 路径不应被搜索引擎索引。`badmin.example.com` 整站也不应被索引。

前端博客已在 `src/app/robots.ts` 中配置：

```
User-agent: *
Allow: /
Disallow: /api
Sitemap: https://www.example.com/sitemap.xml
```

`badmin.example.com` 通过 Nginx 响应头屏蔽，在 badmin 站点配置中加入：

```nginx
add_header X-Robots-Tag "noindex, nofollow" always;
```

---

## 本地开发环境

### 启动顺序

```bash
# 1. 后端 API（端口 3000）
cd apps/server/my-blog
pnpm start:dev

# 2. 前端博客（端口 3001）
cd apps/blog-web/blog_web
pnpm dev

# 3. 管理后台（端口 8002）
cd apps/admin-web/myapp
pnpm dev
```

### 本地环境变量

**后端** `apps/server/my-blog/.env` 中 CORS 改为：
```bash
CORS_ORIGINS=http://localhost:3001,http://localhost:8002
```

**前端博客** `apps/blog-web/blog_web/.env.local`：
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/v1/public
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

**管理后台** `apps/admin-web/myapp/.env`：
```bash
REACT_APP_ENV=dev
API_BASE_URL=http://localhost:3000
```

---

## 生产部署步骤

### 1. 拉取最新代码

```bash
cd /root/myblog
git pull origin main
```

### 2. 写入环境变量文件

按上方"环境变量配置"章节，在服务器上创建对应的 `.env` / `.env.local` 文件。

### 3. 部署后端服务 (NestJS API)

```bash
cd /root/myblog/apps/server/my-blog
pnpm install
pnpm run build

pm2 restart my-blog-api
# 或首次启动
pm2 start dist/src/main.js --name my-blog-api
```

### 4. 部署管理后台 (Admin Web)

```bash
cd /root/myblog/apps/admin-web/myapp
pnpm install
NODE_ENV=production UMI_ENV=prod pnpm run build

cat > dist/serve.cjs << 'EOF'
const { spawn } = require('child_process');
const path = require('path');

const servePath = '/usr/local/nodejs/bin/serve';
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

pm2 restart admin-web
# 或首次启动
pm2 start dist/serve.cjs --name admin-web --cwd "/root/myblog/apps/admin-web/myapp"
```

### 5. 部署前端页面 (Blog Web)

```bash
cd /root/myblog/apps/blog-web/blog_web
pnpm install
NODE_ENV=production pnpm run build

pm2 restart blog-web
# 或首次启动
PORT=3001 NODE_ENV=production pm2 start npm --name blog-web -- start
```

### 6. 保存 PM2 配置

```bash
pm2 save
```

---

## Nginx 配置

配置文件位置: `/etc/nginx/sites-available/www.example.com`

```nginx
server {
    server_name www.example.com example.com;

    # 后端 API（剥去 /api 前缀后转发）
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # MCP Server（AI 工具调用入口）
    location /mcp {
        proxy_pass http://localhost:4000/mcp;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # SSE / Streamable HTTP 需要关闭缓冲
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    # 前端博客
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/www.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.example.com/privkey.pem;
    include /etc/nginx/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# HTTP 重定向到 HTTPS，裸域名重定向到 www
server {
    listen 80;
    server_name www.example.com example.com;
    return 301 https://www.example.com$request_uri;
}
```

配置文件位置: `/etc/nginx/sites-available/badmin.example.com`

```nginx
server {
    server_name badmin.example.com;

    # 后端 API（剥去 /api 前缀后转发，与主站共享同一后端）
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 管理后台 SPA
    location / {
        proxy_pass http://localhost:8002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/badmin.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/badmin.example.com/privkey.pem;
    include /etc/nginx/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80;
    server_name badmin.example.com;
    return 301 https://badmin.example.com$request_uri;
}
```

应用 Nginx 配置：

```bash
# 删除旧配置（如有）
sudo rm -f /etc/nginx/sites-enabled/badmin.example.com

# 申请 badmin 子域名证书（需先确保 DNS 已解析）
sudo certbot --nginx -d badmin.example.com

# 启用两个配置
sudo ln -s /etc/nginx/sites-available/www.example.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/badmin.example.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 常用命令

### PM2 管理

```bash
pm2 list                        # 查看所有服务状态
pm2 logs [service-name]         # 查看服务日志
pm2 restart [service-name]      # 重启服务
pm2 stop [service-name]         # 停止服务
pm2 delete [service-name]       # 删除服务
pm2 save                        # 保存当前进程列表
pm2 show [service-name]         # 查看服务详细信息
```

### 数据库操作

```bash
# 进入 PostgreSQL
psql -h your_db_host -U your_db_user -d your_db_name

# 备份数据库
pg_dump -h your_db_host -U your_db_user your_db_name > backup.sql

# 恢复数据库
psql -h your_db_host -U your_db_user your_db_name < backup.sql
```

---

## 服务器安全配置

```bash
# SSH 配置 /etc/ssh/sshd_config
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes

# 防火墙
ufw enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## 故障排查

### admin-web 启动失败

```bash
ls -la /root/myblog/apps/admin-web/myapp/dist/serve.cjs
# 不存在则重新执行部署步骤 4 中的 cat 命令
pm2 restart admin-web
```

### 查看日志

```bash
pm2 logs [service-name] --lines 100
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 检查端口占用

```bash
ss -tuln | grep -E ':(3000|3001|8002)'
```
