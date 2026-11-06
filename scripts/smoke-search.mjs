import assert from 'node:assert/strict';
const base = process.argv[2] || 'https://api.new-universe.cn/v1/public';
async function query(term, legacy = false) {
  const url = new URL(`${base}/${legacy ? 'articles' : 'search'}`);
  url.search = new URLSearchParams({ [legacy ? 'search' : 'q']: term, locale: 'zh-CN', page: '1', pageSize: '10' });
  const start = performance.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `${term}: ${response.status}`);
  const result = await response.json();
  assert.ok(Array.isArray(result.data), JSON.stringify(result).slice(0, 200));
  console.log(JSON.stringify({ term, legacy, ms: Math.round(performance.now() - start), total: result.total, first: result.data[0]?.title }));
  return result;
}
for (const term of ['隐式动画与显式动画', '隐式动画 显式动画', 'Flutter 动画', '动画 Flutter', 'Fluter', 'TickerProviderStateMixin']) {
  const current = await query(term);
  const legacy = await query(term, true);
  assert.ok(current.data.length > 0, `${term}: no results`);
  assert.deepEqual(current.data.map(x => x.id), legacy.data.map(x => x.id), `${term}: entrypoint mismatch`);
  assert.equal(current.total, legacy.total);
  if (term === '隐式动画与显式动画') assert.equal(current.data[0].title, term);
}
const first = await query('Flutter 动画');
const reversed = await query('动画 Flutter');
assert.deepEqual(first.data.map(x => x.id), reversed.data.map(x => x.id));
assert.equal(first.total, reversed.total);
console.log('Search production checks passed');
