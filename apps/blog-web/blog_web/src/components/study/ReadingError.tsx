'use client'

import { useLocale } from 'next-intl'

export default function ReadingError({ reset }: { reset: () => void }) {
  const en = useLocale() === 'en'
  return <div className="magazine-error" role="alert">
    <p className="study-imprint">A PAUSE BETWEEN PAGES</p>
    <h1>{en ? 'This page needs a moment.' : '这一页，暂时还没翻开。'}</h1>
    <p>{en ? 'Your place in the study is still here. Try opening the page again.' : '书房还在原处。稍候片刻，再试着翻开这一页。'}</p>
    <button onClick={reset}>{en ? 'Open again ↻' : '重新翻开 ↻'}</button>
  </div>
}
