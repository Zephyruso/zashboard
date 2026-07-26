// sing-box native 后端的日志订阅:拿到原始 gRPC Log,保留 ANSI 颜色码、
// 按选定的级别过滤并映射级别。日志本就按批到达,直接整批产出(不再伪装成 Clash 逐条投递)。
import { subscribeStream } from '@/api/singbox/subscriptions'
import { LOG_LEVEL } from '@/constant'
import { LogLevel as PbLogLevel, type Log as PbLog } from '@/gen/daemon/started_service_pb'
import type { Log } from '@/types'
import type { LogsSubscription } from './types'

const logLevelToType = (level: PbLogLevel): Log['type'] => {
  switch (level) {
    case PbLogLevel.PANIC:
      return LOG_LEVEL.Panic
    case PbLogLevel.FATAL:
      return LOG_LEVEL.Fatal
    case PbLogLevel.ERROR:
      return LOG_LEVEL.Error
    case PbLogLevel.WARN:
      return LOG_LEVEL.Warning
    case PbLogLevel.DEBUG:
      return LOG_LEVEL.Debug
    case PbLogLevel.TRACE:
      return LOG_LEVEL.Trace
    default:
      return LOG_LEVEL.Info
  }
}

const logLevelFilterFromParam = (level?: string): PbLogLevel | null | undefined => {
  switch (level?.toLowerCase()) {
    case 'panic':
      return PbLogLevel.PANIC
    case 'fatal':
      return PbLogLevel.FATAL
    case 'error':
      return PbLogLevel.ERROR
    case 'warning':
    case 'warn':
      return PbLogLevel.WARN
    case 'info':
      return PbLogLevel.INFO
    case 'debug':
      return PbLogLevel.DEBUG
    case 'trace':
      return PbLogLevel.TRACE
    case 'silent':
      return null
    default:
      return undefined
  }
}

export const subscribeLogs = (
  params: Record<string, string>,
  onBatch: (batch: Log[]) => void,
): LogsSubscription => {
  const levelFilter = logLevelFilterFromParam(params.level)

  return subscribeStream<PbLog>('logs', (msg) => {
    const batch: Log[] = []
    for (const m of msg.messages) {
      if (levelFilter === null || (levelFilter !== undefined && m.level > levelFilter)) continue
      batch.push({ type: logLevelToType(m.level), payload: m.message })
    }
    if (batch.length) onBatch(batch)
  })
}
