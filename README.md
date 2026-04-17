# LumiBlog

A full-stack personal blog platform with multilingual support, SEO optimization, and a content management system.

## Tech Stack

| App | Path | Stack |
|-----|------|-------|
| Backend API | `apps/server/my-blog` | NestJS 11 + TypeScript + Prisma + PostgreSQL + Redis |
| Public Blog | `apps/blog-web/blog_web` | Next.js 16 + React 19 + Tailwind CSS 4 |
| Admin CMS | `apps/admin-web/myapp` | Ant Design Pro + UmiJS + Ant Design 5 |

## Features

- Blog articles with CMS-style content management
- Multilingual support (zh-CN / en-US) with translation management
- SEO optimization with SSG/ISR static page generation
- Role-based access control for admin collaboration
- Media management with Alibaba Cloud OSS integration
- AI-powered article translation and SEO optimization (Doubao AI)
- RSS feed support
- Timeline feature

## Project Structure

```
/
├── apps/
│   ├── admin-web/myapp/        # Ant Design Pro admin panel
│   ├── blog-web/blog_web/      # Next.js public blog
│   └── server/my-blog/         # NestJS backend API
├── mcp-server/                 # MCP server for AI tooling integration
└── docs/                       # Project documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL
- Redis

### Backend Setup

```bash
cd apps/server/my-blog

# Install dependencies
pnpm install

# Copy and configure environment variables
cp .env.example .env.dev
# Edit .env.dev with your database, Redis, JWT, and other credentials

# Run database migrations
pnpm prisma migrate dev

# Start development server
pnpm start:dev
```

### Public Blog Setup

```bash
cd apps/blog-web/blog_web

# Install dependencies
pnpm install

# Copy and configure environment variables
cp .env.example .env.local
# Edit .env.local with your API base URL

# Start development server
pnpm dev
```

### Admin Panel Setup

```bash
cd apps/admin-web/myapp

# Install dependencies
pnpm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your API base URL

# Start development server
pnpm dev
```

## Environment Variables

Each app has an `.env.example` file documenting the required variables. Never commit real `.env` files.

### Backend (`apps/server/my-blog/.env.example`)

| Variable | Description |
|----------|-------------|
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | PostgreSQL connection |
| `DATABASE_URL` | Prisma connection string |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis connection |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | JWT authentication |
| `ADMIN_DEFAULT_EMAIL` / `ADMIN_DEFAULT_PASSWORD` | Initial admin account (created on first run) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `DOUBAO_API_KEY` / `DOUBAO_MODEL` | Doubao AI for translation & SEO |
| `OSS_*` | Alibaba Cloud OSS for media uploads |
| `WX_APP_ID` / `WX_APP_SECRET` | WeChat integration |

## Backend Modules

- `AuthModule` — Authentication & authorization (JWT)
- `UserModule` — User management
- `ArticleModule` — Article CRUD with multilingual support
- `CategoryModule` — Category management
- `TagModule` — Tag management
- `MediaModule` — File upload via OSS
- `SeoModule` — SEO configuration
- `TimelineModule` — Timeline events

## Common Commands

### Backend

```bash
pnpm start:dev    # Development (NODE_ENV=dev)
pnpm start:prod   # Production (NODE_ENV=prod)
pnpm build        # Production build
pnpm test         # Unit tests
pnpm test:e2e     # E2E tests
pnpm lint         # Lint
pnpm prisma studio  # Open Prisma Studio
```

### Public Blog

```bash
pnpm dev      # Dev server
pnpm build    # Production build
pnpm start    # Start production server
```

### Admin Panel

```bash
pnpm dev      # Dev server
pnpm build    # Production build
```

## API Documentation

See [`docs/api-reference.md`](docs/api-reference.md) for the full API reference.

## License

MIT
1