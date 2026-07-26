import { StartedService } from '@/gen/daemon/started_service_pb'
import { getSingboxSecret, getSingboxUrlFromBackend } from '@/helper/utils'
import { activeBackend } from '@/store/setup'
import type { Backend } from '@/types'
import { createClient, type Client, type Interceptor } from '@connectrpc/connect'
import { createGrpcWebTransport } from '@connectrpc/connect-web'

const authInterceptor = (secret: string): Interceptor => {
  return (next) => (request) => {
    if (secret) request.header.set('Authorization', `Bearer ${secret}`)
    return next(request)
  }
}

export class SingboxClient {
  readonly client: Client<typeof StartedService>

  constructor(baseUrl: string, secret: string) {
    this.client = createClient(
      StartedService,
      createGrpcWebTransport({
        baseUrl,
        interceptors: secret ? [authInterceptor(secret)] : [],
      }),
    )
  }
}

// --- Singleton manager keyed to the active backend's sing-box channel ---

let current: { key: string; client: SingboxClient } | null = null

const backendKey = (backend: Backend) =>
  `${backend.uuid}|${getSingboxUrlFromBackend(backend)}|${getSingboxSecret(backend)}`

export const getSingboxClient = (): SingboxClient | null => {
  const backend = activeBackend.value
  const baseUrl = backend ? getSingboxUrlFromBackend(backend) : ''
  if (!backend || !baseUrl) {
    current = null
    return null
  }
  const key = backendKey(backend)
  if (current?.key === key) return current.client
  current = { key, client: new SingboxClient(baseUrl, getSingboxSecret(backend)) }
  return current.client
}

// Probe the sing-box channel for the Setup connectivity test.
export const probeSingboxChannel = async (backend: Backend, timeout = 10000): Promise<boolean> => {
  const baseUrl = getSingboxUrlFromBackend(backend)
  if (!baseUrl) return false
  const secret = getSingboxSecret(backend)
  const client = createClient(
    StartedService,
    createGrpcWebTransport({
      baseUrl,
      interceptors: secret ? [authInterceptor(secret)] : [],
    }),
  )
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    await client.getVersion({}, { signal: controller.signal })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
