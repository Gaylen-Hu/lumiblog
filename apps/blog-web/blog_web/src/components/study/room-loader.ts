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
