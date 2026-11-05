import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export function patchBlogNginx(source) {
  const names = [...source.matchAll(/\bserver_name\s+([^;]+);/g)]
  const website = names.find(match => match[1].split(/\s+/).includes('www.new-universe.cn'))
  if (!website) throw new Error('Blog virtual host not found; manual configuration required')
  const next = names.find(match => match.index > website.index)
  const start = website.index, end = next?.index ?? source.length
  const section = source.slice(start, end)
  // Already configured templates are retained verbatim, not duplicated.
  const api = /location\s+\^~\s+\/api\/study\/\s*\{/.test(section)
  const assets = /location\s+\^~\s+\/study-assets\/\s*\{/.test(section)
  if (api) {
    const block = section.match(/location\s+\^~\s+\/api\/study\/\s*\{([^}]+)\}/)?.[1] || ''
    if (!/proxy_pass\s+http:\/\/(127\.0\.0\.1|localhost):3001\s*;/.test(block) || /\brewrite\b/.test(block)) {
      throw new Error('Existing study route has unexpected upstream/path rewrite; manual review required')
    }
  }
  if (api && assets) return source
  const anchor = /[ \t]*location\s+\/api\/\s*\{/.exec(section)
  if (!anchor) throw new Error('Backend API anchor not found; manual configuration required')
  const blocks = []
  if (!api) blocks.push(`    location ^~ /api/study/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }
`)
  if (!assets) blocks.push(`    location ^~ /study-assets/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "public, max-age=0, must-revalidate" always;
    }
`)
  const at = start + anchor.index
  return source.slice(0, at) + blocks.join('\n') + '\n' + source.slice(at)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2)
  if (!input || !output || path.resolve(input) === path.resolve(output)) throw new Error('Usage: patch-blog-nginx.mjs INPUT NEW_OUTPUT')
  await writeFile(output, patchBlogNginx(await readFile(input, 'utf8')), { flag: 'wx' })
}
