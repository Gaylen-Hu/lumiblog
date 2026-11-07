import { logoPaths } from './logo-paths'

interface LogoProps {
  className?: string
  height?: number
}

// SVG logo - 支持深色/浅色模式，fill 跟随 currentColor
// 已移除底部横线（M1442 2098），保留主墨迹图形 + 三条装饰弧线
export default function Logo({ className = '', height = 32 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={height}
      viewBox="138 201 284 205"
      fill="currentColor"
      aria-label="Logo"
      className={className}
    >
      <g transform="translate(0,640) scale(0.1,-0.1)">
        {logoPaths.map(d => <path key={d} d={d} />)}
      </g>
    </svg>
  )
}
