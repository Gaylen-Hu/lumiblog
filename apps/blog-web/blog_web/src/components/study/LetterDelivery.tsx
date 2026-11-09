'use client'

import { createContext, useState, type ReactNode } from 'react'

export type LetterReceipt = { token: string; allowPublic: boolean }

export const LetterDeliveryContext = createContext<{
  receipt: LetterReceipt | null
  remember: (receipt: LetterReceipt) => void
} | null>(null)

// The locale layout survives the trip from a standalone letter back to the drawer.
// Keep only the latest claim slip in memory, never in the URL or browser storage.
export function LetterDeliveryProvider({ children }: { children: ReactNode }) {
  const [receipt, remember] = useState<LetterReceipt | null>(null)
  return (
    <LetterDeliveryContext.Provider value={{ receipt, remember }}>
      {children}
    </LetterDeliveryContext.Provider>
  )
}
