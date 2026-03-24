import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import StatsSection from '@/components/StatsSection'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// Mock AnimatedCounter to render value directly
vi.mock('@/components/ui/AnimatedCounter', () => ({
  default: ({ value }: { value: number }) => <span>{value}</span>,
}))

const zeroProps = {
  articleCount: 0,
  yearsOfExperience: 0,
  openSourceCount: 0,
  talkCount: 0,
}

describe('StatsSection all-zero hide', () => {
  // 2.1 全零时组件返回 null
  it('renders nothing when all stats are zero', () => {
    const { container } = render(<StatsSection {...zeroProps} />)
    expect(container.innerHTML).toBe('')
  })

  // 2.2 至少一个值非零时正常渲染 section
  it('renders section when at least one stat is non-zero', () => {
    const { container } = render(
      <StatsSection {...zeroProps} articleCount={1} />,
    )
    expect(container.querySelector('section')).toBeInTheDocument()
  })

  // 2.3 渲染时 4 个统计项均显示（包括值为 0 的项）
  it('displays all 4 stat items when rendered', () => {
    const { container } = render(
      <StatsSection
        articleCount={5}
        yearsOfExperience={0}
        openSourceCount={0}
        talkCount={0}
      />,
    )
    const items = container.querySelectorAll('.text-center')
    expect(items).toHaveLength(4)
  })
})
