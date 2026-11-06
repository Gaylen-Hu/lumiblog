import { ConfigService } from '@nestjs/config';
import { BlogCacheService } from '../redis/blog-cache.service';
import { EnvironmentService, weatherCondition, parseCurrentWeather } from './environment.module';

describe('environment proxy', () => {
  afterEach(() => jest.restoreAllMocks());
  const emptyConfig = { get: (_name: string, fallback: string) => fallback } as unknown as ConfigService;
  it('falls back without a configured account and never queries an upstream', async () => {
    const fetcher = jest.spyOn(global, 'fetch');
    const service = new EnvironmentService(emptyConfig, { get: jest.fn().mockResolvedValue(null) } as unknown as BlogCacheService);
    expect((await service.read()).weather).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('keeps old cache clearly stale and does not confuse fetch time with observation time', async () => {
    const fetchedAt = Date.now() - 30 * 60_000;
    const service = new EnvironmentService(emptyConfig, { get: jest.fn().mockResolvedValue({ condition: 'rain', temperatureC: 15, fetchedAt }) } as unknown as BlogCacheService);
    const result = await service.read();
    expect(result.weather).toMatchObject({ freshness: 'stale', fetchedAt });
    expect(result.serverNow).toBeGreaterThan(fetchedAt);
    expect(result.weather).not.toHaveProperty('observedAt');
  });
  it('rejects unknown weather codes instead of pretending clear weather', () => {
    expect(weatherCondition('305')).toBe('rain');
    expect(weatherCondition('400')).toBe('snow');
    expect(() => weatherCondition('999')).toThrow();
  });
  it('coalesces concurrent first visitors into one upstream request', async () => {
    const configured = { get: (name: string) => name === 'QWEATHER_API_HOST' ? 'example.xy.qweatherapi.com' : 'test-key' } as unknown as ConfigService;
    const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ condition: { code: '305' }, temperature: { value: 15, unit: '°C' } }) } as Response);
    const cache = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) } as unknown as BlogCacheService;
    const service = new EnvironmentService(configured, cache);
    const results = await Promise.all(Array.from({ length: 20 }, () => service.read()));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results.every(result => result.weather?.condition === 'rain')).toBe(true);
    expect(cache.set).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ condition: 'rain' }), 7200);
  });
  it('does not return expired cache as current weather', async () => {
    const service = new EnvironmentService(emptyConfig, { get: jest.fn().mockResolvedValue({ condition: 'rain', temperatureC: 15, fetchedAt: Date.now()-7200_000 }) } as unknown as BlogCacheService);
    expect((await service.read()).weather).toBeNull();
  });
  it('parses the live-tested current-weather schema without inventing an observation timestamp', () => {
    const now = Date.parse('2026-11-05T15:05:00Z');
    const result = parseCurrentWeather({ validTime: '2026-11-05T15:00Z', condition: { code: '101' }, temperature: { value: 14.44, unit: '°C' }, wind: { speed: { value: 1.73, unit: 'm/s' } }, precipitation: { intensity: { value: 0, unit: 'mm/h' } }, cloudCover: .76, metadata: { attributions: ['https://developer.qweather.com/attribution.html', 'javascript:alert(1)'] } }, now);
    expect(result).toMatchObject({ condition: 'cloudy', validAt: Date.parse('2026-11-05T15:00Z'), fetchedAt: now, windSpeedMps: 1.73, precipitationMmPerHour: 0, cloudCover: .76, attributions: ['https://developer.qweather.com/attribution.html'] });
    expect(result).not.toHaveProperty('observedAt');
  });
  it('rejects old upstream data even when it has just been fetched', () => {
    expect(() => parseCurrentWeather({ validTime: '2026-11-05T12:00Z', condition: { code: '101' }, temperature: { value: 14, unit: '°C' } }, Date.parse('2026-11-05T15:05Z'))).toThrow('invalid weather validity time');
  });
  it('preserves valid stale weather on upstream timeout and backs off repeated visitors', async () => {
    let now = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const configured = new ConfigService({ QWEATHER_API_HOST:'example.xy.qweatherapi.com', QWEATHER_API_KEY:'test-key' });
    const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue({ ok:true, json:async()=>({condition:{code:'305'},temperature:{value:15,unit:'°C'}}) } as Response);
    const cache = { get:jest.fn().mockResolvedValue(null),set:jest.fn() } as unknown as BlogCacheService;
    const service = new EnvironmentService(configured, cache);
    const first = await service.read();
    now += 900_001;
    fetcher.mockRejectedValue(new DOMException('timeout','TimeoutError'));
    expect((await service.read()).weather?.freshness).toBe('stale');
    await new Promise<void>(resolve=>setImmediate(resolve));
    for(let i=0;i<10;i++) expect((await service.read()).weather?.fetchedAt).toBe(first.weather?.fetchedAt);
    expect(fetcher).toHaveBeenCalledTimes(2);
    now += 60_001;
    await service.read(); await new Promise<void>(resolve=>setImmediate(resolve));
    expect(fetcher).toHaveBeenCalledTimes(3);
    now = first.weather!.fetchedAt + 7200_001;
    expect((await service.read()).weather).toBeNull();
  });
});
