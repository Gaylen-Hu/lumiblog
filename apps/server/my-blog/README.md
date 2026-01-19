# My Blog - 后端服务

基于 NestJS 构建的个人博客后端 API 服务。

## 技术栈

- **框架**: NestJS 11
- **语言**: TypeScript 5
- **数据库**: PostgreSQL
- **缓存**: Redis
- **ORM**: Prisma (待集成)
- **包管理**: pnpm

## 项目结构

```
apps/server/my-blog/
├── src/
│   ├── app.module.ts      # 主模块
│   ├── app.controller.ts  # 主控制器
│   ├── app.service.ts     # 主服务
│   └── main.ts            # 入口文件
├── test/                  # 测试文件
├── .env.dev               # 开发环境配置
├── .env.prod              # 生产环境配置
├── .env.example           # 配置模板
└── package.json
```

## 环境配置

项目使用 `.env.[环境]` 文件管理配置：

| 文件 | 说明 |
|------|------|
| `.env.dev` | 开发环境配置 |
| `.env.prod` | 生产环境配置 |
| `.env.example` | 配置模板（可提交到 Git） |

### 配置项说明

```bash
# PostgreSQL 配置
DB_HOST=数据库地址
DB_PORT=5432
DB_USERNAME=用户名
DB_PASSWORD=密码
DB_DATABASE=数据库名

# Redis 配置
REDIS_HOST=Redis地址
REDIS_PORT=6379
REDIS_PASSWORD=密码
```

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 并根据环境修改：

```bash
cp .env.example .env.dev
```

### 3. 启动服务

```bash
# 开发模式（使用 .env.dev）
pnpm start:dev

# 生产模式（使用 .env.prod）
pnpm start:prod

# 调试模式
pnpm start:debug
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm start:dev` | 开发模式启动（热重载） |
| `pnpm start:prod` | 生产模式启动 |
| `pnpm build` | 构建项目 |
| `pnpm test` | 运行单元测试 |
| `pnpm test:e2e` | 运行端到端测试 |
| `pnpm lint` | 代码检查 |
| `pnpm format` | 代码格式化 |

## 使用配置

在代码中通过 `ConfigService` 获取环境变量：

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService {
  constructor(private configService: ConfigService) {}

  getDbConfig() {
    return {
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT'),
      username: this.configService.get<string>('DB_USERNAME'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_DATABASE'),
    };
  }
}
```

## API 文档

服务启动后访问：`http://localhost:3000`

> Swagger 文档待集成

## 开发规范

- 遵循 NestJS 模块化架构
- 使用 TypeScript 严格模式
- 代码提交前执行 `pnpm lint` 和 `pnpm format`
- 敏感配置不提交到 Git（已在 .gitignore 中配置）

## 相关文档

- [项目架构文档](../../../docs/项目架构.md)
- [开发阶段信息](../../../docs/开发阶段所用信息.md)
