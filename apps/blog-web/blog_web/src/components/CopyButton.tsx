'use client'

import { useState } from 'react'

const COPY_ICON = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

const CHECK_ICON = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

interface CopyButtonProps {
  text: string
  className?: string
}

export function CopyButton({ text, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const fullUrl = typeof window !== 'undefined' && text.startsWith('/')
      ? `${window.location.origin}${text}`
      : text
    
    await navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`p-3 bg-white rounded-lg border border-gray-100 transition-colors ${
        copied 
          ? 'text-green-500 border-green-200' 
          : 'text-gray-400 hover:text-[#111111] hover:border-gray-200'
      } ${className}`}
      aria-label={copied ? '已复制' : '复制链接'}
    >
      {copied ? CHECK_ICON : COPY_ICON}
    </button>
  )
}
