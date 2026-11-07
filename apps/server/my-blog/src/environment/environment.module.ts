import { EnvironmentConfigController, EnvironmentConfigService, DEFAULT_ENVIRONMENT } from './environment-config';
import { Controller, Get, Header, Injectable, Logger, Module, Optional, UseGuards } from '@nestjs/common';
import { EnvironmentRateGuard, WeatherCoordinator } from './weather-coordinator';
import { ConfigService } from '@nestjs/config';
import { BlogCacheService } from '../redis/blog-cache.service';

type Condition = 'clear' | 'cloudy' | 'overcast' | 'rain' | 'snow' | 'fog' | 'thunderstorm';
type Snapshot = {
  condition: Condition; temperatureC: number | null; fetchedAt: number;
  validAt?: number | null; windSpeedMps?: number | null;
  precipitationMmPerHour?: number | null; cloudCover?: number | null;
  attributions?: string[];
};
type CurrentWeather = {
  validTime?: string; condition?: { code?: string };
  temperature?: { value?: number; unit?: string };
  wind?: { speed?: { value?: number; unit?: string } };
  precipitation?: { intensity?: { value?: number; unit?: string } };
  cloudCover?: number; metadata?: { attributions?: unknown[] };
};
export function parseCurrentWeather(data: CurrentWeather, now: number): Snapshot {
  const condition = weatherCondition(data.condition?.code ?? '');
  const temperature = data.temperature;
  if (!temperature || temperature.unit !== '°C' || !Number.isFinite(temperature.value)) throw new Error('invalid temperature');
  const validAt = data.validTime === undefined ? null : Date.parse(data.validTime);
  if (validAt !== null && (!Number.isFinite(validAt) || validAt > now + 10*60_000 || now-validAt >= 2*3600_000)) throw new Error('invalid weather validity time');
  const speed = data.wind?.speed;
  const windSpeedMps = speed?.unit === 'm/s' && Number.isFinite(speed.value) && speed.value! >= 0 ? speed.value! : null;
  const rain = data.precipitation?.intensity;
  const precipitationMmPerHour = rain?.unit === 'mm/h' && Number.isFinite(rain.value) && rain.value! >= 0 ? rain.value! : null;
  const cloudCover = Number.isFinite(data.cloudCover) && data.cloudCover! >= 0 && data.cloudCover! <= 1 ? data.cloudCover! : null;
  const attributions = (data.metadata?.attributions ?? []).filter((value): value is string => {
    if (typeof value !== 'string' || value.length > 1024) return false;
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
  }).slice(0, 8);
  return { condition, temperatureC: temperature.value!, validAt, fetchedAt: now, windSpeedMps, precipitationMmPerHour, cloudCover, attributions };
}
export function weatherCondition(code: string): Condition {
  const n = Number(code);
  if (!/^\d+$/.test(code)) throw new Error('invalid weather code');
  if (n === 100 || n === 150) return 'clear';
  if ([101, 102, 103, 151, 152, 153].includes(n)) return 'cloudy';
  if (n === 104 || n === 154) return 'overcast';
  if ([302, 303, 304].includes(n)) return 'thunderstorm';
  if (n >= 300 && n <= 399) return 'rain';
  if (n >= 400 && n <= 499) return 'snow';
  if (n >= 500 && n <= 515) return 'fog';
  throw new Error('unsupported weather code');
}

