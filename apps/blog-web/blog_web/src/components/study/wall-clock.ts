// The unrotated hands point at twelve (+Y). Negative Z rotation runs
// clockwise as seen by the visitor facing the glass.
export function clockHandAngles(local: Date) {
  return clockHandAnglesFromParts({ hour: local.getHours(), minute: local.getMinutes(), second: local.getSeconds() })
}

export function clockHandAnglesFromParts(local: { hour: number; minute: number; second: number }) {
  const turn = -2 * Math.PI
  const seconds = local.second
  const minutes = local.minute + seconds / 60
  const hours = local.hour % 12 + minutes / 60
  return {
    hour: turn * hours / 12,
    minute: turn * minutes / 60,
    second: turn * seconds / 60,
  }
}
