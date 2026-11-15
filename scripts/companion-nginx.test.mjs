import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { patchCompanionNginx } from './patch-companion-nginx.mjs'

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
  assert.equal(patched.split('location ^~ /api/companion/').length, 2)
  assert.ok(patched.endsWith(original.slice(original.indexOf('    listen 443 ssl')) + other))
})
