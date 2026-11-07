import { ConfigService } from '@nestjs/config';
import { WeatherCoordinator } from './weather-coordinator';
const mockRedis = { status:'ready', on:jest.fn(), connect:jest.fn(), set:jest.fn(), get:jest.fn(), eval:jest.fn(), disconnect:jest.fn() };
jest.mock('ioredis', () => ({ __esModule:true, default:jest.fn(() => mockRedis) }));
const config=(multi=false) => ({ get:(name:string, fallback:unknown) => name==='WEATHER_MULTI_INSTANCE' ? String(multi) : fallback }) as ConfigService;
describe('weather refresh coordination', () => {
  beforeEach(() => { jest.clearAllMocks(); mockRedis.status='ready'; });
  it('does not fetch when another process owns the lease', async () => {
    mockRedis.set.mockResolvedValue(null);
    const task=jest.fn(), service=new WeatherCoordinator(config(true));
    await service.refresh('city',task);
    expect(task).not.toHaveBeenCalled(); expect(mockRedis.eval).not.toHaveBeenCalled();
  });
  it('releases only its own lease, even after provider failure', async () => {
    mockRedis.set.mockResolvedValue('OK'); mockRedis.eval.mockResolvedValue(1);
    const service=new WeatherCoordinator(config(true));
    await expect(service.refresh('city',async()=>{throw Error('failed')})).rejects.toThrow();
    const owner=mockRedis.set.mock.calls[0][1];
    expect(mockRedis.eval).toHaveBeenCalledWith(expect.stringContaining("ARGV[1]"),1,'city:lease',owner);
    expect(mockRedis.set).toHaveBeenCalledWith('city:lease',owner,'PX',10000,'NX');
  });
  it('fails closed for multiple instances when Redis is down, but permits single-process fallback', async () => {
    mockRedis.set.mockRejectedValue(Error('offline'));
    const task=jest.fn();
    await new WeatherCoordinator(config(true)).refresh('city',task);
    expect(task).not.toHaveBeenCalled();
    await new WeatherCoordinator(config(false)).refresh('city',task);
    expect(task).toHaveBeenCalledTimes(1);
  });
  it('enforces bounded per-IP fallback rate limits', async () => {
    mockRedis.eval.mockRejectedValue(Error('offline'));
    const service=new WeatherCoordinator(config());
    for(let i=0;i<60;i++) expect(await service.allow('127.0.0.1')).toBe(true);
    expect(await service.allow('127.0.0.1')).toBe(false);
    expect(await service.allow('127.0.0.2')).toBe(true);
    service.onModuleDestroy(); expect(mockRedis.disconnect).toHaveBeenCalled();
  });
});
