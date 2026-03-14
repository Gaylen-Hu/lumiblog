# 服务端部署文档

## 服务器信息

- **操作系统**: Linux 5.15.0-138-generic
- **包管理器**: pnpm 10.28.0
- **Node.js**: /usr/local/nodejs
- **PM2**: 进程管理

## 服务架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (443/80)                        │
│  badmin.example.com                                      │
├──────────────┬──────────────────┬───────────────────────────┤
│ /api         │ /badmin          │ /                         │
│ ↓            │ ↓                │ ↓                         │
└──────────────┼──────────────────┼───────────────────────────┘
               │                  │
     ┌─────────┴──────────────────┴─────────────┐
     │              PM2                         │
     ├─────────────┬──────────────┬─────────────┤
     │ my-blog-api │ admin-web    │ blog-web    │
     │ :3000       │ :8002        │ :3001       │
     │ (NestJS)    │ (Umi/AntD)   │ (Next.js)   │
     └─────────────┴──────────────┴─────────────┘
                     │
     ┌───────────────┼─────────────────┐
     │               │                 │
  PostgreSQL        Redis          阿里云OSS
  :5432           :6379
```

## 端口映射

| 服务 | 内部端口 | 说明 |
|------|----------|------|
| my-blog-api | 3000 | 后端 API 服务 |
| blog-web | 3001 | 前端页面 (Next.js) |
| admin-web | 8002 | 管理后台 (Ant Design Pro) |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |

## 环境变量配置

### 后端服务配置 (`apps/server/my-blog/.env`)

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

# CORS 允许的域名（逗号分隔）
CORS_ORIGINS=http://localhost:8002,https://badmin.example.com,https://admin.example.com

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

## 部署步骤

### 1. 拉取最新代码

```bash
cd /root/myblog
git pull origin main
```

### 2. 部署后端服务 (NestJS API)

```bash
cd /root/myblog/apps/server/my-blog
pnpm install
pnpm run build

# 重启 PM2 服务
pm2 restart my-blog-api
# 或首次启动
pm2 start dist/src/main.js --name my-blog-api
```

### 3. 部署管理后台 (Admin Web)

```bash
cd /root/myblog/apps/admin-web/myapp
pnpm install
NODE_ENV=production UMI_ENV=prod pnpm run build

# 创建 serve 启动脚本
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

# 重启 PM2 服务
pm2 restart admin-web
# 或首次启动
pm2 start dist/serve.cjs --name admin-web --cwd "/root/myblog/apps/admin-web/myapp"
```

### 4. 部署前端页面 (Blog Web)

```bash
cd /root/myblog/apps/blog-web/blog_web
pnpm install
NODE_ENV=production pnpm run build

# 重启 PM2 服务
pm2 restart blog-web
# 或首次启动
PORT=3001 NODE_ENV=production pm2 start npm --name blog-web -- start
```

### 5. 保存 PM2 配置

```bash
pm2 save
```

## Nginx 配置

配置文件位置: `/etc/nginx/sites-available/badmin.example.com`

```nginx
# 管理后台 Nginx 配置
# 域名: badmin.example.com
# - /api 代理到后端服务 (localhost:3000)
# - /badmin 代理到管理后台静态文件 (localhost:8002)
# - / 代理到前端页面 (localhost:3001)

server {
    server_name badmin.example.com;

    # 后端 API 服务
    location /api {
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

    # 管理后台
    location /badmin {
        proxy_pass http://localhost:8002/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 前端页面 (Blog Web)
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

    # SSL配置 - 使用Certbot申请证书后会自动添加
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/badmin.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/badmin.example.com/privkey.pem;
    include /etc/nginx/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# HTTP重定向到HTTPS
server {
    if ($host = badmin.example.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name badmin.example.com;
    return 404;
}
```

应用 Nginx 配置：

```bash
sudo ln -s /root/myblog/nginx-admin-template.conf /etc/nginx/sites-available/badmin.example.com
sudo ln -s /etc/nginx/sites-available/badmin.example.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 常用命令

### PM2 管理

```bash
# 查看所有服务状态
pm2 list

# 查看服务日志
pm2 logs [service-name]

# 重启服务
pm2 restart [service-name]

# 停止服务
pm2 stop [service-name]

# 删除服务
pm2 delete [service-name]

# 保存当前进程列表
pm2 save

# 查看服务详细信息
pm2 show [service-name]
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

## 服务器安全配置

### SSH 配置

```bash
# /etc/ssh/sshd_config
PermitRootLogin prohibit-password  # 仅允许密钥登录
PasswordAuthentication no           # 禁用密码认证
PubkeyAuthentication yes            # 启用公钥认证
```

### 建议的安全措施

1. **启用防火墙**
   ```bash
   ufw enable
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ```

2. **限制数据库访问**
   - PostgreSQL 绑定到 127.0.0.1
   - Redis 配置密码并绑定到 127.0.0.1

3. **定期更新系统**
   ```bash
   apt update && apt upgrade -y
   ```

## 访问地址

| 服务 | URL |
|------|-----|
| API | https://badmin.example.com/api |
| 管理后台 | https://badmin.example.com/badmin |
| 前端页面 | https://badmin.example.com/ |

## 故障排查

### admin-web 启动失败

如果 `admin-web` 启动失败，检查 `serve.cjs` 是否存在：

```bash
ls -la /root/myblog/apps/admin-web/myapp/dist/serve.cjs

# 如果不存在，重新创建
cat > /root/myblog/apps/admin-web/myapp/dist/serve.cjs << 'EOF'
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
```

### 查看服务日志

```bash
# PM2 日志
pm2 logs [service-name] --lines 100

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 检查端口占用

```bash
ss -tuln | grep -E ':(3000|3001|8002)'
```
