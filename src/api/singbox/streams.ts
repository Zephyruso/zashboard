// Reconnecting runner for sing-box gRPC-Web server-streaming RPCs.
// Mirrors the resilience of ReconnectingWebSocket used by the Clash API path.

export interface StreamHandle {
  close: () => void
}

export const runStream = <T>(
  factory: (signal: AbortSignal) => AsyncIterable<T>,
  onMessage: (msg: T) => void,
  options: { onError?: (err: unknown) => void; resetBackoffOnMessage?: boolean } = {},
): StreamHandle => {
  let controller: AbortController | null = null
  let closed = false
  let attempt = 0

  const loop = async () => {
    while (!closed) {
      controller = new AbortController()
      try {
        for await (const msg of factory(controller.signal)) {
          if (closed) return
          if (options.resetBackoffOnMessage !== false) attempt = 0
          onMessage(msg)
        }
      } catch (err) {
        if (closed) return
        options.onError?.(err)
      }
      if (closed) return
      const delay = Math.min(1000 * 2 ** attempt, 15000)
      attempt += 1
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  void loop()

  return {
    close: () => {
      closed = true
      controller?.abort()
    },
  }
}
