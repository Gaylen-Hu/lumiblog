export interface MediaItem {
  src: string
  title: string
  date: string
}

const formats: Record<string, string> = {
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', oga: 'audio/ogg', ogg: 'audio/ogg', flac: 'audio/flac',
}

export function mediaFormat(src: string) {
  const extension = src.split(/[?#]/, 1)[0].match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase()
  return extension && Object.hasOwn(formats, extension) ? formats[extension] : undefined
}

export function validMediaUrls(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  const urls = values.filter((src): src is string => typeof src === 'string').map(src => src.trim())
  return [...new Set(urls.filter(src => /^(https?:\/\/|\/(?!\/))/i.test(src)))]
}
