export function isNightHour(hour: number) {
  return hour >= 23 || hour < 6
}

export function localLightPeriod(now: Date) {
  const hour = now.getHours()
  const night = isNightHour(hour)
  const boundary = new Date(now)
  if (hour >= 23) boundary.setDate(boundary.getDate() + 1)
  boundary.setHours(night ? 6 : 23, 0, 0, 0)
  return {night, until:boundary.getTime()}
}
