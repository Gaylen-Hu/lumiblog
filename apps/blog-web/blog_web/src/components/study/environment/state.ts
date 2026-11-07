import { solarDirection } from './solar'
export const CITY = { name: '杭州', timezone: 'Asia/Shanghai', latitude: 30.2741, longitude: 120.1551 }
export type Phase = 'morning' | 'day' | 'dusk' | 'night'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type Weather = 'clear' | 'cloudy' | 'overcast' | 'rain' | 'snow' | 'fog' | 'thunderstorm'
export type WindowWeather = 'city' | Weather
export type Preset = 'auto' | 'sunny' | 'rainy-night' | 'spring' | 'autumn' | 'snow'
export type Environment = { phase: Phase; season: Season; weather: Weather; intensity: number; timezone: string; preset: Preset; clockOffsetMs?: number; solar: ReturnType<typeof solarDirection>; windSpeedMps: number; cloudCover: number }
export type City = { name: string; timezone: string; latitude: number; longitude: number }
export type SiteEnvironment = { city: string; timezone: string; latitude: number; longitude: number; preset: Preset; revision: number }
export type WeatherEnvelope = { config?: SiteEnvironment; serverNow: number; weather: { condition: Weather; temperatureC: number | null; fetchedAt: number; validAt?: number | null; windSpeedMps?: number | null; precipitationMmPerHour?: number | null; cloudCover?: number | null; attributions?: string[]; freshness: 'fresh' | 'stale' } | null }
const formatters = new Map<string, Intl.DateTimeFormat>()
export function cityTime(epoch: number, timezone = CITY.timezone) {
  let formatter = formatters.get(timezone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' })
    formatters.set(timezone, formatter)
  }
  const parts = Object.fromEntries(formatter.formatToParts(epoch).map(p => [p.type, Number(p.value)]))
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second }
}
export function resolveEnvironment(epoch: number, preset: Preset, weather?: Weather, city: City = CITY, windowWeather?: Weather): Environment {
  const { month } = cityTime(epoch, city.timezone)
  const solar = solarTimes(epoch, city)
  const phase: Phase = epoch < solar.sunrise - 1800_000 || epoch >= solar.sunset + 1800_000 ? 'night' : epoch < solar.sunrise + 5400_000 ? 'morning' : epoch < solar.sunset - 3600_000 ? 'day' : 'dusk'
  const season: Season = month >= 3 && month <= 5 ? 'spring' : month <= 8 && month >= 6 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter'
  const state: Environment = { phase, season, weather: weather ?? 'cloudy', intensity: .55, timezone: city.timezone, preset, solar: solarDirection(epoch, city.latitude, city.longitude), windSpeedMps: 0, cloudCover: .5 }
  if (preset === 'sunny') Object.assign(state, { phase: 'day', weather: 'clear' })
  if (preset === 'rainy-night') Object.assign(state, { phase: 'night', weather: 'rain' })
  if (preset === 'spring') Object.assign(state, { phase: 'morning', season: 'spring', weather: 'clear' })
  if (preset === 'autumn') Object.assign(state, { phase: 'dusk', season: 'autumn', weather: 'clear' })
  if (preset === 'snow') Object.assign(state, { phase: 'day', season: 'winter', weather: 'snow' })
  // Presets change only the visual sun; the real wall clock retains city time.
  if (preset !== 'auto') {
    const directions = { sunny: [.65, .65, -.39, 1], 'rainy-night': [.5, -.3, -.81, 0], spring: [.85, .28, -.44, .92], autumn: [-.8, .1, -.59, .6], snow: [.3, .6, -.74, 1] }
    const [east, up, north, daylight] = directions[preset]
    state.solar = { east, up, north, daylight }
  }
  if (windowWeather) state.weather = windowWeather
  state.cloudCover = state.weather === 'clear' ? .1 : state.weather === 'cloudy' ? .5 : .9
  if (state.weather === 'thunderstorm') {
    state.intensity = .9
    state.windSpeedMps = 8
  }
  return state
}
// NOAA-style solar approximation. Date comes from the city, never the host timezone.
export function solarTimes(epoch: number, city: City = CITY) {
  const { year, month, day } = cityTime(epoch, city.timezone)
  const midnight = Date.UTC(year, month - 1, day)
  const ordinal = (midnight - Date.UTC(year, 0, 1)) / 86400_000 + 1
  const angle = 2 * Math.PI / 365 * (ordinal - 1)
  const equation = 229.18 * (.000075 + .001868*Math.cos(angle) - .032077*Math.sin(angle) - .014615*Math.cos(2*angle) - .040849*Math.sin(2*angle))
  const declination = .006918 - .399912*Math.cos(angle) + .070257*Math.sin(angle) - .006758*Math.cos(2*angle) + .000907*Math.sin(2*angle) - .002697*Math.cos(3*angle) + .00148*Math.sin(3*angle)
  const latitude = city.latitude * Math.PI / 180
  const cosine = Math.cos(90.833*Math.PI/180)/(Math.cos(latitude)*Math.cos(declination)) - Math.tan(latitude)*Math.tan(declination)
  if (!Number.isFinite(cosine) || Math.abs(cosine) > 1) {
    const local = cityTime(epoch, city.timezone)
    const localMidnight = epoch - (local.hour*3600 + local.minute*60 + local.second)*1000
    return { sunrise: localMidnight + 6*3600_000, sunset: localMidnight + 18*3600_000 }
  }
  const hourAngle = Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI
  const noon = midnight + (720 - 4*city.longitude - equation) * 60_000
  return { sunrise: noon - hourAngle*4*60_000, sunset: noon + hourAngle*4*60_000 }
}
export const presets: Preset[] = ['auto', 'sunny', 'rainy-night', 'spring', 'autumn', 'snow']
export const weatherLabels: Record<Weather, [string, string]> = { clear: ['晴', 'Clear'], cloudy: ['多云', 'Cloudy'], overcast: ['阴', 'Overcast'], rain: ['雨', 'Rain'], snow: ['雪', 'Snow'], fog: ['雾', 'Fog'], thunderstorm: ['雷雨', 'Thunderstorm'] }
export const presetLabels: Record<Preset, [string, string]> = { auto: ['跟随杭州', 'Follow Hangzhou'], sunny: ['晴朗午后', 'Sunny afternoon'], 'rainy-night': ['安静雨夜', 'Rainy night'], spring: ['春日清晨', 'Spring morning'], autumn: ['秋日黄昏', 'Autumn dusk'], snow: ['冬日飘雪 · 原型', 'Snow · prototype'] }
