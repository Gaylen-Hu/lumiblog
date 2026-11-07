// Low-cost solar direction for lighting, not a precision astronomical ephemeris.
export function solarDirection(epoch: number, latitude: number, longitude: number) {
  const date = new Date(epoch)
  const day = (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000 + 1
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  const days = new Date(Date.UTC(date.getUTCFullYear(), 1, 29)).getUTCMonth() === 1 ? 366 : 365
  const g = 2 * Math.PI / days * (day - 1 + (hour - 12) / 24)
  const eq = 229.18 * (.000075 + .001868*Math.cos(g) - .032077*Math.sin(g) - .014615*Math.cos(2*g) - .040849*Math.sin(2*g))
  const dec = .006918 - .399912*Math.cos(g) + .070257*Math.sin(g) - .006758*Math.cos(2*g) + .000907*Math.sin(2*g) - .002697*Math.cos(3*g) + .00148*Math.sin(3*g)
  const lat = latitude * Math.PI / 180
  const angle = (hour * 60 + eq + 4 * longitude - 720) * Math.PI / 720
  const east = -Math.cos(dec) * Math.sin(angle)
  const up = Math.sin(lat)*Math.sin(dec) + Math.cos(lat)*Math.cos(dec)*Math.cos(angle)
  const north = Math.cos(lat)*Math.sin(dec) - Math.sin(lat)*Math.cos(dec)*Math.cos(angle)
  const daylight = Math.max(0, Math.min(1, (up + .08) / .22))
  return { east, up, north, daylight: daylight * daylight * (3 - 2 * daylight) }
}
