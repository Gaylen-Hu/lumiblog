// The unrotated hands point at twelve (+Y). Negative Z rotation runs
// clockwise as seen by the visitor facing the glass.
export function clockHandAngles(local: Date) {
  const turn = -2 * Math.PI
  const seconds = local.getSeconds()
  const minutes = local.getMinutes() + seconds / 60
  const hours = local.getHours() % 12 + minutes / 60
  return {
    hour: turn * hours / 12,
    minute: turn * minutes / 60,
    second: turn * seconds / 60,
  }
}
