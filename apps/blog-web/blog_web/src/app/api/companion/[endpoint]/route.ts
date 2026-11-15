// Local development bridge only. Production requests go directly through Nginx.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ endpoint: string }> }
const POST_ENDPOINTS = new Set(['sessions', 'chat', 'result', 'cancel', 'clear'])
const MAX_BODY_BYTES = 16_000

function failure(status: number, code: string) {
  return Response.json({ code, message: '小灰暂时无法处理这个请求。' }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

async function proxy(request: Request, context: RouteContext) {
  const upstream = process.env.COMPANION_PREVIEW_API
  const match = upstream?.match(/^http:\/\/127\.0\.0\.1:(\d{1,5})$/)
  // Never turn the Next process into a production trusted proxy or arbitrary URL relay.
  if (process.env.NODE_ENV !== 'development' || !match ||
      Number(match[1]) < 1 || Number(match[1]) > 65535) return failure(503, 'SERVICE_UNAVAILABLE')

  const { endpoint } = await context.params
  if (request.method === 'GET' ? endpoint !== 'status' : !POST_ENDPOINTS.has(endpoint)) {
    return failure(404, 'NOT_FOUND')
  }

  const host = request.headers.get('host')
  let origin: string
  try {
    const local = new URL(`http://${host}`)
    if (!host || local.host !== host || !['localhost', '127.0.0.1', '[::1]'].includes(local.hostname)) {
      return failure(403, 'FORBIDDEN')
    }
    origin = local.origin
  } catch { return failure(403, 'FORBIDDEN') }
  const suppliedOrigin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')
  if ((suppliedOrigin !== null ? suppliedOrigin !== origin : request.method !== 'GET') ||
      (fetchSite !== null && !['same-origin', 'none'].includes(fetchSite))) return failure(403, 'FORBIDDEN')

  const headers = new Headers({ Host: host! })
  // Do not copy X-Cat-*, Forwarded, X-Forwarded-*, or browser Authorization.
  for (const name of ['origin', 'sec-fetch-site', 'cookie', 'content-type']) {
    const value = request.headers.get(name)
    if (value !== null) headers.set(name, value)
  }
  let body: Uint8Array | undefined
  if (request.method === 'POST') {
    if (headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return failure(415, 'UNSUPPORTED_MEDIA_TYPE')
    }
    const reader = request.body?.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    if (reader) {
      try {
        while (true) {
          const chunk = await reader.read()
          if (chunk.done) break
          size += chunk.value.byteLength
          if (size > MAX_BODY_BYTES) {
            await reader.cancel()
            return failure(413, 'PAYLOAD_TOO_LARGE')
          }
          chunks.push(chunk.value)
        }
      } catch { return failure(400, 'INVALID_REQUEST') }
      finally { reader.releaseLock() }
    }
    body = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
  }

  const controller = new AbortController()
  const abort = () => controller.abort()
  request.signal.addEventListener('abort', abort, { once: true })
  if (request.signal.aborted) controller.abort()
  const timeout = setTimeout(abort, 105_000)
  const cleanup = () => {
    clearTimeout(timeout)
    request.signal.removeEventListener('abort', abort)
  }
  try {
    const response = await fetch(`${upstream}/v1/public/companion/${endpoint}`, {
      method: request.method,
      headers,
      body: body as BodyInit | undefined,
      redirect: 'error',
      cache: 'no-store',
      signal: controller.signal,
    })
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' })
    for (const name of ['content-type', 'retry-after']) {
      const value = response.headers.get(name)
      if (value !== null) responseHeaders.set(name, value)
    }
    for (const cookie of response.headers.getSetCookie()) responseHeaders.append('Set-Cookie', cookie)
    const reader = response.body?.getReader()
    if (!reader) { cleanup(); return new Response(null, { status: response.status, headers: responseHeaders }) }
    const stream = new ReadableStream<Uint8Array>({
      async pull(destination) {
        try {
          const chunk = await reader.read()
          if (chunk.done) { cleanup(); destination.close() }
          else destination.enqueue(chunk.value)
        } catch (error) { cleanup(); destination.error(error) }
      },
      async cancel() { controller.abort(); cleanup(); await reader.cancel().catch(() => {}) },
    })
    return new Response(stream, { status: response.status, headers: responseHeaders })
  } catch {
    cleanup()
    return failure(503, 'SERVICE_UNAVAILABLE')
  }
}

export const GET = proxy
export const POST = proxy
