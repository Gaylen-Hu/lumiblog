import { createHash } from 'node:crypto'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const directory = path.join(root, 'apps/blog-web/blog_web/public/study-assets')
const manifest = path.join(root, 'docs/design-draft/V1资产清单.json')
const active = {
  'web/garden-snow.8845be9d98ff.webp': '雪天按需加载的同机位庭院积雪景观',
  'web/garden.b2ca157b72df.webp': '窗外花园远景', 'web/kingfisher.cfeb077bf546.webp': '翠鸟装饰画',
  'web/leaf.a745a1c3b89b.webp': '程序叶片底色', 'web/oak.196046371a6e.webp': '家具与地板木纹',
  'web/bookcloth.19d880a6c34f.webp': '书封与日记封面', 'web/landscape.20cfd8836796.webp': '墙面装饰画',
  'web/linen.1c1f4cdc90b5.webp': '窗帘与软装', 'web/paper.64148e22c9e6.webp': '日记纸页',
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
  const hash = createHash('sha256').update(contents).digest('hex')
  if (active[name] && !name.endsWith(`.${hash.slice(0, 12)}.webp`)) throw new Error(`Invalid content hash: ${name}`)
  assets.push({ file: name, bytes: contents.length, sha256: hash,
    source: '项目内 ImageGen 生成记录', usage: active[name] || '旧视觉版本保留，不在当前房间加载', runtime: !!active[name] })
}
for (const name of Object.keys(active)) if (!assets.some(asset => asset.file === name)) throw new Error(`Missing room asset: ${name}`)
const output = JSON.stringify({ assets }, null, 2) + '\n'
if (process.argv.includes('--write')) await writeFile(manifest, output)
else if (JSON.stringify(JSON.parse(await readFile(manifest, 'utf8'))) !== JSON.stringify({ assets })) throw new Error('Asset inventory changed. Review provenance and run node scripts/audit-study-assets.mjs --write.')
const runtimeBytes = assets.filter(asset => asset.runtime).reduce((sum, asset) => sum + asset.bytes, 0)
console.log(`Study assets: ${assets.length} inventoried, ${Object.keys(active).length} runtime textures, ${runtimeBytes} runtime file bytes. GPU memory/network timing require device measurement.`)
