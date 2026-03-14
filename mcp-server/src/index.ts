#!/usr/bin/env node
/**
 * Blog MCP Server
 * 支持两种传输模式：
 *   - stdio（本地，默认）：TRANSPORT=stdio node dist/index.js
 *   - http（线上）：TRANSPORT=http node dist/index.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import express, { type Request, type Response } from 'express'
import { BlogApiClient } from './client.js'
import { TOOLS, handleTool } from './tools.js'

// ── 环境变量 ────────────────────────────────────────────
const TRANSPORT = process.env.TRANSPORT ?? 'stdio'
const PORT = parseInt(process.env.PORT ?? '4000', 10)
const API_BASE_URL = process.env.BLOG_API_URL ?? 'http://localhost:3000'
// 线上模式的访问密钥，防止公网裸露
const MCP_API_KEY = process.env.MCP_API_KEY ?? ''

// ── 创建 MCP Server 实例 ────────────────────────────────
function createServer(): Server {
  const client = new BlogApiClient(API_BASE_URL)
  if (process.env.BLOG_API_TOKEN) {
    client.setToken(process.env.BLOG_API_TOKEN)
  }

  const server = new Server(
    { name: 'blog-mcp-server', version: '1.0.0' },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params
    try {
      const result = await handleTool(name, args, client)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { content: [{ type: 'text', text: `错误: ${message}` }], isError: true }
    }
  })

  return server
}

// ── stdio 模式（本地使用）──────────────────────────────
async function startStdio(): Promise<void> {
  const server = createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  process.stderr.write('Blog MCP Server 已启动 [stdio]\n')
}

// ── HTTP 模式（线上部署）──────────────────────────────
async function startHttp(): Promise<void> {
  const app = express()
  app.use(express.json())

  // API Key 鉴权中间件
  if (MCP_API_KEY) {
    app.use('/mcp', (req: Request, res: Response, next) => {
      const key = req.headers['x-api-key'] ?? req.query['api_key']
      if (key !== MCP_API_KEY) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      next()
    })
  }

  // 每个请求独立 server 实例（无状态，适合线上）
  app.post('/mcp', async (req: Request, res: Response) => {
    const server = createServer()
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // 无状态模式
    })
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  })

  // 健康检查
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'blog-mcp-server' })
  })

  app.listen(PORT, () => {
    process.stderr.write(`Blog MCP Server 已启动 [http] port=${PORT}\n`)
  })
}

// ── 入口 ───────────────────────────────────────────────
if (TRANSPORT === 'http') {
  startHttp().catch((err) => {
    process.stderr.write(`启动失败: ${err}\n`)
    process.exit(1)
  })
} else {
  startStdio().catch((err) => {
    process.stderr.write(`启动失败: ${err}\n`)
    process.exit(1)
  })
}
