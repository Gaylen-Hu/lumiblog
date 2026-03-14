/**
 * 生成 favicon.ico（32x32）
 * 纯 Node.js，无需第三方依赖
 * 图案：深色背景 + 白色简化墨迹横线
 */
import { createWriteStream } from 'fs'
import { deflateSync } from 'zlib'

const SIZE = 32

// ── 1. 生成 RGBA 像素数据 ──────────────────────────────────────────────────
const pixels = new Uint8Array(SIZE * SIZE * 4)

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return
  const i = (y * SIZE + x) * 4
  pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = a
}

function fillRect(x, y, w, h, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(x + dx, y + dy, r, g, b, a)
}

function roundedRect(x, y, w, h, radius, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = x + dx, py = y + dy
      // 简单圆角：检查四个角
      const inCorner =
        (dx < radius && dy < radius && Math.hypot(dx - radius, dy - radius) > radius) ||
        (dx >= w - radius && dy < radius && Math.hypot(dx - (w - radius - 1), dy - radius) > radius) ||
        (dx < radius && dy >= h - radius && Math.hypot(dx - radius, dy - (h - radius - 1)) > radius) ||
        (dx >= w - radius && dy >= h - radius && Math.hypot(dx - (w - radius - 1), dy - (h - radius - 1)) > radius)
      if (!inCorner) setPixel(px, py, r, g, b, a)
    }
  }
}

// 背景：深色圆角矩形
roundedRect(0, 0, SIZE, SIZE, 5, 17, 17, 17)

// 白色横线（模拟 logo 的笔画特征）
fillRect(5, 8,  22, 3, 255, 255, 255)   // 顶部长线
fillRect(5, 14, 16, 3, 255, 255, 255)   // 中间短线
fillRect(5, 20, 19, 3, 255, 255, 255)   // 下方中线
fillRect(5, 26, 22, 2, 255, 255, 255)   // 底部长线

// ── 2. 编码为 PNG ─────────────────────────────────────────────────────────
function crc32(buf) {
  const table = new Int32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    table[i] = c
  }
  let crc = -1
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crcBuf = Buffer.concat([typeBytes, data])
  const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(crcBuf))
  return Buffer.concat([len, typeBytes, data, crcVal])
}

// IHDR
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8   // bit depth
ihdr[9] = 6   // color type: RGBA
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

// IDAT: filter byte (0) + raw scanlines
const raw = []
for (let y = 0; y < SIZE; y++) {
  raw.push(0) // filter type None
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4
    raw.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3])
  }
}
const compressed = deflateSync(Buffer.from(raw))

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG signature
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
])

// ── 3. 包装为 ICO ─────────────────────────────────────────────────────────
// ICO header (6 bytes) + directory entry (16 bytes) + PNG data
const icoHeader = Buffer.alloc(6)
icoHeader.writeUInt16LE(0, 0)   // reserved
icoHeader.writeUInt16LE(1, 2)   // type: 1 = ICO
icoHeader.writeUInt16LE(1, 4)   // count: 1 image

const dataOffset = 6 + 16       // header + 1 directory entry
const dirEntry = Buffer.alloc(16)
dirEntry[0] = SIZE              // width
dirEntry[1] = SIZE              // height
dirEntry[2] = 0                 // color count (0 = no palette)
dirEntry[3] = 0                 // reserved
dirEntry.writeUInt16LE(1, 4)    // color planes
dirEntry.writeUInt16LE(32, 6)   // bits per pixel
dirEntry.writeUInt32LE(png.length, 8)   // size of image data
dirEntry.writeUInt32LE(dataOffset, 12)  // offset of image data

const ico = Buffer.concat([icoHeader, dirEntry, png])

// ── 4. 写入文件 ───────────────────────────────────────────────────────────
const out = createWriteStream(new URL('../src/app/favicon.ico', import.meta.url))
out.write(ico)
out.end()
out.on('finish', () => console.log(`✅ favicon.ico generated (${ico.length} bytes)`))
