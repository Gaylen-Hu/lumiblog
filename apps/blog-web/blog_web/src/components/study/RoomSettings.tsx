import { useState, type RefObject } from 'react'
import { presets, presetLabels, weatherLabels, type Preset, type WindowWeather } from './environment/state'
import type { useEnvironment } from './environment/useEnvironment'
import type { useRainAudio } from './environment/useRainAudio'
import type { RoomQuality } from './room-quality'
import skin from './room-settings.module.css'

const weatherPaths: Record<WindowWeather, string> = {
  city: 'M12 21s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z M14.5 9a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  clear: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  cloudy: 'M4 11a4 4 0 1 1 8-4M5 2l1 2M1 6l2 1m8-5-1 2 M7 18a4 4 0 1 1 .6-8 5.5 5.5 0 0 1 10.6 1.4A3.3 3.3 0 1 1 18 18z',
  overcast: 'M5.5 17a4 4 0 0 1-.1-8 5.5 5.5 0 0 1 10.5-1A4.6 4.6 0 1 1 17 17z',
  rain: 'M5 14a3.5 3.5 0 0 1 0-7 5.7 5.7 0 0 1 11-1A4 4 0 1 1 18 14z M8 17l-1 3m6-3-1 3m6-3-1 3',
  snow: 'M12 2v20M3.4 7l17.2 10M3.4 17 20.6 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4m10 14-1-4 4-1M4 14l4 1-1 4M17 5l-1 4 4 1',
  fog: 'M4 12a3.1 3.1 0 0 1 1-6 5.2 5.2 0 0 1 10-.5A3.8 3.8 0 0 1 19 12 M3 15h12m3 0h3M6 19h14',
  thunderstorm: 'M6 14a3.8 3.8 0 0 1-1-7 5.5 5.5 0 0 1 10.8-1A4.2 4.2 0 1 1 18 14 M13 11l-4 6h4l-2 5 6-8h-4z',
}

function WeatherIcon({ kind }: { kind: WindowWeather }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={weatherPaths[kind]} /></svg>
}

function Toggle({ label, pressed, change }: { label: string; pressed: boolean; change: () => void }) {
  return <button className={skin.toggle} aria-pressed={pressed} onClick={change}>{label}<i aria-hidden="true" /></button>
}

type SettingsProps = {
  en: boolean; panel: RefObject<HTMLDivElement | null>; close: () => void
  environment: ReturnType<typeof useEnvironment>; rainAudio: ReturnType<typeof useRainAudio>
  sound: boolean; motion: boolean; simple: boolean; quality: RoomQuality
  toggleSound: () => void; toggleMotion: () => void; toggleSimple: () => void
  chooseQuality: (quality: RoomQuality) => void; resetLamp: () => void
}

