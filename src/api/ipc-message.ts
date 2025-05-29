const api = window.api

export const addMessageListener = <T>(event: string, callback: (params: T) => void) => {
  return api.on(event, (...args: unknown[]) => {
    const params = args[1] as T
    callback(params)
  })
}
