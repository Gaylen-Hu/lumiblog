# NestJS CMS 架构参考

**调研日期：** 2026-03-06  
**调研人：** Scout 🔍

---

## 一、优秀项目参考

### 1. nodepress ⭐⭐⭐⭐
- **GitHub:** https://github.com/surmon-china/nodepress
- **Stars:** 1,515+
- **技术栈:** NestJS, TypeScript, MongoDB, GraphQL
- **特点:**
  - 完整的博客/CMS 系统
  - GraphQL + RESTful API 双支持
  - JWT 认证 + RBAC 权限
  - 文章、分类、标签、评论完整功能
  - 文件上传和管理
  - 详细的中文文档

**架构亮点:**
- 模块化设计（Article, Category, Tag, Comment, User）
- 使用 GraphQL 进行数据查询
- 完善的权限控制中间件
- 统一的响应格式和错误处理

### 2. mili ⭐⭐⭐⭐
- **GitHub:** https://github.com/shen100/mili
- **Stars:** 2,922+
- **技术栈:** NestJS, TypeScript, MySQL, TypeORM
- **特点:**
  - 开源 CMS 系统
  - 模块化架构
  - 支持多租户
  - 完善的后台管理

### 3. notadd ⭐⭐⭐⭐
- **GitHub:** https://github.com/notadd/notadd
- **Stars:** 2,838+
- **技术栈:** NestJS, TypeScript, 微服务架构
- **特点:**
  - 微服务开发框架
  - 插件化设计
  - 适合大型项目

---

## 二、推荐模块设计

基于项目需求和技术栈（NestJS 11 + Prisma + PostgreSQL），推荐以下模块结构：

```
apps/server/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/                    # 通用模块
│   │   ├── decorators/            # 自定义装饰器
│   │   │   ├── roles.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── filters/               # 异常过滤器
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/                # 守卫
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── interceptors/          # 拦截器
│   │   │   ├── response.interceptor.ts
│   │   │   └── logging.interceptor.ts
│   │   └── pipes/                 # 管道
│   │       └── validation.pipe.ts
│   ├── config/                    # 配置
│   │   ├── database.config.ts
│   │   └── app.config.ts
│   ├── modules/
│   │   ├── auth/                  # 认证模块
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── register.dto.ts
│   │   │   └── strategies/
│   │   │       └── jwt.strategy.ts
│   │   ├── users/                 # 用户模块
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.module.ts
│   │   │   └── dto/
│   │   ├── articles/              # 文章模块
│   │   │   ├── articles.controller.ts
│   │   │   ├── articles.service.ts
│   │   │   ├── articles.module.ts
│   │   │   └── dto/
│   │   ├── categories/            # 分类模块
│   │   ├── tags/                  # 标签模块
│   │   ├── comments/              # 评论模块
│   │   ├── media/                 # 媒体模块
│   │   └── ai/                    # AI 模块
│   └── prisma/                    # Prisma
│       ├── schema.prisma
│       └── migrations/
```

---

## 三、权限管理方案 (RBAC)

### 1. 角色定义
```typescript
// common/enums/role.enum.ts
export enum Role {
  ADMIN = 'admin',
  EDITOR = 'editor',
  AUTHOR = 'author',
  USER = 'user',
}
```

### 2. 权限装饰器
```typescript
// common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common'
import { Role } from '../enums/role.enum'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)
```

### 3. 角色守卫
```typescript
// common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { Role } from '../enums/role.enum'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles) return true
    
    const { user } = context.switchToHttp().getRequest()
    return requiredRoles.some((role) => user.roles?.includes(role))
  }
}
```

### 4. 使用示例
```typescript
// modules/articles/articles.controller.ts
@Controller('articles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ArticlesController {
  @Post()
  @Roles(Role.ADMIN, Role.EDITOR, Role.AUTHOR)
  create(@Body() createArticleDto: CreateArticleDto) {
    return this.articlesService.create(createArticleDto)
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.articlesService.remove(id)
  }
}
```

---

## 四、Prisma Schema 设计参考

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  EDITOR
  AUTHOR
  USER
}