export default function RoomSettings({ en, panel, close, environment, rainAudio, sound, motion, simple,
  quality, toggleSound, toggleMotion, toggleSimple, chooseQuality, resetLamp }: SettingsProps) {
  const [indoors, setIndoors] = useState(false)
  const { city, weather, freshness, selectedWeather, selectWeather } = environment
  const language = en ? 1 : 0
  const temperature = weather?.temperatureC
  const weatherTitle = en ? 'Window weather' : '窗外天气'
  const roomTitle = en ? 'Room controls' : '室内设置'
  return <div className={skin.stage} onClick={event => { if (event.target === event.currentTarget) close() }}>
    <div className={skin.panel} role="dialog" aria-modal="true" aria-labelledby="room-panel-title" ref={panel} data-room-scroll>
      <header className={skin.header}>
        <h2 id="room-panel-title">{en ? 'Study settings' : '书房设置'}</h2>
        <button className={skin.close} aria-label={en ? 'Close and return' : '关闭并返回'} onClick={close}>×</button>
      </header>
      <div className={skin.sections} role="group" aria-label={en ? 'Settings group' : '设置分组'}>
        <button aria-pressed={!indoors} onClick={() => setIndoors(false)}>{weatherTitle}</button>
        <button aria-pressed={indoors} onClick={() => setIndoors(true)}>{roomTitle}</button>
      </div>
      {!indoors ? <section aria-label={weatherTitle}>
        <div className={skin.observation}>
          <WeatherIcon kind={weather?.condition ?? 'city'} />
          <div><strong>{city.name}</strong><small>{weather
            ? (en ? 'City weather · ' : '城市实况 · ') + weatherLabels[weather.condition][language]
            : (en ? 'Weather unavailable' : '实况暂不可用')}{freshness === 'stale' && (en ? ' · delayed' : ' · 更新延迟')}</small></div>
          {temperature != null && Number.isFinite(temperature) && <span>{Math.round(temperature)}<sup>°C</sup></span>}
        </div>
        <div className={skin.choices} role="group" aria-label={weatherTitle}>
          {(Object.keys(weatherPaths) as WindowWeather[]).map(kind => <button key={kind}
            aria-label={kind === 'city' ? (en ? 'Follow city weather' : '跟随城市实况') : weatherLabels[kind][language]}
            aria-pressed={selectedWeather === kind} onClick={() => selectWeather(kind)}>
            <WeatherIcon kind={kind} />
            <span>{kind === 'city' ? (en ? 'Live' : '随城市') : weatherLabels[kind][language]}</span>
          </button>)}
        </div>
        {weather && <footer className={skin.attribution}>
          <a href="https://www.qweather.com" target="_blank" rel="noreferrer">QWeather</a>
          {weather.validAt != null && <time>{new Intl.DateTimeFormat(en ? 'en-GB' : 'zh-CN', { timeZone: city.timezone, hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).format(weather.validAt)}</time>}
          {weather.attributions?.filter(url => typeof url === 'string' && /^https:\/\//i.test(url)).map(url => <a key={url} href={url} target="_blank" rel="noreferrer">{en ? 'Attribution' : '数据归因'}</a>)}
        </footer>}
      </section> : <section className={skin.controls} aria-label={roomTitle}>
        <label className={skin.row}>{en ? 'Atmosphere' : '书房氛围'}
          <select value={environment.selection} onChange={e => environment.select(e.target.value as Preset)}>
            {presets.map(value => <option key={value} value={value}>{value === 'auto' ? (en ? 'Site default' : '跟随站点默认') : presetLabels[value][language]}</option>)}
          </select>
        </label>
        <div className={skin.row}>{en ? 'Room detail' : '画面质量'}<div className={skin.quality}>
          <button aria-pressed={quality === 'auto'} onClick={() => chooseQuality('auto')}>{en ? 'Full detail' : '完整效果'}</button>
          <button aria-pressed={quality === 'light'} onClick={() => chooseQuality('light')}>{en ? 'Performance' : '性能模式'}</button>
        </div></div>
        <Toggle label={en ? 'Subtle movement' : '环境微动与视差'} pressed={motion} change={toggleMotion} />
        <Toggle label={en ? 'Interaction sounds' : '翻页与交互声音'} pressed={sound} change={toggleSound} />
        <Toggle label={en ? 'Rain sound' : '雨声'} pressed={rainAudio.enabled} change={() => { if (!sound) toggleSound(); void rainAudio.toggle() }} />
        <label className={skin.row}>{en ? 'Rain volume' : '雨声音量'}
          <input type="range" min="0" max="100" value={Math.round(rainAudio.volume*100)} onChange={e => rainAudio.changeVolume(Number(e.target.value)/100)} />
          <span>{Math.round(rainAudio.volume*100)}%</span>
        </label>
        {rainAudio.failed && <small role="status">{en ? 'Rain sound unavailable. Try again.' : '雨声暂不可用，可再次点击重试。'}</small>}
        <Toggle label={en ? 'Simple view' : '简洁模式'} pressed={simple} change={toggleSimple} />
        <button className={skin.lamp} onClick={resetLamp}>{en ? 'Restore automatic lamp' : '恢复台灯自动开关'} <span aria-hidden="true">↺</span></button>
      </section>}
    </div>
  </div>
}
