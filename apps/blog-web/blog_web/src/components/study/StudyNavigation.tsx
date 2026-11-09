'use client'

import { createContext, useContext, useSyncExternalStore } from 'react'
import { resolveStudyRoute, studyLocation, subscribeStudyLocation, type StudyRoute } from './study-route'
import type { StudyRoomProps } from './StudyRoom'

export type StudyNavigation = {
  route: StudyRoute
  cameraSettled: (key: string) => void
  catalogPath?: string
}
export const StudyNavigationContext = createContext<StudyNavigation | null>(null)
export const RoomRegistrationContext = createContext<((data: StudyRoomProps) => void) | null>(null)

export function useStudyLocation(locale: string, serverPath = `/${locale}`) {
  const href = useSyncExternalStore(subscribeStudyLocation, studyLocation, () => serverPath)
  return resolveStudyRoute(href, locale)
}

export function useStudyNavigation(locale: string): StudyNavigation {
  const context = useContext(StudyNavigationContext)
  const route = useStudyLocation(locale)
  return context ?? { route, cameraSettled: () => {} }
}
