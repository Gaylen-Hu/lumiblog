export function prefersSimpleStudy() {
  try {
    return window.localStorage.getItem('study-simple') === 'true'
  } catch {
    return false
  }
}

export function loadRoomScene() {
  return import('./room-scene')
}

/** Evaluate after hydration so the indexes and article links stay in the server HTML. */
export function deferStudyGraphics() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  return prefersSimpleStudy() || window.matchMedia('(max-width: 700px), (pointer: coarse), (prefers-reduced-motion: reduce)').matches
    || !!connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '')
}