enum ArticleStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  avatar    String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  articles     Article[]     @relation("AuthorArticles")
  comments     Comment[]
  refreshTokens RefreshToken[]
}

model Article {
  id          String        @id @default(uuid())
  title       String
  slug        String        @unique
  content     String        @db.Text
  excerpt     String?
  coverImage  String?
  status      ArticleStatus @default(DRAFT)
  publishedAt DateTime?
  views       Int           @default(0)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  
  authorId    String
  author      User          @relation("AuthorArticles", fields: [authorId], references: [id])
  
  categoryId  String?
  category    Category?     @relation(fields: [categoryId], references: [id])
  
  tags        Tag[]         @relation("ArticleTags")
  comments    Comment[]
  
  @@index([slug])
  @@index([authorId])
  @@index([categoryId])
  @@index([status])
}

model Category {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  description String?
  parentId    String?
  parent      Category? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")
  articles    Article[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([slug])
  @@index([parentId])
}

model Tag {
  id        String    @id @default(uuid())
  name      String
  slug      String    @unique
  articles  Tag[]     @relation("ArticleTags")
  createdAt DateTime  @default(now())
  
  @@index([slug])
}

model Comment {
  id        String   @id @default(uuid())
  content   String   @db.Text
  status    String   @default("PENDING") // PENDING, APPROVED, REJECTED
  articleId String
  article   Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  parentId  String?
  parent    Comment? @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies   Comment[] @relation("CommentReplies")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([articleId])
  @@index([userId])
}

model Media {
  id        String   @id @default(uuid())
  filename  String
  originalName String
  mimetype  String
  size      Int
  url       String
  uploadedBy String?
  createdAt DateTime @default(now())
  
  @@index([uploadedBy])
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  @@index([userId])
}
```

---

## 五、模块设计最佳实践

### 1. 模块文件组织
每个模块应包含：
- `*.module.ts` - 模块定义
- `*.controller.ts` - 控制器（路由）
- `*.service.ts` - 服务（业务逻辑）
- `dto/` - 数据传输对象
- `entities/` - 实体（如使用 TypeORM）

### 2. DTO 设计
```typescript
// modules/articles/dto/create-article.dto.ts
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator'
import { ArticleStatus } from '@prisma/client'

export class CreateArticleDto {
  @IsString()
  title: string

  @IsString()
  content: string

  @IsOptional()
  @IsString()
  excerpt?: string

  @IsOptional()
  @IsString()
  coverImage?: string

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus

  @IsOptional()
  @IsString()
  categoryId?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]
}
```

### 3. 统一响应格式
```typescript
// common/interceptors/response.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface Response<T> {
  success: boolean
  data: T
  message?: string
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
      })),
    )
  }
}
```

---

## 六、API 设计规范

### RESTful 风格
```
GET    /articles           # 获取文章列表
GET    /articles/:id       # 获取单篇文章
POST   /articles           # 创建文章
PUT    /articles/:id       # 更新文章
DELETE /articles/:id       # 删除文章

GET    /articles/:id/comments     # 获取文章评论
POST   /articles/:id/comments     # 创建评论

GET    /categories         # 获取分类列表
GET    /tags               # 获取标签列表
```

### 查询参数规范
```
GET /articles?page=1&limit=10&status=published&category=tech&tag=nestjs
GET /articles?search=keyword&sort=publishedAt:desc
```

---

## 七、参考链接

- [NestJS 官方文档](https://docs.nestjs.com/)
- [Prisma 官方文档](https://www.prisma.io/docs/)
- [nodepress GitHub](https://github.com/surmon-china/nodepress)
- [NestJS 认证教程](https://docs.nestjs.com/techniques/authentication)
- [RBAC 权限设计](https://docs.nestjs.com/recipes/roles-guard)

---

**调研总结:**
1. 采用模块化设计，每个功能独立成模块
2. 使用 Prisma 作为 ORM，类型安全且开发效率高
3. 实现 RBAC 权限系统，支持多角色
4. 统一的响应格式和错误处理
5. RESTful API 设计规范
6. 考虑后期扩展性（GraphQL、微服务）
