import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { packageBlog } from './package-blog.mjs'
import { patchBlogNginx } from './patch-blog-nginx.mjs'

test('both Nginx templates explicitly route study requests to Next without rewriting paths', async () => {
  for (const file of ['nginx-blog.conf', 'ops/nginx-myblog.conf']) {
    const source = await readFile(file, 'utf8')
    const block = source.match(/location\s+\^~\s+\/api\/study\/\s*\{([^}]+)\}/)?.[1]
    assert.ok(block)
    assert.match(block, /proxy_pass http:\/\/(localhost|127\.0\.0\.1):3001;/)
    assert.doesNotMatch(block, /rewrite/)
  }
})

test('patch changes only blog host, is idempotent and preserves TLS/backend rules', () => {
  const source = 'server { server_name www.new-universe.cn;\n    location /api/ { proxy_pass http://127.0.0.1:3000/; }\n ssl_certificate /private/cert; }\nserver { server_name admin.example.com; location /api/ { proxy_pass http://127.0.0.1:3000/; } }'
  const result = patchBlogNginx(source)
  assert.equal(patchBlogNginx(result), result)
  assert.equal((result.match(/location \^~ \/api\/study\//g) || []).length, 1)
  assert.ok(result.endsWith(source.slice(source.indexOf('\nserver { server_name admin'))))
  assert.match(result, /ssl_certificate \/private\/cert/)
  assert.match(result, /location \/api\/ \{ proxy_pass http:\/\/127\.0\.0\.1:3000\/;/)
  assert.throws(() => patchBlogNginx('server { server_name other.example.com; }'))
  assert.throws(() => patchBlogNginx(source.replace('    location /api/', '    location ^~ /api/study/ { proxy_pass http://127.0.0.1:3000; }\n    location /api/')), /unexpected upstream/)
})

for (const nested of [false, true]) test(`standalone ${nested ? 'nested' : 'root'} package has resources beside real server and correct launcher`, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'blog-package-test-'))
  try {
    const app = path.join(root, 'app'), output = path.join(root, 'output')
    const entry = path.join(app, '.next/standalone', nested ? 'apps/blog-web/blog_web' : '')
    async function file(name, value = 'test') { await mkdir(path.dirname(name), { recursive: true }); await writeFile(name, value) }
    await file(path.join(entry, 'server.js'), 'console.log("app")')
    await file(path.join(entry, '.next/required-server-files.json'), '{}')
    for (const route of ['reading', 'search']) await file(path.join(entry, `.next/server/app/api/study/${route}/route.js`))
    await file(path.join(app, '.next/standalone/node_modules/dependency.js'))
    await file(path.join(app, '.next/standalone/.env.local'), 'SECRET=must-not-ship')
    await file(path.join(app, '.next/static/chunk.js'))
    for (const name of ['daylight/garden.webp', 'daylight/garden-snow.webp', 'daylight/oak.webp', 'daylight/leaf.webp', 'v1/paper.webp', 'v1/linen.webp']) await file(path.join(app, 'public/study-assets', name))
    const result = await packageBlog(app, output, 'a'.repeat(40))
    const runtime = path.dirname(path.join(output, result.entry))
    await access(path.join(runtime, 'public/study-assets/daylight/garden.webp'))
    await access(path.join(runtime, '.next/static/chunk.js'))
    await access(path.join(output, 'node_modules/dependency.js'))
    assert.equal(JSON.parse(await readFile(path.join(runtime, 'public/blog-release.json'), 'utf8')).revision, 'a'.repeat(40))
    await assert.rejects(access(path.join(output, '.env.local')))
    assert.match(await readFile(path.join(output, 'server.js'), 'utf8'), nested ? /require\("\.\/apps\/blog-web\/blog_web\/server.js"\)/ : /console.log/)
    await assert.rejects(packageBlog(app, output, 'b'.repeat(40)), /new directory/)
  } finally { await rm(root, { recursive: true, force: true }) }
})
