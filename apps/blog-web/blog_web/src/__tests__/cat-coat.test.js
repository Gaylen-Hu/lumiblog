import { beforeEach, describe, expect, it, vi } from 'vitest'

const images = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('@/components/companion/runtime/asset-images.js', () => ({ loadCompanionImage: images.load }))

beforeEach(() => {
  vi.resetModules()
  images.load.mockReset()
})

describe('猫咪毛色图集缩放后的区域对应', () => {
  it.each([1024, 1536])('%i 像素的图集不会把身体涂满整张图或把四肢裁到图外', async size => {
    const atlas = { naturalWidth: size, naturalHeight: size }
    images.load.mockResolvedValue(atlas)
    const { prepareBodyCoat, drawBakedCoat } = await import('@/components/companion/runtime/cat-coat.js')
    await prepareBodyCoat()
    const drawImage = vi.fn()
    const context = { drawImage }
    const regions = ['body', 'FL', 'FR', 'HL', 'HR', 'tail']
    const centers = [
      [1 / 3, 1 / 3], [5 / 6, 1 / 6], [5 / 6, 1 / 2],
      [1 / 6, 5 / 6], [1 / 2, 5 / 6], [5 / 6, 5 / 6],
    ]
    for (const [index, region] of regions.entries()) {
      expect(drawBakedCoat(context, region)).toBe(true)
      const [image, x, y, width, height, dx, dy, dw, dh] = drawImage.mock.lastCall
      expect(image).toBe(atlas)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(x + width).toBeLessThanOrEqual(size)
      expect(y + height).toBeLessThanOrEqual(size)
      expect((x + width / 2) / size).toBeCloseTo(centers[index][0])
      expect((y + height / 2) / size).toBeCloseTo(centers[index][1])
      expect(width / size).toBeCloseTo(index === 0 ? 2 / 3 : 1 / 3)
      expect(height).toBe(width)
      expect([dx, dy, dw, dh]).toEqual([0, 0, 1, 1])
    }
  })
})
