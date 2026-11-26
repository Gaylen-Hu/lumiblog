import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { directives } from './patch-blog-nginx.mjs'

const originMap = `map "$request_method:$host:$http_origin" $companion_public_origin {
    default $http_origin;
    "GET:www.new-universe.cn:" "https://www.new-universe.cn";
}`

const apiOriginMap = `map $http_origin $companion_api_origin {
    default "";
    "https://www.new-universe.cn" "https://www.new-universe.cn";
}`

function companionRoute(host, crossOrigin) {
  const browserChecks = crossOrigin ? `
        if ($companion_api_origin = "") { return 403; }
        if ($http_sec_fetch_site !~ "^(same-site|same-origin|none|)$") { return 403; }
        if ($request_method !~ "^(GET|POST|OPTIONS)$") { return 405; }
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Credentials;
        add_header Access-Control-Allow-Origin $companion_api_origin always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type" always;
        add_header Vary "Origin" always;
        add_header X-Content-Type-Options nosniff always;
        if ($request_method = OPTIONS) { return 204; }
        # The cross-origin request has already passed the host, origin and metadata checks.
        proxy_set_header Sec-Fetch-Site "";` : ''
  return `location ^~ /api/companion/ {
        set $companion_proxy_token "";
        include /etc/nginx/snippets/myblog-companion-secret*.conf;
        if ($companion_proxy_token = "") { return 503; }
        if ($host != ${host}) { return 403; }${browserChecks}
        proxy_pass http://127.0.0.1:3000/v1/public/companion/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Connection "";
        proxy_set_header Origin $http_origin;
        proxy_set_header X-Cat-Origin ${crossOrigin ? '$companion_api_origin' : '$companion_public_origin'};
        proxy_set_header X-Cat-Client-IP $remote_addr;
        proxy_set_header X-Cat-Proxy-Token $companion_proxy_token;
        proxy_set_header X-Forwarded-For "";
        proxy_set_header Forwarded "";
        client_max_body_size 16000;
        client_body_timeout 30s;
        proxy_connect_timeout 3s;
        proxy_send_timeout 30s;
        proxy_read_timeout 90s;
        proxy_buffering off;
        proxy_request_buffering on;
        proxy_cache off;
        gzip off;
    }`
}

function signature({ head, children }) {
  return [head, children.map(signature)]
}

function needsBlock(matches, expected) {
  if (!matches.length) return true
  const wanted = signature(directives(expected)[0])
  if (matches.length !== 1 || JSON.stringify(signature(matches[0])) !== JSON.stringify(wanted)) {
    throw new Error('Conflicting Nginx configuration for ' + wanted[0])
  }
  return false
}

export function patchCompanionNginx(source) {
  const nodes = directives(source)
  const maps = [[originMap, '$companion_public_origin'], [apiOriginMap, '$companion_api_origin']]
    .filter(([block, variable]) => needsBlock(nodes.filter(({ head }) =>
      head.startsWith('map ') && head.endsWith(' ' + variable)), block))
    .map(([block]) => block + '\n\n').join('')
  const edits = []
  for (const [host, anchor] of [['www.new-universe.cn', 'location /api/'], ['api.new-universe.cn', 'location /']]) {
    const sites = nodes.filter(({ head, children }) => head === 'server' &&
      children.some(node => node.head.startsWith('server_name ') && node.head.split(' ').includes(host)) &&
      !children.some(node => node.head.startsWith('return ')) && children.some(node => node.head === anchor))
    if (sites.length !== 1) throw new Error('Expected exactly one serving virtual host for ' + host)
    const locations = sites[0].children.filter(node => node.head.startsWith('location '))
    const at = locations.find(node => node.head === anchor).start
    const api = host === 'api.new-universe.cn'
    const routes = [['/api/companion', companionRoute(host, api)]]
    if (api) routes.push(['/v1/public/companion', 'location ^~ /v1/public/companion/ { return 403; }'])
    for (const [prefix, block] of routes) {
      const matches = locations.filter(node => {
        const p = node.head.split(' ').at(-1).replace(/^["']|["']$/g, '')
        return p === prefix || p.startsWith(prefix + '/')
      })
      if (needsBlock(matches, block)) edits.push({ at, block })
    }
  }
  for (const { at, block } of edits.sort((a, b) => b.at - a.at)) {
    source = source.slice(0, at) + block + '\n\n    ' + source.slice(at)
  }
  return maps + source
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2)
  if (!input || !output || path.resolve(input) === path.resolve(output)) {
    throw new Error('Usage: patch-companion-nginx.mjs INPUT NEW_OUTPUT')
  }
  await writeFile(output, patchCompanionNginx(await readFile(input, 'utf8')), { flag: 'wx' })
}