@Injectable()
export class EnvironmentService {
  private readonly logger = new Logger(EnvironmentService.name);
  private failures = 0;
  private last: Snapshot | null = null;
  private pending: Promise<void> | null = null;
  private retryAfter = 0;
  private lastKey = '';
  private pendingKey = '';
  private generation = 0;
  constructor(private readonly config: ConfigService, private readonly cache: BlogCacheService, @Optional() private readonly settings?: EnvironmentConfigService, @Optional() private readonly coordinator?: WeatherCoordinator) {}
  private valid(value: Snapshot | null, now: number): value is Snapshot {
    return !!value && ['clear','cloudy','overcast','rain','snow','fog','thunderstorm'].includes(value.condition) && (value.temperatureC === null || Number.isFinite(value.temperatureC)) && Number.isFinite(value.fetchedAt) && value.fetchedAt <= now && now - value.fetchedAt < 2 * 3600_000 && (value.validAt == null || Number.isFinite(value.validAt) && value.validAt <= now+10*60_000 && now-value.validAt < 2*3600_000);
  }
  async read() {
    const now = Date.now();
    const config = this.settings ? await this.settings.read() : DEFAULT_ENVIRONMENT;
    const key = `environment:v2:qweather:${config.latitude}:${config.longitude}:${config.revision}`;
    if (this.lastKey !== key) { this.generation++; this.last = null; this.lastKey = key; this.retryAfter = 0; this.failures = 0; }
    const generation = this.generation;
    if (!this.valid(this.last, now)) { const cached = await this.cache.get<Snapshot>(key); if (this.lastKey === key && this.generation === generation) this.last = cached ?? null; }
    if (this.generation !== generation) return { config, serverNow: Date.now(), weather: null };
    const host = this.config.get<string>('QWEATHER_API_HOST', '');
    const apiKey = this.config.get<string>('QWEATHER_API_KEY', '');
    if (apiKey && /^[a-z0-9-]+\.[a-z0-9-]+\.qweatherapi\.com$/i.test(host) && (!this.valid(this.last, now) || now - this.last.fetchedAt >= 900_000) && now >= this.retryAfter) {
      if (!this.pending || this.pendingKey !== key) {
        this.pendingKey = key;
        const refresh = () => this.refresh(host, apiKey, key, config.latitude, config.longitude, generation);
        const task = (this.coordinator ? this.coordinator.refresh(key, refresh) : refresh()).finally(() => { if (this.pending === task) this.pending = null; });
        this.pending = task;
      }
    }
    if (!this.valid(this.last, now) && this.pendingKey === key && this.pending) await this.pending;
    const current = Date.now();
    return { config, serverNow: current, weather: this.lastKey === key && this.valid(this.last, current) ? { ...this.last, freshness: current - this.last.fetchedAt < 900_000 ? 'fresh' : 'stale' } : null };
  }
  private async refresh(host: string, apiKey: string, key: string, latitude: number, longitude: number, generation: number) {
    if (this.coordinator) {
      const retryAfter = await this.coordinator.readBackoff(key);
      if (retryAfter > Date.now()) { if (this.generation === generation) this.retryAfter = retryAfter; return; }
      // A different instance may already have refreshed while this instance used old memory.
      const cached = await this.cache.get<Snapshot>(key);
      if (this.valid(cached ?? null, Date.now()) && Date.now() - cached!.fetchedAt < 900_000) {
        if (this.generation === generation) this.last = cached!;
        return;
      }
    }
    // Backoff also bounds concurrent calls while Redis is unavailable.
    this.retryAfter = Date.now() + 60_000;
    try {
      const res = await fetch(`https://${host}/weather/v1/current/${latitude}/${longitude}`, { headers: { 'X-QW-Api-Key': apiKey }, signal: AbortSignal.timeout(4000), redirect: 'error' });
      if (!res.ok) throw new Error('upstream unavailable');
      const snapshot = parseCurrentWeather(await res.json() as CurrentWeather, Date.now());
      if (this.lastKey === key && this.generation === generation) this.last = snapshot;
      if (this.generation === generation) await this.cache.set(key, snapshot, 7200);
      if (this.lastKey === key && this.generation === generation) { this.retryAfter = 0; this.failures = 0; }
    } catch {
      if (this.lastKey === key && this.generation === generation) {
        this.failures++;
        const delay = [60_000, 300_000, 900_000][Math.min(2, this.failures - 1)];
        this.retryAfter = Date.now() + delay;
        await this.coordinator?.backoff(key, delay);
        this.logger.warn({ event: 'weather_refresh_failed', provider: 'qweather', retryInMs: delay });
      }
      // No tokens or upstream response bodies in logs; preserve successful data.
    }
  }
}

@Controller({ path: 'public/environment', version: '1' })
@UseGuards(EnvironmentRateGuard)
class EnvironmentController {
  constructor(private readonly environment: EnvironmentService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  read() { return this.environment.read(); }
}

@Module({ controllers: [EnvironmentController, EnvironmentConfigController], providers: [EnvironmentService, EnvironmentConfigService, WeatherCoordinator, EnvironmentRateGuard] })
export class EnvironmentModule {}
