import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { directives } from './patch-blog-nginx.mjs'

const originMap = `map "$request_method:$host:$http_origin" $companion_public_origin {
    default $http_origin;
    "GET:www.new-universe.cn:" "https://www.new-universe.cn";
}`

const companionRoute = `location ^~ /api/companion/ {
        set $companion_proxy_token "";
        include /etc/nginx/snippets/myblog-companion-secret*.conf;
        if ($companion_proxy_token = "") { return 503; }
        if ($host != www.new-universe.cn) { return 403; }
        proxy_pass http://127.0.0.1:3000/v1/public/companion/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Connection "";
        proxy_set_header Origin $http_origin;
        proxy_set_header X-Cat-Origin $companion_public_origin;
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
  const maps = nodes.filter(({ head }) => head.startsWith('map ') && head.endsWith(' $companion_public_origin'))
  const addMap = needsBlock(maps, originMap)
  const sites = nodes.filter(({ head, children }) => head === 'server' &&
    children.some(node => node.head.startsWith('server_name ') && node.head.split(' ').includes('www.new-universe.cn')) &&
    !children.some(node => node.head.startsWith('return ')) &&
    children.some(node => node.head === 'location /api/'))
  if (sites.length !== 1) throw new Error('Expected exactly one serving www.new-universe.cn blog virtual host')

  const locations = sites[0].children.filter(node => node.head.startsWith('location '))
  const matches = locations.filter(node => /^\/api\/companion(?:\/|$)/.test(
    node.head.split(' ').at(-1).replace(/^["']|["']$/g, '')))
  if (needsBlock(matches, companionRoute)) {
    const anchor = locations.find(node => node.head === 'location /api/').start
    source = source.slice(0, anchor) + companionRoute + '\n\n    ' + source.slice(anchor)
  }
  return addMap ? originMap + '\n\n' + source : source
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2)
  if (!input || !output || path.resolve(input) === path.resolve(output)) {
    throw new Error('Usage: patch-companion-nginx.mjs INPUT NEW_OUTPUT')
  }
  await writeFile(output, patchCompanionNginx(await readFile(input, 'utf8')), { flag: 'wx' })
}
