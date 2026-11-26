import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { patchCompanionNginx } from './patch-companion-nginx.mjs'
import { directives } from './patch-blog-nginx.mjs'

test('companion routing agrees with the production template', async () => {
  const site = await readFile(new URL('../ops/nginx-myblog.conf', import.meta.url), 'utf8')
  assert.equal(patchCompanionNginx(site), site)
  assert.throws(() => patchCompanionNginx(site.replace('proxy_buffering off;', 'proxy_buffering on;')), /Conflicting/)
  assert.throws(() => patchCompanionNginx(site.replace('default $http_origin;', 'default $host;')), /Conflicting/)
})

test('patches the serving site once and preserves redirects, TLS and other sites', async () => {
  const original = await readFile(new URL('../nginx-blog.conf', import.meta.url), 'utf8')
  const other = '\nserver { server_name api.new-universe.cn; location / { proxy_pass http://127.0.0.1:3000; } }'
  const patched = patchCompanionNginx(original + other)
  assert.equal(patchCompanionNginx(patched), patched)
  assert.equal(patched.split('location ^~ /api/companion/').length, 3)
  assert.ok(patched.includes(original.slice(original.indexOf('    listen 443 ssl'))))
  assert.ok(patched.endsWith('location / { proxy_pass http://127.0.0.1:3000; } }'))
})

test('browser API requires the blog origin, supports credentialed preflight and blocks the raw endpoint', async () => {
  const template = await readFile(new URL('../ops/nginx-myblog.conf', import.meta.url), 'utf8')
  const nodes = directives(template)
  const api = nodes.find(node => node.children.some(child => child.head === 'server_name api.new-universe.cn'))
  const map = nodes.find(node => node.head === 'map $http_origin $companion_api_origin')
  assert.deepEqual(map.children.map(x => x.head), ['default ""', '"https://www.new-universe.cn" "https://www.new-universe.cn"'])
  const route = api.children.find(node => node.head === 'location ^~ /api/companion/')
  const checks = route.children.map(x => x.head)
  const originCheck = checks.findIndex(line => line.startsWith('if ($companion_api_origin = ""'))
  assert.ok(originCheck >= 0 && originCheck < checks.indexOf('if ($request_method = OPTIONS)'))
  assert.ok(checks.includes('add_header Access-Control-Allow-Credentials "true" always'))
  assert.ok(checks.includes('proxy_set_header X-Cat-Client-IP $remote_addr'))
  assert.ok(checks.includes('proxy_set_header X-Cat-Proxy-Token $companion_proxy_token'))
  assert.equal(api.children.find(node => node.head === 'location ^~ /v1/public/companion/').children[0].head, 'return 403')
  assert.throws(() => patchCompanionNginx(template.replace('proxy_set_header Sec-Fetch-Site "";', '')), /Conflicting/)
})
