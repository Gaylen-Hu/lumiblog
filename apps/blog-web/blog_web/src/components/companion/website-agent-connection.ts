import { createAgentTransport } from './runtime/agent/transport.js'

export function getWebsiteAgentConnection(origin: string) {
  if (process.env.NEXT_PUBLIC_COMPANION_SPLIT_HOST !== 'true' || origin !== 'https://www.new-universe.cn') {
    return { apiBase: '/api/companion' }
  }
  // The production browser talks directly to the API so its session cookie,
  // visitor IP and streaming connection all reach the same trusted gateway.
  const apiBase = 'https://api.new-universe.cn/api/companion'
  return {
    apiBase,
    transport: createAgentTransport({
      apiBase,
      credentials: 'include',
      fetchImpl: (input, init) => fetch(input, { ...init, redirect: 'error' }),
    }),
  }
}
