import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const zone = 'limit_req_zone $binary_remote_addr zone=study_letter_requests:2m rate=5r/s'
const letterDirectives = [
  'limit_req zone=study_letter_requests burst=20 nodelay',
  'limit_req_status 429',
  'client_max_body_size 24k',
  'proxy_pass http://127.0.0.1:3000/v1/public/letters',
  'proxy_set_header Host $host',
  'proxy_set_header X-Forwarded-For $remote_addr',
  'proxy_set_header X-Forwarded-Proto $scheme',
]

// Record direct children and source offsets; braces in comments, quoted strings
// and variable expansions do not delimit Nginx blocks.
function directives(source) {
  const root = [], stack = [root]
  let words = [], start = 0
  const tokens = /#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|(?:\\.|\$\{[\w]+\}|[^\s{};#"'\\])+|[{};]/g
  for (const match of source.matchAll(tokens)) {
    const token = match[0]
    if (token.startsWith('#')) continue
    if (token === '}') {
      if (words.length || stack.length === 1) throw new Error('Unexpected Nginx block boundary')
      stack.pop()
    } else if (token === ';' || token === '{') {
      if (!words.length) throw new Error('Empty Nginx directive')
      const node = { head: words.join(' '), start, children: [] }
      stack.at(-1).push(node)
      if (token === '{') stack.push(node.children)
      words = []
    } else {
      if (!words.length) start = match.index
      words.push(token)
    }
  }
  if (words.length || stack.length !== 1) throw new Error('Incomplete Nginx configuration')
  return root
}

const studyBlock = `location ^~ /api/study/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }`
const assetsBlock = `location ^~ /study-assets/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "public, max-age=0, must-revalidate" always;
    }`

export function patchBlogNginx(source) {
  const nodes = directives(source)
  const zones = nodes.filter(({ head }) => head.startsWith('limit_req_zone ') && /\bzone=study_letter_requests:/.test(head))
  if (zones.length > 1 || zones.some(node => node.head !== zone)) {
    throw new Error('Conflicting study_letter_requests zone; manual review required')
  }
  const edits = []
  let servingBlog = false
  for (const server of nodes.filter(node => node.head === 'server')) {
    const hosts = server.children.find(node => node.head.startsWith('server_name '))?.head.split(' ').slice(1) || []
    const blog = hosts.includes('www.new-universe.cn')
    const api = hosts.includes('api.new-universe.cn')
    if (!blog && !api) continue
    if (server.children.some(node => /^return (301|302|307|308)\b/.test(node.head)) ||
      (server.children.some(node => node.head === 'return 404') &&
       !server.children.some(node => node.head.startsWith('location ')))) continue

    const anchor = server.children.find(node => node.head === (blog ? 'location /api/' : 'location /'))
    if (!anchor) throw new Error('Backend API anchor not found; manual configuration required')
    const blocks = []
    if (blog) {
      servingBlog = true
      const study = server.children.find(node => node.head === 'location ^~ /api/study/')
      if (!study) blocks.push(studyBlock)
      else if (!study.children.some(node => /^proxy_pass http:\/\/(127\.0\.0\.1|localhost):3001$/.test(node.head))
        || study.children.some(node => node.head.startsWith('rewrite '))) {
        throw new Error('Existing study route has unexpected upstream/path rewrite; manual review required')
      }
      if (!server.children.some(node => node.head === 'location ^~ /study-assets/')) blocks.push(assetsBlock)
    }
    const paths = []
    if (blog) paths.push('/api/v1/public/letters')
    if (api) paths.push('/v1/public/letters')
    for (const route of paths) {
      const head = 'location = ' + route
      const existing = server.children.filter(node => node.head.startsWith('location ') &&
        node.head.split(' ').at(-1).replace(/^["']|["']$/g, '') === route)
      if (existing.length) {
        const body = existing[0].children.map(node => node.head)
        if (existing.length !== 1 || existing[0].head !== head || body.length !== letterDirectives.length ||
          !letterDirectives.every(directive => body.includes(directive))) {
          throw new Error('Conflicting letter route ' + route + '; manual review required')
        }
      } else {
        blocks.push(head + ' {\n' + letterDirectives.map(line => '        ' + line + ';').join('\n') + '\n    }')
      }
    }
    if (blocks.length) edits.push({ at: anchor.start, text: blocks.join('\n\n    ') + '\n\n    ' })
  }
  if (!servingBlog) throw new Error('Blog virtual host not found; manual configuration required')
  for (const { at, text } of edits.reverse()) source = source.slice(0, at) + text + source.slice(at)
  return zones.length ? source : zone + ';\n\n' + source
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2)
  if (!input || !output || path.resolve(input) === path.resolve(output)) throw new Error('Usage: patch-blog-nginx.mjs INPUT NEW_OUTPUT')
  await writeFile(output, patchBlogNginx(await readFile(input, 'utf8')), { flag: 'wx' })
}
