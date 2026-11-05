import { createHash } from 'node:crypto'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const directory = path.join(root, 'apps/blog-web/blog_web/public/study-assets')
const manifest = path.join(root, 'docs/design-draft/V1资产清单.json')
const active = {
  'daylight/garden.webp': '窗外花园远景', 'daylight/kingfisher.webp': '翠鸟装饰画',
  'daylight/leaf.webp': '程序叶片底色', 'daylight/oak.webp': '家具与地板木纹',
  'v1/bookcloth.webp': '书封与日记封面', 'v1/landscape.webp': '墙面装饰画',
  'v1/linen.webp': '窗帘与软装', 'v1/paper.webp': '日记纸页',
}
const files = []
async function scan(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name)
    if (item.isDirectory()) await scan(file)
    else if (item.isFile()) files.push(file)
    else throw new Error(`Unexpected linked asset: ${file}`)
  }
}
await scan(directory)
const assets = []
for (const file of files.sort()) {
  const name = path.relative(directory, file).split(path.sep).join('/')
  const contents = await readFile(file)
  assets.push({ file: name, bytes: contents.length, sha256: createHash('sha256').update(contents).digest('hex'),
    source: '项目内 ImageGen 生成记录', usage: active[name] || '旧视觉版本保留，不在当前房间加载', runtime: !!active[name] })
}
for (const name of Object.keys(active)) if (!assets.some(asset => asset.file === name)) throw new Error(`Missing room asset: ${name}`)
const output = JSON.stringify({ assets }, null, 2) + '\n'
if (process.argv.includes('--write')) await writeFile(manifest, output)
else if (JSON.stringify(JSON.parse(await readFile(manifest, 'utf8'))) !== JSON.stringify({ assets })) throw new Error('Asset inventory changed. Review provenance and run node scripts/audit-study-assets.mjs --write.')
const runtimeBytes = assets.filter(asset => asset.runtime).reduce((sum, asset) => sum + asset.bytes, 0)
console.log(`Study assets: ${assets.length} inventoried, ${Object.keys(active).length} runtime textures, ${runtimeBytes} runtime file bytes. GPU memory/network timing require device measurement.`)
