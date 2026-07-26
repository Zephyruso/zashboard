// Clash WS 后端的日志订阅。WS 每条消息即一条 { type, payload } 日志,逐条产出。
import { createClashWebSocket } from '@/api/clash'
import type { Log } from '@/types'
import { watch } from 'vue'
import type { LogsSubscription } from './types'

export const subscribeLogs = (
  params: Record<string, string>,
  onBatch: (batch: Log[]) => void,
): LogsSubscription => {
  const ws = createClashWebSocket<Log>('logs', params)
  const stop = watch(ws.data, (data) => {
    if (data) onBatch([data])
  })

  return {
    close: () => {
      stop()
      ws.close()
    },
  }
}
