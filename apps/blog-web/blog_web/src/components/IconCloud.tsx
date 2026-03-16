'use client'

import { useEffect, useRef } from 'react'

const TECH_ITEMS = [
  'Vue 3', 'Pinia', 'Next.js', 'React', 'TypeScript',
  'UniApp', 'Electron', 'HarmonyOS', 'NestJS', 'Redis',
  'Node.js', 'Python', 'Tailwind', 'PostgreSQL', 'Docker',
]

export default function IconCloud() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = canvas.offsetWidth
    let height = canvas.offsetHeight
    canvas.width = width
    canvas.height = height

    const items = TECH_ITEMS.map((name, i) => {
      const phi = Math.acos(-1 + (2 * i) / TECH_ITEMS.length)
      const theta = Math.sqrt(TECH_ITEMS.length * Math.PI) * phi
      return {
        x: Math.cos(theta) * Math.sin(phi),
        y: Math.sin(theta) * Math.sin(phi),
        z: Math.cos(phi),
        name,
      }
    })

    let rotationX = 0.005
    let rotationY = 0.005
    let animId: number

    const animate = () => {
      ctx.clearRect(0, 0, width, height)
      const radius = Math.min(width, height) * 0.4

      for (const item of items) {
        const x1 = item.x * Math.cos(rotationY) - item.z * Math.sin(rotationY)
        const z1 = item.z * Math.cos(rotationY) + item.x * Math.sin(rotationY)
        const y2 = item.y * Math.cos(rotationX) - z1 * Math.sin(rotationX)
        const z2 = z1 * Math.cos(rotationX) + item.y * Math.sin(rotationX)
        item.x = x1
        item.y = y2
        item.z = z2

        const scale = 2 / (2 - item.z)
        const screenX = width / 2 + item.x * radius * scale
        const screenY = height / 2 + item.y * radius * scale
        const opacity = (item.z + 1) / 2

        // dark/light adaptive color via CSS variable fallback
        ctx.fillStyle = `rgba(59, 130, 246, ${opacity * 0.9})`
        ctx.font = `bold ${Math.max(11, 15 * scale)}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(item.name, screenX, screenY)
      }

      animId = requestAnimationFrame(animate)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      rotationY = (e.clientX - rect.left - width / 2) * 0.0001
      rotationX = -(e.clientY - rect.top - height / 2) * 0.0001
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    animId = requestAnimationFrame(animate)

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <div className="w-full aspect-square rounded-3xl border border-gray-100 dark:border-slate-700 overflow-hidden bg-gray-50 dark:bg-slate-800/50">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
