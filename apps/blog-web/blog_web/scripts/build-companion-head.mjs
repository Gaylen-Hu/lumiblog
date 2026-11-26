import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { gzipSync } from 'node:zlib';

// Use the same image processor as the blog's installed Next version.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const directory = new URL('../public/companion/v1/', import.meta.url);
const source = await readFile(new URL('kitten-head.glb', directory));
const jsonEnd = 20 + source.readUInt32LE(12);
const model = JSON.parse(source.toString('utf8', 20, jsonEnd));
const bin = source.subarray(jsonEnd + 8);

// The toon shader reads only pigment on these two materials. Eye materials
// still use their original surface maps.
for (const material of model.materials) {
  if (!['Silver mackerel tabby', 'MuzzleIvory'].includes(material.name)) continue;
  delete material.normalTexture;
  delete material.occlusionTexture;
  delete material.pbrMetallicRoughness.metallicRoughnessTexture;
}

function visit(object, callback) {
  if (!object || typeof object !== 'object') return;
  for (const [key, value] of Object.entries(object)) {
    callback(object, key, value);
    visit(value, callback);
  }
}

// Compact each index table and update every surviving reference, including
// the sparse accessor views used by blinks and other facial expressions.
function retainReferenced(items, references) {
  const used = new Set(references.map(([owner, key]) => owner[key]));
  const remap = new Map();
  const retained = items.filter((_, index) => {
    if (!used.has(index)) return false;
    remap.set(index, remap.size);
    return true;
  });
  for (const [owner, key] of references) owner[key] = remap.get(owner[key]);
  return retained;
}

const textureRefs = [];
visit(model.materials, (_, key, value) => {
  if (key.endsWith('Texture') && Number.isInteger(value?.index)) textureRefs.push([value, 'index']);
});
model.textures = retainReferenced(model.textures, textureRefs);
model.images = retainReferenced(model.images, model.textures.map(texture => [texture, 'source']));
const viewRefs = [];
visit(model, (owner, key) => {
  if (key === 'bufferView') viewRefs.push([owner, key]);
});
model.bufferViews = retainReferenced(model.bufferViews, viewRefs);

const chunks = [];
let length = 0;
for (const [index, view] of model.bufferViews.entries()) {
  const offset = view.byteOffset || 0;
  let data = bin.subarray(offset, offset + view.byteLength);
  const image = model.images.find(entry => entry.bufferView === index);
  if (image?.name === 'coat-color' || image?.name === 'Eye-normal') {
    const width = image.name === 'coat-color' ? 2048 : 512;
    data = await sharp(data).resize({ width, withoutEnlargement: true })
      .jpeg({ quality: 94, chromaSubsampling: '4:4:4', mozjpeg: true }).toBuffer();
  }
  view.byteOffset = length;
  view.byteLength = data.length;
  chunks.push(data, Buffer.alloc((4 - data.length % 4) % 4));
  length += data.length + chunks.at(-1).length;
}
model.buffers[0].byteLength = length;
const json = Buffer.from(JSON.stringify(model));
const paddedJson = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
json.copy(paddedJson);
const header = Buffer.alloc(20);
header.write('glTF');
header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + paddedJson.length + length, 8);
header.writeUInt32LE(paddedJson.length, 12);
header.write('JSON', 16);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(length);
binHeader.write('BIN\0', 4);
const packed = gzipSync(Buffer.concat([header, paddedJson, binHeader, ...chunks]), { level: 9 });
const hash = createHash('sha256').update(packed).digest('hex').slice(0, 12);
const name = `kitten-head.${hash}.glb.gz`;
await writeFile(new URL(name, directory), packed);
console.log(`${name} (${packed.length} bytes)`);
