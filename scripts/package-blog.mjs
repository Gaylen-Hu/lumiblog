import { cp, mkdir, writeFile, access, readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export async function packageBlog(app, output, revision) {
  app = path.resolve(app); output = path.resolve(output)
  if (!/^[a-f0-9]{7,40}$/.test(revision)) throw new Error('A Git revision is required')
  try { await access(output); throw new Error('Output must be a new directory') }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  const standalone = path.join(app, '.next/standalone')
  const entries = []
  async function find(directory, depth = 0) {
    if (depth > 8) return
    for (const item of await readdir(directory, { withFileTypes: true })) {
      if (item.name === 'node_modules' || item.name === '.next') continue
      const file = path.join(directory, item.name)
      if (item.isDirectory()) await find(file, depth + 1)
      else if (item.name === 'server.js') {
        try { await access(path.join(directory, '.next/required-server-files.json')); entries.push(file) } catch { /* dependency, not application */ }
      }
    }
  }
  await find(standalone)
  if (entries.length !== 1) throw new Error(`Expected one standalone application; found ${entries.length}`)
  const relativeEntry = path.relative(standalone, entries[0])
  const entryDir = path.dirname(relativeEntry)
  // Check the new application APIs and the resources the room actually requests.
  for (const route of ['reading', 'search']) {
    await access(path.join(path.dirname(entries[0]), `.next/server/app/api/study/${route}/route.js`))
  }
  for (const asset of ['daylight/garden.webp', 'daylight/oak.webp', 'daylight/leaf.webp', 'v1/paper.webp', 'v1/linen.webp']) {
    await access(path.join(app, 'public/study-assets', asset))
  }
  await mkdir(output, { recursive: true })
  await cp(standalone, output, { recursive: true, dereference: false, verbatimSymlinks: true,
    filter: file => !path.basename(file).startsWith('.env') })
  const destination = path.join(output, entryDir)
  await cp(path.join(app, '.next/static'), path.join(destination, '.next/static'), { recursive: true })
  await cp(path.join(app, 'public'), path.join(destination, 'public'), { recursive: true })
  if (entryDir !== '.') {
    await writeFile(path.join(output, 'server.js'), `// Generated launcher; keep traced dependencies in their original locations.\nrequire(${JSON.stringify('./' + relativeEntry.split(path.sep).join('/'))});\n`)
  }
  await writeFile(path.join(destination, 'public/blog-release.json'), JSON.stringify({ revision }) + '\n')
  await writeFile(path.join(output, 'blog-release.json'), JSON.stringify({ revision, entry: relativeEntry.split(path.sep).join('/') }) + '\n')
  // The runtime public configuration is embedded by Next; no .env or secrets are copied.
  return { output, revision, entry: relativeEntry }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [app, output, revision] = process.argv.slice(2)
  if (!app || !output || !revision) throw new Error('Usage: node package-blog.mjs APP OUTPUT GIT_SHA')
  console.log(JSON.stringify(await packageBlog(app, output, revision)))
}
